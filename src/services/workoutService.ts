import type { WorkoutResult } from '../../server/engine/types'
import { AnalysisError, describeError, type AnalysisErrorCode } from '../../shared/errors'
import { loadFromStorage, removeFromStorage, saveToStorage } from '../lib/storage'
import { toWorkoutRequest } from '../lib/workoutAdapter'
import type { PainArea, WorkoutProfile } from '../types'

/**
 * workoutService — /api/workout을 불러 추천 루틴을 받아온다(AI 키는 서버에만 있다).
 * - 같은 요청이면 localStorage에 저장한 결과를 재사용한다 → 불필요한 AI 호출(=키 한도 사용)을 막는다.
 * - force: true일 때만 저장된 결과를 무시하고 새로 만든다("다시 추천" 버튼).
 * - 같은 요청이 이미 진행 중이면 새로 부르지 않고 그 결과를 함께 기다린다(중복 호출 방지).
 */

const ENDPOINT = '/api/workout'

// storage.ts의 STORAGE_KEYS와 같은 방식(접두사는 loadFromStorage/saveToStorage가 붙임).
// storage.ts는 수정하지 않기로 해서 여기 따로 둔다.
export const WORKOUT_ROUTINE_STORAGE_KEY = 'workoutRoutine'
// 사용자가 종목을 바꾸거나 추가·삭제한 루틴. AI 결과 저장값(위)과 섞이지 않게 따로 둔다.
export const WORKOUT_ROUTINE_EDIT_STORAGE_KEY = 'workoutRoutineEdit'

// 저장 형식이나 엔진 결과 모양이 바뀌면 숫자를 올려 예전 저장값을 무시한다.
const CACHE_VERSION = 1

// 서버는 AI를 최대 3번 시도한 뒤 기본 루틴으로 대신하므로 넉넉하게 잡는다.
const CLIENT_TIMEOUT_MS = 150_000

// 이미지가 없는 텍스트 요청이라 에러 문구는 기존 'coach' 종류를 쓴다(서버와 동일).
const KIND = 'coach' as const

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
  'METHOD_NOT_ALLOWED',
  'INTERNAL',
])

interface CachedRoutine {
  v: number
  requestKey: string
  savedAt: string
  result: WorkoutResult
}

export interface WorkoutRoutineResponse {
  result: WorkoutResult
  /** 엔진이 다루지 못해 반영되지 않은 통증 부위(손목·발목). 화면 안내용 */
  unsupportedPains: PainArea[]
  /** true면 저장된 결과를 재사용한 것(서버 호출 없음) */
  fromCache: boolean
  /** true면 사용자가 종목을 직접 바꾼 루틴(AI 추천이 아님). 예전 코드·테스트는 이 값을 몰라도 된다 */
  edited?: boolean
}

const inFlight = new Map<string, Promise<WorkoutResult>>()

function isWorkoutResult(data: unknown): data is WorkoutResult {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Partial<WorkoutResult>
  return (d.source === 'llm' || d.source === 'fallback') && Array.isArray(d.days) && typeof d.summary === 'string'
}

function readCache(requestKey: string): WorkoutResult | null {
  const cached = loadFromStorage<CachedRoutine | null>(WORKOUT_ROUTINE_STORAGE_KEY, null)
  if (!cached || cached.v !== CACHE_VERSION || cached.requestKey !== requestKey) return null
  return isWorkoutResult(cached.result) ? cached.result : null
}

function readEdited(requestKey: string): WorkoutResult | null {
  const saved = loadFromStorage<CachedRoutine | null>(WORKOUT_ROUTINE_EDIT_STORAGE_KEY, null)
  if (!saved || saved.v !== CACHE_VERSION || saved.requestKey !== requestKey) return null
  return isWorkoutResult(saved.result) ? saved.result : null
}

/** 사용자가 바꾼 루틴을 저장한다(현재 프로필의 요청과 짝지어서). AI는 부르지 않는다. */
export function saveEditedWorkoutRoutine(profile: WorkoutProfile, result: WorkoutResult): void {
  const requestKey = JSON.stringify(toWorkoutRequest(profile).request)
  const entry: CachedRoutine = { v: CACHE_VERSION, requestKey, savedAt: new Date().toISOString(), result }
  saveToStorage(WORKOUT_ROUTINE_EDIT_STORAGE_KEY, entry)
}

/** 바꾼 루틴을 지운다(다시 AI 추천으로 되돌릴 때) */
export function clearEditedWorkoutRoutine(): void {
  removeFromStorage(WORKOUT_ROUTINE_EDIT_STORAGE_KEY)
}

/**
 * 화면 첫 표시용: 저장된 결과가 있으면 서버 호출 없이 바로 돌려준다. 없으면 null.
 * 사용자가 바꾼 루틴이 있으면 AI 저장값보다 그쪽을 먼저 돌려준다(대시보드 요약도 같은 함수를 쓴다).
 */
export function getCachedWorkoutRoutine(profile: WorkoutProfile): WorkoutRoutineResponse | null {
  const { request, unsupportedPains } = toWorkoutRequest(profile)
  const requestKey = JSON.stringify(request)
  const edited = readEdited(requestKey)
  if (edited) return { result: edited, unsupportedPains, fromCache: true, edited: true }
  const result = readCache(requestKey)
  return result ? { result, unsupportedPains, fromCache: true } : null
}

export async function getWorkoutRoutine(
  profile: WorkoutProfile,
  options: { force?: boolean } = {},
): Promise<WorkoutRoutineResponse> {
  const { request, unsupportedPains } = toWorkoutRequest(profile)
  // 프로필을 엔진 요청으로 바꾼 값이 같으면 같은 추천으로 본다(예: 45분·50분은 둘 다 TIME_60).
  const requestKey = JSON.stringify(request)

  if (!options.force) {
    const edited = readEdited(requestKey)
    if (edited) return { result: edited, unsupportedPains, fromCache: true, edited: true }
    const cached = readCache(requestKey)
    if (cached) return { result: cached, unsupportedPains, fromCache: true }
  }

  let pending = inFlight.get(requestKey)
  if (!pending) {
    pending = fetchRoutine(request).finally(() => inFlight.delete(requestKey))
    inFlight.set(requestKey, pending)
  }
  const result = await pending

  const entry: CachedRoutine = { v: CACHE_VERSION, requestKey, savedAt: new Date().toISOString(), result }
  saveToStorage(WORKOUT_ROUTINE_STORAGE_KEY, entry)
  // 새 추천을 받는 데 성공했을 때만 바꾼 내용을 지운다(실패하면 그대로 남는다).
  clearEditedWorkoutRoutine()
  return { result, unsupportedPains, fromCache: false }
}

async function fetchRoutine(request: unknown): Promise<WorkoutResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
      cache: 'no-store',
    })

    let json: unknown = null
    try {
      json = JSON.parse(await res.text())
    } catch {
      // JSON이 아닌 응답(플랫폼 에러 페이지 등)
    }

    if (typeof json !== 'object' || json === null || typeof (json as { ok?: unknown }).ok !== 'boolean') {
      if (res.status === 504) throw new AnalysisError('TIMEOUT', KIND, '운동 루틴을 만드는 데 시간이 너무 오래 걸렸어요. 다시 시도해주세요.')
      // 404/405나 200(SPA index.html) → API 함수가 없는 환경(예: vite preview)
      if (res.status === 404 || res.status === 405 || res.ok) throw new AnalysisError('API_UNAVAILABLE', KIND)
      throw new AnalysisError('UPSTREAM_ERROR', KIND)
    }

    const body = json as { ok: boolean; data?: unknown; error?: { code?: unknown; message?: unknown } }
    if (body.ok) {
      if (!isWorkoutResult(body.data)) throw new AnalysisError('PARSE_FAILED', KIND, '추천 루틴을 읽지 못했어요. 잠시 후 다시 시도해주세요.')
      return body.data
    }

    const code = (typeof body.error?.code === 'string' && KNOWN_CODES.has(body.error.code) ? body.error.code : 'INTERNAL') as AnalysisErrorCode
    const message = typeof body.error?.message === 'string' && body.error.message ? body.error.message : describeError(code, KIND)
    throw new AnalysisError(code, KIND, message)
  } catch (err) {
    if (err instanceof AnalysisError) throw err
    if (controller.signal.aborted) {
      throw new AnalysisError('TIMEOUT', KIND, '운동 루틴을 만드는 데 시간이 너무 오래 걸렸어요. 다시 시도해주세요.')
    }
    throw new AnalysisError('NETWORK', KIND)
  } finally {
    clearTimeout(timer)
  }
}
