import type { AnalysisErrorCode } from './errors.js'

/**
 * 이미지 분석 API의 요청/응답 타입. 서버(api/, server/)와 클라이언트(src/)가 공유한다.
 * (타입만 정의하며 런타임 코드는 없다. zod 스키마는 shared/schemas.ts — 서버 전용)
 */

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export interface AnalyzeRequestBody {
  // data URL 접두사가 없는 순수 base64
  image: string
  mediaType?: ImageMediaType
}

// ---------- InBody ----------

export interface InBodyExtraction {
  // 업로드한 이미지가 InBody/체성분 결과지인지
  isInBodyReport: boolean
  weightKg: number | null
  skeletalMuscleMassKg: number | null
  bodyFatMassKg: number | null
  bodyFatPercentage: number | null
  bodyWaterL: number | null
  proteinMassKg: number | null
  mineralMassKg: number | null
  bmi: number | null
  basalMetabolicRateKcal: number | null
  // 0~1
  confidence: number
  warnings: string[]
}

// ---------- Food ----------

export interface FoodItemExtraction {
  name: string
  estimatedGrams: number
  cookingMethod: string | null
  confidence: number
}

export interface FoodExtraction {
  isFood: boolean
  mealName: string
  foods: FoodItemExtraction[]
  overallConfidence: number
  warnings: string[]
}

// ---------- 식사 추천 코칭 문구 ----------
// 추천할 식사(무엇을, 왜)는 규칙 기반 엔진이 이미 결정한다. Claude는 그 결과를
// 자연스러운 한국어 한 줄로 설명하기만 하고, 음식·수치를 새로 만들어내지 않는다.

export interface CoachMealRequestBody {
  mealTitle: string
  // 표시용 문자열. 예: "닭가슴살 120g"
  ingredients: string[]
  nutrientLabel: string
  nutrientAmount: number
  nutrientUnit: string
  // 이 영양소의 현재 달성률(%)
  deficiencyPercent: number
  goalLabel: string
}

export interface CoachMessage {
  message: string
}

// ---------- 공통 응답 ----------

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiFailure {
  ok: false
  error: { code: AnalysisErrorCode; message: string }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
