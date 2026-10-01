import type { FoodExtraction, InBodyExtraction } from '../../shared/analysis'
import type { Meal, NutritionTarget, RecommendedFood, UserProfile, WorkoutProfile } from '../types'

/**
 * Mock 데이터 모음.
 *
 * - DEMO_*, buildDemoMeals  : 데모 모드 시작 프리셋 (온보딩 없이 바로 체험)
 * - FOOD_ANALYSIS_MOCKS 등 : 데모 모드 전용 AI 분석 결과. 실제 AI 모드에서는 사용하지 않는다.
 * - RECOMMENDATION_FOODS   : 규칙 기반 추천 음식 풀
 */

// ---------------------------------------------------------------------------
// 데모 모드: 온보딩을 건너뛰고 바로 체험할 수 있는 프리셋
// ---------------------------------------------------------------------------

export const DEMO_PROFILE: UserProfile = {
  goal: 'fat_loss',
  gender: 'male',
  age: 29,
  height: 175,
  weight: 75,
  skeletalMuscleMass: 34,
  bodyFatMass: 13.5,
  bodyFatPercentage: 18,
  bodyWater: 43.0,
  proteinMass: 13.5,
  mineralMass: 4.5,
  basalMetabolicRate: 1650,
  basalMetabolicRateEstimated: false,
}

export const DEMO_NUTRITION_TARGET: NutritionTarget = {
  calories: 2100,
  protein: 130,
  carbohydrates: 240,
  fat: 60,
  fiber: 28,
}

export const DEMO_WORKOUT_PROFILE: WorkoutProfile = {
  goal: 'fat_loss',
  experience: 'intermediate',
  weeklyFrequency: 3,
  sessionDuration: 60,
  painAreas: [],
}

// 데모 모드 시작 시 이미 기록되어 있는 오늘의 식사 (아침 + 점심)
export function buildDemoMeals(): Meal[] {
  const now = new Date()
  const at = (h: number, m: number) => {
    const d = new Date(now)
    d.setHours(h, m, 0, 0)
    return d.getTime()
  }

  return [
    {
      id: 'demo-meal-breakfast',
      timestamp: at(8, 30),
      slot: '아침',
      title: '그릭요거트 + 바나나',
      image: null,
      foods: [
        { name: '그릭요거트', amount: '150g', calories: 130, protein: 15, carbohydrates: 8, fat: 4, fiber: 0 },
        { name: '바나나', amount: '1개(120g)', calories: 190, protein: 5, carbohydrates: 37, fat: 2, fiber: 3 },
      ],
      calories: 320,
      protein: 20,
      carbohydrates: 45,
      fat: 6,
      fiber: 3,
    },
    {
      id: 'demo-meal-lunch',
      timestamp: at(12, 40),
      slot: '점심',
      title: '치킨 라이스 볼',
      image: null,
      foods: [
        { name: '닭가슴살', amount: '150g', calories: 250, protein: 40, carbohydrates: 0, fat: 6, fiber: 0 },
        { name: '현미밥', amount: '210g', calories: 370, protein: 8, carbohydrates: 70, fat: 9, fiber: 6 },
      ],
      calories: 620,
      protein: 48,
      carbohydrates: 70,
      fat: 15,
      fiber: 6,
    },
  ]
}

// ---------------------------------------------------------------------------
// 데모 모드 전용 AI 분석 Mock — 실제 AI 모드에서는 절대 사용되지 않는다.
// 실제 API와 같은 응답 형태(shared/analysis.ts)로 만들어 두었고, 영양소 숫자는 포함하지 않는다
// (영양 계산은 nutritionService가 담당).
// ---------------------------------------------------------------------------

export const FOOD_ANALYSIS_MOCKS: FoodExtraction[] = [
  {
    isFood: true,
    mealName: '닭가슴살 현미밥 브로콜리',
    foods: [
      { name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.91 },
      { name: '현미밥', estimatedGrams: 180, cookingMethod: null, confidence: 0.84 },
      { name: '브로콜리', estimatedGrams: 80, cookingMethod: 'steamed', confidence: 0.8 },
    ],
    overallConfidence: 0.85,
    warnings: [],
  },
  {
    isFood: true,
    mealName: '연어 포케',
    foods: [
      { name: '연어', estimatedGrams: 130, cookingMethod: 'raw', confidence: 0.88 },
      { name: '현미밥', estimatedGrams: 150, cookingMethod: null, confidence: 0.8 },
      { name: '아보카도', estimatedGrams: 100, cookingMethod: 'raw', confidence: 0.76 },
    ],
    overallConfidence: 0.82,
    warnings: [],
  },
  {
    isFood: true,
    mealName: '제육볶음 + 밥',
    foods: [
      { name: '제육볶음', estimatedGrams: 200, cookingMethod: 'stir-fried', confidence: 0.86 },
      { name: '흰쌀밥', estimatedGrams: 210, cookingMethod: null, confidence: 0.9 },
    ],
    overallConfidence: 0.87,
    warnings: [],
  },
]

export function getMockFoodExtraction(): FoodExtraction {
  const index = Math.floor(Math.random() * FOOD_ANALYSIS_MOCKS.length)
  return FOOD_ANALYSIS_MOCKS[index]
}

export const INBODY_ANALYSIS_MOCKS: InBodyExtraction[] = [
  {
    isInBodyReport: true,
    weightKg: 72,
    skeletalMuscleMassKg: 33.2,
    bodyFatMassKg: 14.5,
    bodyFatPercentage: 17.8,
    bodyWaterL: 41.0,
    proteinMassKg: 12.5,
    mineralMassKg: 4.0,
    bmi: 23.5,
    basalMetabolicRateKcal: 1620,
    confidence: 0.95,
    warnings: [],
  },
  {
    isInBodyReport: true,
    weightKg: 56,
    skeletalMuscleMassKg: 22.4,
    bodyFatMassKg: 14.1,
    bodyFatPercentage: 24.6,
    bodyWaterL: 28.0,
    proteinMassKg: 9.5,
    mineralMassKg: 4.4,
    bmi: 21.3,
    basalMetabolicRateKcal: 1310,
    confidence: 0.95,
    warnings: [],
  },
  {
    isInBodyReport: true,
    weightKg: 85,
    skeletalMuscleMassKg: 38.9,
    bodyFatMassKg: 20.2,
    bodyFatPercentage: 22.1,
    bodyWaterL: 46.0,
    proteinMassKg: 15.0,
    mineralMassKg: 3.8,
    bmi: 26.2,
    basalMetabolicRateKcal: 1780,
    confidence: 0.95,
    warnings: [],
  },
]

export function getMockInBodyExtraction(): InBodyExtraction {
  const index = Math.floor(Math.random() * INBODY_ANALYSIS_MOCKS.length)
  return INBODY_ANALYSIS_MOCKS[index]
}

// ---------------------------------------------------------------------------
// 부족 영양소 기반 추천 음식 풀
// ---------------------------------------------------------------------------

export const RECOMMENDATION_FOODS: RecommendedFood[] = [
  { id: 'egg', name: '달걀', emoji: '🥚', nutrient: 'protein', amount: 6 },
  { id: 'chicken', name: '닭가슴살', emoji: '🐔', nutrient: 'protein', amount: 25 },
  { id: 'tofu', name: '두부', emoji: '🍲', nutrient: 'protein', amount: 10 },
  { id: 'greekyogurt', name: '그릭요거트', emoji: '🥣', nutrient: 'protein', amount: 12 },
  { id: 'broccoli', name: '브로콜리', emoji: '🥦', nutrient: 'fiber', amount: 3 },
  { id: 'sweetpotato', name: '고구마', emoji: '🍠', nutrient: 'fiber', amount: 4 },
  { id: 'oats', name: '오트밀', emoji: '🌾', nutrient: 'fiber', amount: 4 },
  { id: 'apple', name: '사과', emoji: '🍎', nutrient: 'fiber', amount: 3 },
  { id: 'banana', name: '바나나', emoji: '🍌', nutrient: 'carbohydrates', amount: 27 },
  { id: 'rice', name: '현미밥 반공기', emoji: '🍚', nutrient: 'carbohydrates', amount: 35 },
  { id: 'avocado', name: '아보카도', emoji: '🥑', nutrient: 'fat', amount: 15 },
  { id: 'nuts', name: '아몬드 한 줌', emoji: '🥜', nutrient: 'fat', amount: 14 },
]
