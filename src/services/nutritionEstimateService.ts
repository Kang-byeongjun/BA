import type { NutritionEstimateRequestBody, NutritionEstimateResult } from '../../shared/analysis'
import { AnalysisError, type AnalysisErrorCode } from '../../shared/errors'

/**
 * nutritionEstimateService — 영양 DB·검색으로 못 찾은 음식의 100g당 영양소를 AI에게 추정해달라고 요청한다.
 * Anthropic API는 여기서도 직접 호출하지 않는다 — /api/estimate-nutrition을 통해서만 호출한다.
 * 실제 영양성분표 조회가 아니라 추정치이므로, 호출부는 반드시 DB 공식값과 구분해서 보여줘야 한다.
 */

const ENDPOINT = '/api/estimate-nutrition'

// 짧은 구조화 응답이라 이미지 분석보다 훨씬 짧게 잡는다.
const CLIENT_TIMEOUT_MS = 20_000

const KNOWN_CODES: ReadonlySet<string> = new Set<AnalysisErrorCode>([
  'MISSING_API_KEY',
  'INVALID_REQUEST',
  'UNREADABLE',
  'PARSE_FAILED',
  'REFUSED',
  'AUTH_FAILED',
  'MODEL_UNAVAILABLE',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'TIMEOUT',
  'NETWORK',
  'API_UNAVAILABLE',
  'CANCELLED',
  'METHOD_NOT_ALLOWED',
  'INTERNAL',
])

interface ApiResponseLike {
  ok: boolean
  data?: unknown
  error?: { code?: string; message?: string }
}

function isApiResponseLike(value: unknown): value is ApiResponseLike {
  return typeof value === 'object' && value !== null && 'ok' in value && typeof (value as ApiResponseLike).ok === 'boolean'
}

function isNutritionEstimateResult(data: unknown): data is NutritionEstimateResult {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Partial<NutritionEstimateResult>
  return typeof d.caloriesPer100g === 'number' && typeof d.proteinPer100g === 'number' && typeof d.confidence === 'number'
}

/** 성공하면 추정된 100g당 영양소를, 실패하면 AnalysisError를 던진다. 호출부가 실패 시 UI를 정한다. */
export async function requestNutritionEstimate(input: NutritionEstimateRequestBody, signal?: AbortSignal): Promise<NutritionEstimateResult> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, CLIENT_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
      cache: 'no-store',
    })

    const text = await res.text()
    let json: unknown = null
    try {
      json = JSON.parse(text)
    } catch {
      // JSON이 아닌 응답
    }

    if (!isApiResponseLike(json)) throw new AnalysisError('API_UNAVAILABLE', 'nutrition')
    if (json.ok) {
      if (!isNutritionEstimateResult(json.data)) throw new AnalysisError('PARSE_FAILED', 'nutrition')
      return json.data
    }

    const code = json.error?.code && KNOWN_CODES.has(json.error.code) ? (json.error.code as AnalysisErrorCode) : 'INTERNAL'
    throw new AnalysisError(code, 'nutrition', typeof json.error?.message === 'string' ? json.error.message : undefined)
  } catch (err) {
    if (err instanceof AnalysisError) throw err
    if (timedOut) throw new AnalysisError('TIMEOUT', 'nutrition')
    if (signal?.aborted) throw new AnalysisError('CANCELLED', 'nutrition')
    throw new AnalysisError('NETWORK', 'nutrition')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}
