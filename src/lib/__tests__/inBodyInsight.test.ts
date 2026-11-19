import { describe, expect, it } from 'vitest'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../../types'
import { buildDietInBodyInsight, daysUntilNextMeasurement } from '../inBodyInsight'

const target: NutritionTarget = { calories: 2000, protein: 120, carbohydrates: 250, fat: 70, fiber: 30 }

function entry(daysAgo: number, weight: number | null): InBodyHistoryEntry {
  return {
    id: `entry-${daysAgo}`,
    timestamp: Date.now() - daysAgo * 86_400_000,
    source: 'manual',
    weight,
    skeletalMuscleMass: null,
    bodyFatMass: null,
    bodyFatPercentage: null,
    bodyWater: null,
    proteinMass: null,
    mineralMass: null,
    basalMetabolicRate: null,
    bodyType: null,
  }
}

function mealOn(daysAgo: number, calories: number): Meal {
  return {
    id: `meal-${daysAgo}`,
    timestamp: Date.now() - daysAgo * 86_400_000,
    slot: '점심',
    title: '테스트 식사',
    image: null,
    foods: [],
    calories,
    protein: 20,
    carbohydrates: 50,
    fat: 10,
    fiber: 5,
    hasLowConfidencePortions: false,
  }
}

describe('buildDietInBodyInsight — 두 측정 사이 식단 준수와 체중 변화를 한 문장으로 엮는다', () => {
  it('체중이 줄었으면 줄었다고 말해준다', () => {
    const latest = entry(0, 68)
    const comparison = entry(14, 70)
    const meals = [mealOn(0, 2000), mealOn(7, 2000)]
    const insight = buildDietInBodyInsight(meals, target, latest, comparison)
    expect(insight?.message).toContain('2kg 줄었어요')
    expect(insight?.totalDays).toBe(15) // 14일 전 ~ 오늘, 양끝 포함
  })

  it('체중이 늘었으면 늘었다고 말해준다', () => {
    const latest = entry(0, 71)
    const comparison = entry(14, 70)
    const insight = buildDietInBodyInsight([], target, latest, comparison)
    expect(insight?.message).toContain('1kg 늘었어요')
  })

  it('둘 중 하나라도 체중이 없으면 비교할 수 없다', () => {
    const latest = entry(0, null)
    const comparison = entry(14, 70)
    expect(buildDietInBodyInsight([], target, latest, comparison)).toBeNull()
  })

  it('적정 섭취일 수를 센다', () => {
    const latest = entry(0, 70)
    const comparison = entry(2, 70)
    // 2일 전(deficient), 1일 전(기록 없음 → none), 오늘(near_goal) = 3일 중 1일만 적정
    const meals = [mealOn(2, 500), mealOn(0, 2000)]
    const insight = buildDietInBodyInsight(meals, target, latest, comparison)
    expect(insight?.onTrackDays).toBe(1)
    expect(insight?.totalDays).toBe(3)
  })
})

describe('daysUntilNextMeasurement — 2주 주기 기준 다음 측정까지 남은 일수', () => {
  it('막 측정했으면 14일 남았다', () => {
    expect(daysUntilNextMeasurement(Date.now())).toBe(14)
  })

  it('이미 2주가 지났으면 0을 반환한다', () => {
    expect(daysUntilNextMeasurement(Date.now() - 20 * 86_400_000)).toBe(0)
  })

  it('7일 지났으면 7일 남았다', () => {
    expect(daysUntilNextMeasurement(Date.now() - 7 * 86_400_000)).toBe(7)
  })
})
