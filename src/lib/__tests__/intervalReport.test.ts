// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { InBodyHistoryEntry, Meal, MealSlot, NutritionTarget, Workout } from '../../types'
import { estimateBasalMetabolicRate } from '../bmr'
import { buildSeedData } from '../demoSeed'
import {
  activityFactorOf,
  analyzeDiet,
  analyzeWorkout,
  buildIntervalReport,
  findDietPatterns,
  findWorkoutPatterns,
  groupOfExercise,
  pickFeedback,
  resolveGoal,
  selectIntervals,
  strengthOf,
  type Indicator,
  type IndicatorId,
  type IntervalInput,
  type Pattern,
  type PatternId,
} from '../intervalReport'
import type { RecordedExercise, WorkoutSessionRecord } from '../workoutHistory'

// 2026-11-02는 월요일
const MON = new Date(2026, 10, 2).getTime()
/** 월요일부터 d일 뒤의 h시 */
const day = (d: number, h = 12) => new Date(2026, 10, 2 + d, h).getTime()
const TARGET: NutritionTarget = { calories: 2000, protein: 100, carbohydrates: 200, fat: 60, fiber: 28 }

const inbody = (id: string, timestamp: number, fat: number | null = 30, muscle: number | null = 35): InBodyHistoryEntry => ({
  id,
  timestamp,
  source: 'scan',
  weight: 80,
  skeletalMuscleMass: muscle,
  bodyFatMass: fat,
  bodyFatPercentage: 30,
  bodyWater: null,
  proteinMass: null,
  mineralMass: null,
  basalMetabolicRate: 1700,
  bodyType: null,
  standardRanges: null,
})

let mealSeq = 0
const meal = (d: number, calories: number, o: { slot?: MealSlot; hour?: number; protein?: number; name?: string } = {}): Meal => {
  const name = o.name ?? '밥'
  const protein = o.protein ?? 30
  return {
    id: `m${mealSeq++}`,
    timestamp: day(d, o.hour ?? 12),
    slot: o.slot ?? '점심',
    title: name,
    image: null,
    foods: [{ name, amount: '100g', calories, protein, carbohydrates: 0, fat: 0, fiber: 0 }],
    calories,
    protein,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    hasLowConfidencePortions: false,
  }
}

const ex = (id: string, group: RecordedExercise['group'], kg: number, reps = 10, sets = 3): RecordedExercise => ({
  exerciseId: id,
  name: id,
  group,
  sets: Array.from({ length: sets }, () => ({ kg, reps })),
  volume: kg * reps * sets,
})
const session = (d: number, ...exercises: RecordedExercise[]): WorkoutSessionRecord => ({
  id: `w${d}-${mealSeq++}`,
  date: day(d, 19),
  startedAt: day(d, 18),
  day: 1,
  label: '테스트',
  exercises,
  totalVolume: exercises.reduce((s, e) => s + e.volume, 0),
  durationSeconds: 3600,
  completedSets: exercises.reduce((n, e) => n + e.sets.length, 0),
})

const diet = (meals: Meal[], days = 14, target: NutritionTarget | null = TARGET, workoutDates = new Set<number>()) => analyzeDiet(meals, target, workoutDates, MON, days)
const workout = (records: WorkoutSessionRecord[], days = 21, others: Workout[] = []) => analyzeWorkout(records, others, MON, days)
const ids = (patterns: Pattern[]) => patterns.map((p) => p.id)
/** 14일 동안 매일 같은 식단 */
const everyDay = (make: (d: number) => Meal[], days = 14) => Array.from({ length: days }, (_, d) => make(d)).flat()

const input = (o: Partial<IntervalInput> = {}): IntervalInput => ({
  goal: 'fat_loss',
  inBodyHistory: [inbody('a', day(0)), inbody('b', day(21))],
  meals: [],
  target: TARGET,
  workoutHistory: [],
  ...o,
})

beforeEach(() => localStorage.clear())

describe('구간 선택', () => {
  it('가장 최근 측정과, 14일 이상 앞선 것 중 가장 가까운 것을 짝짓고 지난 구간도 이어서 만든다', () => {
    const pairs = selectIntervals([inbody('d', day(40)), inbody('a', day(0)), inbody('b', day(14)), inbody('c', day(30))])
    expect(pairs.map((p) => `${p.base.id}→${p.end.id}:${p.days}`)).toEqual(['b→d:26', 'a→b:14'])
  })
  it('정확히 14일은 되고 13일은 안 된다. 측정 시각은 상관없이 날짜로 센다', () => {
    expect(selectIntervals([inbody('a', day(0, 23)), inbody('b', day(14, 7))])[0]!.days).toBe(14)
    expect(selectIntervals([inbody('a', day(0, 1)), inbody('b', day(13, 23))])).toEqual([])
  })
  it('체지방·골격근이 모두 없는 측정은 건너뛴다', () => {
    const pairs = selectIntervals([inbody('a', day(0)), inbody('empty', day(7), null, null), inbody('b', day(21))])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.base.id).toBe('a')
  })
  it('비교할 측정이 없으면 구간 없이 이유를 알려주고 시계열은 돌려준다', () => {
    const r = buildIntervalReport(input({ inBodyHistory: [inbody('a', day(0), 31, 36)] }))
    expect(r.intervals).toEqual([])
    expect(r.reason).toContain('14일')
    expect(r.series).toEqual([{ date: day(0), fatMass: 31, muscleMass: 36 }])
  })
  it('시계열은 측정 전체를 오래된 것부터', () => {
    const r = buildIntervalReport(input({ inBodyHistory: [inbody('b', day(21), 29, 36), inbody('x', day(10), 29.5, 35.5), inbody('a', day(0), 30, 35)] }))
    expect(r.series.map((p) => p.fatMass)).toEqual([30, 29.5, 29])
  })
  it('기간의 기록은 시작 측정일 포함, 끝 측정일 제외', () => {
    const r = buildIntervalReport(
      input({
        meals: [meal(-1, 100), meal(0, 200, { hour: 0 }), meal(20, 300, { hour: 23 }), meal(21, 900, { hour: 0 })],
        workoutHistory: [session(-1, ex('A', 'CHEST', 10)), session(0, ex('A', 'CHEST', 10)), session(20, ex('A', 'CHEST', 10)), session(21, ex('A', 'CHEST', 10))],
      }),
    )
    const i = r.intervals[0]!
    expect(i.diet.loggedDays).toBe(2)
    expect(i.diet.avgCalories).toBe(250)
    expect(i.workout.sessions).toBe(2)
  })
})

describe('결과 지표', () => {
  const results = (fat: number, muscle: number, o: Partial<IntervalInput> = {}, days = 28) =>
    buildIntervalReport(input({ inBodyHistory: [inbody('a', day(0), 30, 35), inbody('b', day(days), 30 + fat, 35 + muscle)], ...o })).intervals[0]!

  it('체지방 0.5kg·골격근 0.3kg 미만은 오차 범위, 딱 그 값은 변화', () => {
    expect(results(-0.4, 0.2).results).toMatchObject({ fat: { state: 'noise' }, muscle: { state: 'noise' } })
    expect(results(-0.5, 0.3).results).toMatchObject({ fat: { state: 'decrease' }, muscle: { state: 'increase' } })
    expect(results(0.5, -0.3).results).toMatchObject({ fat: { state: 'increase' }, muscle: { state: 'decrease' } })
  })
  it('주당 속도', () => {
    expect(results(-2, 0.4).results.fat).toMatchObject({ change: -2, perWeek: -0.5 })
  })
  it('근육 목표는 28일 미만이면 골격근 판단 보류(변화 숫자는 보여준다)', () => {
    for (const goal of ['muscle_gain', 'strength'] as const) {
      expect(results(0, 1, { goal }, 27).results.muscle).toMatchObject({ state: 'pending', change: 1 })
      expect(results(0, 1, { goal }, 28).results.muscle.state).toBe('increase')
    }
    expect(results(0, 1, { goal: 'body_shape' }, 21).results.muscle.state).toBe('increase')
    expect(results(0, 0, { goal: 'muscle_gain' }, 21).indicators).toEqual([{ id: 'muscle_gain', label: '골격근 증가', status: 'pending' }])
  })
  it('근육 목표의 골격근만 "28일 이상 앞선 가장 가까운 측정"과 비교하고, 체지방·분석 기간은 구간 그대로', () => {
    const history = [inbody('old', day(-10), 33, 33), inbody('a', day(0), 32, 35), inbody('m', day(14), 31, 36), inbody('b', day(35), 30, 36.1)]
    const of = (goal: IntervalInput['goal']) => buildIntervalReport(input({ goal, inBodyHistory: history })).intervals[0]!
    for (const goal of ['muscle_gain', 'strength'] as const) {
      const i = of(goal)
      expect(i.period).toMatchObject({ fromId: 'm', toId: 'b', days: 21 })
      expect(i.results.muscle).toMatchObject({ from: day(0), days: 35, start: 35, change: 1.1, state: 'increase' })
      expect(i.results.fat).toMatchObject({ from: day(14), days: 21, change: -1 })
    }
    for (const goal of ['fat_loss', 'body_shape'] as const) {
      expect(of(goal).results.muscle).toMatchObject({ from: day(14), days: 21, change: 0.1, state: 'noise' })
    }
  })
  it('목표별 핵심 지표', () => {
    const core = (goal: IntervalInput['goal']) => results(-1, 0, { goal }).indicators.map((i) => `${i.id}:${i.status}`)
    expect(core('fat_loss')).toEqual(['fat:good'])
    expect(core('muscle_gain')).toEqual(['muscle_gain:poor'])
    expect(core('body_shape')).toEqual(['fat:good', 'muscle_keep:good'])
    expect(core('strength')).toEqual(['muscle_keep:good', 'volume:unknown'])
  })
  it('측정값이 없으면 알 수 없음', () => {
    const r = buildIntervalReport(input({ inBodyHistory: [inbody('a', day(0), null, 35), inbody('b', day(28), 29, 35)] }))
    expect(r.intervals[0]!.results.fat).toMatchObject({ state: 'unknown', change: null, perWeek: null })
  })
  it('목표가 없으면 식단 목적을 goalMapping으로 바꾼다', () => {
    expect(resolveGoal(null, 'weight_maintain')).toBe('body_shape')
    expect(resolveGoal(undefined, 'health_care')).toBe('strength')
    expect(resolveGoal('muscle_gain', 'fat_loss')).toBe('muscle_gain')
    expect(resolveGoal(null)).toBe('body_shape')
  })
})

describe('식단 분석', () => {
  it('간식은 먹은 시각과 상관없이 간식 칸이고, 저녁·간식을 묶어 비중을 센다', () => {
    for (const hour of [10, 23, 1]) {
      const d = diet([meal(0, 600), meal(0, 300, { slot: '저녁', hour: 19 }), meal(0, 100, { slot: '간식', hour })])
      expect(d.byWeekday[0]!.bySlot).toEqual({ 아침: 0, 점심: 600, 저녁: 300, 간식: 100 })
      expect(d.eveningSharePercent).toBe(40)
    }
  })
  it('요일·끼니별 평균, 평일/주말, 운동한 날/쉰 날, 단백질 분배', () => {
    const d = diet(
      [meal(0, 600, { protein: 20 }), meal(0, 1000, { slot: '저녁', protein: 40 }), meal(7, 800, { protein: 30 }), meal(5, 3000, { slot: '저녁', protein: 30 })],
      14,
      TARGET,
      new Set([new Date(2026, 10, 2).getTime()]),
    )
    expect(d.byWeekday[0]).toMatchObject({ label: '월', loggedDays: 2, total: 1200, bySlot: { 점심: 700, 저녁: 500 } })
    expect(d.byWeekday[1]).toMatchObject({ label: '화', loggedDays: 0, total: null, bySlot: null })
    expect(d).toMatchObject({ weekdayAvg: 1200, weekdayDays: 2, weekendAvg: 3000, weekendDays: 1, workoutDayAvg: 1600, restDayAvg: 1900 })
    expect(d.protein).toMatchObject({ average: 40, percent: 40 })
    expect(d.protein!.bySlot.find((b) => b.slot === '저녁')).toEqual({ slot: '저녁', grams: 23, sharePercent: 58 })
  })
  it('자주 먹은 음식 TOP 3와, 목표를 넘긴 날의 저녁·간식 음식', () => {
    const d = diet([
      meal(0, 500, { name: '밥' }),
      meal(1, 500, { name: '밥' }),
      meal(2, 500, { name: '밥' }),
      meal(0, 300, { name: '빵' }),
      meal(1, 300, { name: '빵' }),
      meal(0, 100, { name: '우유' }),
      meal(0, 100, { name: '차', slot: '저녁' }), // 0일은 합계 1000 → 초과 아님
      meal(3, 1500, { name: '치킨', slot: '저녁' }),
      meal(3, 600, { name: '라면', slot: '간식', hour: 23 }),
      meal(3, 100, { name: '점심밥' }), // 초과한 날이어도 점심은 제외
    ])
    expect(d.topFoods).toEqual([{ name: '밥', count: 3 }, { name: '빵', count: 2 }, { name: '치킨', count: 1 }]) // 같은 횟수면 칼로리 큰 것
    expect(d.overDays).toBe(1)
    expect(d.topEveningFoodsOnOverDays).toEqual([{ name: '치킨', count: 1 }, { name: '라면', count: 1 }])
    expect(d.overDayFood).toEqual({ name: '치킨', count: 1, slot: '저녁' })
    expect(d.overWeekendFood).toBeNull() // 3일째는 목요일
  })
  it('기록일이 기간의 50% 미만이면 부족(패턴을 판정하지 않는다)', () => {
    const six = diet(everyDay(() => [meal(0, 500)], 1).concat([1, 2, 3, 4, 5].map((d) => meal(d, 500))))
    expect(six).toMatchObject({ loggedDays: 6, sufficient: false })
    expect(six.reason).toContain('14일 중 6일')
    expect(findDietPatterns(six, TARGET)).toEqual([])
    expect(diet(everyDay((d) => [meal(d, 500)], 7)).sufficient).toBe(true)
  })
  it('기록이 없으면 평균은 null', () => {
    expect(diet([])).toMatchObject({ avgCalories: null, weekdayAvg: null, eveningSharePercent: null, protein: null })
  })
})

describe('식단 패턴', () => {
  const weekendDiet = (weekend: number) => everyDay((d) => [meal(d, d % 7 >= 5 ? weekend : 1500, { protein: 100 })])

  it('주말 과식: 주말 평균이 평일보다 20% 이상', () => {
    const p = findDietPatterns(diet(weekendDiet(1800)), TARGET)
    expect(ids(p)).toContain('weekend_overeating')
    const weekend = p.find((x) => x.id === 'weekend_overeating')!
    expect(weekend.todo).toEqual({ text: '주말 한 끼는 가볍게 먹기', current: 0, target: 1, unit: '끼/주말' })
    expect(weekend.evidence).toContainEqual({ label: '주말 하루 권장 상한', value: 1650, unit: 'kcal' })
    expect(ids(findDietPatterns(diet(weekendDiet(1790)), TARGET))).not.toContain('weekend_overeating')
  })
  it('주말 할 일은 행동 하나(초과한 주말 저녁·간식에 가장 많은 음식), 칼로리 상한(목표의 110%까지)은 근거에', () => {
    const make = (name: string, slot: MealSlot) =>
      diet(everyDay((d) => (d % 7 >= 5 ? [meal(d, 1000, { protein: 50 }), meal(d, 2000, { slot, name, protein: 50 })] : [meal(d, 1500, { protein: 100 })])))
    const of = (name: string, slot: MealSlot) => findDietPatterns(make(name, slot), TARGET).find((p) => p.id === 'weekend_overeating')!
    expect(of('치킨', '저녁').todo).toEqual({ text: '주말 저녁 치킨은 한 번만', current: 2, target: 1, unit: '회/주말', food: '치킨' })
    expect(of('피자', '간식').todo.text).toBe('주말 간식 피자는 한 번만')
    expect(of('치킨', '저녁').evidence).toContainEqual({ label: '주말 하루 권장 상한', value: 2200, unit: 'kcal' })
  })
  it('모든 할 일 문장은 25자 이내이고 칼로리 숫자가 없다(음식 이름이 길어도)', () => {
    for (const name of ['치킨', '허니콤보 순살 치킨', '허니콤보 순살 치킨과 치즈볼 세트', '아주아주아주아주 긴 이름의 야식 모둠 세트 메뉴']) {
      const d = diet(everyDay((day_) => [meal(day_, 800, { protein: 10 }), ...(day_ % 7 >= 5 ? [meal(day_, 3000, { slot: '저녁', name, protein: 5 })] : [])]))
      const patterns = findDietPatterns(d, TARGET)
      expect(ids(patterns)).toEqual(['weekend_overeating', 'evening_skew', 'protein_low', 'under_eating'])
      for (const p of patterns) {
        expect(p.todo.text.length, p.todo.text).toBeLessThanOrEqual(25)
        expect(p.todo.text).not.toContain('kcal')
      }
    }
  })
  it('저녁·간식 쏠림: 하루 칼로리의 50% 이상, 초과한 날이 있으면 할 일에 음식 이름', () => {
    const make = (evening: number, slot: MealSlot = '저녁') =>
      diet(everyDay((d) => [meal(d, 1000, { protein: 100 }), meal(d, evening, { slot, name: '떡볶이' })]))
    const skew = (evening: number, slot?: MealSlot) => findDietPatterns(make(evening, slot), TARGET).find((p) => p.id === 'evening_skew')!
    expect(skew(1000)).toMatchObject({ title: '저녁·간식 쏠림', chart: 'mealShare', strength: 0, todo: { text: '저녁·간식 한 가지 줄이기', current: 50, target: 45 } })
    expect(skew(1000).evidence).toContainEqual({ label: '목표 비중', value: 45, unit: '%' })
    expect(skew(1500, '간식').todo).toMatchObject({ text: '저녁·간식 떡볶이 줄이기', food: '떡볶이' })
    expect(ids(findDietPatterns(make(950), TARGET))).not.toContain('evening_skew')
  })
  it('강도는 기준(0)에서 상한(1)까지, 핵심 숫자는 제목용', () => {
    const at = (weekend: number) => findDietPatterns(diet(weekendDiet(weekend)), TARGET).find((p) => p.id === 'weekend_overeating')!
    expect(at(1800)).toMatchObject({ strength: 0, headline: { value: 20, unit: '%' } })
    expect(at(2100)).toMatchObject({ strength: 0.5, headline: { value: 40, unit: '%' } })
    expect(at(2400)).toMatchObject({ strength: 1, headline: { value: 60, unit: '%' } })
    expect(at(3600).strength).toBe(1) // 상한을 넘어도 1
  })
  it('강도 정규화: 모든 패턴이 0~1이고, 단백질이 많이 모자라면 주말 과식보다 강할 수 있다', () => {
    expect(strengthOf(20, 20, 60)).toBe(0)
    expect(strengthOf(40, 20, 60)).toBe(0.5)
    expect(strengthOf(99, 20, 60)).toBe(1)
    // 작을수록 나쁜 값(full < limit)
    expect(strengthOf(65, 80, 50)).toBe(0.5)
    expect(strengthOf(10, 80, 50)).toBe(1)
    expect(strengthOf(90, 80, 50)).toBe(0)
    // 주말이 평일보다 40% 많음(0.5) vs 단백질 목표의 56%(0.8)
    const patterns = findDietPatterns(
      diet(everyDay((d) => (d % 7 >= 5 ? [meal(d, 2100, { protein: 56 })] : [meal(d, 1500, { protein: 56 })]))),
      TARGET,
    )
    const of = (id: PatternId) => patterns.find((p) => p.id === id)!.strength
    expect([of('weekend_overeating'), of('protein_low')]).toEqual([0.5, 0.8])
    expect(pickFeedback('body_shape', 'increase', [{ id: 'fat', label: '', status: 'good' }], patterns)[0]!.pattern.id).toBe('protein_low')
  })
  it('시연 데이터 마지막 구간: 목표 단백질 130g·167g에서는 주말 과식과 하체 부족이 뽑힌다', () => {
    const s = buildSeedData(day(30), { targetKcal: 1940 })
    for (const protein of [130, 167]) {
      const [latest] = buildIntervalReport({ goal: 'fat_loss', ...s, target: { ...TARGET, calories: 1940, protein } }).intervals
      expect(latest!.feedback.map((f) => f.pattern.id)).toEqual(['weekend_overeating', 'lower_body_imbalance'])
      for (const p of latest!.patterns) expect(p.strength >= 0 && p.strength <= 1, p.id).toBe(true)
    }
  })
  it('단백질 부족: 목표의 80% 미만, 할 일은 부족분 g', () => {
    const at = (g: number) => findDietPatterns(diet(everyDay((d) => [meal(d, 1900, { protein: g })])), TARGET)
    expect(at(79).find((p) => p.id === 'protein_low')!.todo.text).toBe('단백질을 하루 21g 더 먹기')
    expect(ids(at(80))).not.toContain('protein_low')
  })
  it('너무 적게 먹음: 목표의 70% 미만인 날이 절반 이상', () => {
    const at = (lowDays: number) => findDietPatterns(diet(everyDay((d) => [meal(d, d < lowDays ? 1399 : 1400, { protein: 100 })])), TARGET)
    const under = at(7).find((p) => p.id === 'under_eating')!
    expect(under.todo).toEqual({ text: '하루 한 끼 더 챙겨 먹기', current: 1, target: 2, unit: '끼/일' })
    expect(under.evidence).toContainEqual({ label: '하루 권장 최소', value: 1800, unit: 'kcal' })
    expect(ids(at(6))).not.toContain('under_eating')
  })
  it('목표가 없으면 목표 기준 패턴은 만들지 않는다', () => {
    expect(ids(findDietPatterns(diet(everyDay((d) => [meal(d, 300, { protein: 1 })]), 14, null), null))).toEqual([])
  })
})

describe('운동 분석', () => {
  it('횟수·주당 평균·가장 긴 휴식, 러닝 기록도 센다(같은 운동은 한 번)', () => {
    const records = [session(1, ex('A', 'CHEST', 10)), session(10, ex('A', 'CHEST', 10))]
    const others: Workout[] = [
      { id: 'same', type: '헬스', startTime: day(1, 18), endTime: day(1, 19), duration: 3600 },
      { id: 'run', type: '러닝', startTime: day(15, 7), endTime: day(15, 8), duration: 3600 },
    ]
    expect(workout(records, 21, others)).toMatchObject({ sessions: 3, perWeek: 1, longestRestDays: 8, sufficient: true })
  })
  it('종목 TOP 3의 주별 최고 무게·횟수, 부위별 세트, 주별 볼륨', () => {
    const w = workout([
      session(0, ex('A', 'CHEST', 50, 10), ex('B', 'LEGS', 60, 8, 2)),
      session(2, ex('A', 'CHEST', 55, 6)),
      session(8, ex('A', 'CHEST', 55, 8), ex('C', 'BACK', 40, 10, 2), ex('D', 'ABS', 0, 20, 1)),
    ])
    expect(w.topExercises.map((e) => e.exerciseId)).toEqual(['A', 'B', 'C'])
    expect(w.topExercises[0]!.weeks.map((x) => [x.kg, x.reps])).toEqual([[55, 6], [55, 8], [null, null]])
    expect(w.partSets.find((p) => p.group === 'CHEST')).toMatchObject({ sets: 9, perWeek: 3 })
    expect(w.upperSets).toBe(11)
    expect(w.lowerSets).toBe(2)
    expect(w.weeklyVolume.map((x) => x.volume)).toEqual([3450, 2120, 0])
    expect(w.weeklyVolume.map((x) => x.averageVolume)).toEqual([1725, 2120, null])
  })
  it('볼륨 변화는 합계가 아니라 1회 평균 볼륨으로 비교한다', () => {
    const w = workout([session(0, ex('A', 'CHEST', 100, 10, 1)), session(2, ex('A', 'CHEST', 100, 10, 1)), session(15, ex('A', 'CHEST', 110, 10, 1))])
    expect(w.volumeChangePercent).toBe(10) // 합계로는 -45%
  })
  it('부위가 비어 있으면 종목 id → 이름으로 채우고, 못 찾은 세트는 비율에서 빼고 개수를 남긴다', () => {
    expect(groupOfExercise({ exerciseId: 'C03', name: '아무 이름' })).toBe('CHEST')
    expect(groupOfExercise({ exerciseId: 'custom-1', name: '바벨스쿼트' })).toBe('LEGS')
    expect(groupOfExercise({ exerciseId: 'custom-2', name: '나만의 동작' })).toBe('OTHER')
    expect(groupOfExercise({ exerciseId: 'C03', name: 'x', group: 'BACK' })).toBe('BACK') // 저장된 부위가 먼저
    const w = workout(
      [0, 7, 14].map((d) => session(d, ex('C03', undefined, 10 + d, 10, 10), ex('L02', undefined, 10 + d, 10, 2), ex('custom', undefined, 10 + d, 10, 4))),
    )
    expect(w).toMatchObject({ upperSets: 30, lowerSets: 6, unknownGroupSets: 12, lowerToUpperPercent: 20 })
    const p = findWorkoutPatterns(w).find((x) => x.id === 'lower_body_imbalance')!
    expect(p.evidence).toContainEqual({ label: '부위를 몰라 뺀 세트', value: 12, unit: '세트' })
  })
  it('운동 기록 2회 이하면 부족: 패턴·볼륨 변화를 만들지 않는다', () => {
    const w = workout([session(0, ex('A', 'CHEST', 10)), session(15, ex('A', 'CHEST', 20))])
    expect(w).toMatchObject({ sufficient: false, volumeChangePercent: null })
    expect(w.reason).toContain('2회')
    expect(findWorkoutPatterns(w)).toEqual([])
  })
  it('저장 규칙 때문에 앞쪽 기록이 빠졌을 수 있으면 부위 쏠림·볼륨은 판단하지 않는다', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => session(1 + (i % 20), ex('A', 'CHEST', 10)))
    // 딱 20회이고 구간 시작보다 늦게 시작 → 예전 20회 한도에 걸렸을 수 있다
    const w = workout(many(20))
    expect(w).toMatchObject({ setDataComplete: false, volumeChangePercent: null })
    expect(ids(findWorkoutPatterns(w))).not.toContain('lower_body_imbalance')
    expect(workout(many(19)).setDataComplete).toBe(true)
    // 20회를 넘고 구간이 최근 120일 안이면 모두 남아 있다
    expect(workout(many(25)).setDataComplete).toBe(true)
    // 구간 시작이 가장 최근 기록보다 120일 넘게 앞이면 빠졌을 수 있다
    expect(workout([...many(20), session(130, ex('A', 'CHEST', 10))]).setDataComplete).toBe(false)
  })
})

describe('운동 패턴', () => {
  const squat = (d: number, kg: number, reps = 10) => session(d, ex('SQ', 'LEGS', kg, reps))

  it('운동 부족: 주 2회 미만', () => {
    const at = (n: number) => ids(findWorkoutPatterns(workout(Array.from({ length: n }, (_, i) => squat(i * 3, 10 + i)))))
    expect(at(5)).toContain('workout_shortage')
    expect(at(6)).not.toContain('workout_shortage')
  })
  it('종목 정체: 최고 무게·횟수가 3주 그대로면 +2.5kg·-2회', () => {
    const p = findWorkoutPatterns(workout([squat(0, 55), squat(2, 60), squat(9, 60), squat(16, 60)])).find((x) => x.id === 'exercise_stagnation')!
    expect(p).toMatchObject({ exerciseId: 'SQ', chart: 'exerciseTopSet', todo: { text: 'SQ 62.5kg × 8회 도전', current: 60, target: 62.5 } })
    expect(p.evidence).toContainEqual({ label: '그대로인 기간', value: 3, unit: '주' })
  })
  it('무게나 횟수가 늘었거나 2주만 같으면 정체가 아니다. 맨몸(0kg)도 제외', () => {
    const none = (...r: WorkoutSessionRecord[]) => expect(ids(findWorkoutPatterns(workout(r)))).not.toContain('exercise_stagnation')
    none(squat(0, 60), squat(7, 60), squat(14, 62.5))
    none(squat(0, 60), squat(7, 60), squat(14, 60, 11))
    none(squat(0, 55), squat(7, 60), squat(14, 60))
    none(squat(0, 0), squat(7, 0), squat(14, 0))
  })
  it('부위 쏠림: 하체 세트가 상체의 60% 미만', () => {
    const at = (legSets: number) =>
      findWorkoutPatterns(workout([0, 7, 14].map((d) => session(d, ex('U', 'CHEST', 10 + d, 10, 10), ex('L', 'LEGS', 10 + d, 10, legSets)))))
    expect(at(5).find((p) => p.id === 'lower_body_imbalance')!.todo).toMatchObject({ current: 5, target: 6 })
    expect(ids(at(6))).not.toContain('lower_body_imbalance')
  })
  it('하체 할 일은 부족분이 커도 주 +3세트까지', () => {
    const w = workout([0, 7, 14].map((d) => session(d, ex('U', 'CHEST', 10 + d, 10, 30), ex('L', 'LEGS', 10 + d, 10, 1))))
    expect(findWorkoutPatterns(w).find((p) => p.id === 'lower_body_imbalance')!.todo).toMatchObject({ text: 'L 3세트 더', current: 1, target: 4 })
  })
  it('하체 할 일은 이미 하는 하체 종목 이름에 세트를 나눠 담는다(25자 이내)', () => {
    const named = (id: string, name: string, kg: number, sets: number): RecordedExercise => ({ ...ex(id, 'LEGS', kg, 10, sets), name })
    const todo = (...legs: [string, number][]) => {
      const w = workout([0, 7, 14].map((d) => session(d, ex('U', 'CHEST', 10 + d, 10, 30), ...legs.map(([name, sets], i) => named(`L${i}`, name, 10 + d, sets)))))
      return findWorkoutPatterns(w).find((p) => p.id === 'lower_body_imbalance')!.todo
    }
    // 자주(세트가 많게) 한 종목이 먼저, 기구 이름은 뺀다
    expect(todo(['레그 프레스', 1], ['바벨 스쿼트', 2])).toMatchObject({
      text: '스쿼트 2세트, 레그 프레스 1세트 더',
      split: [{ name: '스쿼트', sets: 2 }, { name: '레그 프레스', sets: 1 }],
    })
    expect(todo(['레그 컬', 1]).text).toBe('레그 컬 3세트 더')
    // 기구 이름을 빼면 같아지면 원래 이름
    expect(todo(['바벨 스쿼트', 2], ['스미스머신 스쿼트', 1]).text.length).toBeLessThanOrEqual(25)
    expect(todo(['바벨 스쿼트', 2], ['스미스머신 스쿼트', 1]).split![0]!.name).toBe('바벨 스쿼트')
    // 길면 한 종목, 그래도 길면 부위 이름만
    expect(todo(['루마니안 데드리프트', 2], ['시티드 카프 레이즈', 1]).text).toBe('루마니안 데드리프트 3세트 더')
    expect(todo(['아주아주 긴 이름을 가진 나만의 하체 운동 동작', 2]).text).toBe('하체 운동 3세트 더')
    // 해 본 하체 종목이 없을 때
    expect(todo().text).toBe('하체 운동 3세트 더')
  })
  it('정체 할 일도 25자를 넘으면 종목 이름을 줄인다', () => {
    const text = (name: string) => {
      const w = workout([0, 7, 14].map((d) => session(d, { ...ex('L', 'LEGS', 102.5), name })))
      return findWorkoutPatterns(w).find((p) => p.id === 'exercise_stagnation')!.todo.text
    }
    expect(text('바벨 스쿼트')).toBe('바벨 스쿼트 105kg × 8회 도전')
    expect(text('스미스머신 루마니안 데드리프트')).toBe('루마니안 데드리프트 105kg × 8회 도전')
    expect(text('아주아주 긴 이름을 가진 나만의 하체 운동 동작')).toBe('105kg × 8회 도전')
  })
  it('긴 공백: 7일 이상 연속 휴식', () => {
    const at = (second: number) => ids(findWorkoutPatterns(workout([squat(0, 10), squat(second, 20), squat(second + 1, 30)], second + 2)))
    expect(at(8)).toContain('long_gap') // 1~7일 = 7일
    expect(at(7)).not.toContain('long_gap')
  })
})

describe('피드백 고르기', () => {
  const pattern = (id: PatternId, domain: Pattern['domain'], strength: number): Pattern => ({
    id,
    domain,
    title: id,
    chart: 'restDays',
    headline: { label: '', value: 0, unit: '' },
    evidence: [],
    strength,
    todo: { text: '', current: 0, target: 0, unit: '' },
  })
  const ind = (id: IndicatorId, status: Indicator['status'] = 'poor'): Indicator => ({ id, label: id, status })
  const all = [
    pattern('weekend_overeating', 'diet', 0.5),
    pattern('evening_skew', 'diet', 0.1),
    pattern('protein_low', 'diet', 0.3),
    pattern('exercise_stagnation', 'workout', 0),
    pattern('lower_body_imbalance', 'workout', 0.6),
  ]
  const picked = (...args: Parameters<typeof pickFeedback>) => pickFeedback(...args).map((f) => `${f.domain}:${f.pattern.id}:${f.tone}:${f.indicator}`)

  it('결과가 좋아도 가장 강한 패턴을 식단 1개·운동 1개 고른다(improve)', () => {
    expect(picked('body_shape', 'increase', [ind('fat', 'good')], all)).toEqual([
      'diet:weekend_overeating:improve:null',
      'workout:lower_body_imbalance:improve:null',
    ])
    const reordered = all.map((p) => (p.id === 'evening_skew' ? { ...p, strength: 2 } : p))
    expect(picked('body_shape', 'increase', [ind('fat', 'good')], reordered)[0]).toBe('diet:evening_skew:improve:null')
  })
  it('결과가 아쉬우면 fix, 아쉬운 지표와 관련 있는 패턴이 강도보다 먼저', () => {
    expect(picked('muscle_gain', 'noise', [ind('muscle_gain')], all)).toEqual([
      'diet:protein_low:fix:muscle_gain',
      'workout:lower_body_imbalance:fix:muscle_gain',
    ])
    // 관련 패턴이 없는 영역은 가장 강한 것(indicator는 null)
    expect(picked('body_shape', 'increase', [ind('fat')], all)).toEqual(['diet:weekend_overeating:fix:fat', 'workout:lower_body_imbalance:fix:null'])
  })
  it('체지방 감량에서 골격근이 오차 범위면 하체 부족·종목 정체를 운동 피드백으로 먼저 고른다', () => {
    const patterns = [pattern('workout_shortage', 'workout', 0.9), pattern('exercise_stagnation', 'workout', 0)]
    const of = (goal: 'fat_loss' | 'body_shape', muscle: 'noise' | 'decrease', status: Indicator['status']) =>
      pickFeedback(goal, muscle, [ind('fat', status)], patterns)[0]!.pattern.id
    expect(of('fat_loss', 'noise', 'good')).toBe('exercise_stagnation')
    expect(of('fat_loss', 'noise', 'poor')).toBe('exercise_stagnation')
    expect(of('fat_loss', 'decrease', 'good')).toBe('workout_shortage')
    expect(of('body_shape', 'noise', 'good')).toBe('workout_shortage')
  })
  it('지표가 모두 보류·알 수 없음이거나 패턴이 없으면 0개', () => {
    expect(picked('muscle_gain', 'pending', [ind('muscle_gain', 'pending'), ind('volume', 'unknown')], all)).toEqual([])
    expect(picked('fat_loss', 'noise', [ind('fat', 'good')], [])).toEqual([])
  })
})

describe('근거용 계산', () => {
  const meals = everyDay((d) => [meal(d, 2000)], 21)
  const sessions = (n: number) => Array.from({ length: n }, (_, i) => session(i, ex('A', 'CHEST', 10)))
  const records = sessions(6)
  const evidence = (o: Partial<IntervalInput>) =>
    buildIntervalReport(input({ inBodyHistory: [inbody('a', day(0), 30), inbody('b', day(21), 29)], meals, workoutHistory: records, ...o })).intervals[0]!.evidence
  const withBmr = (a: number | null, b: number | null) => [
    { ...inbody('a', day(0)), basalMetabolicRate: a },
    { ...inbody('b', day(21)), basalMetabolicRate: b },
  ]

  it('기대 체지방 변화(대략) = (섭취 - 추정 소비) × 일수 ÷ 7700, 실제와 함께', () => {
    // 기초대사 1700 × 주 2회(1.34) = 2278
    expect(evidence({}).expectedFatChange).toEqual({
      approximate: true,
      expectedKg: -0.8,
      actualKg: -1,
      avgIntake: 2000,
      estimatedExpenditure: 2278,
      bmr: 1700,
      bmrSource: 'inbody',
      activityFactor: 1.34,
      reason: null,
    })
    expect(evidence({}).weight).toEqual({ start: 80, end: 80, change: 0 })
    expect(evidence({}).excludedSets).toBe(0)
  })
  it('활동 계수는 주 0회 1.2에서 5회 이상 1.55까지 직선', () => {
    expect([0, 1, 2.5, 4, 5, 7].map((n) => Number(activityFactorOf(n).toFixed(3)))).toEqual([1.2, 1.27, 1.375, 1.48, 1.55, 1.55])
    const factor = (n: number) => evidence({ workoutHistory: sessions(n) }).expectedFatChange.activityFactor
    expect([factor(3), factor(8), factor(9), factor(15), factor(20)]).toEqual([1.27, 1.387, 1.41, 1.55, 1.55])
  })
  it('식단 기록이 50% 미만이면 null과 이유', () => {
    const e = evidence({ meals: meals.slice(0, 10) }).expectedFatChange
    expect(e).toMatchObject({ expectedKg: null, estimatedExpenditure: null, actualKg: -1 })
    expect(e.reason).toContain('식단 기록')
  })
  it('운동 기록이 2회 이하면 null과 이유', () => {
    const e = evidence({ workoutHistory: records.slice(0, 2) }).expectedFatChange
    expect(e.expectedKg).toBeNull()
    expect(e.reason).toContain('운동 기록')
  })
  it('기초대사량은 인바디 값(구간 양 끝 평균) → 없으면 프로필로 추정 → 그것도 없으면 null', () => {
    expect(evidence({ inBodyHistory: withBmr(1600, 1800) }).expectedFatChange).toMatchObject({ bmr: 1700, bmrSource: 'inbody' })
    expect(evidence({ inBodyHistory: withBmr(null, 1800) }).expectedFatChange).toMatchObject({ bmr: 1800, bmrSource: 'inbody' })
    const profile = { gender: 'male', age: 27, height: 176, weight: 90 } as const
    expect(evidence({ inBodyHistory: withBmr(null, null), profile }).expectedFatChange).toMatchObject({
      bmr: estimateBasalMetabolicRate('male', 27, 176, 80), // 몸무게는 인바디 값 우선
      bmrSource: 'estimated',
    })
    const none = evidence({ inBodyHistory: withBmr(null, null) }).expectedFatChange
    expect(none).toMatchObject({ expectedKg: null, bmr: null, bmrSource: null })
    expect(none.reason).toContain('기초대사량')
  })
})

describe('시연 데이터', () => {
  /** now에서 n일 전의 0시 */
  const day_ = (now: number, n: number) => new Date(now - n * 86_400_000).setHours(0, 0, 0, 0)
  // 실행 요일이 달라도 같은 결과가 나와야 한다
  const NOWS = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 24 + i, 12).getTime())
  const demo = (now: number, goal: IntervalInput['goal']) => {
    const s = buildSeedData(now, { targetKcal: 1920 })
    return buildIntervalReport({
      goal,
      inBodyHistory: s.inBodyHistory,
      meals: s.meals,
      target: { calories: 1920, protein: 130, carbohydrates: 200, fat: 60, fiber: 28 },
      workoutHistory: s.workoutHistory,
      workouts: s.workouts,
    })
  }

  it('구간 3개: 마지막 구간은 21일, 체지방 -1.3kg·골격근 +0.1kg(오차 범위)', () => {
    const r = demo(NOWS[0]!, 'fat_loss')
    expect(r.intervals.map((i) => i.period.days)).toEqual([21, 14, 14])
    expect(r.intervals[0]!.results).toMatchObject({ fat: { change: -1.3, state: 'decrease' }, muscle: { change: 0.1, state: 'noise' } })
    expect(r.series.map((p) => p.muscleMass)).toEqual([41.2, 41.8, 42.2, 42.3])
  })
  it('어느 요일에 실행해도 마지막 구간에서 주말 과식·저녁·간식 쏠림·스쿼트 정체·하체 부족이 나온다', () => {
    for (const now of NOWS) {
      const i = demo(now, 'fat_loss').intervals[0]!
      expect(ids(i.patterns)).toEqual(['weekend_overeating', 'evening_skew', 'exercise_stagnation', 'lower_body_imbalance'])
      const stagnant = i.patterns.find((p) => p.id === 'exercise_stagnation')!
      expect(stagnant).toMatchObject({ exerciseId: 'L02', title: '바벨 스쿼트 정체' })
      expect(stagnant.todo.text).toBe('바벨 스쿼트 62.5kg × 8회 도전')
      expect(i.diet.topEveningFoodsOnOverDays).toEqual([{ name: '맥주', count: 4 }, { name: '후라이드 치킨', count: 3 }, { name: '라면', count: 2 }])
    }
  })
  it('벤치프레스는 매주 늘고 스쿼트는 60kg × 10회 그대로', () => {
    const top = demo(NOWS[0]!, 'fat_loss').intervals[0]!.workout.topExercises
    expect(top.find((e) => e.exerciseId === 'C03')!.weeks.map((w) => w.kg)).toEqual([55, 57.5, 60])
    expect(top.find((e) => e.exerciseId === 'L02')!.weeks.map((w) => [w.kg, w.reps])).toEqual([[60, 10], [60, 10], [60, 10]])
  })
  it('결과가 좋아도 주말 과식·하체 부족을 improve로 고른다(어느 요일에 실행해도)', () => {
    for (const now of NOWS) {
      for (const goal of ['fat_loss', 'body_shape', 'muscle_gain'] as const) {
        const f = demo(now, goal).intervals[0]!.feedback
        expect(f.map((x) => `${x.pattern.id}:${x.tone}`)).toEqual(['weekend_overeating:improve', 'lower_body_imbalance:improve'])
        expect(f[0]!.pattern.todo.text).toBe('주말 저녁 맥주는 한 번만')
        expect(f[1]!.pattern.todo.text).toBe('스쿼트 2세트, 레그 프레스 1세트 더')
      }
    }
  })
  it('근육 목표의 골격근은 35일 전 측정과 비교해 +0.5kg', () => {
    expect(demo(NOWS[0]!, 'muscle_gain').intervals[0]!.results.muscle).toMatchObject({ days: 35, change: 0.5, state: 'increase' })
  })
  it('상체 무게는 체중 107kg 초중급 남성의 범위(마지막 구간, 덤벨은 한 손)', () => {
    const kgs = (id: string) =>
      buildSeedData(NOWS[0]!)
        .workoutHistory.filter((r) => r.date >= day_(NOWS[0]!, 28) && r.date < day_(NOWS[0]!, 7))
        .flatMap((r) => r.exercises.filter((e) => e.exerciseId === id).map((e) => e.sets[0]!.kg))
    const ranges: [string, number, number][] = [['C03', 55, 60], ['C04', 18, 22], ['S04', 6, 8], ['B01', 45, 55]]
    for (const [id, min, max] of ranges) {
      const found = kgs(id)
      expect(found.length, id).toBeGreaterThan(0)
      expect(Math.min(...found), id).toBeGreaterThanOrEqual(min)
      expect(Math.max(...found), id).toBeLessThanOrEqual(max)
    }
  })
  it('레그 프레스 무게는 지난 구간에서 이어서 조금씩 는다', () => {
    const kgs = buildSeedData(NOWS[0]!)
      .workoutHistory.slice()
      .reverse()
      .flatMap((r) => r.exercises.filter((e) => e.exerciseId === 'L01').map((e) => e.sets[0]!.kg))
    expect(kgs).toEqual([85, 90, 95, 100, 105, 110, 112.5])
  })
})
