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
