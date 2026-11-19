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
  // InBody 표준범위를 못 읽었을 때, 막대그래프 구역만 잘라 확대한 이미지로 그 부분만 다시 읽어달라는 요청.
  focus?: 'inbody_standard_range'
}

// ---------- InBody ----------

export interface InBodyExtraction {
  // 업로드한 이미지가 InBody/체성분 결과지인지
  isInBodyReport: boolean
  weightKg: number | null
  ageYears: number | null
  heightCm: number | null
  skeletalMuscleMassKg: number | null
  bodyFatMassKg: number | null
  bodyFatPercentage: number | null
  bodyWaterL: number | null
  proteinMassKg: number | null
  mineralMassKg: number | null
  bmi: number | null
  basalMetabolicRateKcal: number | null
  // 결과지에 찍힌 검사일시(검사일만, YYYY-MM-DD). 안 보이면 null
  testedAtDate: string | null
  // "골격근·지방분석" 막대그래프의 "표준" 구간과, 이 사람 측정값이 그 축 위에서 차지하는 위치.
  // 이 그래프의 가로축은 kg이 아니라 "표준 대비 %"다(100 = 그 사람의 표준치). "표준Min-표준Max"
  // 또는 측정값 위치까지 읽었으면 "표준Min-표준Max@측정값위치" 형태의 문자열(예: "90-110@97")로
  // 받는다 — Anthropic 구조화 출력 스키마는 nullable 파라미터 개수에 상한이 있어서(18개에서 실패),
  // 숫자마다 별도 필드로 두지 않고 하나로 합친다.
  weightStandardRange: string | null
  skeletalMuscleMassStandardRange: string | null
  bodyFatMassStandardRange: string | null
  // "골격근·지방분석" 막대그래프 섹션(막대 3개 + 눈금 전체)이 이 이미지 안에서 차지하는 위치.
  // "xMin,yMin,xMax,yMax" 형태의 문자열(각 0~1, 이미지 너비/높이 대비 비율) — 표준범위를 못 읽었을 때
  // 이 구역만 잘라서 확대해 다시 읽어보는 용도. 섹션 자체가 안 보이면 null.
  muscleFatAnalysisBox: string | null
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

// ---------- 영양정보 추정 (DB·검색으로 못 찾은 음식) ----------
// 음식 이름만으로 Claude의 일반 지식을 바탕으로 100g당 영양소를 추정한다.
// 실제 영양성분표가 아니라 "대략적인 추정치"이므로, 클라이언트는 반드시 DB 공식값과
// 구분해서 보여줘야 한다(나머지 영양 계산 흐름은 DB 매칭 항목과 동일하게 재사용한다).

export interface NutritionEstimateRequestBody {
  foodName: string
  cookingMethod?: string | null
}

export interface NutritionEstimateResult {
  // 이름만으로 어떤 음식인지 알아볼 수 있었는지. false면 추정치를 만들지 않는다(숫자 임의 생성 금지).
  isRecognized: boolean
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number
  // 0~1, 추정 신뢰도
  confidence: number
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
