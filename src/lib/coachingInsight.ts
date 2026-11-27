import type { CoachingGoal, Gap, GapId, InsightRequest, ProcessFacts, ResultFacts, Verdict } from '../../shared/coaching'
import { WORKOUT_GOAL_LABELS } from '../types'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../types'
import { getDayStatus } from './calendar'
import {
  calendarDays,
  changeOf,
  COMPARE_RULES,
  muscleResultOf,
  selectIntervals,
  stateOf,
  usableMeasurements,
  type MetricState,
} from './inbodyCompare'
import { sumMeals } from './nutrition'
import { isSameDay } from './time'
import { countOnTrackDays } from './trend'
import type { WorkoutSessionRecord } from './workoutHistory'

/**
 * "내 운동, 잘하고 있을까요?" 진단. 판정·숫자·보완할 점 선택은 모두 이 파일의 규칙(코드)이 정하고,
 * AI는 보완할 점 문장만 쓴다. 기준값은 아래 상수 한 곳에서 바꾼다.
 */

const DAY_MS = 86_400_000
export const DIET_WINDOW_DAYS = 7
export const WORKOUT_WINDOW_DAYS = 21

/** 판정 기준 */
export const RULES = {
  /** 체지방은 줄었는데 골격근도 이만큼(kg) 이상 줄면 근손실 주의 */
  muscleLossKg: 0.5,
  /**
   * 체중·골격근·체지방이 모두 이 안이면 "변화 없음". 골격근·체지방은 이 값 이상 움직여야 "늘었다/줄었다"이며,
   * 구간 분석과 함께 쓰는 값이라 inbodyCompare의 COMPARE_RULES에서만 바꾼다
   */
  flatWeightKg: 0.5,
  flatMuscleKg: COMPARE_RULES.muscleNoiseKg,
  flatFatKg: COMPARE_RULES.fatNoiseKg,
  /** 실천 기준(셋 중 둘 이상 넘으면 "실천 높음", 하나 이하면 "낮음") */
  highSessions: 6, // 3주 6회 = 주 2회
  highOnTrackDays: 4, // 7일 중 4일
  highProteinPercent: 80,
  /** 기록 부족 기준 */
  minLoggedDays: 3,
  minSessions: 2,
  /** 보완할 점 계산용 "목표" */
  goalOnTrackDays: 5,
  goalSessions: 9, // 3주 9회 = 주 3회
  goalProteinPercent: 100,
  /** 이보다 덜 벗어난 항목은 보완할 점으로 고르지 않는다(%) */
  minShortfall: 10,
  maxGaps: 2,
} as const

export const VERDICT_LABELS: Record<Verdict, string> = {
  on_track: '순조로워요',
  muscle_loss: '근손실 주의',
  check_method: '방법 점검 필요',
  need_consistency: '꾸준함이 필요해요',
  need_data: '기록이 더 필요해요',
}

const round1 = (v: number) => Math.round(v * 10) / 10
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`)

// ---------------------------------------------------------------------------
// 숫자 모으기
// ---------------------------------------------------------------------------

/** 카드가 쓰는 결과. 골격근은 비교한 측정이 체중·체지방과 다를 수 있어 따로 적는다 */
export interface CardResultFacts extends ResultFacts {
  /** 골격근 판단 상태. pending = 근육 목표인데 28일 이상 앞선 측정이 없음 */
  muscleState?: MetricState
  /** 골격근을 비교한 시작 측정 시각 */
  muscleFromTimestamp?: number
  /** 지금까지 골격근을 잰 가장 긴 간격(일) — 판단 보류 안내에 쓴다 */
  muscleSpanDays?: number
}

/**
 * 인바디 변화. 비교할 측정은 구간 분석과 같은 규칙(inbodyCompare)으로 고른다:
 * 가장 최근 측정과 14일 이상 앞선 가장 가까운 측정. 근육 목표의 골격근만 28일 이상 앞선 가장 가까운 측정.
 * 비교할 이전 측정이 없으면 measurements: 1, 측정이 없으면 null
 */
export function buildResultFacts(history: InBodyHistoryEntry[], goal: CoachingGoal = 'body_shape'): CardResultFacts | null {
  if (history.length === 0) return null
  const pair = selectIntervals(history)[0]
  if (!pair) return { measurements: 1, periodDays: 0, weightDelta: null, muscleDelta: null, fatDelta: null }
  const measurements = usableMeasurements(history)
  const muscle = muscleResultOf(goal, pair, measurements)
  const oldest = measurements.filter((e) => e.skeletalMuscleMass !== null).at(-1)
  return {
    measurements: 2,
    fromTimestamp: pair.base.timestamp,
    toTimestamp: pair.end.timestamp,
    periodDays: pair.days,
    weightDelta: changeOf(pair.base.weight, pair.end.weight).change,
    muscleDelta: muscle.change,
    fatDelta: changeOf(pair.base.bodyFatMass, pair.end.bodyFatMass).change,
    muscleState: muscle.state,
    muscleFromTimestamp: muscle.from,
    muscleSpanDays: oldest ? calendarDays(oldest.timestamp, pair.end.timestamp) : 0,
  }
}

/** 식단(어제까지 최근 7일)과 운동(최근 3주). 오늘은 끝나지 않은 날이라 식단에서 뺀다. */
export function buildProcessFacts(
  meals: Meal[],
  target: NutritionTarget | null,
  workouts: WorkoutSessionRecord[],
  now: number,
): ProcessFacts {
  const days = Array.from({ length: DIET_WINDOW_DAYS }, (_, i) => now - (i + 1) * DAY_MS)
  const statuses = target ? days.map((ts) => getDayStatus(meals, target, ts)) : []
  const logged = target ? days.filter((_, i) => statuses[i] !== 'none') : []
  const totals = logged.map((ts) => sumMeals(meals.filter((m) => isSameDay(m.timestamp, ts))))
  const avgProtein = totals.length > 0 ? Math.round(avg(totals.map((t) => t.protein))) : null

  const from = now - WORKOUT_WINDOW_DAYS * DAY_MS
  const recent = workouts.filter((r) => r.date >= from && r.date <= now).sort((a, b) => a.date - b.date)
  const mid = Math.floor(recent.length / 2)
  const firstAvg = mid > 0 ? avg(recent.slice(0, mid).map((r) => r.totalVolume)) : 0
  const lastAvg = mid > 0 ? avg(recent.slice(recent.length - mid).map((r) => r.totalVolume)) : 0

  return {
    dietLoggedDays: logged.length,
    dietOnTrackDays: countOnTrackDays(statuses),
    proteinPercent: avgProtein !== null && target && target.protein > 0 ? Math.round((avgProtein / target.protein) * 100) : null,
    avgProtein,
    targetProtein: target?.protein ?? 0,
    workoutSessions: recent.length,
    volumeChangePercent: firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 100) : null,
  }
}

/** 카드의 겹링용 달성률(0~100). 단백질·운동은 100% 상한, 종합은 세 값의 평균 */
export interface RingRates {
  diet: number
  protein: number
  workout: number
  overall: number
  /** 최근 3주 평균 주당 운동 횟수(반올림) */
  sessionsPerWeek: number
}

export function ringRates(p: ProcessFacts): RingRates {
  const cap = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
  const diet = cap((p.dietOnTrackDays / DIET_WINDOW_DAYS) * 100)
  const protein = cap(p.proteinPercent ?? 0)
  const workout = cap((p.workoutSessions / RULES.goalSessions) * 100)
  return {
    diet,
    protein,
    workout,
    overall: Math.round((diet + protein + workout) / 3),
    sessionsPerWeek: Math.round(p.workoutSessions / (WORKOUT_WINDOW_DAYS / 7)),
  }
}

// ---------------------------------------------------------------------------
// 판정(목표별 기준)
// ---------------------------------------------------------------------------

export type ResultState = 'good' | 'flat' | 'wrong'

/** 골격근 상태. 따로 계산해 둔 것이 없으면 변화량으로 판단한다(기준은 inbodyCompare) */
const muscleStateOf = (r: CardResultFacts): MetricState => r.muscleState ?? stateOf(r.muscleDelta, RULES.flatMuscleKg)

/** 체지방이 "줄었다"고 볼 만큼 움직였는지(기준은 inbodyCompare). 측정값이 없으면 아니다 */
const fatDecreased = (fatDelta: number | null) => stateOf(fatDelta, RULES.flatFatKg) === 'decrease'

/** 목표별로 "결과가 목표 방향인가"를 본다. 측정값이 없는(null) 항목은 변화 없음(0)으로 본다. */
const GOAL_RESULT: Record<CoachingGoal, (d: { fat: number; muscle: MetricState }, p: ProcessFacts) => boolean> = {
  // 체지방 감량: 체지방이 줄었다
  fat_loss: (d) => fatDecreased(d.fat),
  // 근육 증가: 골격근이 늘었다
  muscle_gain: (d) => d.muscle === 'increase',
  // 체형 개선: 체지방은 줄고 골격근은 줄지 않았다(오차 범위는 유지)
  body_shape: (d) => fatDecreased(d.fat) && d.muscle !== 'decrease',
  // 근력 향상: 골격근이 줄지 않고, 운동 볼륨도 줄지 않았다
  strength: (d, p) => d.muscle !== 'decrease' && (p.volumeChangePercent === null || p.volumeChangePercent >= 0),
}

export function resultState(goal: CoachingGoal, r: CardResultFacts, p: ProcessFacts): ResultState {
  const d = { weight: r.weightDelta ?? 0, muscle: r.muscleDelta ?? 0, fat: r.fatDelta ?? 0 }
  if (GOAL_RESULT[goal]({ fat: d.fat, muscle: muscleStateOf(r) }, p)) return 'good'
  const flat = Math.abs(d.weight) < RULES.flatWeightKg && Math.abs(d.muscle) < RULES.flatMuscleKg && Math.abs(d.fat) < RULES.flatFatKg
  return flat ? 'flat' : 'wrong'
}

/** 실천 기준 셋(운동 횟수·식단 달성일·단백질) 중 넘긴 개수 */
export function practiceScore(p: ProcessFacts): number {
  return (
    Number(p.workoutSessions >= RULES.highSessions) +
    Number(p.dietOnTrackDays >= RULES.highOnTrackDays) +
    Number((p.proteinPercent ?? 0) >= RULES.highProteinPercent)
  )
}

export function decideVerdict(goal: CoachingGoal, r: CardResultFacts | null, p: ProcessFacts): Verdict {
  // 1) 기록 부족: 인바디가 1회뿐이거나 식단·운동 기록이 모자라면 판단하지 않는다
  if (!r || r.measurements < 2 || p.dietLoggedDays < RULES.minLoggedDays || p.workoutSessions < RULES.minSessions) return 'need_data'
  // 2) 근손실: 체지방은 줄었는데 골격근도 줄었다(목표와 무관하게 먼저 알린다)
  const pending = muscleStateOf(r) === 'pending'
  if (!pending && fatDecreased(r.fatDelta) &&(r.muscleDelta ?? 0) <= -RULES.muscleLossKg) return 'muscle_loss'
  const high = practiceScore(p) >= 2
  // 3) 실천이 낮으면 꾸준함이 먼저
  if (!high) return 'need_consistency'
  // 4) 근육 목표인데 골격근을 비교할 28일 이상 앞선 측정이 없으면 판단 보류
  if (pending) return 'need_data'
  // 5) 실천은 높음: 결과가 목표 방향이면 순조, 아니면(변화 없음·반대 방향) 방법 점검
  return resultState(goal, r, p) === 'good' ? 'on_track' : 'check_method'
}

// ---------------------------------------------------------------------------
// 보완할 점(코드가 고른다)
// ---------------------------------------------------------------------------

interface Candidate {
  gap: Gap
  /** 목표에서 벗어난 정도(0~100). 클수록 먼저 */
  shortfall: number
}

export function pickGaps(goal: CoachingGoal, verdict: Verdict, r: CardResultFacts | null, p: ProcessFacts): Gap[] {
  const c: Candidate[] = []
  const add = (id: GapId, label: string, current: number, target: number, unit: string, shortfall: number) => {
    if (shortfall >= RULES.minShortfall) c.push({ gap: { id, label, current, target, unit }, shortfall: Math.min(100, Math.round(shortfall)) })
  }

  if (!r || r.measurements < 2) add('inbody', '인바디 측정', r?.measurements ?? 0, 2, '회', 100)
  else if (verdict === 'need_data' && muscleStateOf(r) === 'pending') {
    add('inbody', '골격근 비교 간격', r.muscleSpanDays ?? r.periodDays, COMPARE_RULES.muscleGoalMinDays, '일', 100)
  }
  if (verdict === 'muscle_loss' && r?.muscleDelta != null) add('muscle', '골격근 변화', r.muscleDelta, 0, 'kg', 100)
  if (verdict === 'check_method' && r) {
    const bodyFat = goal === 'fat_loss' || goal === 'body_shape'
    add('result', bodyFat ? '체지방 변화' : '골격근 변화', (bodyFat ? r.fatDelta : r.muscleDelta) ?? 0, bodyFat ? -RULES.flatFatKg : RULES.flatMuscleKg, 'kg', 80)
  }
  if (p.dietLoggedDays < RULES.minLoggedDays) add('record', '식단 기록일', p.dietLoggedDays, DIET_WINDOW_DAYS, '일', (1 - p.dietLoggedDays / RULES.minLoggedDays) * 100)
  else add('diet', '식단 목표 달성일', p.dietOnTrackDays, RULES.goalOnTrackDays, '일', (1 - p.dietOnTrackDays / RULES.goalOnTrackDays) * 100)
  if (p.proteinPercent !== null) add('protein', '단백질 달성률', p.proteinPercent, RULES.goalProteinPercent, '%', RULES.goalProteinPercent - p.proteinPercent)
  add('workout', '운동 횟수', p.workoutSessions, RULES.goalSessions, '회', (1 - p.workoutSessions / RULES.goalSessions) * 100)

  return c.sort((a, b) => b.shortfall - a.shortfall).slice(0, RULES.maxGaps).map((x) => x.gap)
}

// ---------------------------------------------------------------------------
// 보완할 점 문장: AI 문장 검사 + 코드가 만든 예시 문장
// ---------------------------------------------------------------------------

export const MAX_LINE_LENGTH = 35 // "25자 안팎"에서 한참 넘으면 버린다
const PRAISE = /(잘하|잘했|훌륭|멋지|멋져|대단|칭찬|최고|굿|좋아요|좋은 흐름|순조|성공|해냈|내일도|화이팅|파이팅|응원|축하)/

const proteinMissingGrams = (p: ProcessFacts) => Math.max(5, p.avgProtein === null ? 0 : p.targetProtein - p.avgProtein)

/** 문장에 들어 있어야 하는 "목표와의 차이" 숫자: 목표값 또는 부족한 양(단백질은 부족한 g도 인정) */
export function gapNumbers(gap: Gap, p?: ProcessFacts): number[] {
  const nums = [Math.abs(gap.target), round1(Math.abs(gap.target - gap.current))]
  if (gap.id === 'protein' && p) nums.push(proteinMissingGrams(p))
  return nums
}

/**
 * AI가 쓴 문장이 규칙(길이·숫자 포함·칭찬 금지)을 지키는지.
 * gap을 주면 "목표와의 차이" 숫자(목표값 또는 부족한 양)도 들어 있어야 통과한다.
 */
export function isValidLine(line: unknown, gap?: Gap, p?: ProcessFacts): line is string {
  if (typeof line !== 'string') return false
  const t = line.trim()
  if (!(t.length > 0 && t.length <= MAX_LINE_LENGTH && /\d/.test(t) && !PRAISE.test(t))) return false
  if (!gap) return true
  const allowed = gapNumbers(gap, p)
  const found = (t.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => round1(Number(n)))
  return found.some((n) => allowed.some((a) => Math.abs(a - n) < 0.05))
}

export function exampleLine(gap: Gap, p: ProcessFacts): string {
  const n = gap.current
  switch (gap.id) {
    case 'muscle':
      return `골격근이 ${Math.abs(n)}kg 줄었어요. 단백질·근력운동을 늘려요`
    case 'result':
      return gap.label === '체지방 변화'
        ? `체지방 ${signed(n)}kg, 목표 ${signed(gap.target)}kg예요. 식단을 점검해요`
        : `골격근 ${signed(n)}kg, 목표 ${signed(gap.target)}kg예요. 운동을 올려요`
    case 'protein': {
      const missing = proteinMissingGrams(p)
      return `단백질이 목표의 ${n}%예요. 오늘 +${missing}g 채워요`
    }
    case 'diet':
      return `식단 목표 달성이 ${n}일이에요. ${Math.max(1, gap.target - n)}일만 더 맞춰 봐요`
    case 'record':
      return `식단 기록이 7일 중 ${n}일이에요. ${Math.max(1, gap.target - n)}일 더 기록해요`
    case 'workout':
      return `최근 3주 운동이 ${n}회예요. ${Math.max(1, gap.target - n)}회만 더 해봐요`
    case 'inbody':
      return gap.unit === '일' ? `골격근은 ${gap.target}일 간격으로 비교해요. 지금 ${n}일` : `인바디 측정이 ${n}회예요. 2주 뒤 다시 재요`
  }
}

/** 항목마다 AI 문장이 규칙을 지키면 쓰고, 아니면(없음·길이 초과·숫자 없음·칭찬) 예시 문장으로 대체한다 */
export function resolveLines(gaps: Gap[], p: ProcessFacts, aiLines: readonly unknown[] | null): string[] {
  return gaps.map((g, i) => {
    const ai = aiLines?.[i]
    return isValidLine(ai, g, p) ?ai.trim() : exampleLine(g, p)
  })
}

// ---------------------------------------------------------------------------
// 한 번에 만들기
// ---------------------------------------------------------------------------

export interface Diagnosis {
  goal: CoachingGoal
  goalLabel: string
  verdict: Verdict
  result: CardResultFacts | null
  process: ProcessFacts
  gaps: Gap[]
  /** AI에게 보내는 본문(숫자뿐). 캐시 키로도 쓴다 */
  request: InsightRequest
}

export interface DiagnosisInput {
  /** 운동 목표(마이 탭 "나의 목표"와 연동된 값). 없으면 체형 개선으로 본다 */
  goal: CoachingGoal | null | undefined
  history: InBodyHistoryEntry[]
  meals: Meal[]
  target: NutritionTarget | null
  workouts: WorkoutSessionRecord[]
  now?: number
}

export function buildDiagnosis({ goal, history, meals, target, workouts, now = Date.now() }: DiagnosisInput): Diagnosis {
  const g: CoachingGoal = goal ?? 'body_shape'
  const result = buildResultFacts(history, g)
  const process = buildProcessFacts(meals, target, workouts, now)
  const verdict = decideVerdict(g, result, process)
  const gaps = pickGaps(g, verdict, result, process)
  const goalLabel = WORKOUT_GOAL_LABELS[g]
  return { goal: g, goalLabel, verdict, result, process, gaps, request: { goalLabel, verdict, gaps } }
}

/** 인바디·식단·운동 어디에도 기록이 없는지 */
export function isEmptyDiagnosis(d: Diagnosis): boolean {
  return !d.result && d.process.dietLoggedDays === 0 && d.process.workoutSessions === 0
}
