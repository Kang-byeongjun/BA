import type { NutritionTarget } from '../types'
import { formatPointDates } from './inBodyTrendChart'
import {
  INTERVAL_RULES,
  MEAL_SLOTS,
  shortExerciseName,
  type ExerciseTrend,
  type Feedback,
  type IntervalAnalysis,
  type MetricResult,
  type Pattern,
  type PatternId,
} from './intervalReport'

/**
 * trendView — 리포트 "변화 추이" 화면에 보여줄 문장과 그래프 데이터를 구간 분석 결과로 만든다.
 * 문장은 모두 이 파일의 틀(템플릿)에 숫자를 넣은 것이고 AI를 부르지 않는다. React를 쓰지 않는 순수 함수다.
 * 피드백 카드는 제목이 "그래서 무슨 뜻인지", 설명이 근거 숫자(앱이 계산한 해석용 숫자 포함)다.
 */

export const TREND_COLORS = {
  /** 와인색 = 강조·부족한 곳 */
  accent: '#8e2433',
  /** 체지방 선(초록 = 좋음) */
  fat: '#15803d',
  muscle: '#8e2433',
  gray: '#94a3b8',
  graySoft: '#cbd5e1',
  eveningSoft: '#fdba74',
  snack: '#ea580c',
} as const

export const TITLE_MAX_LENGTH = 30
export const DESCRIPTION_MAX_LENGTH = 40
/** 하체가 상체의 이 % 미만이면 "많이" 모자란다고 말한다(패턴 판정 기준은 INTERVAL_RULES) */
const LOWER_FAR_BELOW_PERCENT = 50
/** 단백질 "끼니당 권장" = 하루 목표 ÷ 이 끼니 수(아침·점심·저녁) */
export const PROTEIN_MEALS_PER_DAY = 3
/** 주별 그래프에 그리는 최대 주 수(구간이 길면 최근 것만) */
export const MAX_WEEK_BARS = 8

const kcal = (v: number) => Math.round(v).toLocaleString('ko-KR')
export const signedNumber = (v: number) => (v > 0 ? `+${v}` : `${v}`)

// ---------------------------------------------------------------------------
// 결과 카드
// ---------------------------------------------------------------------------

/** "10.27 → 11.17 (3주)". 7일로 나누어떨어지지 않으면 일수로 쓴다 */
export function periodLabel({ from, to, days }: IntervalAnalysis['period']): string {
  const [a, b] = formatPointDates([from, to])
  return `${a} → ${b} (${days % 7 === 0 ? `${days / 7}주` : `${days}일`})`
}

/** 그래프 오른쪽 위의 변화량. muted면 회색 글씨 */
export function changeLabel(m: MetricResult): { text: string; muted: boolean } {
  if (m.state === 'unknown' || m.change === null) return { text: '값 없음', muted: true }
  if (m.state === 'pending') return { text: '판단 보류', muted: true }
  if (m.state === 'noise') return { text: '오차 범위', muted: true }
  return { text: `${signedNumber(m.change)}kg`, muted: false }
}

/** 지난 구간에는 근육이 늘었는데 이번에는 주당 증가가 절반도 안 되는가(줄어든 것은 제외) */
function muscleSlowed(now: MetricResult, before: MetricResult | undefined): boolean {
  if (!before || before.state !== 'increase' || before.perWeek === null) return false
  if (now.state === 'pending' || now.change === null || now.change < 0 || now.perWeek === null) return false
  return now.perWeek < before.perWeek / 2
}

/** 한 줄 평가 */
export function headlineOf(latest: IntervalAnalysis, previous?: IntervalAnalysis): string {
  const { fat, muscle } = latest.results
  const m = muscleSlowed(muscle, previous?.results.muscle) ? 'slowed' : muscle.state
  if (fat.state === 'decrease') {
    if (m === 'increase') return '체지방은 빠지고, 근육은 늘었어요'
    if (m === 'slowed') return '체지방은 빠지는데, 근육 증가가 느려졌어요'
    if (m === 'noise') return '체지방은 빠지고, 근육은 지키고 있어요'
    if (m === 'decrease') return '체지방은 빠졌는데, 근육도 줄었어요'
    if (m === 'pending') return '체지방이 빠졌어요. 근육은 아직 판단하기 일러요'
    return '체지방이 빠졌어요'
  }
  if (fat.state === 'increase') {
    if (m === 'increase') return '근육은 늘었는데, 체지방도 늘었어요'
    if (m === 'slowed') return '체지방은 늘고, 근육 증가는 느려졌어요'
    if (m === 'noise') return '체지방이 늘었고, 근육은 그대로예요'
    if (m === 'decrease') return '체지방은 늘고, 근육은 줄었어요'
    return '체지방이 늘었어요'
  }
  if (fat.state === 'noise') {
    if (m === 'increase') return '근육이 늘었고, 체지방은 그대로예요'
    if (m === 'slowed') return '근육 증가가 느려졌고, 체지방은 그대로예요'
    if (m === 'noise') return '체지방과 근육 모두 큰 변화가 없어요'
    if (m === 'decrease') return '근육이 줄었고, 체지방은 그대로예요'
    return '체지방은 큰 변화가 없어요'
  }
  if (m === 'increase') return '근육이 늘었어요'
  if (m === 'slowed') return '근육 증가가 느려졌어요'
  if (m === 'noise') return '근육은 큰 변화가 없어요'
  if (m === 'decrease') return '근육이 줄었어요'
  return '아직 변화를 판단하기 어려워요'
}

// ---------------------------------------------------------------------------
// 피드백 카드
// ---------------------------------------------------------------------------

export type FeedbackChartKind = 'stackedMeals' | 'proteinByMeal' | 'weekdayCalories' | 'bodyPartSets' | 'topSetByWeek' | 'weeklySessions'

/** 패턴별 그래프 */
export const CHART_BY_PATTERN: Record<PatternId, FeedbackChartKind> = {
  weekend_overeating: 'stackedMeals',
  evening_skew: 'stackedMeals',
  protein_low: 'proteinByMeal',
  under_eating: 'weekdayCalories',
  lower_body_imbalance: 'bodyPartSets',
  exercise_stagnation: 'topSetByWeek',
  workout_shortage: 'weeklySessions',
  long_gap: 'weeklySessions',
}

export interface ChartBar {
  /** 아래부터 쌓는 조각들. 기록이 없으면 빈 배열 */
  segments: { value: number; color: string }[]
  /** 막대 위 숫자 */
  valueLabel: string | null
  /** 눌러 보거나 올려 두면 나오는 설명 */
  title: string
}

export interface BarChartModel {
  kind: FeedbackChartKind
  groups: { label: string; bars: ChartBar[] }[]
  target: { value: number; label: string } | null
  legend: { label: string; color: string }[]
  ariaLabel: string
}

export interface FeedbackView {
  id: PatternId
  badge: '식단' | '운동'
  toneLabel: string
  title: string
  description: string
  chart: BarChartModel
  /** 목표를 넘긴 날 저녁·간식에 자주 먹은 음식("치킨 3회"). 주말 과식·저녁 쏠림에만 */
  foods: string[]
}

const bar = (title: string, value: number | null, color: string, valueLabel: string | null): ChartBar =>
  value === null ? { segments: [], valueLabel: null, title: `${title} 기록 없음` } : { segments: [{ value, color }], valueLabel, title: `${title} ${valueLabel}` }

const calorieTarget = (target: NutritionTarget | null) =>
  target && target.calories > 0 ? { value: target.calories, label: `목표 ${kcal(target.calories)}kcal` } : null

/** 요일별 막대는 그 요일에 실제로 기록한 날들의 평균이다. 숫자는 목표를 넘은 막대에만 쓴다 */
function stackedMealsChart(i: IntervalAnalysis, target: NutritionTarget | null): BarChartModel {
  const goal = calorieTarget(target)
  return {
    kind: 'stackedMeals',
    groups: i.diet.byWeekday.map((d) => {
      const s = d.bySlot
      const total = d.total === null ? null : kcal(d.total)
      const over = goal !== null && d.total !== null && d.total > goal.value
      return {
        label: d.label,
        bars: [
          s === null || total === null
            ? bar(`${d.label}요일`, null, TREND_COLORS.gray, null)
            : {
                segments: [
                  { value: s.아침 + s.점심, color: TREND_COLORS.graySoft },
                  { value: s.저녁, color: TREND_COLORS.eveningSoft },
                  { value: s.간식, color: TREND_COLORS.snack },
                ],
                valueLabel: over ? total : null,
                title: `${d.label}요일 평균 ${total}kcal (아침·점심 ${kcal(s.아침 + s.점심)}, 저녁 ${kcal(s.저녁)}, 간식 ${kcal(s.간식)})`,
              },
        ],
      }
    }),
    target: goal,
    legend: [
      { label: '아침·점심', color: TREND_COLORS.graySoft },
      { label: '저녁', color: TREND_COLORS.eveningSoft },
      { label: '간식', color: TREND_COLORS.snack },
    ],
    ariaLabel: '요일별 평균 칼로리(끼니별)',
  }
}

function weekdayCaloriesChart(i: IntervalAnalysis, target: NutritionTarget | null): BarChartModel {
  const low = target ? (target.calories * INTERVAL_RULES.underEatPercent) / 100 : 0
  return {
    kind: 'weekdayCalories',
    groups: i.diet.byWeekday.map((d) => ({
      label: d.label,
      bars: [bar(`${d.label}요일 평균`, d.total, d.total !== null && d.total < low ? TREND_COLORS.accent : TREND_COLORS.gray, d.total === null ? null : kcal(d.total))],
    })),
    target: calorieTarget(target),
    legend: [{ label: `목표의 ${INTERVAL_RULES.underEatPercent}% 미만`, color: TREND_COLORS.accent }],
    ariaLabel: '요일별 평균 칼로리',
  }
}

function proteinChart(i: IntervalAnalysis): BarChartModel {
  const p = i.diet.protein
  const perMeal = p?.target ? Math.round(p.target / PROTEIN_MEALS_PER_DAY) : null
  return {
    kind: 'proteinByMeal',
    groups: MEAL_SLOTS.map((slot) => {
      const grams = p?.bySlot.find((b) => b.slot === slot)?.grams ?? null
      // 간식은 한 끼가 아니라서 부족 표시를 하지 않는다
      const short = slot !== '간식' && grams !== null && perMeal !== null && grams < perMeal
      return { label: slot, bars: [bar(`${slot} 평균`, grams, short ? TREND_COLORS.accent : TREND_COLORS.gray, grams === null ? null : `${grams}g`)] }
    }),
    target: perMeal === null ? null : { value: perMeal, label: `끼니당 권장 ${perMeal}g` },
    legend: [{ label: '권장보다 적은 끼니', color: TREND_COLORS.accent }],
    ariaLabel: '끼니별 평균 단백질',
  }
}

/** 주당 세트(정수) */
const setsPerWeek = (sets: number, periodDays: number) => Math.round((sets / periodDays) * 7)

/** 하체 부족 판정이 보는 두 값(상체 네 부위의 합, 하체)을 그대로 그린다 */
function bodyPartChart(i: IntervalAnalysis): BarChartModel {
  const w = i.workout
  const group = (label: string, sets: number, color: string) => {
    const perWeek = setsPerWeek(sets, w.periodDays)
    return { label, bars: [bar(`${label} 주당`, perWeek, color, `${perWeek}`)] }
  }
  return {
    kind: 'bodyPartSets',
    groups: [group('상체 합계', w.upperSets, TREND_COLORS.gray), group('하체', w.lowerSets, TREND_COLORS.accent)],
    target: null,
    legend: [
      { label: '부족한 부위', color: TREND_COLORS.accent },
      { label: '단위: 주당 세트', color: 'transparent' },
    ],
    ariaLabel: '상체 합계와 하체의 주당 세트',
  }
}

const recordedKg = (e: ExerciseTrend) => e.weeks.flatMap((w) => (w.kg === null ? [] : [w.kg]))

/** 정체 종목과 나란히 보여줄, 무게가 늘어난 대표 종목 */
function risingExercise(i: IntervalAnalysis, exceptId: string): ExerciseTrend | null {
  return (
    i.workout.topExercises.find((e) => {
      const kg = recordedKg(e)
      return e.exerciseId !== exceptId && kg.length > 1 && kg.at(-1)! > kg[0]!
    }) ?? null
  )
}

function topSetChart(i: IntervalAnalysis, exerciseId: string): BarChartModel {
  const main = i.workout.topExercises.find((e) => e.exerciseId === exerciseId)
  const other = risingExercise(i, exerciseId)
  const series = [
    ...(main ? [{ exercise: main, color: TREND_COLORS.accent as string }] : []),
    ...(other ? [{ exercise: other, color: TREND_COLORS.graySoft as string }] : []),
  ]
  const weeks = (main?.weeks ?? []).slice(-MAX_WEEK_BARS)
  return {
    kind: 'topSetByWeek',
    groups: weeks.map((w) => ({
      label: `${w.week + 1}주`,
      bars: series.map(({ exercise, color }) => {
        const kg = exercise.weeks.find((x) => x.week === w.week)?.kg ?? null
        return bar(`${exercise.name} ${w.week + 1}주차`, kg, color, kg === null ? null : `${kg}`)
      }),
    })),
    target: null,
    legend: [...series.map(({ exercise, color }) => ({ label: exercise.name, color })), { label: '단위: 최고 무게 kg', color: 'transparent' }],
    ariaLabel: '대표 종목의 주별 최고 무게',
  }
}

function weeklySessionsChart(i: IntervalAnalysis): BarChartModel {
  const goal = INTERVAL_RULES.minSessionsPerWeek
  return {
    kind: 'weeklySessions',
    groups: i.workout.weeklyVolume.slice(-MAX_WEEK_BARS).map((w) => {
      // 7일이 안 되는 마지막 칸은 모자라도 강조하지 않는다
      const short = w.days === 7 && w.sessions < goal
      const label = w.days === 7 ? `${w.week + 1}주` : `${w.week + 1}주(${w.days}일)`
      return { label, bars: [bar(`${w.week + 1}주차`, w.sessions, short ? TREND_COLORS.accent : TREND_COLORS.gray, `${w.sessions}회`)] }
    }),
    target: { value: goal, label: `목표 주 ${goal}회` },
    legend: [{ label: '목표보다 적은 주', color: TREND_COLORS.accent }],
    ariaLabel: '주별 운동 횟수',
  }
}

/** 앞에서부터 길이 제한에 맞는 첫 문장. 마지막 후보는 항상 짧은 문장을 넣는다 */
const fit = (max: number, candidates: string[]) => candidates.find((t) => t.length <= max) ?? candidates.at(-1)!

/** 마지막 글자의 받침에 따라 조사를 붙인다("스쿼트가", "풀업이") */
function withParticle(word: string, afterBatchim: string, otherwise: string): string {
  const code = word.charCodeAt(word.length - 1)
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
  return `${word}${hasBatchim ? afterBatchim : otherwise}`
}

type Text = { title: string; description: string }

/** 주말 과식: 목표를 넘긴 양과 평일에 아낀 양을 비교해, 말할 수 있는 만큼만 말한다 */
function weekendText(d: IntervalAnalysis['diet'], targetKcal: number | null): Text {
  const weekend = d.weekendAvg ?? 0
  const weekday = d.weekdayAvg ?? 0
  const overDay = targetKcal === null ? 0 : weekend - targetKcal
  const averages = `하루 평균 주말 ${kcal(weekend)} · 평일 ${kcal(weekday)}kcal`
  // 목표가 없거나 주말도 목표 안
  if (targetKcal === null || overDay <= 0) return { title: '주말에 식사량이 부쩍 늘어요', description: averages }
  const overWeek = overDay * 2
  const savedWeek = (targetKcal - weekday) * 5
  // 평일에도 아끼지 않았으면 "되돌린다"고 말할 수 없다
  if (savedWeek <= 0) return { title: '주말에 목표를 넘기는 폭이 커요', description: `주말 하루 평균이 목표보다 ${kcal(overDay)}kcal 많아요` }
  return {
    title: overWeek >= savedWeek ? '주말 이틀이 평일 노력을 되돌려요' : '주말이 평일에 아낀 양을 일부 되돌려요',
    description: fit(DESCRIPTION_MAX_LENGTH, [`목표보다 주말 하루 ${kcal(overDay)}kcal, 일주일 ${kcal(overWeek)}kcal 초과`, averages]),
  }
}

function textOf(i: IntervalAnalysis, f: Feedback, target: NutritionTarget | null): Text {
  const { diet: d, workout: w } = i
  const p = f.pattern
  const value = p.headline.value
  const targetKcal = target && target.calories > 0 ? target.calories : null
  switch (p.id) {
    case 'weekend_overeating':
      return weekendText(d, targetKcal)
    case 'evening_skew': {
      // 목표 비중보다 많이 먹은 칼로리(비중이 반올림 값이라 10kcal 단위의 "약")
      const excess = Math.round(((d.avgCalories ?? 0) * (value - p.todo.target)) / 1000) * 10
      return {
        title: '하루 식사가 저녁·간식에 몰려 있어요',
        description: fit(DESCRIPTION_MAX_LENGTH, [
          ...(excess > 0 ? [`저녁·간식 ${value}%, 목표 비중보다 하루 약 ${kcal(excess)}kcal 많아요`] : []),
          `하루 칼로리의 ${value}%가 저녁·간식이에요`,
        ]),
      }
    }
    case 'protein_low': {
      const missing = Math.round(p.todo.target - p.todo.current)
      return {
        title: '끼니마다 단백질을 더하면 목표예요',
        description: `하루 ${missing}g 모자라요. 끼니당 ${Math.round(missing / PROTEIN_MEALS_PER_DAY)}g씩이에요`,
      }
    }
    case 'under_eating': {
      const gap = targetKcal === null || d.avgCalories === null ? 0 : targetKcal - d.avgCalories
      return {
        title: '적게 먹은 날이 절반 이상이에요',
        description: gap > 0 ? `하루 평균이 목표보다 ${kcal(gap)}kcal 적어요` : `${d.loggedDays}일 중 ${value}일은 목표의 ${INTERVAL_RULES.underEatPercent}%도 안 돼요`,
      }
    }
    case 'workout_shortage': {
      const goal = p.todo.target
      const missing = Math.round((goal * i.period.days) / 7) - w.sessions
      return {
        title: '운동하는 날이 드문드문해요',
        description: missing > 0 ? `주 ${goal}회 목표보다 이번 구간에 ${missing}회 적어요` : `주당 ${value}회로, 목표 주 ${goal}회에 못 미쳐요`,
      }
    }
    case 'long_gap':
      return { title: '긴 휴식 기간이 있었어요', description: `${value}일 연속 쉬었어요. 권장은 ${p.todo.target}일 이하예요` }
    case 'lower_body_imbalance':
      return {
        title: value < LOWER_FAR_BELOW_PERCENT ? '상체에 비해 하체가 많이 쉬고 있어요' : '상체에 비해 하체가 적은 편이에요',
        description: `하체 주당 ${setsPerWeek(w.lowerSets, w.periodDays)}세트, 상체의 ${value}%예요`,
      }
    case 'exercise_stagnation': {
      const id = p.exerciseId ?? ''
      const name = w.topExercises.find((e) => e.exerciseId === id)?.name ?? '대표 종목'
      const kg = p.todo.current
      const other = risingExercise(i, id)
      const range = other ? recordedKg(other) : []
      const gain = other ? Math.round((range.at(-1)! - range[0]!) * 10) / 10 : 0
      return {
        title: fit(
          TITLE_MAX_LENGTH,
          [name, shortExerciseName(name), '대표 종목'].map((n) => `${withParticle(n, '이', '가')} 같은 자리에 머물러 있어요`),
        ),
        description: fit(DESCRIPTION_MAX_LENGTH, [
          ...(other ? [`${kg}kg ${value}주째 그대로, ${withParticle(shortExerciseName(other.name), '은', '는')} ${gain}kg 늘었어요`] : []),
          `최고 무게 ${kg}kg이 ${value}주째 그대로예요`,
        ]),
      }
    }
  }
}

export function buildFeedbackView(i: IntervalAnalysis, f: Feedback, target: NutritionTarget | null): FeedbackView {
  const kind = CHART_BY_PATTERN[f.pattern.id]
  const charts: Record<FeedbackChartKind, () => BarChartModel> = {
    stackedMeals: () => stackedMealsChart(i, target),
    proteinByMeal: () => proteinChart(i),
    weekdayCalories: () => weekdayCaloriesChart(i, target),
    bodyPartSets: () => bodyPartChart(i),
    topSetByWeek: () => topSetChart(i, f.pattern.exerciseId ?? ''),
    weeklySessions: () => weeklySessionsChart(i),
  }
  return {
    id: f.pattern.id,
    badge: f.domain === 'diet' ? '식단' : '운동',
    toneLabel: f.tone === 'improve' ? '더 빨라질 수 있어요' : '보완할 점',
    ...textOf(i, f, target),
    chart: charts[kind](),
    foods: kind === 'stackedMeals' ? i.diet.topEveningFoodsOnOverDays.map((x) => `${x.name} ${x.count}회`) : [],
  }
}

function patternLine(i: IntervalAnalysis, p: Pattern): string {
  const { diet: d, workout: w } = i
  const value = p.headline.value
  switch (p.id) {
    case 'weekend_overeating':
      return `주말 하루 ${kcal(d.weekendAvg ?? 0)}kcal · 평일보다 ${value}% 많음`
    case 'evening_skew':
      return `저녁·간식이 칼로리의 ${value}%`
    case 'protein_low':
      return `단백질 하루 ${p.todo.current}g · 목표의 ${value}%`
    case 'under_eating':
      return `목표의 ${INTERVAL_RULES.underEatPercent}% 미만인 날 ${value}일 · 기록 ${d.loggedDays}일`
    case 'workout_shortage':
      return `운동 주 ${value}회 · 목표 주 ${p.todo.target}회`
    case 'long_gap':
      return `가장 긴 휴식 ${value}일 연속`
    case 'lower_body_imbalance':
      return `하체 주 ${setsPerWeek(w.lowerSets, w.periodDays)}세트 · 상체의 ${value}%`
    case 'exercise_stagnation': {
      const name = w.topExercises.find((e) => e.exerciseId === p.exerciseId)?.name ?? '대표 종목'
      return `${shortExerciseName(name)} ${p.todo.current}kg · ${value}주째 그대로`
    }
  }
}

/** 찾았지만 피드백 카드로 뽑히지 않은 패턴("그 밖에 보이는 점")을 한 줄씩 */
export function otherPatternLines(i: IntervalAnalysis): { key: string; text: string }[] {
  const picked = new Set(i.feedback.map((f) => f.pattern))
  return i.patterns
    .filter((p) => !picked.has(p))
    .map((p) => ({ key: `${p.id}:${p.exerciseId ?? ''}`, text: patternLine(i, p) }))
}

/** 지난 구간에 피드백이 하나도 없는 이유 한 줄 */
export function noFeedbackReason(i: IntervalAnalysis): string {
  if (!i.indicators.some((x) => x.status === 'good' || x.status === 'poor')) return '결과를 판단하기 일러 피드백이 없어요'
  const short = [!i.diet.sufficient && '식단', !i.workout.sufficient && '운동'].filter(Boolean)
  return short.length > 0 ? `${short.join('·')} 기록이 부족해 피드백이 없어요` : '눈에 띄는 보완점이 없었어요'
}

/** 기록이 모자라 분석하지 못할 때 피드백 자리에 보여줄 한 줄(없으면 null) */
export function recordNotice(i: IntervalAnalysis): string | null {
  if (!i.diet.sufficient) return '식단 기록이 더 쌓이면 알려 드릴게요'
  if (!i.workout.sufficient) return '운동 기록이 더 쌓이면 알려 드릴게요'
  return null
}
