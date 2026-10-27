import type { ApiResponse, CoachMealRequestBody, NutritionEstimateRequestBody } from '../shared/analysis.js'
import { AnalysisError } from '../shared/errors.js'
import type { AnalysisKind } from '../shared/errors.js'
import {
  analyzeRequestSchema,
  coachMealRequestSchema,
  foodExtractionSchema,
  inBodyExtractionSchema,
  nutritionEstimateRequestSchema,
} from '../shared/schemas.js'
import { generateCoachMessage } from './coach.js'
import type { Env } from './config.js'
import { validateImage } from './image.js'
import { normalizeFood, normalizeInBody, normalizeNutritionEstimate } from './normalize.js'
import { FOOD_SYSTEM_PROMPT, FOOD_USER_PROMPT, INBODY_SYSTEM_PROMPT, INBODY_USER_PROMPT } from './prompts.js'
import { generateNutritionEstimate } from './nutritionEstimate.js'
import { createVisionClient, describeCause, extractStructured, mapVisionError, type VisionClient } from './vision.js'

export interface HandlerDeps {
  // 기본값은 process.env. 로컬 개발/테스트에서 주입할 수 있다.
  env?: Env
  // 테스트에서 가짜 Anthropic 클라이언트를 주입할 수 있다.
  client?: VisionClient
}

export interface HandlerResult {
  status: number
  body: ApiResponse<unknown>
}

function parseRequestBody(raw: unknown, kind: AnalysisKind): { image: string } {
  let value: unknown = raw
  if (Buffer.isBuffer(value)) value = value.toString('utf8')
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      throw new AnalysisError('INVALID_REQUEST', kind)
    }
  }
  const parsed = analyzeRequestSchema.safeParse(value)
  if (!parsed.success) throw new AnalysisError('INVALID_REQUEST', kind)
  return parsed.data
}

/**
 * InBody / 음식 이미지 분석 공통 처리.
 * 요청 검증 → 이미지 검증 → Claude Vision → 결과 검증 순서로 진행하며,
 * 실패하면 절대 mock/기본값으로 대체하지 않고 에러 코드와 한국어 메시지를 돌려준다.
 */
export async function handleAnalysis(kind: AnalysisKind, rawBody: unknown, deps: HandlerDeps = {}): Promise<HandlerResult> {
  const env: Env = deps.env ?? process.env

  try {
    // API Key 설정 여부를 가장 먼저 확인한다.
    const client = deps.client ?? createVisionClient(env, kind)
    const { image } = parseRequestBody(rawBody, kind)
    const validated = validateImage(image, kind)

    if (kind === 'inbody') {
      const raw = await extractStructured({
        client,
        env,
        kind,
        schema: inBodyExtractionSchema,
        system: INBODY_SYSTEM_PROMPT,
        prompt: INBODY_USER_PROMPT,
        image: validated,
      })
      return { status: 200, body: { ok: true, data: normalizeInBody(raw) } }
    }

    const raw = await extractStructured({
      client,
      env,
      kind,
      schema: foodExtractionSchema,
      system: FOOD_SYSTEM_PROMPT,
      prompt: FOOD_USER_PROMPT,
      image: validated,
    })
    return { status: 200, body: { ok: true, data: normalizeFood(raw) } }
  } catch (err) {
    const error = mapVisionError(err, kind)
    // 이미지·API Key·사용자 데이터는 로그에 남기지 않고, 원인 파악에 필요한 최소 정보만 남긴다.
    console.error(`[analyze-${kind}] ${error.code} (${describeCause(err)})`)
    return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message } } }
  }
}

function parseCoachRequestBody(raw: unknown): CoachMealRequestBody {
  let value: unknown = raw
  if (Buffer.isBuffer(value)) value = value.toString('utf8')
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      throw new AnalysisError('INVALID_REQUEST', 'coach')
    }
  }
  const parsed = coachMealRequestSchema.safeParse(value)
  if (!parsed.success) throw new AnalysisError('INVALID_REQUEST', 'coach')
  return parsed.data
}

/**
 * 추천 식사에 대한 AI 코칭 문구 생성. 식사·수치는 클라이언트가 이미 규칙 기반으로 결정해 보내고,
 * 여기서는 그 결과를 설명하는 한국어 문장만 만든다(이미지 없음, 숫자 재생성 없음).
 */
export async function handleCoachMeal(rawBody: unknown, deps: HandlerDeps = {}): Promise<HandlerResult> {
  const env: Env = deps.env ?? process.env

  try {
    const client = deps.client ?? createVisionClient(env, 'coach')
    const input = parseCoachRequestBody(rawBody)
    const data = await generateCoachMessage(client, env, input)
    return { status: 200, body: { ok: true, data } }
  } catch (err) {
    const error = mapVisionError(err, 'coach')
    console.error(`[coach-meal] ${error.code} (${describeCause(err)})`)
    return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message } } }
  }
}

function parseNutritionEstimateRequestBody(raw: unknown): NutritionEstimateRequestBody {
  let value: unknown = raw
  if (Buffer.isBuffer(value)) value = value.toString('utf8')
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      throw new AnalysisError('INVALID_REQUEST', 'nutrition')
    }
  }
  const parsed = nutritionEstimateRequestSchema.safeParse(value)
  if (!parsed.success) throw new AnalysisError('INVALID_REQUEST', 'nutrition')
  return parsed.data
}

/**
 * 영양 DB·검색으로 못 찾은 음식의 100g당 영양소를 Claude의 일반 지식으로 추정한다(이미지 없음).
 * 실제 영양성분표 조회가 아니라 추정치이므로, 클라이언트가 DB 공식값과 구분해서 보여줘야 한다.
 */
export async function handleNutritionEstimate(rawBody: unknown, deps: HandlerDeps = {}): Promise<HandlerResult> {
  const env: Env = deps.env ?? process.env

  try {
    const client = deps.client ?? createVisionClient(env, 'nutrition')
    const input = parseNutritionEstimateRequestBody(rawBody)
    const raw = await generateNutritionEstimate(client, env, input)
    return { status: 200, body: { ok: true, data: normalizeNutritionEstimate(raw) } }
  } catch (err) {
    const error = mapVisionError(err, 'nutrition')
    console.error(`[estimate-nutrition] ${error.code} (${describeCause(err)})`)
    return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message } } }
  }
}
