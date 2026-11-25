// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { CoachingGoal, ProcessFacts, ResultFacts } from '../../../shared/coaching'
import {
  buildDiagnosis,
  buildResultFacts,
  ringRates,
  decideVerdict,
  exampleLine,
  isEmptyDiagnosis,
  isValidLine,
  MAX_LINE_LENGTH,
  pickGaps,
  resolveLines,
} from '../coachingInsight'
import { buildSeedData } from '../demoSeed'

const NOW = new Date(2026, 10, 24, 12, 0).getTime()
const TARGET = { calories: 1920, protein: 130, carbohydrates: 200, fat: 60, fiber: 28 }
const GOALS: CoachingGoal[] = ['fat_loss', 'muscle_gain', 'body_shape', 'strength']

const result = (o: Partial<ResultFacts> = {}): ResultFacts => ({ measurements: 3, periodDays: 28, weightDelta: 0, muscleDelta: 0, fatDelta: 0, ...o })
const HIGH: ProcessFacts = { dietLoggedDays: 7, dietOnTrackDays: 5, proteinPercent: 90, avgProtein: 117, targetProtein: 130, workoutSessions: 9, volumeChangePercent: 3 }
const LOW: ProcessFacts = { dietLoggedDays: 7, dietOnTrackDays: 1, proteinPercent: 50, avgProtein: 65, targetProtein: 130, workoutSessions: 3, volumeChangePercent: 0 }

// 목표별로 "결과가 목표 방향"인 인바디 변화
const GOOD: Record<CoachingGoal, Partial<ResultFacts>> = {
  fat_loss: { weightDelta: -2, muscleDelta: 0.2, fatDelta: -2 },
  muscle_gain: { weightDelta: 1, muscleDelta: 0.8, fatDelta: 0.2 },
  body_shape: { weightDelta: -1, muscleDelta: 0, fatDelta: -1.5 },
  strength: { weightDelta: 0, muscleDelta: 0.2, fatDelta: 0 },
}

describe('판정 — 순조로워요(on_track): 목표 방향 + 실천 높음', () => {
  for (const g of GOALS) {
    it(`${g}`, () => expect(decideVerdict(g, result(GOOD[g]), HIGH)).toBe('on_track'))
  }
})

describe('판정 — 근손실 주의(muscle_loss): 체지방↓ + 골격근↓', () => {
  for (const g of GOALS) {
    it(`${g} (실천이 낮아도 근손실을 먼저 알린다)`, () => {
      const r = result({ weightDelta: -3, muscleDelta: -0.8, fatDelta: -2 })
      expect(decideVerdict(g, r, HIGH)).toBe('muscle_loss')
      expect(decideVerdict(g, r, LOW)).toBe('muscle_loss')
    })
  }
  it('골격근이 조금(0.5kg 미만) 줄면 근손실로 보지 않는다', () => {
    expect(decideVerdict('fat_loss', result({ muscleDelta: -0.3, fatDelta: -2 }), HIGH)).toBe('on_track')
  })
})

describe('판정 — 방법 점검 필요(check_method): 실천 높음 + 결과가 목표 방향이 아님', () => {
  for (const g of GOALS.filter((x) => x !== 'strength')) {
    it(`${g}: 변화 없음`, () => expect(decideVerdict(g, result(), HIGH)).toBe('check_method'))
  }
  it('strength: 골격근이 유지되고 볼륨이 줄지 않았다면 변화 없음도 목표 방향(순조)', () => {
    expect(decideVerdict('strength', result(), HIGH)).toBe('on_track')
  })
  it('fat_loss: 체지방이 오히려 늘었다', () => {
    expect(decideVerdict('fat_loss', result({ weightDelta: 2, fatDelta: 1.8, muscleDelta: 0.2 }), HIGH)).toBe('check_method')
  })
  it('strength: 골격근은 유지돼도 볼륨이 줄면 목표 방향이 아니다', () => {
    expect(decideVerdict('strength', result({ muscleDelta: 0.2 }), { ...HIGH, volumeChangePercent: -10 })).toBe('check_method')
  })
  it('같은 결과도 목표에 따라 다르다: 골격근만 늘면 근육 증가는 순조, 체지방 감량은 점검', () => {
    const r = result({ muscleDelta: 0.8, fatDelta: 0 })
    expect(decideVerdict('muscle_gain', r, HIGH)).toBe('on_track')
    expect(decideVerdict('fat_loss', r, HIGH)).toBe('check_method')
  })
})

describe('판정 — 꾸준함이 필요해요(need_consistency): 실천 낮음', () => {
  for (const g of GOALS) {
    it(`${g}: 변화 없음`, () => expect(decideVerdict(g, result(), LOW)).toBe('need_consistency'))
  }
  it('결과가 좋아도 실천이 낮으면 꾸준함을 먼저 말한다', () => {
    expect(decideVerdict('fat_loss', result(GOOD.fat_loss), LOW)).toBe('need_consistency')
  })
})

describe('판정 — 기록이 더 필요해요(need_data)', () => {
  it('인바디가 없거나 1회뿐', () => {
    expect(decideVerdict('fat_loss', null, HIGH)).toBe('need_data')
    expect(decideVerdict('fat_loss', result({ measurements: 1, weightDelta: null, muscleDelta: null, fatDelta: null }), HIGH)).toBe('need_data')
  })
  it('식단 기록이 3일 미만', () => expect(decideVerdict('fat_loss', result(GOOD.fat_loss), { ...HIGH, dietLoggedDays: 2 })).toBe('need_data'))
  it('운동 기록이 2회 미만', () => expect(decideVerdict('fat_loss', result(GOOD.fat_loss), { ...HIGH, workoutSessions: 1 })).toBe('need_data'))
})

describe('보완할 점 고르기', () => {
  it('목표에서 가장 크게 벗어난 순으로 최대 2개', () => {
    const p: ProcessFacts = { ...HIGH, proteinPercent: 62, avgProtein: 80, dietOnTrackDays: 4, workoutSessions: 8 }
    const gaps = pickGaps('fat_loss', 'on_track', result(GOOD.fat_loss), p)
    expect(gaps.map((g) => g.id)).toEqual(['protein', 'diet']) // 38% > 20% > 운동 11%
    expect(gaps).toHaveLength(2)
  })
  it('목표를 채운 항목은 고르지 않고, 다 채우면 비어 있다', () => {
    const full: ProcessFacts = { ...HIGH, dietOnTrackDays: 6, proteinPercent: 100, workoutSessions: 9 }
    expect(pickGaps('fat_loss', 'on_track', result(GOOD.fat_loss), full)).toEqual([])
  })
  it('근손실이면 골격근 항목이 맨 앞', () => {
    const gaps = pickGaps('fat_loss', 'muscle_loss', result({ muscleDelta: -0.8, fatDelta: -2 }), LOW)
    expect(gaps[0]).toMatchObject({ id: 'muscle', current: -0.8 })
  })
  it('방법 점검이면 목표 지표(체지방 감량→체지방, 근육 증가→골격근) 결과 항목이 들어간다', () => {
    expect(pickGaps('fat_loss', 'check_method', result(), HIGH)[0]).toMatchObject({ id: 'result', label: '체지방 변화' })
    expect(pickGaps('muscle_gain', 'check_method', result(), HIGH)[0]).toMatchObject({ id: 'result', label: '골격근 변화' })
  })
  it('기록 부족이면 인바디·식단 기록 항목을 안내한다', () => {
    const ids = pickGaps('fat_loss', 'need_data', null, { ...HIGH, dietLoggedDays: 1, dietOnTrackDays: 0 }).map((g) => g.id)
    expect(ids).toEqual(['inbody', 'record'])
  })
})

describe('보완할 점 문장', () => {
  const p: ProcessFacts = { ...HIGH, proteinPercent: 62, avgProtein: 80, targetProtein: 130 }

  it('코드가 만든 예시 문장은 숫자를 포함하고 길이 제한·칭찬 금지를 지킨다(모든 항목)', () => {
    const gaps = [
      { id: 'muscle', label: '골격근 변화', current: -0.8, target: 0, unit: 'kg' },
      { id: 'result', label: '체지방 변화', current: 0.4, target: -0.3, unit: 'kg' },
      { id: 'result', label: '골격근 변화', current: 0, target: 0.3, unit: 'kg' },
      { id: 'protein', label: '단백질 달성률', current: 62, target: 100, unit: '%' },
      { id: 'diet', label: '식단 목표 달성일', current: 2, target: 5, unit: '일' },
      { id: 'record', label: '식단 기록일', current: 1, target: 7, unit: '일' },
      { id: 'workout', label: '운동 횟수', current: 3, target: 9, unit: '회' },
      { id: 'inbody', label: '인바디 측정', current: 1, target: 2, unit: '회' },
    ] as const
    for (const g of gaps) {
      const line = exampleLine(g, p)
      expect(isValidLine(line), line).toBe(true)
      expect(line.length).toBeLessThanOrEqual(MAX_LINE_LENGTH)
    }
    expect(exampleLine(gaps[3], p)).toBe('단백질이 목표의 62%예요. 오늘 +50g 채워요')
  })

  it('AI 문장 검사: 길이 초과·숫자 없음·칭찬은 탈락', () => {
    expect(isValidLine('단백질이 목표의 62%예요. 오늘 +60g 채워요')).toBe(true)
    expect(isValidLine('단백질이 목표의 62%예요. 오늘 저녁에 닭가슴살과 두부를 충분히 더 먹어요')).toBe(false) // 길이
    expect(isValidLine('단백질이 부족해요. 더 채워요')).toBe(false) // 숫자 없음
    expect(isValidLine('운동 9회로 잘하고 있어요. 이대로 해요')).toBe(false) // 칭찬
    expect(isValidLine('')).toBe(false)
    expect(isValidLine(42)).toBe(false)
  })

  it('목표와의 차이 숫자가 없거나 칭찬·성공 표현이면 탈락, 차이·목표 숫자가 있으면 통과', () => {
    const diet = { id: 'diet', label: '식단 목표 달성일', current: 4, target: 5, unit: '일' } as const
    const praise = '식단 4일 성공했어요. 내일도 실천해요'
    expect(isValidLine(praise, diet)).toBe(false)
    expect(isValidLine('식단 4일째예요. 꾸준히 해요', diet)).toBe(false) // 현재 숫자뿐, 차이·목표 숫자 없음
    expect(isValidLine('식단 달성이 4일이에요. 1일만 더 맞춰요', diet)).toBe(true) // 차이
    expect(isValidLine('식단 달성이 4일이에요. 목표는 5일이에요', diet)).toBe(true) // 목표
    expect(resolveLines([diet], p, [praise])).toEqual(['식단 목표 달성이 4일이에요. 1일만 더 맞춰 봐요'])
  })

  it('항목별로 AI 문장이 통과하면 쓰고, 아니면 그 항목만 예시 문장', () => {
    const gaps = pickGaps('fat_loss', 'on_track', result(GOOD.fat_loss), { ...p, dietOnTrackDays: 4 })
    const lines = resolveLines(gaps, p, ['단백질이 62%예요. 38%를 더 채워요', '길이가 너무 길어서 탈락하는 문장입니다 숫자 4일 포함해도 탈락해요 정말로'])
    expect(lines[0]).toBe('단백질이 62%예요. 38%를 더 채워요')
    expect(lines[1]).toBe(exampleLine(gaps[1]!, p))
    expect(resolveLines(gaps, p, null)).toEqual(gaps.map((g) => exampleLine(g, p))) // 데모·실패
  })
})

describe('buildDiagnosis — 시연 데이터 기준', () => {
  const seed = buildSeedData(NOW, { targetKcal: 1920 })
  const d = buildDiagnosis({ goal: 'fat_loss', history: seed.inBodyHistory, meals: seed.meals, target: TARGET, workouts: seed.workoutHistory, now: NOW })

  it('식단은 인바디 측정일과 상관없이 어제까지 7일(7일 중 7일 기록, 5일 달성)', () => {
    expect(d.process).toMatchObject({ dietLoggedDays: 7, dietOnTrackDays: 5, workoutSessions: 9 })
  })
  it('인바디는 최근 구간(가장 최근 측정 vs 14일 이상 앞선 가장 가까운 측정)으로 비교', () => {
    expect(d.result).toMatchObject({ measurements: 2, periodDays: 21, weightDelta: -1.4, muscleDelta: 0.3, fatDelta: -1.7 })
  })
  describe('최근 구간 14일 규칙', () => {
    const DAY = 86_400_000
    const entry = (daysAgo: number, fat: number) => ({ ...seed.inBodyHistory[0]!, id: `e${daysAgo}`, timestamp: NOW - daysAgo * DAY, bodyFatMass: fat })
    const facts = (...e: ReturnType<typeof entry>[]) => buildResultFacts(e)
    it('14일 미만 간격은 건너뛰고 그보다 앞선 가장 가까운 측정과 비교', () => {
      const r = facts(entry(0, 30), entry(10, 31), entry(14, 32), entry(40, 36))!
      expect(r).toMatchObject({ measurements: 2, periodDays: 14, fatDelta: -2 })
    })
    it('13일 간격뿐이면 비교하지 않고 기록 부족으로 판정', () => {
      const r = facts(entry(0, 30), entry(13, 31))!
      expect(r).toMatchObject({ measurements: 1, fatDelta: null })
      expect(r.fromTimestamp).toBeUndefined()
      expect(decideVerdict('fat_loss', r, HIGH)).toBe('need_data')
    })
    it('측정이 하나도 없으면 null', () => expect(buildResultFacts([])).toBeNull())
  })
  it('링 달성률: 단백질·운동은 100% 상한, 종합은 평균', () => {
    expect(ringRates({ ...HIGH, dietOnTrackDays: 5, proteinPercent: 140, workoutSessions: 30 })).toMatchObject({ diet: 71, protein: 100, workout: 100, overall: 90, sessionsPerWeek: 10 })
    expect(ringRates({ ...LOW, proteinPercent: null })).toMatchObject({ diet: 14, protein: 0, workout: 33, sessionsPerWeek: 1 })
  })
  it('판정은 순조로워요이고 AI에게 보낼 본문은 판정·숫자뿐', () => {
    expect(d.verdict).toBe('on_track')
    expect(d.request).toEqual({ goalLabel: '체지방 감량', verdict: 'on_track', gaps: d.gaps })
    expect(JSON.stringify(d.request)).not.toContain(seed.meals[0]!.title)
  })
  it('목표가 없으면 체형 개선으로 본다', () => {
    expect(buildDiagnosis({ goal: null, history: [], meals: [], target: TARGET, workouts: [], now: NOW }).goalLabel).toBe('체형 개선')
  })
  it('기록이 전혀 없으면 비어 있다고 알려주고 판정은 기록 부족', () => {
    const e = buildDiagnosis({ goal: 'fat_loss', history: [], meals: [], target: TARGET, workouts: [], now: NOW })
    expect(isEmptyDiagnosis(e)).toBe(true)
    expect(e.verdict).toBe('need_data')
  })
  it('오늘 식단과 21일보다 오래된 운동은 세지 않는다', () => {
    const todayMeal = { ...seed.meals[0]!, id: 'today', timestamp: NOW }
    const old = { ...seed.workoutHistory[0]!, date: NOW - 40 * 86_400_000 }
    const e = buildDiagnosis({ goal: 'fat_loss', history: [], meals: [todayMeal], target: TARGET, workouts: [old], now: NOW })
    expect(e.process).toMatchObject({ dietLoggedDays: 0, workoutSessions: 0 })
  })
})
