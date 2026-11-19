import { describe, expect, it } from 'vitest'
import { buildInBodyAdvice } from '../inBodyAdvice'
import type { Meal, NutritionTarget } from '../../types'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.now()

const TARGET: NutritionTarget = { calories: 2000, protein: 130, carbohydrates: 220, fat: 60, fiber: 25 }

function meal(daysAgo: number, overrides: Partial<Meal> = {}): Meal {
  return {
    id: `meal-${daysAgo}-${Math.random()}`,
    timestamp: NOW - daysAgo * DAY_MS,
    slot: '점심',
    title: '테스트 식사',
    image: null,
    foods: [],
    calories: 600,
    protein: 40,
    carbohydrates: 60,
    fat: 15,
    fiber: 5,
    hasLowConfidencePortions: false,
    ...overrides,
  }
}

describe('buildInBodyAdvice', () => {
  it('bodyType이 null이면 조언도 null이다', () => {
    expect(buildInBodyAdvice(null, [], TARGET, NOW)).toBeNull()
  })

  it('I자형은 긍정적인 한 줄만 주고 별도 tip은 없다', () => {
    const advice = buildInBodyAdvice('I', [], TARGET, NOW)
    expect(advice?.tone).toBe('good')
    expect(advice?.tips).toEqual([])
  })

  it('D자형이고 최근 평균 칼로리가 목표보다 충분히 낮으면 섭취를 더 챙기라고 알려준다', () => {
    const meals = [meal(1, { calories: 1200, protein: 60 }), meal(2, { calories: 1200, protein: 60 })]
    const advice = buildInBodyAdvice('D', meals, TARGET, NOW)
    expect(advice?.tone).toBe('good')
    expect(advice?.tips[0]).toContain('근육량을 유지하려면')
    expect(advice?.tips[0]).toContain('1200kcal')
  })

  it('D자형이고 섭취가 충분하면 tip 없이 긍정 메시지만 준다', () => {
    const meals = [meal(1, { calories: 2000, protein: 130 })]
    const advice = buildInBodyAdvice('D', meals, TARGET, NOW)
    expect(advice?.tone).toBe('good')
    expect(advice?.tips).toEqual([])
  })

  it('C자형이고 칼로리 초과·단백질 부족이면 둘 다 짚어준다', () => {
    const meals = [meal(1, { calories: 2600, protein: 60 }), meal(2, { calories: 2500, protein: 70 })]
    const advice = buildInBodyAdvice('C', meals, TARGET, NOW)
    expect(advice?.tone).toBe('caution')
    expect(advice?.tips.length).toBe(2)
    expect(advice?.tips[0]).toContain('섭취량을 줄이거나')
    expect(advice?.tips[1]).toContain('단백질을 충분히')
  })

  it('C자형이고 식단 기록이 목표 범위 안이면 운동을 늘리라고 제안한다', () => {
    const meals = [meal(1, { calories: 1950, protein: 125 })]
    const advice = buildInBodyAdvice('C', meals, TARGET, NOW)
    expect(advice?.tone).toBe('caution')
    expect(advice?.tips.length).toBe(1)
    expect(advice?.tips[0]).toContain('운동량')
  })

  it('C자형이고 최근 식단 기록이 없으면 기록을 유도하는 tip을 준다', () => {
    const advice = buildInBodyAdvice('C', [], TARGET, NOW)
    expect(advice?.tone).toBe('caution')
    expect(advice?.tips[0]).toContain('식단을 기록하면')
  })

  it('7일보다 오래된 식사 기록은 평균 계산에서 제외한다', () => {
    const meals = [meal(30, { calories: 100, protein: 5 })]
    const advice = buildInBodyAdvice('C', meals, TARGET, NOW)
    // 최근 기록이 없는 것으로 취급되어 "기록하면" 안내가 나와야 한다
    expect(advice?.tips[0]).toContain('식단을 기록하면')
  })
})
