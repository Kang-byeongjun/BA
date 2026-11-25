import type { InsightRequest } from '../../shared/coaching'
import { AnalysisError, type AnalysisErrorCode } from '../../shared/errors'
import { loadFromStorage, saveToStorage } from '../lib/storage'

/**
 * 진단 카드의 "보완할 점" 문장: 앱이 정한 판정·보완할 점(숫자)을 /api/insight로 보내 항목별 한 문장을 받는다.
 * 같은 숫자면 localStorage에 저장한 문장을 다시 쓴다 → 불필요한 AI 호출(=키 한도 사용)을 막는다.
 */

const ENDPOINT = '/api/insight'
const CLIENT_TIMEOUT_MS = 20_000
export const COACHING_CACHE_KEY = 'coachingInsight'
// 저장 형식·문구 규칙이 바뀌면 올린다 → 이전 버전으로 저장된 문장은 무시된다(v1 = 예전 종합 코칭 문장, v3 = 인바디 비교를 "최근 구간"으로 바꿈)
export const COACHING_CACHE_VERSION = 3

interface CachedLines {
  v: number
  /** JSON.stringify(request) — 입력 숫자가 하나라도 바뀌면 다른 키가 된다 */
  requestKey: string
  lines: string[]
  savedAt: string
}

export const requestKeyOf = (request: InsightRequest) => JSON.stringify(request)

export function readCoachingCache(requestKey: string): string[] | null {
  const c = loadFromStorage<CachedLines | null>(COACHING_CACHE_KEY, null)
  if (!c || c.v !== COACHING_CACHE_VERSION || c.requestKey !== requestKey) return null
  return Array.isArray(c.lines) && c.lines.every((l) => typeof l === 'string') ? c.lines : null
}

/** 서버에 요청한다(캐시 확인은 호출부가 한다). 실패하면 AnalysisError를 던지고, 호출부가 예시 문장으로 대체한다. */
export async function requestInsightLines(request: InsightRequest, signal?: AbortSignal): Promise<string[]> {
  const requestKey = requestKeyOf(request)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestKey,
      signal: controller.signal,
      cache: 'no-store',
    })
    let json: { ok?: unknown; data?: { lines?: unknown }; error?: { code?: unknown } } | null = null
    try {
      json = JSON.parse(await res.text())
    } catch {
      // JSON이 아닌 응답
    }
    if (!json || typeof json.ok !== 'boolean') throw new AnalysisError('API_UNAVAILABLE', 'coach')
    if (!json.ok) throw new AnalysisError((typeof json.error?.code === 'string' ? json.error.code : 'INTERNAL') as AnalysisErrorCode, 'coach')
    const lines = json.data?.lines
    if (!Array.isArray(lines) || !lines.every((l) => typeof l === 'string')) throw new AnalysisError('PARSE_FAILED', 'coach')

    const entry: CachedLines = { v: COACHING_CACHE_VERSION, requestKey, lines, savedAt: new Date().toISOString() }
    saveToStorage(COACHING_CACHE_KEY, entry)
    return lines
  } catch (err) {
    if (err instanceof AnalysisError) throw err
    throw new AnalysisError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK', 'coach')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}
