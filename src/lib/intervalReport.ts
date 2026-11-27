// 타입만 가져온다(import type은 빌드 때 지워져서 운동 DB가 브라우저 코드에 들어가지 않는다)
import type { MuscleGroup } from '../../server/engine/types'
import type { CoachingGoal } from '../../shared/coaching'
import { WORKOUT_GOAL_LABELS } from '../types'
import type { Goal, InBodyHistoryEntry, Meal, MealSlot, NutritionTarget, UserProfile, Workout } from '../types'
import { estimateBasalMetabolicRate } from './bmr'
import { RULES, WORKOUT_WINDOW_DAYS } from './coachingInsight'
import { EXERCISE_CATALOG } from './exerciseCatalog'
import { GOAL_TO_WORKOUT_GOAL } from './goalMapping'
import {
  calendarDays,
  changeOf,
  COMPARE_RULES,
  metricOf,
  muscleResultOf,
  selectIntervals,
  startOfDay,
  usableMeasurements,
  type Change,
  type IntervalPair,
  type MetricResult,
  type MetricState,
} from './inbodyCompare'
import { sumMeals } from './nutrition'
import { HISTORY_KEEP_DAYS, HISTORY_MIN_KEEP, type RecordedExercise, type WorkoutSessionRecord } from './workoutHistory'
import { mergeSessions, MUSCLE_GROUP_LABEL, type MuscleGroupKey } from './workoutSummary'

/**
 * intervalReport — "변화 추이"의 구간 분석. 인바디 두 번 사이의 기간을 잘라
 * 결과(체지방·골격근) → 식단·운동 분석 → 패턴 → 할 일을 모두 코드가 숫자로 만든다.
 * localStorage·React·서버·AI를 쓰지 않는 순수 함수다.
 *
 * 날짜 규칙: 간격과 기간은 달력 날짜로 센다(측정 시각은 무시). 기간의 기록은 시작 측정일 포함, 끝 측정일 제외.
 */

export { calendarDays, selectIntervals }
export type { Change, IntervalPair, MetricResult, MetricState }

/** 측정을 고르고 "변했다"고 보는 기준은 inbodyCompare의 COMPARE_RULES (진단 카드와 함께 쓴다) */
export const INTERVAL_RULES = {
  /** 주말 평균 칼로리가 평일보다 이 %(이상) 많으면 주말 과식 */
  weekendOverPercent: 20,
  /** 주말·평일 비교에 필요한 최소 기록일(각각) */
  minGroupDays: 2,
  /** 저녁+간식이 칼로리의 이 %(이상)이면 쏠림 */
  eveningSharePercent: 50,
  /** 단백질 평균이 목표의 이 % 미만이면 부족 — 진단 카드와 같은 값 */
  proteinLowPercent: RULES.highProteinPercent,
  /** 목표의 이 % 미만인 날이 기록일의 이 비율(%) 이상이면 너무 적게 먹음 */
  underEatPercent: 70,
  underEatDaysPercent: 50,
  /** 주당 운동 횟수가 이 값 미만이면 운동 부족 — 진단 카드의 "3주 6회"와 같은 값 */
  minSessionsPerWeek: RULES.highSessions / (WORKOUT_WINDOW_DAYS / 7),
  /** 대표 종목의 최고 기록이 이 주 수 이상 그대로면 정체 */
  stagnantWeeks: 3,
  /** 하체 세트가 상체의 이 % 미만이면 부위 쏠림 */
  lowerToUpperPercent: 60,
  /** 연속 휴식일이 이 값 이상이면 긴 공백 */
  longGapDays: 7,
  /** 식단 기록일이 기간의 이 % 미만이면 기록 부족 */
  minDietLogPercent: 50,
  /** 운동 기록이 이 횟수 이하면 기록 부족 */
  maxInsufficientSessions: 2,
  topCount: 3,
  /** 할 일 숫자와 상한 */
  todoMaxLength: 25,
  todoWeekendMarginPercent: 10,
  todoMaxCaloriePercent: 110,
  todoEveningSharePercent: 45,
  todoMinCaloriePercent: 90,
  todoAddKg: 2.5,
  todoLessReps: 2,
  todoMaxAddSets: 3,
  todoMaxRestDays: 3,
  /** 체지방 1kg ≈ 7700kcal (대략) */
  kcalPerKgFat: 7700,
} as const

/**
 * 패턴 강도를 0~1로 맞출 때 "이 값이면 1(가장 강함)". 강도 0은 INTERVAL_RULES의 판정 기준값이고, 그 사이는 직선이다.
 * 패턴마다 값의 단위와 범위가 달라도 같은 눈금으로 겨루게 한다.
 */
export const STRENGTH_FULL_AT = {
  /** 주말이 평일보다 이 % 많음 */
  weekendOverPercent: 60,
  /** 저녁+간식 비중(%) */
  eveningSharePercent: 70,
  /** 단백질이 목표의 이 % */
  proteinPercent: 50,
  /** 적게 먹은 날이 기록일의 이 % */
  underEatDaysPercent: 100,
  /** 주당 운동 횟수 */
  sessionsPerWeek: 0,
  /** 최고 기록이 그대로인 주 수 */
  stagnantWeeks: 6,
  /** 상체 대비 하체(%) */
  lowerToUpperPercent: 0,
  /** 연속 휴식일 */
  longGapDays: 14,
} as const

/**
 * 활동 계수(기초대사량에 곱해 하루 소비 칼로리를 대략 추정). 주 0회 min부터 주 fullPerWeek회 이상 max까지 직선으로 늘어난다.
 */
export const ACTIVITY_FACTOR = { min: 1.2, max: 1.55, fullPerWeek: 5 } as const

export const activityFactorOf = (perWeek: number) =>
  ACTIVITY_FACTOR.min + (ACTIVITY_FACTOR.max - ACTIVITY_FACTOR.min) * Math.min(1, Math.max(0, perWeek / ACTIVITY_FACTOR.fullPerWeek))

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export interface IntervalInput {
  /** 운동 목표. 없으면 식단 목적(dietGoal)을 goalMapping으로 바꿔 쓰고, 그것도 없으면 체형 개선 */
  goal: CoachingGoal | null | undefined
  dietGoal?: Goal | null
  inBodyHistory: InBodyHistoryEntry[]
  meals: Meal[]
  target: NutritionTarget | null
  /** 세트 상세가 있는 운동 기록 */
  workoutHistory: WorkoutSessionRecord[]
  /** (선택) 종류·시간만 있는 운동 기록(러닝 등). 횟수·휴식일에 합쳐 센다 */
  workouts?: Workout[]
  /** (선택) 인바디에 기초대사량이 없을 때 추정에 쓰는 프로필 */
  profile?: Pick<UserProfile, 'gender' | 'age' | 'height' | 'weight'> | null
}

export interface SeriesPoint {
  date: number
  fatMass: number | null
  muscleMass: number | null
}

export type IndicatorId = 'fat' | 'muscle_gain' | 'muscle_keep' | 'volume'
export type IndicatorStatus = 'good' | 'poor' | 'pending' | 'unknown'

export interface Indicator {
  id: IndicatorId
  label: string
  status: IndicatorStatus
}

/** 끼니 칸(식사 기록의 slot 그대로) */
export const MEAL_SLOTS = ['아침', '점심', '저녁', '간식'] as const satisfies readonly MealSlot[]
export type SlotValues = Record<MealSlot, number>
export type EveningSlot = '저녁' | '간식'

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const

export interface WeekdayCalories {
  label: (typeof WEEKDAY_LABELS)[number]
  loggedDays: number
  /** 기록한 날 평균. 기록이 없으면 null */
  total: number | null
  bySlot: SlotValues | null
}

export interface FoodCount {
  name: string
  count: number
}

/** 목표를 넘긴 날의 저녁·간식에 가장 많이 나온 음식 */
export interface OverDayFood extends FoodCount {
  /** 그 음식이 더 자주 나온 칸 */
  slot: EveningSlot
}

export interface DietAnalysis {
  periodDays: number
  loggedDays: number
  sufficient: boolean
  reason: string | null
  avgCalories: number | null
  byWeekday: WeekdayCalories[]
  weekdayAvg: number | null
  weekdayDays: number
  weekendAvg: number | null
  weekendDays: number
  workoutDayAvg: number | null
  workoutDays: number
  restDayAvg: number | null
  restDays: number
  /** 저녁+간식 칼로리 비중(%) */
  eveningSharePercent: number | null
  protein: {
    average: number
    target: number | null
    percent: number | null
    bySlot: { slot: MealSlot; grams: number; sharePercent: number }[]
  } | null
  /** 목표 칼로리의 70% 미만인 날 */
  underDays: number | null
  /** 목표 칼로리를 넘긴 날 */
  overDays: number | null
  topFoods: FoodCount[]
  /** 목표를 넘긴 날의 저녁·간식에서 자주 먹은 음식 */
  topEveningFoodsOnOverDays: FoodCount[]
  overDayFood: OverDayFood | null
  /** 위와 같되 목표를 넘긴 주말만. perWeekend = 그 음식을 주말 저녁·간식에 먹은 횟수(주말 1번당) */
  overWeekendFood: (OverDayFood & { perWeekend: number }) | null
  /** 기록한 날의 하루 평균 끼니 수 */
  mealsPerDay: number | null
}

export interface WeekBucket {
  /** 구간 시작일부터 7일씩 끊은 순번(0부터) */
  week: number
  from: number
  /** 이 칸의 날짜 수(마지막 칸은 7일보다 짧을 수 있다) */
  days: number
}

export interface ExerciseTrend {
  exerciseId: string
  name: string
  sessions: number
  sets: number
  weeks: (WeekBucket & { kg: number | null; reps: number | null })[]
}

export interface WorkoutAnalysis {
  periodDays: number
  sessions: number
  perWeek: number
  longestRestDays: number
  sufficient: boolean
  reason: string | null
  /** false면 저장 규칙 때문에 앞쪽 세트 기록이 빠졌을 수 있다 */
  setDataComplete: boolean
  topExercises: ExerciseTrend[]
  partSets: { group: MuscleGroupKey; label: string; sets: number; perWeek: number }[]
  upperSets: number
  lowerSets: number
  /** 이 기간에 한 하체 종목(자주 한 것부터) — 할 일에 이름을 넣는다 */
  lowerExercises: { name: string; sessions: number; sets: number }[]
  /** 부위를 알 수 없어 상체·하체 비율에서 뺀 세트 수 */
  unknownGroupSets: number
  lowerToUpperPercent: number | null
  weeklyVolume: (WeekBucket & { volume: number; sessions: number; averageVolume: number | null })[]
  /** 앞쪽 주들 대비 뒤쪽 주들의 "1회 평균 볼륨" 변화(%). 판단할 수 없으면 null */
  volumeChangePercent: number | null
}

export type PatternId =
  | 'weekend_overeating'
  | 'evening_skew'
  | 'protein_low'
  | 'under_eating'
  | 'workout_shortage'
  | 'exercise_stagnation'
  | 'lower_body_imbalance'
  | 'long_gap'

export type ChartKind = 'weekdayCalories' | 'mealShare' | 'proteinByMeal' | 'dailyCalories' | 'weeklySessions' | 'exerciseTopSet' | 'bodyPartSets' | 'restDays'

export interface Evidence {
  label: string
  value: number
  unit: string
}

export interface Todo {
  text: string
  current: number
  target: number
  unit: string
  /** 문장에 넣은 음식 이름(식단 할 일) */
  food?: string
  /** 문장에 넣은 종목 이름과 세트 배분(부위 쏠림 할 일) */
  split?: { name: string; sets: number }[]
}

export interface Pattern {
  id: PatternId
  domain: 'diet' | 'workout'
  title: string
  chart: ChartKind
  /** 제목에 쓸 핵심 숫자 */
  headline: Evidence
  evidence: Evidence[]
  /** 근거 숫자가 기준을 넘은 정도(0~1, STRENGTH_FULL_AT). 클수록 강한 패턴 */
  strength: number
  todo: Todo
  /** 종목 정체일 때 그래프에 쓸 종목 */
  exerciseId?: string
}

/** improve = 더 빨라질 수 있어요(결과가 좋음), fix = 보완할 점(결과가 아쉬움) */
export type Tone = 'improve' | 'fix'

export interface Feedback {
  domain: 'diet' | 'workout'
  tone: Tone
  /** 이 패턴과 관련 있는 아쉬운 핵심 지표. 관련 지표가 없으면 null */
  indicator: IndicatorId | null
  pattern: Pattern
}

export interface ExpectedFatChange {
  /** 항상 "대략" 표시를 해야 하는 값 */
  approximate: true
  expectedKg: number | null
  actualKg: number | null
  avgIntake: number | null
  estimatedExpenditure: number | null
  bmr: number | null
  /** inbody = 측정값, estimated = 프로필로 추정 */
  bmrSource: 'inbody' | 'estimated' | null
  activityFactor: number | null
  /** expectedKg가 null인 이유 */
  reason: string | null
}

export interface IntervalAnalysis {
  period: { from: number; to: number; days: number; fromId: string; toId: string }
  results: { fat: MetricResult; muscle: MetricResult }
  indicators: Indicator[]
  diet: DietAnalysis
  workout: WorkoutAnalysis
  patterns: Pattern[]
  /** 식단 최대 1개 + 운동 최대 1개 */
  feedback: Feedback[]
  evidence: { weight: Change; bodyFatPercentage: Change; expectedFatChange: ExpectedFatChange; excludedSets: number }
}

export interface IntervalReport {
  goal: CoachingGoal
  goalLabel: string
  /** 측정 전체(오래된 것부터) */
  series: SeriesPoint[]
  /** 맨 앞 = 최근 구간, 그 뒤 = 지난 구간 */
  intervals: IntervalAnalysis[]
  /** 구간이 하나도 없는 이유 */
  reason: string | null
}

// ---------------------------------------------------------------------------
// 날짜·숫자·글자 도우미
// ---------------------------------------------------------------------------

const addDays = (dayStart: number, n: number) => {
  const d = new Date(dayStart)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime()
}

const round1 = (v: number) => Math.round(v * 10) / 10
const round2 = (v: number) => Math.round(v * 100) / 100
const round10 = (v: number) => Math.round(v / 10) * 10
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const avgOrNull = (xs: number[]) => (xs.length > 0 ? Math.round(sum(xs) / xs.length) : null)
const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null)
const emptySlots = (): SlotValues => ({ 아침: 0, 점심: 0, 저녁: 0, 간식: 0 })

/** 판정 기준(limit)이면 0, full 이상이면 1. full이 limit보다 작으면 "작을수록 나쁜 값"이다 */
export const strengthOf = (value: number, limit: number, full: number) => round2(Math.min(1, Math.max(0, (value - limit) / (full - limit))))

/** 앞에서부터 길이 제한에 맞는 첫 문장. 마지막 후보는 항상 짧은 문장을 넣는다 */
const fitTodo = (candidates: string[]) => candidates.find((t) => t.length <= INTERVAL_RULES.todoMaxLength) ?? candidates.at(-1)!

/** 종목 이름 앞의 기구 이름을 뺀다("바벨 스쿼트" → "스쿼트") */
export const shortExerciseName =(name: string) => name.replace(/^(바벨|덤벨|머신|케이블|스미스머신|레버리지)\s+/, '')

/** 마지막 글자의 받침에 따라 '은/는'을 붙인다 */
function withTopic(word: string): string {
  const code = word.charCodeAt(word.length - 1)
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
  return `${word}${hasBatchim ? '은' : '는'}`
}

// ---------------------------------------------------------------------------
// 2. 결과 지표 (측정 고르기·변화 판단은 inbodyCompare)
// ---------------------------------------------------------------------------

export function resolveGoal(goal: CoachingGoal | null | undefined, dietGoal?: Goal | null): CoachingGoal {
  return goal ?? (dietGoal ? GOAL_TO_WORKOUT_GOAL[dietGoal] : 'body_shape')
}

const INDICATOR_LABELS: Record<IndicatorId, string> = {
  fat: '체지방 감소',
  muscle_gain: '골격근 증가',
  muscle_keep: '골격근 유지',
  volume: '운동 볼륨',
}

/** 목표별 핵심 지표(앞에 있는 것이 더 중요) */
export const GOAL_INDICATORS: Record<CoachingGoal, IndicatorId[]> = {
  fat_loss: ['fat'],
  muscle_gain: ['muscle_gain'],
  body_shape: ['fat', 'muscle_keep'],
  strength: ['muscle_keep', 'volume'],
}

function statusOf(id: IndicatorId, fat: MetricResult, muscle: MetricResult, volumeChange: number | null): IndicatorStatus {
  if (id === 'volume') return volumeChange === null ? 'unknown' : volumeChange >= 0 ? 'good' : 'poor'
  const m = id === 'fat' ? fat : muscle
  if (m.state === 'pending' || m.state === 'unknown') return m.state
  if (id === 'fat') return m.state === 'decrease' ? 'good' : 'poor'
  if (id === 'muscle_gain') return m.state === 'increase' ? 'good' : 'poor'
  return m.state === 'decrease' ? 'poor' : 'good'
}

// ---------------------------------------------------------------------------
// 3. 식단 분석
// ---------------------------------------------------------------------------

const isEvening = (slot: MealSlot): slot is EveningSlot => slot === '저녁' || slot === '간식'

/** 많이 나온 순. 횟수가 같으면 칼로리 합이 큰 음식 먼저(곁들임 반찬보다 주된 음식이 앞에 오게) */
function rankFoods(meals: Meal[]) {
  const found = new Map<string, { count: number; calories: number; dinner: number }>()
  for (const m of meals) {
    for (const f of m.foods) {
      const v = found.get(f.name) ?? { count: 0, calories: 0, dinner: 0 }
      found.set(f.name, { count: v.count + 1, calories: v.calories + f.calories, dinner: v.dinner + (m.slot === '저녁' ? 1 : 0) })
    }
  }
  return [...found]
    .sort(([a, x], [b, y]) => y.count - x.count || y.calories - x.calories || a.localeCompare(b, 'ko'))
    .map(([name, v]) => ({ name, ...v }))
}

const topFoodsOf = (meals: Meal[]): FoodCount[] =>
  rankFoods(meals)
    .slice(0, INTERVAL_RULES.topCount)
    .map(({ name, count }) => ({ name, count }))

function overDayFoodOf(meals: Meal[]): OverDayFood | null {
  const top = rankFoods(meals.filter((m) => isEvening(m.slot)))[0]
  return top ? { name: top.name, count: top.count, slot: top.dinner * 2 >= top.count ? '저녁' : '간식' } : null
}

interface DietDay {
  date: number
  meals: Meal[]
  calories: number
  protein: number
  bySlot: SlotValues
  proteinBySlot: SlotValues
}

function dietDaysOf(meals: Meal[]): DietDay[] {
  const byDay = new Map<number, Meal[]>()
  for (const m of meals) {
    const key = startOfDay(m.timestamp)
    const list = byDay.get(key)
    if (list) list.push(m)
    else byDay.set(key, [m])
  }
  return [...byDay].map(([date, list]) => {
    const bySlot = emptySlots()
    const proteinBySlot = emptySlots()
    for (const m of list) {
      bySlot[m.slot] += m.calories
      proteinBySlot[m.slot] += m.protein
    }
    const total = sumMeals(list)
    return { date, meals: list, calories: total.calories, protein: total.protein, bySlot, proteinBySlot }
  })
}

/** 월=0 … 일=6 */
const weekdayIndex = (ts: number) => (new Date(ts).getDay() + 6) % 7
const isWeekend = (ts: number) => weekdayIndex(ts) >= 5
/** 같은 주말(토·일)을 하나로 세기 위한 키: 그 주 토요일 */
const weekendKey = (ts: number) => addDays(startOfDay(ts), 5 - weekdayIndex(ts))

function overWeekendFoodOf(overMeals: Meal[], allMeals: Meal[]): DietAnalysis['overWeekendFood'] {
  const food = overDayFoodOf(overMeals.filter((m) => isWeekend(m.timestamp)))
  if (!food) return null
  const weekendMeals = allMeals.filter((m) => isWeekend(m.timestamp))
  const weekends = new Set(weekendMeals.map((m) => weekendKey(m.timestamp))).size
  const eaten = weekendMeals.filter((m) => isEvening(m.slot) && m.foods.some((f) => f.name === food.name)).length
  return { ...food, perWeekend: round1(eaten / weekends) }
}

export function analyzeDiet(meals: Meal[], target: NutritionTarget | null, workoutDates: Set<number>, from: number, days: number): DietAnalysis {
  const to = addDays(startOfDay(from), days)
  const inPeriod = meals.filter((m) => m.timestamp >= startOfDay(from) && m.timestamp < to)
  const logged = dietDaysOf(inPeriod)
  const n = logged.length
  const sufficient = n * 100 >= days * INTERVAL_RULES.minDietLogPercent

  const byWeekday = WEEKDAY_LABELS.map((label, i): WeekdayCalories => {
    const list = logged.filter((d) => weekdayIndex(d.date) === i)
    if (list.length === 0) return { label, loggedDays: 0, total: null, bySlot: null }
    const bySlot = emptySlots()
    for (const s of MEAL_SLOTS) bySlot[s] = Math.round(sum(list.map((d) => d.bySlot[s])) / list.length)
    return { label, loggedDays: list.length, total: avgOrNull(list.map((d) => d.calories)), bySlot }
  })

  const weekend = logged.filter((d) => isWeekend(d.date))
  const weekday = logged.filter((d) => !isWeekend(d.date))
  const active = logged.filter((d) => workoutDates.has(d.date))
  const rest = logged.filter((d) => !workoutDates.has(d.date))
  const calories = sum(logged.map((d) => d.calories))
  const evening = sum(logged.map((d) => d.bySlot.저녁 + d.bySlot.간식))
  const proteinTotal = sum(logged.map((d) => d.protein))
  const targetProtein = target && target.protein > 0 ? target.protein : null
  const targetKcal = target && target.calories > 0 ? target.calories : null
  const over = targetKcal === null ? [] : logged.filter((d) => d.calories > targetKcal)
  const overMeals = over.flatMap((d) => d.meals)

  return {
    periodDays: days,
    loggedDays: n,
    sufficient,
    reason: sufficient ? null : `식단 기록이 ${days}일 중 ${n}일이라 부족해요(${INTERVAL_RULES.minDietLogPercent}% 이상 필요)`,
    avgCalories: avgOrNull(logged.map((d) => d.calories)),
    byWeekday,
    weekdayAvg: avgOrNull(weekday.map((d) => d.calories)),
    weekdayDays: weekday.length,
    weekendAvg: avgOrNull(weekend.map((d) => d.calories)),
    weekendDays: weekend.length,
    workoutDayAvg: avgOrNull(active.map((d) => d.calories)),
    workoutDays: active.length,
    restDayAvg: avgOrNull(rest.map((d) => d.calories)),
    restDays: rest.length,
    eveningSharePercent: percentOf(evening, calories),
    protein:
      n === 0
        ? null
        : {
            average: Math.round(proteinTotal / n),
            target: targetProtein,
            percent: targetProtein === null ? null : Math.round((proteinTotal / n / targetProtein) * 100),
            bySlot: MEAL_SLOTS.map((slot) => {
              const grams = sum(logged.map((d) => d.proteinBySlot[slot]))
              return { slot, grams: Math.round(grams / n), sharePercent: percentOf(grams, proteinTotal) ?? 0 }
            }),
          },
    underDays: targetKcal === null ? null : logged.filter((d) => d.calories * 100 < targetKcal * INTERVAL_RULES.underEatPercent).length,
    overDays: targetKcal === null ? null : over.length,
    topFoods: topFoodsOf(inPeriod),
    topEveningFoodsOnOverDays: topFoodsOf(overMeals.filter((m) => isEvening(m.slot))),
    overDayFood: overDayFoodOf(overMeals),
    overWeekendFood: overWeekendFoodOf(overMeals, inPeriod),
    mealsPerDay: n === 0 ? null : round1(sum(logged.map((d) => d.meals.length)) / n),
  }
}

// ---------------------------------------------------------------------------
// 4. 운동 분석
// ---------------------------------------------------------------------------

const UPPER_GROUPS: MuscleGroup[] = ['CHEST', 'SHOULDER', 'BACK', 'ARM']
const PART_ORDER: MuscleGroupKey[] = ['CHEST', 'BACK', 'SHOULDER', 'ARM', 'LEGS', 'ABS', 'CARDIO', 'OTHER']

const normalizeName = (name: string) => name.replace(/\s+/g, '').toLowerCase()
const CATALOG_BY_ID = new Map(EXERCISE_CATALOG.map((e) => [e.id, e.group]))
const CATALOG_BY_NAME = new Map(EXERCISE_CATALOG.map((e) => [normalizeName(e.name), e.group]))

/** 기록의 부위. 비어 있으면 종목 목록에서 id → 이름 순으로 찾고, 그래도 없으면 OTHER(비율 계산에서 빠진다) */
export function groupOfExercise(e: Pick<RecordedExercise, 'exerciseId' | 'name' | 'group'>): MuscleGroupKey {
  if (e.group && e.group in MUSCLE_GROUP_LABEL) return e.group
  return CATALOG_BY_ID.get(e.exerciseId) ?? CATALOG_BY_NAME.get(normalizeName(e.name)) ?? 'OTHER'
}

function weekBuckets(from: number, days: number): WeekBucket[] {
  return Array.from({ length: Math.ceil(days / 7) }, (_, week) => ({ week, from: addDays(from, week * 7), days: Math.min(7, days - week * 7) }))
}

const weekOf = (from: number, ts: number) => Math.floor(calendarDays(from, ts) / 7)

/** 그 기록들 중 가장 무거운 세트(같은 무게면 횟수가 많은 것) */
function topSet(sets: { kg: number; reps: number }[]) {
  return sets.reduce<{ kg: number; reps: number } | null>((best, s) => (!best || s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps) ? s : best), null)
}

/** 1회 평균 볼륨. 볼륨이 없는 기록(맨몸 운동만 한 날 등)은 빼고, 남는 것이 없으면 null */
function averageVolume(records: WorkoutSessionRecord[]): number | null {
  const volumes = records.map((r) => r.totalVolume).filter((v) => Number.isFinite(v) && v > 0)
  return volumes.length > 0 ? sum(volumes) / volumes.length : null
}

function lowerExercisesOf(records: WorkoutSessionRecord[]): WorkoutAnalysis['lowerExercises'] {
  const map = new Map<string, { name: string; sessions: number; sets: number; volume: number }>()
  for (const r of records) {
    for (const e of r.exercises) {
      if (e.sets.length === 0 || groupOfExercise(e) !== 'LEGS') continue
      const item = map.get(e.exerciseId) ?? { name: e.name, sessions: 0, sets: 0, volume: 0 }
      item.sessions += 1
      item.sets += e.sets.length
      item.volume += Number.isFinite(e.volume) ? e.volume : 0
      map.set(e.exerciseId, item)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.sessions - a.sessions || b.sets - a.sets || b.volume - a.volume || a.name.localeCompare(b.name, 'ko'))
    .map(({ name, sessions, sets }) => ({ name, sessions, sets }))
}

function topExercisesOf(records: WorkoutSessionRecord[], from: number, days: number): ExerciseTrend[] {
  const map = new Map<string, { name: string; sessions: number; sets: number; volume: number; byWeek: Map<number, { kg: number; reps: number }[]> }>()
  for (const r of records) {
    for (const e of r.exercises) {
      if (e.sets.length === 0) continue
      const item = map.get(e.exerciseId) ?? { name: e.name, sessions: 0, sets: 0, volume: 0, byWeek: new Map<number, { kg: number; reps: number }[]>() }
      item.sessions += 1
      item.sets += e.sets.length
      item.volume += Number.isFinite(e.volume) ? e.volume : 0
      const week = weekOf(from, r.date)
      item.byWeek.set(week, [...(item.byWeek.get(week) ?? []), ...e.sets])
      map.set(e.exerciseId, item)
    }
  }
  return [...map]
    .sort(([, a], [, b]) => b.sessions - a.sessions || b.sets - a.sets || b.volume - a.volume || a.name.localeCompare(b.name, 'ko'))
    .slice(0, INTERVAL_RULES.topCount)
    .map(([exerciseId, v]) => ({
      exerciseId,
      name: v.name,
      sessions: v.sessions,
      sets: v.sets,
      weeks: weekBuckets(from, days).map((w) => {
        const best = topSet(v.byWeek.get(w.week) ?? [])
        return { ...w, kg: best?.kg ?? null, reps: best?.reps ?? null }
      }),
    }))
}

export function analyzeWorkout(history: WorkoutSessionRecord[], workouts: Workout[], from: number, days: number): WorkoutAnalysis {
  const start = startOfDay(from)
  const to = addDays(start, days)
  const inPeriod = (ts: number) => ts >= start && ts < to
  const records = history.filter((r) => inPeriod(r.date))
  const sessions = mergeSessions(workouts, history).filter((s) => inPeriod(s.endTime))

  const activeDays = new Set(sessions.map((s) => calendarDays(start, s.endTime)))
  let longestRest = 0
  let run = 0
  for (let d = 0; d < days; d++) {
    run = activeDays.has(d) ? 0 : run + 1
    longestRest = Math.max(longestRest, run)
  }

  // 저장 규칙: 최근 120일은 모두, 더 오래된 것은 최근 20회까지(예전에는 20회가 전부였다).
  // 그 규칙에 걸렸을 수 있고 가장 오래된 기록이 구간 시작보다 늦으면, 빠진 세트 기록이 있다고 본다
  const oldest = history.reduce((min, r) => Math.min(min, r.date), Infinity)
  const newest = history.reduce((max, r) => Math.max(max, r.date), -Infinity)
  const mayBePruned =
    history.length === HISTORY_MIN_KEEP || (history.length > HISTORY_MIN_KEEP && calendarDays(start, newest) > HISTORY_KEEP_DAYS)
  const setDataComplete = !(mayBePruned && startOfDay(oldest) > start)

  const sets = new Map<MuscleGroupKey, number>()
  for (const r of records) {
    for (const e of r.exercises) {
      const key = groupOfExercise(e)
      sets.set(key, (sets.get(key) ?? 0) + e.sets.length)
    }
  }
  const upperSets = sum(UPPER_GROUPS.map((g) => sets.get(g) ?? 0))
  const lowerSets = sets.get('LEGS') ?? 0

  const weeklyVolume = weekBuckets(start, days).map((w) => {
    const list = records.filter((r) => weekOf(start, r.date) === w.week)
    const average = averageVolume(list)
    return {
      ...w,
      volume: Math.round(sum(list.map((r) => (Number.isFinite(r.totalVolume) ? r.totalVolume : 0)))),
      sessions: sessions.filter((s) => weekOf(start, s.endTime) === w.week).length,
      averageVolume: average === null ? null : Math.round(average),
    }
  })

  const sufficient = sessions.length > INTERVAL_RULES.maxInsufficientSessions
  // 볼륨 변화: 구간 앞쪽과 뒤쪽에서 같은 길이(온전한 주 단위)를 떼어 1회 평균끼리 비교한다
  const half = Math.floor(days / 14) * 7
  const averageBetween = (a: number, b: number) => averageVolume(records.filter((r) => r.date >= a && r.date < b))
  const first = half > 0 ? averageBetween(start, addDays(start, half)) : null
  const last = half > 0 ? averageBetween(addDays(to, -half), to) : null
  const canCompare = records.length > INTERVAL_RULES.maxInsufficientSessions && setDataComplete

  return {
    periodDays: days,
    sessions: sessions.length,
    perWeek: round1((sessions.length / days) * 7),
    longestRestDays: longestRest,
    sufficient,
    reason: sufficient ? null : `운동 기록이 ${sessions.length}회라 부족해요(${INTERVAL_RULES.maxInsufficientSessions + 1}회 이상 필요)`,
    setDataComplete,
    topExercises: topExercisesOf(records, start, days),
    partSets: PART_ORDER.filter((g) => (sets.get(g) ?? 0) > 0).map((group) => ({
      group,
      label: MUSCLE_GROUP_LABEL[group],
      sets: sets.get(group)!,
      perWeek: round1((sets.get(group)! / days) * 7),
    })),
    upperSets,
    lowerSets,
    lowerExercises: lowerExercisesOf(records),
    unknownGroupSets: sets.get('OTHER') ?? 0,
    lowerToUpperPercent: percentOf(lowerSets, upperSets),
    weeklyVolume,
    volumeChangePercent: canCompare && first !== null && last !== null ? Math.round(((last - first) / first) * 100) : null,
  }
}

// ---------------------------------------------------------------------------
// 5. 패턴 찾기 (할 일 숫자도 함께 만든다)
// ---------------------------------------------------------------------------

/** 주말 칼로리 상한. 목표의 110%를 쓰고, 이미 그 아래라면 평일 평균의 110% */
function weekendLimit(weekdayAvg: number, weekendAvg: number, targetKcal: number | null): number {
  const cap = targetKcal === null ? null : Math.floor((targetKcal * INTERVAL_RULES.todoMaxCaloriePercent) / 1000) * 10
  if (cap !== null && cap < weekendAvg) return cap
  return round10((weekdayAvg * (100 + INTERVAL_RULES.todoWeekendMarginPercent)) / 100)
}

export function findDietPatterns(d: DietAnalysis, target: NutritionTarget | null): Pattern[] {
  if (!d.sufficient) return []
  const out: Pattern[] = []
  const add = (p: Omit<Pattern, 'domain'>) => out.push({ ...p, domain: 'diet' })
  const targetKcal = target && target.calories > 0 ? target.calories : null

  const { weekdayAvg, weekendAvg } = d
  if (
    weekdayAvg !== null &&
    weekendAvg !== null &&
    d.weekdayDays >= INTERVAL_RULES.minGroupDays &&
    d.weekendDays >= INTERVAL_RULES.minGroupDays &&
    weekendAvg * 100 >= weekdayAvg * (100 + INTERVAL_RULES.weekendOverPercent)
  ) {
    const more = Math.round((weekendAvg / weekdayAvg - 1) * 100)
    const limit = weekendLimit(weekdayAvg, weekendAvg, targetKcal)
    const food = d.overWeekendFood
    const headline = { label: '평일보다 많은 정도', value: more, unit: '%' }
    add({
      id: 'weekend_overeating',
      title: '주말 과식',
      chart: 'weekdayCalories',
      headline,
      evidence: [
        { label: '주말 하루 평균', value: weekendAvg, unit: 'kcal' },
        { label: '평일 하루 평균', value: weekdayAvg, unit: 'kcal' },
        headline,
        { label: '주말 하루 권장 상한', value: limit, unit: 'kcal' },
      ],
      strength: strengthOf(((weekendAvg - weekdayAvg) / weekdayAvg) * 100, INTERVAL_RULES.weekendOverPercent, STRENGTH_FULL_AT.weekendOverPercent),
      todo: food
        ? {
            text: fitTodo([
              `주말 ${food.slot} ${withTopic(food.name)} 한 번만`,
              `${withTopic(food.name)} 주말에 한 번만`,
              `주말 ${food.slot} 과식은 한 번만`,
            ]),
            current: food.perWeekend,
            target: 1,
            unit: '회/주말',
            food: food.name,
          }
        : { text: '주말 한 끼는 가볍게 먹기', current: 0, target: 1, unit: '끼/주말' },
    })
  }

  const share = d.eveningSharePercent
  if (share !== null && share >= INTERVAL_RULES.eveningSharePercent) {
    const aim = INTERVAL_RULES.todoEveningSharePercent
    const food = d.overDayFood
    const headline = { label: '저녁·간식 칼로리 비중', value: share, unit: '%' }
    add({
      id: 'evening_skew',
      title: '저녁·간식 쏠림',
      chart: 'mealShare',
      headline,
      evidence: [headline, { label: '목표 비중', value: aim, unit: '%' }],
      strength: strengthOf(share, INTERVAL_RULES.eveningSharePercent, STRENGTH_FULL_AT.eveningSharePercent),
      todo: {
        text: fitTodo([...(food ? [`저녁·간식 ${food.name} 줄이기`, `${food.name} 줄이기`] : []), '저녁·간식 한 가지 줄이기']),
        current: share,
        target: aim,
        unit: '%',
        ...(food ? { food: food.name } : {}),
      },
    })
  }

  const p = d.protein
  if (p && p.target !== null && p.average * 100 < p.target * INTERVAL_RULES.proteinLowPercent) {
    const missing = Math.round(p.target - p.average)
    const headline = { label: '목표 대비', value: p.percent!, unit: '%' }
    add({
      id: 'protein_low',
      title: '단백질 부족',
      chart: 'proteinByMeal',
      headline,
      evidence: [{ label: '하루 평균 단백질', value: p.average, unit: 'g' }, headline],
      strength: strengthOf((p.average / p.target) * 100, INTERVAL_RULES.proteinLowPercent, STRENGTH_FULL_AT.proteinPercent),
      todo: { text: `단백질을 하루 ${missing}g 더 먹기`, current: p.average, target: p.target, unit: 'g' },
    })
  }

  if (
    targetKcal !== null &&
    d.underDays !== null &&
    d.avgCalories !== null &&
    d.underDays * 100 >= d.loggedDays * INTERVAL_RULES.underEatDaysPercent
  ) {
    const min = round10((targetKcal * INTERVAL_RULES.todoMinCaloriePercent) / 100)
    const headline = { label: `목표의 ${INTERVAL_RULES.underEatPercent}% 미만인 날`, value: d.underDays, unit: '일' }
    add({
      id: 'under_eating',
      title: '너무 적게 먹음',
      chart: 'dailyCalories',
      headline,
      evidence: [
        headline,
        { label: '기록한 날', value: d.loggedDays, unit: '일' },
        { label: '하루 평균', value: d.avgCalories, unit: 'kcal' },
        { label: '하루 권장 최소', value: min, unit: 'kcal' },
      ],
      strength: strengthOf((d.underDays / d.loggedDays) * 100, INTERVAL_RULES.underEatDaysPercent, STRENGTH_FULL_AT.underEatDaysPercent),
      todo: { text: '하루 한 끼 더 챙겨 먹기', current: d.mealsPerDay ?? 0, target: round1((d.mealsPerDay ?? 0) + 1), unit: '끼/일' },
    })
  }
  return out
}

/**
 * 늘릴 세트를 이미 하고 있는 종목(자주 한 것부터 최대 2개)에 나눠 담는다. 예: "스쿼트 2세트, 레그 프레스 1세트 더"
 * 길면 한 종목으로 줄이고, 해 본 하체 종목이 없으면 부위 이름만 쓴다.
 */
function splitSets(exercises: WorkoutAnalysis['lowerExercises'], extra: number): Pick<Todo, 'text' | 'split'> {
  const chosen = exercises.slice(0, Math.min(2, extra))
  const short = chosen.map((e) => shortExerciseName(e.name))
  // 기구 이름을 빼면 같아지는 두 종목은 원래 이름을 쓴다
  const names = new Set(short).size === short.length ? short : chosen.map((e) => e.name)
  const options: NonNullable<Todo['split']>[] = []
  if (names.length === 2) options.push([{ name: names[0]!, sets: Math.ceil(extra / 2) }, { name: names[1]!, sets: Math.floor(extra / 2) }])
  if (names.length > 0) options.push([{ name: names[0]!, sets: extra }])
  const text = (split: NonNullable<Todo['split']>) => `${split.map((x) => `${x.name} ${x.sets}세트`).join(', ')} 더`
  const split = options.find((o) => text(o).length <= INTERVAL_RULES.todoMaxLength)
  return split ? { text: text(split), split } : { text: `하체 운동 ${extra}세트 더` }
}

export function findWorkoutPatterns(w: WorkoutAnalysis): Pattern[] {
  if (!w.sufficient) return []
  const out: Pattern[] = []
  const add = (p: Omit<Pattern, 'domain'>) => out.push({ ...p, domain: 'workout' })

  if (w.sessions * 7 < INTERVAL_RULES.minSessionsPerWeek * w.periodDays) {
    const headline = { label: '주당 운동', value: w.perWeek, unit: '회' }
    add({
      id: 'workout_shortage',
      title: '운동 부족',
      chart: 'weeklySessions',
      headline,
      evidence: [headline, { label: '기간 안 운동', value: w.sessions, unit: '회' }],
      strength: strengthOf((w.sessions / w.periodDays) * 7, INTERVAL_RULES.minSessionsPerWeek, STRENGTH_FULL_AT.sessionsPerWeek),
      todo: { text: `주 ${INTERVAL_RULES.minSessionsPerWeek}회 이상 운동하기`, current: w.perWeek, target: INTERVAL_RULES.minSessionsPerWeek, unit: '회/주' },
    })
  }

  for (const e of w.topExercises) {
    // 뒤에서부터, 최고 기록(무게·횟수)이 같은 주를 센다. 기록이 없는 주는 건너뛴다
    const recorded = e.weeks.filter((x) => x.kg !== null)
    const last = recorded.at(-1)
    if (!last || last.kg === null || last.reps === null || last.kg <= 0) continue
    let first = recorded.length - 1
    while (first > 0 && recorded[first - 1]!.kg === last.kg && recorded[first - 1]!.reps === last.reps) first--
    const same = recorded.length - first
    if (same < INTERVAL_RULES.stagnantWeeks) continue
    const kg = last.kg + INTERVAL_RULES.todoAddKg
    const reps = Math.max(1, last.reps - INTERVAL_RULES.todoLessReps)
    const headline = { label: '그대로인 기간', value: same, unit: '주' }
    add({
      id: 'exercise_stagnation',
      title: `${e.name} 정체`,
      chart: 'exerciseTopSet',
      exerciseId: e.exerciseId,
      headline,
      evidence: [{ label: '최고 무게', value: last.kg, unit: 'kg' }, { label: '그때 횟수', value: last.reps, unit: '회' }, headline],
      strength: strengthOf(same, INTERVAL_RULES.stagnantWeeks, STRENGTH_FULL_AT.stagnantWeeks),
      todo: {
        text: fitTodo([e.name, shortExerciseName(e.name)].map((n) => `${n} ${kg}kg × ${reps}회 도전`).concat(`${kg}kg × ${reps}회 도전`)),
        current: last.kg,
        target: kg,
        unit: 'kg',
      },
    })
  }

  if (w.setDataComplete && w.upperSets > 0 && w.lowerSets * 100 < w.upperSets * INTERVAL_RULES.lowerToUpperPercent) {
    const perWeek = (sets: number) => (sets / w.periodDays) * 7
    const needed = (perWeek(w.upperSets) * INTERVAL_RULES.lowerToUpperPercent) / 100
    const extra = Math.min(INTERVAL_RULES.todoMaxAddSets, Math.max(1, Math.ceil(needed - perWeek(w.lowerSets))))
    const headline = { label: '상체 대비 하체', value: w.lowerToUpperPercent!, unit: '%' }
    add({
      id: 'lower_body_imbalance',
      title: '부위 쏠림(하체 부족)',
      chart: 'bodyPartSets',
      headline,
      evidence: [
        { label: '상체 주당 세트', value: round1(perWeek(w.upperSets)), unit: '세트' },
        { label: '하체 주당 세트', value: round1(perWeek(w.lowerSets)), unit: '세트' },
        headline,
        ...(w.unknownGroupSets > 0 ? [{ label: '부위를 몰라 뺀 세트', value: w.unknownGroupSets, unit: '세트' }] : []),
      ],
      strength: strengthOf((w.lowerSets / w.upperSets) * 100, INTERVAL_RULES.lowerToUpperPercent, STRENGTH_FULL_AT.lowerToUpperPercent),
      todo: { ...splitSets(w.lowerExercises, extra), current: round1(perWeek(w.lowerSets)), target: round1(perWeek(w.lowerSets) + extra), unit: '세트/주' },
    })
  }

  if (w.longestRestDays >= INTERVAL_RULES.longGapDays) {
    const headline = { label: '가장 긴 연속 휴식', value: w.longestRestDays, unit: '일' }
    add({
      id: 'long_gap',
      title: '긴 공백',
      chart: 'restDays',
      headline,
      evidence: [headline],
      strength: strengthOf(w.longestRestDays, INTERVAL_RULES.longGapDays, STRENGTH_FULL_AT.longGapDays),
      todo: { text: `연속 휴식은 ${INTERVAL_RULES.todoMaxRestDays}일 이하로`, current: w.longestRestDays, target: INTERVAL_RULES.todoMaxRestDays, unit: '일' },
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// 6. 결과와 짝짓기, 고르기
// ---------------------------------------------------------------------------

/** 핵심 지표별로 관련 있는 패턴 */
export const RELATED_PATTERNS: Record<IndicatorId, PatternId[]> = {
  fat: ['weekend_overeating', 'evening_skew', 'workout_shortage', 'long_gap'],
  muscle_gain: ['under_eating', 'protein_low', 'workout_shortage', 'long_gap', 'exercise_stagnation', 'lower_body_imbalance'],
  muscle_keep: ['under_eating', 'protein_low', 'workout_shortage', 'long_gap'],
  volume: ['workout_shortage', 'long_gap', 'exercise_stagnation', 'lower_body_imbalance'],
}

/** 체지방 감량 목표에서 골격근이 오차 범위일 때 운동 피드백으로 먼저 고르는 패턴 */
export const MUSCLE_FLAT_PRIORITY: PatternId[] = ['lower_body_imbalance', 'exercise_stagnation']

/**
 * 식단·운동에서 각각 최대 1개. 결과가 좋아도 패턴이 있으면 고른다.
 * 순서: ① (체지방 감량 + 골격근 오차 범위의 운동) 하체 부족·종목 정체 ② 아쉬운 지표와 관련된 패턴 ③ 강도가 큰 것.
 * 아쉬운 지표가 하나라도 있으면 fix, 없고 좋은 지표가 있으면 improve. 모두 보류·알 수 없음이면 고르지 않는다.
 */
export function pickFeedback(goal: CoachingGoal, muscleState: MetricState, indicators: Indicator[], patterns: Pattern[]): Feedback[] {
  const poor = indicators.filter((i) => i.status === 'poor')
  if (poor.length === 0 && !indicators.some((i) => i.status === 'good')) return []
  const tone: Tone = poor.length > 0 ? 'fix' : 'improve'
  const relatedTo = (p: Pattern) => poor.find((i) => RELATED_PATTERNS[i.id].includes(p.id))?.id ?? null
  const muscleFlat = goal === 'fat_loss' && muscleState === 'noise'
  const first = (p: Pattern) => Number(muscleFlat && MUSCLE_FLAT_PRIORITY.includes(p.id))

  const picked: Feedback[] = []
  for (const domain of ['diet', 'workout'] as const) {
    const best = patterns
      .filter((p) => p.domain === domain)
      .sort((a, b) => first(b) - first(a) || Number(relatedTo(b) !== null) - Number(relatedTo(a) !== null) || b.strength - a.strength)[0]
    if (best) picked.push({ domain, tone, indicator: relatedTo(best), pattern: best })
  }
  return picked
}

// ---------------------------------------------------------------------------
// 7. 근거용 계산
// ---------------------------------------------------------------------------

/** 기초대사량: 구간 양 끝 인바디 값의 평균. 둘 다 없으면 프로필로 추정(앱의 기존 공식) */
function bmrOf(pair: IntervalPair, profile: IntervalInput['profile']): Pick<ExpectedFatChange, 'bmr' | 'bmrSource'> {
  const measured = [pair.base.basalMetabolicRate, pair.end.basalMetabolicRate].filter((v): v is number => v !== null)
  if (measured.length > 0) return { bmr: Math.round(sum(measured) / measured.length), bmrSource: 'inbody' }
  if (!profile) return { bmr: null, bmrSource: null }
  const weight = pair.end.weight ?? pair.base.weight ?? profile.weight
  return { bmr: estimateBasalMetabolicRate(profile.gender, profile.age, profile.height, weight), bmrSource: 'estimated' }
}

function expectedFatChange(pair: IntervalPair, diet: DietAnalysis, workout: WorkoutAnalysis, actualKg: number | null, profile: IntervalInput['profile']): ExpectedFatChange {
  const { bmr, bmrSource } = bmrOf(pair, profile)
  const missing = [diet.reason, workout.reason, bmr === null ? '기초대사량 값이 없어요' : null].filter((r): r is string => r !== null)
  if (missing.length > 0 || bmr === null || diet.avgCalories === null) {
    return {
      approximate: true,
      expectedKg: null,
      actualKg,
      avgIntake: null,
      estimatedExpenditure: null,
      bmr,
      bmrSource,
      activityFactor: null,
      reason: missing.join(' / ') || '식단 기록이 없어요',
    }
  }
  const factor = activityFactorOf((workout.sessions * 7) / workout.periodDays)
  const expenditure = Math.round(bmr * factor)
  return {
    approximate: true,
    expectedKg: round1(((diet.avgCalories - expenditure) * pair.days) / INTERVAL_RULES.kcalPerKgFat),
    actualKg,
    avgIntake: diet.avgCalories,
    estimatedExpenditure: expenditure,
    bmr,
    bmrSource,
    activityFactor: Math.round(factor * 1000) / 1000,
    reason: null,
  }
}

// ---------------------------------------------------------------------------
// 한 번에 만들기
// ---------------------------------------------------------------------------

function analyzeInterval(goal: CoachingGoal, pair: IntervalPair, measurements: InBodyHistoryEntry[], input: IntervalInput): IntervalAnalysis {
  const { base, end, days } = pair
  const workouts = input.workouts ?? []
  const fat = metricOf(base, end, 'bodyFatMass', COMPARE_RULES.fatNoiseKg)
  const muscle = muscleResultOf(goal, pair, measurements)
  const workout = analyzeWorkout(input.workoutHistory, workouts, base.timestamp, days)
  const workoutDates = new Set(mergeSessions(workouts, input.workoutHistory).map((s) => startOfDay(s.endTime)))
  const diet = analyzeDiet(input.meals, input.target, workoutDates, base.timestamp, days)
  const indicators = GOAL_INDICATORS[goal].map((id): Indicator => ({ id, label: INDICATOR_LABELS[id], status: statusOf(id, fat, muscle, workout.volumeChangePercent) }))
  const patterns = [...findDietPatterns(diet, input.target), ...findWorkoutPatterns(workout)]

  return {
    period: { from: base.timestamp, to: end.timestamp, days, fromId: base.id, toId: end.id },
    results: { fat, muscle },
    indicators,
    diet,
    workout,
    patterns,
    feedback: pickFeedback(goal, muscle.state, indicators, patterns),
    evidence: {
      weight: changeOf(base.weight, end.weight),
      bodyFatPercentage: changeOf(base.bodyFatPercentage, end.bodyFatPercentage),
      expectedFatChange: expectedFatChange(pair, diet, workout, fat.change, input.profile),
      excludedSets: workout.unknownGroupSets,
    },
  }
}

export function buildIntervalReport(input: IntervalInput): IntervalReport {
  const goal = resolveGoal(input.goal, input.dietGoal)
  const measurements = usableMeasurements(input.inBodyHistory)
  const intervals = selectIntervals(input.inBodyHistory).map((pair) => analyzeInterval(goal, pair, measurements, input))
  return {
    goal,
    goalLabel: WORKOUT_GOAL_LABELS[goal],
    series: [...measurements].reverse().map((e) => ({ date: e.timestamp, fatMass: e.bodyFatMass, muscleMass: e.skeletalMuscleMass })),
    intervals,
    reason: intervals.length > 0 ? null : `비교하려면 ${COMPARE_RULES.minGapDays}일 이상 간격을 둔 인바디 측정이 2번 필요해요`,
  }
}
