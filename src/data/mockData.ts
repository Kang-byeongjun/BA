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
// 1인분 기준 섭취량을 가정해 src/data/foodDatabase.ts의 100g당 수치로부터 계산했다.
// ---------------------------------------------------------------------------

export const RECOMMENDATION_FOODS: RecommendedFood[] = [
  // 단백질
  { id: 'egg', name: '달걀 1개', emoji: '🥚', nutrient: 'protein', amount: 6 },
  { id: 'chicken-breast', name: '닭가슴살', emoji: '🍗', nutrient: 'protein', amount: 31 },
  { id: 'tofu', name: '두부 반모', emoji: '🥢', nutrient: 'protein', amount: 12 },
  { id: 'greek-yogurt', name: '그릭요거트', emoji: '🥣', nutrient: 'protein', amount: 14 },
  { id: 'salmon', name: '연어', emoji: '🐟', nutrient: 'protein', amount: 24 },
  { id: 'tuna-can', name: '참치캔', emoji: '🥫', nutrient: 'protein', amount: 28 },
  { id: 'shrimp', name: '새우', emoji: '🦐', nutrient: 'protein', amount: 24 },
  { id: 'beef-tenderloin', name: '소고기 안심', emoji: '🥩', nutrient: 'protein', amount: 30 },
  { id: 'pork-tenderloin', name: '돼지고기 안심', emoji: '🐖', nutrient: 'protein', amount: 25 },
  { id: 'edamame', name: '에다마메', emoji: '🫛', nutrient: 'protein', amount: 11 },

  // 식이섬유
  { id: 'broccoli', name: '브로콜리', emoji: '🥦', nutrient: 'fiber', amount: 3 },
  { id: 'sweet-potato', name: '고구마 1개', emoji: '🍠', nutrient: 'fiber', amount: 5 },
  { id: 'apple', name: '사과 1개', emoji: '🍎', nutrient: 'fiber', amount: 5 },
  { id: 'pear', name: '배', emoji: '🍐', nutrient: 'fiber', amount: 3 },
  { id: 'carrot', name: '당근', emoji: '🥕', nutrient: 'fiber', amount: 3 },
  { id: 'cabbage', name: '양배추', emoji: '🥬', nutrient: 'fiber', amount: 3 },
  { id: 'eggplant', name: '가지', emoji: '🍆', nutrient: 'fiber', amount: 3 },
  { id: 'kiwi', name: '키위 1개', emoji: '🥝', nutrient: 'fiber', amount: 3 },
  { id: 'spinach', name: '시금치', emoji: '🌿', nutrient: 'fiber', amount: 2 },
  { id: 'bean-sprout', name: '콩나물', emoji: '🌱', nutrient: 'fiber', amount: 3 },

  // 탄수화물
  { id: 'banana', name: '바나나 1개', emoji: '🍌', nutrient: 'carbohydrates', amount: 28 },
  { id: 'brown-rice', name: '현미밥 반공기', emoji: '🍚', nutrient: 'carbohydrates', amount: 32 },
  { id: 'oatmeal', name: '오트밀', emoji: '🌾', nutrient: 'carbohydrates', amount: 10 },
  { id: 'bagel', name: '베이글 반개', emoji: '🥯', nutrient: 'carbohydrates', amount: 48 },
  { id: 'onigiri', name: '오니기리', emoji: '🍙', nutrient: 'carbohydrates', amount: 35 },
  { id: 'potato', name: '감자 1개', emoji: '🥔', nutrient: 'carbohydrates', amount: 26 },
  { id: 'multigrain-rice', name: '잡곡밥', emoji: '🍘', nutrient: 'carbohydrates', amount: 30 },
  { id: 'mango', name: '망고', emoji: '🥭', nutrient: 'carbohydrates', amount: 23 },
  { id: 'grape', name: '포도', emoji: '🍇', nutrient: 'carbohydrates', amount: 18 },
  { id: 'white-rice', name: '흰쌀밥 반공기', emoji: '🍚', nutrient: 'carbohydrates', amount: 31 },

  // 지방
  { id: 'avocado', name: '아보카도 반개', emoji: '🥑', nutrient: 'fat', amount: 15 },
  { id: 'almond', name: '아몬드 한 줌', emoji: '🥜', nutrient: 'fat', amount: 15 },
  { id: 'mixed-nuts-fat', name: '견과류믹스 한 줌', emoji: '🌰', nutrient: 'fat', amount: 15 },
  { id: 'croissant', name: '크루아상 반개', emoji: '🥐', nutrient: 'fat', amount: 11 },
  { id: 'pork-belly', name: '삼겹살', emoji: '🥓', nutrient: 'fat', amount: 22 },
  { id: 'duck-smoked', name: '훈제오리', emoji: '🦆', nutrient: 'fat', amount: 15 },
  { id: 'tonkatsu', name: '돈카츠', emoji: '🍖', nutrient: 'fat', amount: 20 },
  { id: 'bacon', name: '베이컨', emoji: '🍳', nutrient: 'fat', amount: 19 },
  { id: 'karaage', name: '치킨가라아게', emoji: '🍗', nutrient: 'fat', amount: 17 },
  { id: 'beef-sirloin-fat', name: '소고기 등심', emoji: '🥩', nutrient: 'fat', amount: 14 },
]
