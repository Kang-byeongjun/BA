import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisError } from '../../../shared/errors'
import type { PreparedImage } from '../../lib/imagePrep'
import { requestAnalysis } from '../analysisApi'
import { analyzeFoodImage } from '../foodVisionService'
import { analyzeInBodyImage } from '../inBodyVisionService'

const image: PreparedImage = { base64: 'AAAA', thumbnail: '', preview: '' }
const isNumberBox = (d: unknown): d is { n: number } =>
  typeof d === 'object' && d !== null && typeof (d as { n?: unknown }).n === 'number'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// 취소(abort) 신호가 오면 AbortError로 거절되는 fetch — 응답이 오지 않는 상황을 흉내낸다.
function hangingFetch(_url: string, init: RequestInit) {
  return new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function errorOf(promise: Promise<unknown>): Promise<AnalysisError> {
  try {
    await promise
  } catch (err) {
    return err as AnalysisError
  }
  throw new Error('expected rejection')
}

describe('requestAnalysis', () => {
  it('성공 응답의 data를 반환하고 이미지를 서버 API로 POST한다', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: { n: 1 } }))
    await expect(requestAnalysis('food', 'BASE64DATA', isNumberBox)).resolves.toEqual({ n: 1 })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/analyze-food')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ image: 'BASE64DATA' })
  })

  it('InBody는 /api/analyze-inbody 로 보낸다', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: { n: 1 } }))
    await requestAnalysis('inbody', 'X', isNumberBox)
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('/api/analyze-inbody')
  })

  it('서버가 알려준 에러 코드와 메시지를 그대로 전달한다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: false, error: { code: 'NOT_FOOD', message: '음식 사진이 아닌 것 같아요.' } }, 422),
    )
    const err = await errorOf(requestAnalysis('food', 'X', isNumberBox))
    expect(err).toBeInstanceOf(AnalysisError)
    expect(err.code).toBe('NOT_FOOD')
    expect(err.message).toBe('음식 사진이 아닌 것 같아요.')
  })

  it('알 수 없는 에러 코드는 INTERNAL로 처리한다', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: false, error: { code: 'WHAT', message: 'x' } }, 500))
    expect((await errorOf(requestAnalysis('food', 'X', isNumberBox))).code).toBe('INTERNAL')
  })

  it('성공 응답이어도 형식이 다르면 PARSE_FAILED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: { wrong: true } }))
    expect((await errorOf(requestAnalysis('food', 'X', isNumberBox))).code).toBe('PARSE_FAILED')
  })

  const platformCases: Array<[string, number, string, string]> = [
    ['API 함수가 없는 환경(404)', 404, '<html>Not found</html>', 'API_UNAVAILABLE'],
    ['SPA가 index.html을 돌려준 경우(200)', 200, '<!doctype html>', 'API_UNAVAILABLE'],
    ['플랫폼 본문 크기 초과(413)', 413, 'Request Entity Too Large', 'IMAGE_TOO_LARGE'],
    ['플랫폼 타임아웃(504)', 504, 'timeout', 'TIMEOUT'],
    ['JSON이 아닌 서버 오류(500)', 500, 'Internal Server Error', 'UPSTREAM_ERROR'],
  ]
  for (const [name, status, body, code] of platformCases) {
    it(name, async () => {
      fetchMock.mockResolvedValue(new Response(body, { status }))
      expect((await errorOf(requestAnalysis('food', 'X', isNumberBox))).code).toBe(code)
    })
  }

  it('네트워크 오류는 NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    expect((await errorOf(requestAnalysis('food', 'X', isNumberBox))).code).toBe('NETWORK')
  })

  it('사용자가 취소하면 CANCELLED', async () => {
    fetchMock.mockImplementation(hangingFetch)
    const controller = new AbortController()
    const pending = errorOf(requestAnalysis('food', 'X', isNumberBox, controller.signal))
    controller.abort()
    expect((await pending).code).toBe('CANCELLED')
  })

  it('응답이 너무 오래 걸리면 TIMEOUT', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(hangingFetch)
    const pending = errorOf(requestAnalysis('food', 'X', isNumberBox))
    await vi.advanceTimersByTimeAsync(96_000)
    expect((await pending).code).toBe('TIMEOUT')
  })
})

describe('실제 AI 모드에서는 실패해도 mock으로 대체하지 않는다', () => {
  it('음식: API 실패 → 에러 (mock 결과를 반환하지 않음)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: false, error: { code: 'UPSTREAM_ERROR', message: '일시적인 문제' } }, 502))
    const err = await errorOf(analyzeFoodImage(image, { mode: 'real' }))
    expect(err.code).toBe('UPSTREAM_ERROR')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('InBody: API 키 없음 → 에러', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: false, error: { code: 'MISSING_API_KEY', message: 'ANTHROPIC_API_KEY' } }, 500))
    expect((await errorOf(analyzeInBodyImage(image, { mode: 'real' }))).code).toBe('MISSING_API_KEY')
  })

  it('음식: 응답 형식이 이상하면 PARSE_FAILED (mock 대체 없음)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data: { isFood: true, foods: 'nope', warnings: [] } }))
    expect((await errorOf(analyzeFoodImage(image, { mode: 'real' }))).code).toBe('PARSE_FAILED')
  })

  it('음식 성공: 서버 응답을 그대로 반환한다', async () => {
    const data = {
      isFood: true,
      mealName: '김치찌개',
      foods: [{ name: '김치찌개', estimatedGrams: 300, cookingMethod: 'soup', confidence: 0.9 }],
      overallConfidence: 0.9,
      warnings: [],
    }
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, data }))
    await expect(analyzeFoodImage(image, { mode: 'real' })).resolves.toEqual(data)
  })
})

describe('데모(mock) 모드', () => {
  it('서버 API를 호출하지 않고 예시 결과를 반환한다', async () => {
    vi.useFakeTimers()
    const foodPromise = analyzeFoodImage(image, { mode: 'mock' })
    const inbodyPromise = analyzeInBodyImage(image, { mode: 'mock' })
    await vi.advanceTimersByTimeAsync(1600)
    const food = await foodPromise
    const inbody = await inbodyPromise
    expect(food.isFood).toBe(true)
    expect(food.foods.length).toBeGreaterThan(0)
    expect(inbody.isInBodyReport).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
