import type { ApiResponse } from '../../shared/analysis'
import { AnalysisError, type AnalysisErrorCode, type AnalysisKind } from '../../shared/errors'

/**
 * 서버(api/analyze-*)로 이미지를 보내 분석 결과를 받아오는 클라이언트.
 * Anthropic API는 절대 브라우저에서 직접 호출하지 않는다 — API Key는 서버 환경변수에만 있다.
 */

const ENDPOINTS: Record<AnalysisKind, string> = {
  inbody: '/api/analyze-inbody',
  food: '/api/analyze-food',
}

// 서버 쪽 재시도까지 포함한 최악의 경우보다 조금 길게 잡는다.
const CLIENT_TIMEOUT_MS = 95_000

const KNOWN_CODES: ReadonlySet<string> = new Set<AnalysisErrorCode>([
  'MISSING_API_KEY',
  'INVALID_REQUEST',
  'UNSUPPORTED_IMAGE_TYPE',
  'IMAGE_TOO_LARGE',
  'INVALID_IMAGE',
  'NOT_IN_BODY_REPORT',
  'NOT_FOOD',
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

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && 'ok' in value && typeof value.ok === 'boolean'
}

function errorFromStatus(status: number, kind: AnalysisKind): AnalysisError {
  if (status === 413) return new AnalysisError('IMAGE_TOO_LARGE', kind)
  if (status === 504) return new AnalysisError('TIMEOUT', kind)
  // 404/405나 200(SPA index.html) 등 → API 함수가 없는 환경(예: vite preview)
  if (status === 404 || status === 405 || (status >= 200 && status < 300)) {
    return new AnalysisError('API_UNAVAILABLE', kind)
  }
  return new AnalysisError('UPSTREAM_ERROR', kind)
}

export async function requestAnalysis<T>(
  kind: AnalysisKind,
  imageBase64: string,
  isValid: (data: unknown) => data is T,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, CLIENT_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)

  try {
    const res = await fetch(ENDPOINTS[kind], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const text = await res.text()
    let json: unknown = null
    try {
      json = JSON.parse(text)
    } catch {
      // JSON이 아닌 응답 (플랫폼 레벨 에러 등)
    }

    if (!isApiResponse(json)) throw errorFromStatus(res.status, kind)

    if (json.ok) {
      if (!isValid(json.data)) throw new AnalysisError('PARSE_FAILED', kind)
      return json.data
    }

    const code = KNOWN_CODES.has(json.error?.code) ? json.error.code : 'INTERNAL'
    throw new AnalysisError(code, kind, typeof json.error?.message === 'string' ? json.error.message : undefined)
  } catch (err) {
    if (err instanceof AnalysisError) throw err
    if (timedOut) throw new AnalysisError('TIMEOUT', kind)
    if (signal?.aborted) throw new AnalysisError('CANCELLED', kind)
    throw new AnalysisError('NETWORK', kind)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}
