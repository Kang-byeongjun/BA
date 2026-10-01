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
  // InBody 체성분 데이터. 간편 온보딩(키·체중만 입력)으로 시작한 경우 null — "있으면 더 정교해지는
  // 보너스 입력"으로 다루고, 식단 목표 계산(nutritionTargetService)은 이 값들 없이도 동작해야 한다.
  skeletalMuscleMass: number | null // kg
  bodyFatMass: number | null // kg
  bodyFatPercentage: number | null // %
  bodyWater: number | null // 체수분, L
  proteinMass: number | null // 단백질량, kg
  mineralMass: number | null // 무기질량, kg
  basalMetabolicRate: number // kcal — 실측값이 없으면 공식(estimateBasalMetabolicRate)으로 추정해 채운다
  // true면 basalMetabolicRate가 InBody 실측이 아니라 공식으로 추정한 값
  basalMetabolicRateEstimated: boolean
}

// InBody 결과지에서 읽어온(또는 사용자가 확인·수정한) 체성분 측정값. null이면 값이 없는 항목.
export interface InBodyMeasurements {
  weight: number | null
  skeletalMuscleMass: number | null
  bodyFatMass: number | null
  bodyFatPercentage: number | null
  bodyWater: number | null
  proteinMass: number | null
  mineralMass: number | null
  basalMetabolicRate: number | null
}

// 측정 시점의 InBody 스냅샷. "이전 측정 대비 변화"를 보여주기 위해 최신 값 위에 쌓아간다(최신이 배열 앞).
export type InBodySource =
  | 'onboarding' // 온보딩 중 입력(수동 또는 스캔 보조)
  | 'scan' // 마이 탭 "결과지 사진으로 업데이트"
  | 'estimated' // InBody 없이 간편 온보딩, 체성분 항목 없음

export interface InBodyHistoryEntry {
  timestamp: number
  source: InBodySource
  weight: number | null
  skeletalMuscleMass: number | null
  bodyFatMass: number | null
  bodyFatPercentage: number | null
  bodyWater: number | null
  proteinMass: number | null
  mineralMass: number | null
  basalMetabolicRate: number | null
}

export const IN_BODY_SOURCE_LABELS: Record<InBodySource, string> = {
  onboarding: '온보딩 입력',
  scan: '결과지 스캔',
  estimated: '간편 입력(추정)',
}

// ---------- 운동 프로필 (온보딩에서 수집, 운동 추천 엔진의 입력값) ----------

export type WorkoutGoal = 'fat_loss' | 'muscle_gain' | 'strength' | 'body_shape'

export const WORKOUT_GOAL_LABELS: Record<WorkoutGoal, string> = {
  fat_loss: '체지방 감량',
  muscle_gain: '근육 증가',
  strength: '근력 향상',
  body_shape: '체형 개선',
}

export type WorkoutExperience = 'beginner' | 'intermediate' | 'advanced'

export const WORKOUT_EXPERIENCE_LABELS: Record<WorkoutExperience, string> = {
  beginner: '초보',
  intermediate: '중급',
  advanced: '고급',
}

export type PainArea = 'shoulder' | 'back' | 'knee' | 'wrist' | 'ankle'

export const PAIN_AREA_LABELS: Record<PainArea, string> = {
  shoulder: '어깨',
  back: '허리',
  knee: '무릎',
  wrist: '손목',
  ankle: '발목',
}

export interface WorkoutProfile {
  goal: WorkoutGoal
  experience: WorkoutExperience
  weeklyFrequency: number // 주당 운동 가능 횟수
  sessionDuration: number // 1회 운동 가능 시간(분)
  painAreas: PainArea[] // 통증·부상 부위, 없으면 빈 배열
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
  // 목록 표시용 작은 썸네일(data URL). 원본 사진은 저장하지 않는다.
  image: string | null
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
