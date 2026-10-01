import type { CoachMealRequestBody, CoachMessage } from '../../shared/analysis'
import { AnalysisError, type AnalysisErrorCode } from '../../shared/errors'

/**
 * coachService — 추천 식사(이미 규칙 기반으로 결정됨)에 대한 AI 코칭 문구를 서버에 요청한다.
 * Anthropic API는 여기서도 직접 호출하지 않는다 — /api/coach-meal을 통해서만 호출한다.
 */

const ENDPOINT = '/api/coach-meal'

// 짧은 텍스트 생성이라 이미지 분석보다 훨씬 짧게 잡는다.
const CLIENT_TIMEOUT_MS = 20_000

const KNOWN_CODES: ReadonlySet<string> = new Set<AnalysisErrorCode>([
  'MISSING_API_KEY',
  'INVALID_REQUEST',
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

function isCoachMessage(data: unknown): data is CoachMessage {
  return typeof data === 'object' && data !== null && typeof (data as CoachMessage).message === 'string'
}

/** 성공하면 코칭 문구 문자열을, 실패하면 AnalysisError를 던진다. 호출부가 실패 시 보여줄 대체 문구를 정한다. */
export async function requestCoachMessage(input: CoachMealRequestBody, signal?: AbortSignal): Promise<string> {
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

    if (!isApiResponseLike(json)) throw new AnalysisError('API_UNAVAILABLE', 'coach')
    if (json.ok) {
      if (!isCoachMessage(json.data)) throw new AnalysisError('PARSE_FAILED', 'coach')
      return json.data.message
    }

    const code = json.error?.code && KNOWN_CODES.has(json.error.code) ? (json.error.code as AnalysisErrorCode) : 'INTERNAL'
    throw new AnalysisError(code, 'coach', typeof json.error?.message === 'string' ? json.error.message : undefined)
  } catch (err) {
    if (err instanceof AnalysisError) throw err
    if (timedOut) throw new AnalysisError('TIMEOUT', 'coach')
    if (signal?.aborted) throw new AnalysisError('CANCELLED', 'coach')
    throw new AnalysisError('NETWORK', 'coach')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}
