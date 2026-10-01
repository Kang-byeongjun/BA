import { describe, expect, it } from 'vitest'
import { MEAL_COMBOS } from '../../data/mealCombos'
import { resolveMealCombo } from '../../services/nutritionService'
import type { NutritionTarget } from '../../types'
import { getRecommendedMeals } from '../nutrition'

const target: NutritionTarget = { calories: 2000, protein: 120, carbohydrates: 250, fat: 70, fiber: 30 }
const healthCareProfile = { goal: 'health_care' as const, gender: 'male' as const, bodyFatPercentage: null }

describe('resolveMealCombo', () => {
  it('재료 id+중량으로부터 실제 영양 수치를 계산한다(숫자를 지어내지 않는다)', () => {
    const combo = MEAL_COMBOS.find((c) => c.id === 'combo-chicken-rice-broccoli')
    if (!combo) throw new Error('combo not found')
    const resolved = resolveMealCombo(combo)

    // 닭가슴살 120g(37.2) + 현미밥 150g(4.8) + 브로콜리 80g(2.24) = 44.24 → 44
    expect(resolved.nutrients.protein).toBe(44)
    expect(resolved.ingredients).toEqual([
      { name: '닭가슴살', amount: '120g' },
      { name: '현미밥', amount: '150g' },
      { name: '브로콜리', amount: '80g' },
    ])
  })
})

describe('getRecommendedMeals', () => {
  it('가장 부족한 영양소를 기준으로 추천하고, 최대 3개를 반환한다', () => {
    const consumed = { calories: 500, protein: 10, carbohydrates: 200, fat: 60, fiber: 25 }
    const result = getRecommendedMeals(consumed, target, healthCareProfile, [])
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(3)
    expect(result[0].primaryNutrient).toBe('protein')
  })

  it('모든 영양소를 채웠으면 네 매크로 전체에서 추천한다', () => {
    const consumed = { calories: 2000, protein: 120, carbohydrates: 250, fat: 70, fiber: 30 }
    const result = getRecommendedMeals(consumed, target, healthCareProfile, [])
    expect(result.length).toBeGreaterThan(0)
  })

  it('오늘 이미 먹은 재료로만 구성된 조합은 제외한다', () => {
    const consumed = { calories: 500, protein: 10, carbohydrates: 200, fat: 60, fiber: 25 }
    // combo-salmon-salad = 연어 + 그린샐러드. 둘 다 이미 먹었다면 그 조합은 추천하지 않는다.
    const result = getRecommendedMeals(consumed, target, healthCareProfile, ['연어', '그린샐러드'])
    expect(result.some((r) => r.id === 'combo-salmon-salad')).toBe(false)
  })

  it('같은 입력이면 같은 날 안에서는 같은 추천을 반환한다(결정적 셔플)', () => {
    const consumed = { calories: 500, protein: 10, carbohydrates: 200, fat: 60, fiber: 25 }
    const first = getRecommendedMeals(consumed, target, healthCareProfile, [])
    const second = getRecommendedMeals(consumed, target, healthCareProfile, [])
    expect(first.map((r) => r.id)).toEqual(second.map((r) => r.id))
  })

  it('결과에 primaryNutrient 기준 달성률(deficiencyPercent)을 포함한다', () => {
    const consumed = { calories: 500, protein: 10, carbohydrates: 200, fat: 60, fiber: 25 }
    const result = getRecommendedMeals(consumed, target, healthCareProfile, [])
    expect(result[0].deficiencyPercent).toBe(Math.round((10 / 120) * 100))
  })

  it('체지방률이 높고 목적이 체지방감량이면 지방보다 단백질 조합을 우선한다', () => {
    // 탄수화물(80%)·지방(85.7%)보다 단백질(91.7%)이 수치상으로는 덜 부족하지만,
    // 체지방률이 높은 체지방감량 목적이면 단백질을 저탄고단 쪽으로 우선시켜야 한다.
    const consumed = { calories: 1500, protein: 110, carbohydrates: 200, fat: 60, fiber: 25 }
    const fatLossHighBodyFat = { goal: 'fat_loss' as const, gender: 'male' as const, bodyFatPercentage: 28 }
    const result = getRecommendedMeals(consumed, target, fatLossHighBodyFat, [])
    expect(result[0].primaryNutrient).toBe('protein')
  })

  it('체지방률이 낮으면 보정을 적용하지 않는다(그대로 달성률 낮은 순)', () => {
    const consumed = { calories: 1500, protein: 110, carbohydrates: 200, fat: 60, fiber: 25 }
    const fatLossLowBodyFat = { goal: 'fat_loss' as const, gender: 'male' as const, bodyFatPercentage: 15 }
    const result = getRecommendedMeals(consumed, target, fatLossLowBodyFat, [])
    expect(result[0].primaryNutrient).toBe('carbohydrates')
  })
})
