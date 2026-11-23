import { describe, expect, it } from 'vitest'
import { buildDemoMeals, DEMO_NUTRITION_TARGET } from '../../data/mockData'
import type { InBodyHistoryEntry } from '../../types'
import { getInBodySummaryLine, getMonthGoalSummary, getWeekNutritionSummaryLine, getWeekProteinSummary } from '../dashboardSummaries'

describe('getMonthGoalSummary / getWeekProteinSummary', () => {
  it('기록이 없으면 0과 null', () => {
    expect(getMonthGoalSummary([], DEMO_NUTRITION_TARGET)).toEqual({ loggedDays: 0, metDays: 0 })
    expect(getWeekProteinSummary([], DEMO_NUTRITION_TARGET)).toEqual({ avgProtein: null, metDays: 0 })
  })
  it('오늘 기록이 있으면 기록한 날과 단백질 평균이 계산된다', () => {
    const meals = buildDemoMeals()
    expect(getMonthGoalSummary(meals, DEMO_NUTRITION_TARGET).loggedDays).toBeGreaterThan(0)
    const w = getWeekProteinSummary(meals, DEMO_NUTRITION_TARGET)
    expect(w.avgProtein).toBeGreaterThan(0)
    expect(Number.isFinite(w.avgProtein)).toBe(true)
  })
})

const entry = (t: number, weight: number | null, muscle: number | null): InBodyHistoryEntry =>
  ({ id: `e${t}`, timestamp: t, weight, skeletalMuscleMass: muscle }) as InBodyHistoryEntry
const DAY = 86_400_000

describe('getInBodySummaryLine', () => {
  it('기록이 없으면 null', () => expect(getInBodySummaryLine([])).toBeNull())
  it('측정이 1회면 비교 없이 체중만', () => expect(getInBodySummaryLine([entry(DAY * 30, 70, 30)])).toBe('체중 70kg · 비교할 이전 측정 없음'))
  it('2회 이상이면 체중·골격근 변화', () => {
    expect(getInBodySummaryLine([entry(DAY * 30, 69.2, 30.5), entry(DAY * 16, 70, 30)])).toBe('체중 -0.8kg · 골격근 +0.5kg')
  })
  it('한쪽 값이 비어 있으면 있는 값만', () => {
    expect(getInBodySummaryLine([entry(DAY * 30, 69, null), entry(DAY * 16, 70, 30)])).toBe('체중 -1kg')
  })
})

describe('getWeekNutritionSummaryLine', () => {
  it('이번 주 식사 기록이 없으면 안내 문구만 보여준다(0/7일 같은 숫자 없음)', () => {
    expect(getWeekNutritionSummaryLine([], DEMO_NUTRITION_TARGET)).toBe('이번 주 식사 기록이 아직 없어요')
  })
  it('지난주 기록만 있어도 이번 주 기록이 없으면 안내 문구', () => {
    const lastWeek = buildDemoMeals().map((m) => ({ ...m, timestamp: m.timestamp - 8 * 86_400_000 }))
    expect(getWeekNutritionSummaryLine(lastWeek, DEMO_NUTRITION_TARGET)).toBe('이번 주 식사 기록이 아직 없어요')
  })
  it('기록이 있으면 단백질 평균과 목표 달성 일수를 보여준다', () => {
    expect(getWeekNutritionSummaryLine(buildDemoMeals(), DEMO_NUTRITION_TARGET)).toMatch(/^이번 주 단백질 평균 \d+g · 목표 달성 \d\/7일$/)
  })
})
