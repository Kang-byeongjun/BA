import { describe, expect, it } from 'vitest'
import type { FoodExtraction } from '../../../shared/analysis'
import { FOOD_DATABASE } from '../../data/foodDatabase'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { buildMeal, createEmptyRow, createRowsFromExtraction, summarizeRows } from '../mealService'
import { calculateNutrients, localNutritionProvider, roundNutrients, sumNutrients } from '../nutritionService'
import { generateNutritionTarget, mergeInBodyMeasurements } from '../nutritionTargetService'
import { DEMO_PROFILE } from '../../data/mockData'

const extraction: FoodExtraction = {
  isFood: true,
  mealName: '닭가슴살 현미밥 브로콜리',
  foods: [
    { name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.91 },
    { name: '현미밥', estimatedGrams: 180, cookingMethod: null, confidence: 0.84 },
    { name: '브로콜리', estimatedGrams: 70, cookingMethod: 'steamed', confidence: 0.8 },
  ],
  overallConfidence: 0.85,
  warnings: [],
}

describe('nutritionService: 이름 → 영양 DB 연결', () => {
  it('정확히 일치하는 이름을 연결한다', () => {
    expect(localNutritionProvider.match('닭가슴살')).toMatchObject({ matchType: 'exact', entry: { id: 'chicken-breast' } })
    expect(localNutritionProvider.match('현미밥')).toMatchObject({ matchType: 'exact', entry: { id: 'brown-rice' } })
  })

  it('띄어쓰기/기호 차이는 무시한다', () => {
    expect(localNutritionProvider.match('연어 포케').entry?.id).toBe('poke-salmon')
    expect(localNutritionProvider.match('BLT 샌드위치').entry?.id).toBe('blt-sandwich')
  })

  it('별칭을 연결한다', () => {
    expect(localNutritionProvider.match('계란')).toMatchObject({ matchType: 'exact', entry: { id: 'egg' } })
    expect(localNutritionProvider.match('공기밥')).toMatchObject({ matchType: 'exact', entry: { id: 'white-rice' } })
  })

  it('수식어가 붙은 이름은 부분 일치로 연결한다', () => {
    expect(localNutritionProvider.match('구운 닭가슴살')).toMatchObject({ matchType: 'partial', entry: { id: 'chicken-breast' } })
  })

  it('DB에 없는 음식은 임의로 만들지 않고 none을 반환한다', () => {
    expect(localNutritionProvider.match('정체불명 특별 메뉴')).toEqual({ entry: null, matchType: 'none' })
    expect(localNutritionProvider.match('')).toEqual({ entry: null, matchType: 'none' })
  })
})

describe('nutritionService: 계산', () => {
  it('100g당 영양소 × 중량으로 계산한다', () => {
    const chicken = FOOD_DATABASE.find((f) => f.id === 'chicken-breast')!
    const n = calculateNutrients(chicken, 120)
    expect(n.calories).toBeCloseTo(198)
    expect(n.protein).toBeCloseTo(37.2)
  })

  it('중량을 바꾸면 영양소가 비례해서 다시 계산된다', () => {
    const rice = FOOD_DATABASE.find((f) => f.id === 'brown-rice')!
    expect(calculateNutrients(rice, 200).calories).toBeCloseTo(calculateNutrients(rice, 100).calories * 2)
    expect(calculateNutrients(rice, 0).calories).toBe(0)
  })

  it('합산 후 반올림한다', () => {
    const total = roundNutrients(
      sumNutrients([
        { calories: 10.4, protein: 1.4, carbohydrates: 1.4, fat: 1.4, fiber: 1.4 },
        { calories: 10.4, protein: 1.4, carbohydrates: 1.4, fat: 1.4, fiber: 1.4 },
      ]),
    )
    expect(total).toEqual({ calories: 21, protein: 3, carbohydrates: 3, fat: 3, fiber: 3 })
  })
})

describe('mealService', () => {
  it('AI 분석 결과(음식+중량)를 행으로 바꾸고 영양 DB와 연결한다', () => {
    const rows = createRowsFromExtraction(extraction)
    expect(rows.map((r) => [r.name, r.grams, r.entry?.id])).toEqual([
      ['닭가슴살', 120, 'chicken-breast'],
      ['현미밥', 180, 'brown-rice'],
      ['브로콜리', 70, 'broccoli'],
    ])
    const summary = summarizeRows(rows)
    expect(summary.unresolvedCount).toBe(0)
    // 198 + 273.6 + 23.8 = 495.4
    expect(summary.totals.calories).toBe(495)
  })

  it('중량을 수정하면 총 영양소가 다시 계산된다', () => {
    const rows = createRowsFromExtraction(extraction)
    const before = summarizeRows(rows).totals.calories
    const edited = rows.map((r) => (r.name === '현미밥' ? { ...r, grams: 90 } : r))
    const after = summarizeRows(edited).totals.calories
    expect(after).toBeLessThan(before)
    // 현미밥 90g 감소분 ≈ 137kcal (반올림 오차 ±1 허용)
    expect(Math.abs(before - after - 137)).toBeLessThanOrEqual(1)
  })

  it('영양 정보를 찾지 못한 음식은 계산에서 빠지고 unresolved로 집계된다', () => {
    const rows = createRowsFromExtraction({ ...extraction, foods: [...extraction.foods, { name: '정체불명 요리', estimatedGrams: 100, cookingMethod: null, confidence: 0.3 }] })
    const summary = summarizeRows(rows)
    expect(summary.unresolvedCount).toBe(1)
    expect(() => buildMeal({ title: 't', slot: '점심', rows, thumbnail: null })).toThrow()
  })

  it('이름이 비어있는 행은 무시한다', () => {
    const rows = [...createRowsFromExtraction(extraction), createEmptyRow()]
    const summary = summarizeRows(rows)
    expect(summary.activeCount).toBe(3)
    expect(summary.unresolvedCount).toBe(0)
  })

  it('식사 기록(Meal)을 만든다 — 총합은 화면 표시값과 같다', () => {
    const rows = createRowsFromExtraction(extraction)
    const meal = buildMeal({ title: '  ', slot: '저녁', rows, thumbnail: 'data:image/jpeg;base64,xx' })
    const totals = summarizeRows(rows).totals
    expect(meal).toMatchObject({ title: '식사 기록', slot: '저녁', image: 'data:image/jpeg;base64,xx', ...totals })
    expect(meal.foods.map((f) => f.amount)).toEqual(['120g', '180g', '70g'])
    expect(meal.foods).toHaveLength(3)
  })
})

describe('nutritionTargetService', () => {
  it('InBody 측정값 중 값이 있는 항목만 프로필에 반영한다', () => {
    const merged = mergeInBodyMeasurements(DEMO_PROFILE, {
      weight: 80,
      skeletalMuscleMass: null,
      bodyFatMass: null,
      bodyFatPercentage: 20.5,
      bodyWater: null,
      proteinMass: null,
      mineralMass: null,
      basalMetabolicRate: 1800,
    })
    expect(merged).toMatchObject({ weight: 80, bodyFatPercentage: 20.5, basalMetabolicRate: 1800 })
    expect(merged.skeletalMuscleMass).toBe(DEMO_PROFILE.skeletalMuscleMass)
    expect(merged.bodyFatMass).toBe(DEMO_PROFILE.bodyFatMass)
  })

  it('InBody 데이터나 목표가 바뀌면 목표가 달라진다', () => {
    const base = generateNutritionTarget(DEMO_PROFILE)
    const heavier = generateNutritionTarget({ ...DEMO_PROFILE, weight: 90, basalMetabolicRate: 1900 })
    const muscle = generateNutritionTarget({ ...DEMO_PROFILE, goal: 'muscle_gain' })
    expect(heavier.protein).toBeGreaterThan(base.protein)
    expect(heavier.calories).toBeGreaterThan(base.calories)
    expect(muscle.calories).toBeGreaterThan(base.calories)
  })
})

describe('AI 분석 방식 결정', () => {
  it('mock은 데모 모드에서 mock을 선택했을 때만 사용한다', () => {
    expect(resolveAnalysisMode(true, 'mock')).toBe('mock')
    expect(resolveAnalysisMode(true, 'real')).toBe('real')
    // 데모가 아니면 저장된 값이 mock이어도 항상 실제 AI
    expect(resolveAnalysisMode(false, 'mock')).toBe('real')
    expect(resolveAnalysisMode(false, 'real')).toBe('real')
  })
})
