import { describe, expect, it } from 'vitest'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../../types'
import { buildDietInBodyInsight } from '../inBodyInsight'

const target: NutritionTarget = { calories: 2000, protein: 120, carbohydrates: 250, fat: 70, fiber: 30 }
const DAY = 86_400_000

function entry(daysAgo: number, body: { weight: number; muscle: number | null; fat: number | null }): InBodyHistoryEntry {
  return {
    id: `e${daysAgo}`,
    timestamp: Date.now() - daysAgo * DAY,
    source: 'scan',
    weight: body.weight,
    skeletalMuscleMass: body.muscle,
    bodyFatMass: body.fat,
    bodyFatPercentage: null,
    bodyWater: null,
    proteinMass: null,
    mineralMass: null,
    basalMetabolicRate: null,
    bodyType: null,
    standardRanges: null,
  }
}

function mealOn(daysAgo: number): Meal {
  return {
    id: `m${daysAgo}`,
    timestamp: Date.now() - daysAgo * DAY,
    slot: '점심',
    title: '식사',
    image: null,
    foods: [],
    calories: 2000,
    protein: 20,
    carbohydrates: 50,
    fat: 10,
    fiber: 5,
    hasLowConfidencePortions: false,
  }
}

const meals = [mealOn(3), mealOn(1)]

describe('식단 × 인바디 문장 규칙', () => {
  it('근육 감소형: 체중·골격근량이 같이 줄고 체지방이 늘면 그대로 알려준다 (식단 기록 없음 포함)', () => {
    const latest = entry(0, { weight: 68.4, muscle: 28.4, fat: 17.3 })
    const comparison = entry(11, { weight: 70, muscle: 30, fat: 16 })
    const msg = buildDietInBodyInsight([], target, latest, comparison)?.message
    expect(msg).toBe('이 기간에는 식단 기록이 없어요. 체중은 1.6kg 줄었지만 골격근량도 1.6kg 줄었어요. 체지방량은 1.3kg 늘었어요.')
    expect(msg).not.toContain('0/')
  })

  it('근육 감소형인데 식단 기록이 있으면 목표 준수 문구와 함께 보여준다', () => {
    const latest = entry(0, { weight: 68.4, muscle: 28.4, fat: 15 })
    const comparison = entry(11, { weight: 70, muscle: 30, fat: 16 })
    const msg = buildDietInBodyInsight(meals, target, latest, comparison)?.message
    expect(msg).toMatch(/^이 기간 기록한 2일 중 \d+일 목표를 지켰고, 체중은 1\.6kg 줄었지만 골격근량도 1\.6kg 줄었어요\.$/)
  })

  it('골격근 감소가 0.5kg 미만이어도 체중 감소의 절반 이상이면 근육 감소로 본다', () => {
    const latest = entry(0, { weight: 69.2, muscle: 29.6, fat: null }) // 체중 -0.8, 근육 -0.4 (정확히 절반)
    const comparison = entry(11, { weight: 70, muscle: 30, fat: null })
    expect(buildDietInBodyInsight(meals, target, latest, comparison)?.message).toContain('골격근량도 0.4kg 줄었어요')
  })

  it('정상 감량형: 골격근량이 유지되거나 늘면 지금처럼 긍정 문장을 쓴다', () => {
    const latest = entry(0, { weight: 68, muscle: 30.2, fat: 14 })
    const comparison = entry(11, { weight: 70, muscle: 30, fat: 16 })
    const msg = buildDietInBodyInsight(meals, target, latest, comparison)?.message
    expect(msg).toMatch(/^이 기간 기록한 2일 중 \d+일 목표를 지켰고, 체중이 2kg 줄었어요\.$/)
    expect(msg).not.toContain('골격근')
  })

  it('골격근 감소가 작고 체중 감소 대비 비중도 작으면 근육 감소로 보지 않는다', () => {
    const latest = entry(0, { weight: 66, muscle: 29.8, fat: 12 }) // 체중 -4, 근육 -0.2
    const comparison = entry(11, { weight: 70, muscle: 30, fat: 16 })
    expect(buildDietInBodyInsight(meals, target, latest, comparison)?.message).toContain('체중이 4kg 줄었어요')
  })

  it('식단 기록 없음: 정상 감량이어도 "0/N일" 대신 기록이 없다고 알린다', () => {
    const latest = entry(0, { weight: 68, muscle: 30, fat: 14 })
    const comparison = entry(11, { weight: 70, muscle: 30, fat: 16 })
    expect(buildDietInBodyInsight([], target, latest, comparison)?.message).toBe('이 기간에는 식단 기록이 없어요. 체중이 2kg 줄었어요.')
  })

  it('골격근량 값이 없으면 기존 문장을 쓴다', () => {
    const latest = entry(0, { weight: 68, muscle: null, fat: null })
    const comparison = entry(11, { weight: 70, muscle: 30, fat: null })
    expect(buildDietInBodyInsight(meals, target, latest, comparison)?.message).toContain('체중이 2kg 줄었어요')
  })

  it('분모는 기간 전체 일수가 아니라 식단을 기록한 날 수다 (캘린더와 같은 기준)', () => {
    const latest = entry(0, { weight: 68, muscle: 30, fat: 14 })
    const comparison = entry(11, { weight: 70, muscle: 30, fat: 16 })
    const insight = buildDietInBodyInsight(meals, target, latest, comparison)
    expect(insight?.totalDays).toBe(12) // 기간 전체는 그대로 12일
    expect(insight?.message).toContain('기록한 2일 중 ')
    expect(insight?.message).not.toContain('/12')
    expect(insight?.message).toContain(`2일 중 ${insight?.onTrackDays}일 목표를 지켰고`)
  })
})
