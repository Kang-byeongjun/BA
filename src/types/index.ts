// ---------- 온보딩 / 사용자 프로필 ----------

export type Goal = 'fat_loss' | 'muscle_gain' | 'weight_maintain' | 'health_care'

export const GOAL_LABELS: Record<Goal, string> = {
  fat_loss: '체지방 감량',
  muscle_gain: '근육 증가',
  weight_maintain: '체중 유지',
  health_care: '건강 관리',
}

export type Gender = 'male' | 'female'

export interface UserProfile {
  goal: Goal
  gender: Gender
  age: number
  height: number // cm
  weight: number // kg
  skeletalMuscleMass: number // kg
  bodyFatMass: number // kg
  bodyFatPercentage: number // %
  basalMetabolicRate: number // kcal
}

// ---------- 영양 목표 & 섭취 ----------

export interface NutritionTarget {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

export type NutrientKey = keyof NutritionTarget

export const NUTRIENT_LABELS: Record<NutrientKey, string> = {
  calories: '칼로리',
  protein: '단백질',
  carbohydrates: '탄수화물',
  fat: '지방',
  fiber: '식이섬유',
}

export const NUTRIENT_UNITS: Record<NutrientKey, string> = {
  calories: 'kcal',
  protein: 'g',
  carbohydrates: 'g',
  fat: 'g',
  fiber: 'g',
}

export type NutritionStatus = 'deficient' | 'adequate' | 'near_goal' | 'exceeded'

export const NUTRITION_STATUS_LABELS: Record<NutritionStatus, string> = {
  deficient: '부족',
  adequate: '적정',
  near_goal: '목표 근접',
  exceeded: '초과',
}

// ---------- 음식 / 식사 기록 ----------

export interface AnalyzedFoodItem {
  name: string
  amount: string // 예: "120g"
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

export type MealSlot = '아침' | '점심' | '저녁' | '간식'

export interface Meal {
  id: string
  timestamp: number // epoch ms
  slot: MealSlot
  title: string
  image: string | null // data URL (mock) — 실제 서비스에서는 업로드된 이미지 URL
  foods: AnalyzedFoodItem[]
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

// AI 음식 분석 mock 결과 (실제 Vision API 응답을 흉내)
export interface FoodAnalysisResult {
  title: string
  foods: AnalyzedFoodItem[]
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

// ---------- 추천 ----------

export interface RecommendedFood {
  id: string
  name: string
  emoji: string
  nutrient: NutrientKey
  amount: number // 해당 영양소 증가량
}

// ---------- 운동 ----------

export type WorkoutType = '헬스' | '러닝' | '걷기' | '자전거' | '스쿼시' | '기타'

export interface Workout {
  id: string
  type: WorkoutType
  startTime: number // epoch ms
  endTime: number // epoch ms
  duration: number // seconds
}

// 진행 중인 운동 세션 (localStorage에 저장되어 새로고침/이동 후에도 복구)
export interface ActiveWorkoutSession {
  type: WorkoutType
  // 현재 러닝 구간이 시작된 시각(재개 시각). paused 상태에서는 사용하지 않음.
  segmentStart: number
  // 이전에 누적된 경과 시간(ms). pause할 때마다 갱신됨.
  accumulatedMs: number
  status: 'running' | 'paused'
}
