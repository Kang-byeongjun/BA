import { z } from 'zod'
import type { CoachMealRequestBody, CoachMessage, FoodExtraction, InBodyExtraction } from './analysis.js'

/**
 * Claude가 반환하는 구조화 JSON의 zod 스키마 (서버 전용 — 클라이언트 번들에 포함하지 않는다).
 * Structured Outputs 호환을 위해 min/max 같은 숫자 제약은 두지 않고,
 * 값의 타당성 검사는 server/normalize.ts에서 별도로 수행한다.
 */

export const inBodyExtractionSchema = z.object({
  isInBodyReport: z.boolean(),
  weightKg: z.number().nullable(),
  skeletalMuscleMassKg: z.number().nullable(),
  bodyFatMassKg: z.number().nullable(),
  bodyFatPercentage: z.number().nullable(),
  bodyWaterL: z.number().nullable(),
  proteinMassKg: z.number().nullable(),
  mineralMassKg: z.number().nullable(),
  bmi: z.number().nullable(),
  basalMetabolicRateKcal: z.number().nullable(),
  confidence: z.number(),
  warnings: z.array(z.string()),
}) satisfies z.ZodType<InBodyExtraction>

export const foodItemExtractionSchema = z.object({
  name: z.string(),
  estimatedGrams: z.number(),
  cookingMethod: z.string().nullable(),
  confidence: z.number(),
})

export const foodExtractionSchema = z.object({
  isFood: z.boolean(),
  mealName: z.string(),
  foods: z.array(foodItemExtractionSchema),
  overallConfidence: z.number(),
  warnings: z.array(z.string()),
}) satisfies z.ZodType<FoodExtraction>

// 요청 본문 검증 (mediaType은 참고용일 뿐, 실제 형식은 이미지 바이트로 판별한다)
export const analyzeRequestSchema = z.object({
  image: z.string().min(1),
  mediaType: z.string().optional(),
})

// 식사 추천 코칭 문구 요청/응답 검증
export const coachMealRequestSchema = z.object({
  mealTitle: z.string().min(1).max(60),
  ingredients: z.array(z.string().min(1).max(40)).min(1).max(6),
  nutrientLabel: z.string().min(1).max(20),
  nutrientAmount: z.number(),
  nutrientUnit: z.string().min(1).max(10),
  deficiencyPercent: z.number(),
  goalLabel: z.string().min(1).max(20),
}) satisfies z.ZodType<CoachMealRequestBody>

export const coachMessageSchema = z.object({
  message: z.string(),
}) satisfies z.ZodType<CoachMessage>
