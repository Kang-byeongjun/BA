import type {
  FoodAnalysisResult,
  Gender,
  Meal,
  NutritionTarget,
  RecommendedFood,
  UserProfile,
} from '../types'

/**
 * Mock 데이터 모음.
 *
 * 실제 서비스 연결 지점:
 * - FOOD_ANALYSIS_MOCKS  → AI Vision 음식 분석 API 응답으로 교체
 * - DEMO_PROFILE         → InBody 연동 API 응답으로 교체
 * - RECOMMENDATION_FOODS → 추천 엔진(서버) 응답으로 교체
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
  basalMetabolicRate: 1650,
}

export const DEMO_NUTRITION_TARGET: NutritionTarget = {
  calories: 2100,
  protein: 130,
  carbohydrates: 240,
  fat: 60,
  fiber: 28,
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
// AI 음식 분석 Mock 결과 — 촬영/업로드 시 이 중 하나를 무작위로 반환
// ---------------------------------------------------------------------------

export const FOOD_ANALYSIS_MOCKS: FoodAnalysisResult[] = [
  {
    title: '닭가슴살 현미밥 브로콜리',
    foods: [
      { name: '닭가슴살', amount: '120g', calories: 200, protein: 37, carbohydrates: 0, fat: 4, fiber: 0 },
      { name: '현미밥', amount: '180g', calories: 280, protein: 6, carbohydrates: 58, fat: 3, fiber: 4 },
      { name: '브로콜리', amount: '80g', calories: 40, protein: 2, carbohydrates: 4, fat: 3, fiber: 3 },
    ],
    calories: 520,
    protein: 45,
    carbohydrates: 62,
    fat: 10,
    fiber: 7,
  },
  {
    title: '연어 포케',
    foods: [
      { name: '연어', amount: '130g', calories: 260, protein: 28, carbohydrates: 0, fat: 16, fiber: 0 },
      { name: '현미밥', amount: '150g', calories: 230, protein: 5, carbohydrates: 48, fat: 2, fiber: 3 },
      { name: '아보카도 & 채소', amount: '100g', calories: 150, protein: 3, carbohydrates: 12, fat: 12, fiber: 6 },
    ],
    calories: 640,
    protein: 36,
    carbohydrates: 60,
    fat: 30,
    fiber: 9,
  },
  {
    title: '제육볶음 + 밥',
    foods: [
      { name: '제육볶음', amount: '200g', calories: 420, protein: 26, carbohydrates: 18, fat: 26, fiber: 2 },
      { name: '흰쌀밥', amount: '210g', calories: 310, protein: 6, carbohydrates: 68, fat: 1, fiber: 1 },
    ],
    calories: 730,
    protein: 32,
    carbohydrates: 86,
    fat: 27,
    fiber: 3,
  },
]

export function getRandomFoodAnalysis(): FoodAnalysisResult {
  const index = Math.floor(Math.random() * FOOD_ANALYSIS_MOCKS.length)
  return FOOD_ANALYSIS_MOCKS[index]
}

// ---------------------------------------------------------------------------
// InBody 결과지 사진 AI 분석 Mock 결과 — 온보딩에서 사진으로 자동 입력할 때 사용
// ---------------------------------------------------------------------------

export interface InBodyAnalysisResult {
  gender: Gender
  age: number
  height: number
  weight: number
  skeletalMuscleMass: number
  bodyFatMass: number
  bodyFatPercentage: number
  basalMetabolicRate: number
}

export const INBODY_ANALYSIS_MOCKS: InBodyAnalysisResult[] = [
  {
    gender: 'male',
    age: 28,
    height: 175,
    weight: 72,
    skeletalMuscleMass: 33.2,
    bodyFatMass: 14.5,
    bodyFatPercentage: 17.8,
    basalMetabolicRate: 1620,
  },
  {
    gender: 'female',
    age: 31,
    height: 162,
    weight: 56,
    skeletalMuscleMass: 22.4,
    bodyFatMass: 14.1,
    bodyFatPercentage: 24.6,
    basalMetabolicRate: 1310,
  },
  {
    gender: 'male',
    age: 35,
    height: 180,
    weight: 85,
    skeletalMuscleMass: 38.9,
    bodyFatMass: 20.2,
    bodyFatPercentage: 22.1,
    basalMetabolicRate: 1780,
  },
]

export function getRandomInBodyAnalysis(): InBodyAnalysisResult {
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
