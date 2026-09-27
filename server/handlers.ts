import type { ApiResponse } from '../shared/analysis.js'
import { AnalysisError } from '../shared/errors.js'
import type { AnalysisKind } from '../shared/errors.js'
import { analyzeRequestSchema, foodExtractionSchema, inBodyExtractionSchema } from '../shared/schemas.js'
import type { Env } from './config.js'
import { validateImage } from './image.js'
import { normalizeFood, normalizeInBody } from './normalize.js'
import { FOOD_SYSTEM_PROMPT, FOOD_USER_PROMPT, INBODY_SYSTEM_PROMPT, INBODY_USER_PROMPT } from './prompts.js'
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
