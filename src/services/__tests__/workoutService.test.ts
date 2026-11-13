import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutResult } from '../../../server/engine/types'
import { AnalysisError } from '../../../shared/errors'
import { DEFAULT_WORKOUT_PROFILE, type WorkoutProfile } from '../../types'
import { getCachedWorkoutRoutine, getWorkoutRoutine, WORKOUT_ROUTINE_STORAGE_KEY } from '../workoutService'

// 실제 /api/workout(=AI)은 부르지 않는다. fetch와 localStorage를 가짜로 바꿔서 검증한다.

const profile = (o: Partial<WorkoutProfile> = {}): WorkoutProfile => ({ ...DEFAULT_WORKOUT_PROFILE, ...o })

const fakeResult = (summary = '요약'): WorkoutResult => ({
  resolvedGoal: 'DIET',
  goalReason: null,
  source: 'fallback',
  attempts: 0,
  attemptErrors: [],
  days: [{ day: 1, label: '전신', exercises: [] }],
  summary,
  warnings: [],
  prescriptionNote: '',
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  }
}

let fetchMock: ReturnType<typeof vi.fn>
let storage: Storage

beforeEach(() => {
  fetchMock = vi.fn()
  storage = memoryStorage()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('localStorage', storage)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('getWorkoutRoutine', () => {
  it('엔진 요청 형식으로 /api/workout을 POST로 부르고 결과를 저장한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: fakeResult() }))
    const r = await getWorkoutRoutine(profile({ painAreas: ['knee', 'wrist'] }))

    expect(r.fromCache).toBe(false)
    expect(r.result.summary).toBe('요약')
    expect(r.unsupportedPains).toEqual(['wrist'])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/workout')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toMatchObject({ goal: 'DIET', pain: ['KNEE'], time: 'TIME_60', frequency: 'FREQ_3' })
    expect(storage.getItem('ai-diet-app:' + WORKOUT_ROUTINE_STORAGE_KEY)).toContain('요약')
  })

  it('같은 프로필이면 저장된 결과를 쓰고 서버를 다시 부르지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: fakeResult('처음') }))
    await getWorkoutRoutine(profile())
    const again = await getWorkoutRoutine(profile())

    expect(again.fromCache).toBe(true)
    expect(again.result.summary).toBe('처음')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getCachedWorkoutRoutine(profile())?.result.summary).toBe('처음')
  })

  it('프로필이 바뀌면 새로 부른다', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ ok: true, data: fakeResult() }))
    await getWorkoutRoutine(profile({ goal: 'fat_loss' }))
    await getWorkoutRoutine(profile({ goal: 'muscle_gain' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getCachedWorkoutRoutine(profile({ goal: 'fat_loss' }))).toBeNull()
  })

  it('force: true면 저장값을 무시하고 새로 만든 뒤 덮어쓴다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: fakeResult('처음') }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: fakeResult('다시') }))
    await getWorkoutRoutine(profile())
    const r = await getWorkoutRoutine(profile(), { force: true })

    expect(r.fromCache).toBe(false)
    expect(r.result.summary).toBe('다시')
    expect(getCachedWorkoutRoutine(profile())?.result.summary).toBe('다시')
  })

  it('호출 중에 같은 요청이 또 오면 한 번만 부른다', async () => {
    let resolve!: (r: Response) => void
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)))
    const a = getWorkoutRoutine(profile())
    const b = getWorkoutRoutine(profile(), { force: true })
    resolve(jsonResponse({ ok: true, data: fakeResult() }))

    const [ra, rb] = await Promise.all([a, b])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(ra.result).toEqual(rb.result)
  })

  it('저장값이 깨져 있으면 무시하고 새로 부른다', async () => {
    storage.setItem('ai-diet-app:' + WORKOUT_ROUTINE_STORAGE_KEY, '{깨진 값')
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: fakeResult() }))
    const r = await getWorkoutRoutine(profile())
    expect(r.fromCache).toBe(false)
  })
})

describe('에러는 한국어 메시지의 AnalysisError로 던진다', () => {
  it('서버가 보낸 에러 코드·문구를 그대로 쓴다', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: false, error: { code: 'INVALID_REQUEST', message: '운동 추천 요청 형식이 올바르지 않아요.' } }, 400),
    )
    const err = await getWorkoutRoutine(profile()).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AnalysisError)
    expect(err).toMatchObject({ code: 'INVALID_REQUEST', message: '운동 추천 요청 형식이 올바르지 않아요.' })
  })

  it('실패하면 저장하지 않고, 다음 호출에서 다시 시도할 수 있다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: false, error: { code: 'INTERNAL', message: '문제가 생겼어요.' } }, 500))
    await expect(getWorkoutRoutine(profile())).rejects.toBeInstanceOf(AnalysisError)
    expect(getCachedWorkoutRoutine(profile())).toBeNull()

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: fakeResult() }))
    await expect(getWorkoutRoutine(profile())).resolves.toMatchObject({ fromCache: false })
  })

  it('네트워크가 끊기면 NETWORK', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(getWorkoutRoutine(profile())).rejects.toMatchObject({ code: 'NETWORK', message: expect.stringContaining('네트워크') })
  })

  it('API 함수가 없는 환경(HTML 응답)이면 API_UNAVAILABLE', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<!doctype html>', { status: 200 }))
    await expect(getWorkoutRoutine(profile())).rejects.toMatchObject({ code: 'API_UNAVAILABLE' })
  })

  it('응답 모양이 이상하면 PARSE_FAILED', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: { nope: 1 } }))
    await expect(getWorkoutRoutine(profile())).rejects.toMatchObject({ code: 'PARSE_FAILED' })
  })

  it('너무 오래 걸리면 TIMEOUT', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_res, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    )
    const p = getWorkoutRoutine(profile()).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(150_000)
    expect(await p).toMatchObject({ code: 'TIMEOUT', message: expect.stringContaining('시간이 너무 오래') })
  })
})
