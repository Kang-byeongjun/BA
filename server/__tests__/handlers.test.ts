import Anthropic from '@anthropic-ai/sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FoodExtraction, InBodyExtraction } from '../../shared/analysis.js'
import { handleAnalysis } from '../handlers.js'
import type { VisionClient } from '../vision.js'

// 실제 Anthropic API를 호출하지 않고, 서버 로직(요청 검증·응답 검증·에러 매핑)을 검증한다.

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const validImage = Buffer.concat([Buffer.from(PNG_HEADER), Buffer.alloc(600, 1)]).toString('base64')

const goodInBody: InBodyExtraction = {
  isInBodyReport: true,
  weightKg: 75.2,
  skeletalMuscleMassKg: 34.1,
  bodyFatMassKg: 13.8,
  bodyFatPercentage: 18.4,
  bodyWaterL: 42.5,
  proteinMassKg: 13.0,
  mineralMassKg: 4.5,
  bmi: 24.6,
  basalMetabolicRateKcal: 1702,
  confidence: 0.93,
  warnings: [],
}

const goodFood: FoodExtraction = {
  isFood: true,
  mealName: '닭가슴살 현미밥',
  foods: [
    { name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.91 },
    { name: '현미밥', estimatedGrams: 180, cookingMethod: null, confidence: 0.84 },
  ],
  overallConfidence: 0.85,
  warnings: ['사진만으로 정확한 중량을 측정할 수 없어 양은 추정값입니다.'],
}

function fakeClient(reply: unknown) {
  const parse = vi.fn(async () => reply)
  return { parse, client: { messages: { parse } } as unknown as VisionClient }
}

function okReply(parsed: unknown) {
  return { stop_reason: 'end_turn', parsed_output: parsed }
}

const env = { ANTHROPIC_API_KEY: 'test-key-not-real' }

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('요청 검증', () => {
  it('API Key가 없으면 MISSING_API_KEY를 반환하고 mock으로 대체하지 않는다', async () => {
    const res = await handleAnalysis('food', { image: validImage }, { env: {} })
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'MISSING_API_KEY' } })
    expect(res.body).not.toHaveProperty('data')
  })

  it('image가 없으면 INVALID_REQUEST', async () => {
    const { client } = fakeClient(okReply(goodFood))
    const res = await handleAnalysis('food', {}, { env, client })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } })
  })

  it('JSON이 아닌 문자열 본문은 INVALID_REQUEST', async () => {
    const { client } = fakeClient(okReply(goodFood))
    const res = await handleAnalysis('food', 'not json', { env, client })
    expect(res.body).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } })
  })

  it('이미지가 아닌 데이터는 UNSUPPORTED_IMAGE_TYPE', async () => {
    const { client, parse } = fakeClient(okReply(goodFood))
    const notImage = Buffer.alloc(600, 65).toString('base64')
    const res = await handleAnalysis('food', { image: notImage }, { env, client })
    expect(res.status).toBe(415)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_IMAGE_TYPE' } })
    expect(parse).not.toHaveBeenCalled()
  })

  it('용량 초과는 IMAGE_TOO_LARGE (AI 호출 전에 차단)', async () => {
    const { client, parse } = fakeClient(okReply(goodFood))
    const huge = Buffer.concat([Buffer.from(PNG_HEADER), Buffer.alloc(4_000_000, 1)]).toString('base64')
    const res = await handleAnalysis('inbody', { image: huge }, { env, client })
    expect(res.status).toBe(413)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'IMAGE_TOO_LARGE' } })
    expect(parse).not.toHaveBeenCalled()
  })

  it('base64가 아닌 문자열은 INVALID_IMAGE', async () => {
    const { client } = fakeClient(okReply(goodFood))
    const res = await handleAnalysis('food', { image: '!!!not base64!!!' }, { env, client })
    expect(res.body).toMatchObject({ ok: false, error: { code: 'INVALID_IMAGE' } })
  })

  it('data URL 접두사가 붙어 있어도 처리한다', async () => {
    const { client } = fakeClient(okReply(goodFood))
    const res = await handleAnalysis('food', { image: `data:image/png;base64,${validImage}` }, { env, client })
    expect(res.status).toBe(200)
  })
})

describe('Claude 호출 파라미터', () => {
  it('이미지를 base64 image 블록으로 전달하고 구조화 출력을 요청한다', async () => {
    const { client, parse } = fakeClient(okReply(goodFood))
    await handleAnalysis('food', { image: validImage }, { env, client })

    expect(parse).toHaveBeenCalledTimes(1)
    const params = (parse.mock.calls[0] as unknown as [Record<string, any>])[0]
    expect(params.model).toBe('claude-opus-5')
    expect(params.output_config.format).toBeDefined()
    expect(params.output_config.effort).toBe('medium')
    const [imageBlock, textBlock] = params.messages[0].content
    expect(imageBlock).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: validImage } })
    expect(textBlock.type).toBe('text')
    expect(params.system).toContain('meal photographs')
  })

  it('ANTHROPIC_MODEL로 모델을 교체할 수 있고, 미지원 모델에는 effort를 보내지 않는다', async () => {
    const { client, parse } = fakeClient(okReply(goodInBody))
    await handleAnalysis('inbody', { image: validImage }, { env: { ...env, ANTHROPIC_MODEL: 'claude-haiku-4-5' }, client })
    const params = (parse.mock.calls[0] as unknown as [Record<string, any>])[0]
    expect(params.model).toBe('claude-haiku-4-5')
    expect(params.output_config.effort).toBeUndefined()
    expect(params.system).toContain('body composition reports')
  })
})

describe('InBody 분석 결과 검증', () => {
  it('정상 결과를 그대로 반환한다', async () => {
    const { client } = fakeClient(okReply(goodInBody))
    const res = await handleAnalysis('inbody', { image: validImage }, { env, client })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, data: { weightKg: 75.2, skeletalMuscleMassKg: 34.1, bodyFatPercentage: 18.4, basalMetabolicRateKcal: 1702 } })
  })

  it('InBody 결과지가 아니면 수치를 만들지 않고 에러를 반환한다', async () => {
    const { client } = fakeClient(okReply({ ...goodInBody, isInBodyReport: false, weightKg: 70 }))
    const res = await handleAnalysis('inbody', { image: validImage }, { env, client })
    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_IN_BODY_REPORT' } })
    expect(res.body).not.toHaveProperty('data')
  })

  it('모든 값이 null이면 UNREADABLE', async () => {
    const empty: InBodyExtraction = {
      ...goodInBody,
      weightKg: null,
      skeletalMuscleMassKg: null,
      bodyFatMassKg: null,
      bodyFatPercentage: null,
      bodyWaterL: null,
      proteinMassKg: null,
      mineralMassKg: null,
      bmi: null,
      basalMetabolicRateKcal: null,
      confidence: 0.2,
    }
    const { client } = fakeClient(okReply(empty))
    const res = await handleAnalysis('inbody', { image: validImage }, { env, client })
    expect(res.body).toMatchObject({ ok: false, error: { code: 'UNREADABLE' } })
  })

  it('일부만 읽은 경우 null은 null로 유지하고(임의 생성 금지) 나머지는 반환한다', async () => {
    const { client } = fakeClient(okReply({ ...goodInBody, bodyFatPercentage: null, bmi: null, confidence: 0.5, warnings: ['체지방률이 흐릿해요.'] }))
    const res = await handleAnalysis('inbody', { image: validImage }, { env, client })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, data: { bodyFatPercentage: null, bmi: null, weightKg: 75.2, warnings: ['체지방률이 흐릿해요.'] } })
  })

  it('비현실적인 값은 null로 바꾸고 경고한다', async () => {
    const { client } = fakeClient(okReply({ ...goodInBody, weightKg: 752, bodyFatPercentage: 184 }))
    const res = await handleAnalysis('inbody', { image: validImage }, { env, client })
    expect(res.status).toBe(200)
    if (!res.body.ok) throw new Error('expected success')
    const data = res.body.data as InBodyExtraction
    expect(data.weightKg).toBeNull()
    expect(data.bodyFatPercentage).toBeNull()
    expect(data.warnings.join(' ')).toContain('체중')
    expect(data.warnings.join(' ')).toContain('체지방률')
  })

  it('체지방량과 체지방률이 서로 맞지 않으면 경고한다', async () => {
    const { client } = fakeClient(okReply({ ...goodInBody, bodyFatMassKg: 30, bodyFatPercentage: 10 }))
    const res = await handleAnalysis('inbody', { image: validImage }, { env, client })
    if (!res.body.ok) throw new Error('expected success')
    expect((res.body.data as InBodyExtraction).warnings.join(' ')).toContain('서로 맞지 않아요')
  })
})

describe('음식 분석 결과 검증', () => {
  it('정상 결과를 반환한다 (영양소 숫자는 포함하지 않는다)', async () => {
    const { client } = fakeClient(okReply(goodFood))
    const res = await handleAnalysis('food', { image: validImage }, { env, client })
    expect(res.status).toBe(200)
    if (!res.body.ok) throw new Error('expected success')
    const data = res.body.data as FoodExtraction
    expect(data.foods.map((f) => f.name)).toEqual(['닭가슴살', '현미밥'])
    expect(JSON.stringify(data)).not.toMatch(/calories|protein/i)
  })

  it('음식이 아닌 사진이면 음식 데이터를 만들지 않고 NOT_FOOD', async () => {
    const { client } = fakeClient(okReply({ isFood: false, mealName: '', foods: [], overallConfidence: 0, warnings: [] }))
    const res = await handleAnalysis('food', { image: validImage }, { env, client })
    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOOD' } })
    expect(res.body).not.toHaveProperty('data')
  })

  it('음식을 하나도 구분하지 못하면 UNREADABLE', async () => {
    const { client } = fakeClient(okReply({ ...goodFood, foods: [] }))
    const res = await handleAnalysis('food', { image: validImage }, { env, client })
    expect(res.body).toMatchObject({ ok: false, error: { code: 'UNREADABLE' } })
  })

  it('중량을 허용 범위로 정리하고 이름 없는 항목은 제외한다', async () => {
    const { client } = fakeClient(
      okReply({
        ...goodFood,
        foods: [
          { name: '  밥 ', estimatedGrams: 99999, cookingMethod: '', confidence: 2 },
          { name: '', estimatedGrams: 100, cookingMethod: null, confidence: 0.5 },
          { name: '김치', estimatedGrams: 1, cookingMethod: null, confidence: -1 },
        ],
      }),
    )
    const res = await handleAnalysis('food', { image: validImage }, { env, client })
    if (!res.body.ok) throw new Error('expected success')
    const data = res.body.data as FoodExtraction
    expect(data.foods).toEqual([
      { name: '밥', estimatedGrams: 2000, cookingMethod: null, confidence: 1 },
      { name: '김치', estimatedGrams: 5, cookingMethod: null, confidence: 0 },
    ])
  })
})

describe('AI 응답/API 오류 처리 (mock 결과로 대체하지 않는다)', () => {
  const cases: Array<[string, unknown, string, number]> = [
    ['모델 거절', { stop_reason: 'refusal', parsed_output: null }, 'REFUSED', 422],
    ['출력 잘림', { stop_reason: 'max_tokens', parsed_output: null }, 'PARSE_FAILED', 502],
    ['파싱 결과 없음', { stop_reason: 'end_turn', parsed_output: null }, 'PARSE_FAILED', 502],
  ]
  for (const [name, reply, code, status] of cases) {
    it(name, async () => {
      const { client } = fakeClient(reply)
      const res = await handleAnalysis('food', { image: validImage }, { env, client })
      expect(res.status).toBe(status)
      expect(res.body).toMatchObject({ ok: false, error: { code } })
      expect(res.body).not.toHaveProperty('data')
    })
  }

  const sdkErrors: Array<[string, () => unknown, string, number]> = [
    ['인증 실패(401)', () => Anthropic.APIError.generate(401, undefined, 'invalid x-api-key', new Headers()), 'AUTH_FAILED', 500],
    ['모델 없음(404)', () => Anthropic.APIError.generate(404, undefined, 'model not found', new Headers()), 'MODEL_UNAVAILABLE', 500],
    ['요청 한도(429)', () => Anthropic.APIError.generate(429, undefined, 'rate limited', new Headers()), 'RATE_LIMITED', 429],
    ['이미지 처리 실패(400)', () => Anthropic.APIError.generate(400, undefined, 'bad image', new Headers()), 'INVALID_IMAGE', 422],
    ['서버 오류(500)', () => Anthropic.APIError.generate(500, undefined, 'oops', new Headers()), 'UPSTREAM_ERROR', 502],
    ['과부하(529)', () => Anthropic.APIError.generate(529, undefined, 'overloaded', new Headers()), 'UPSTREAM_ERROR', 502],
    ['타임아웃', () => new Anthropic.APIConnectionTimeoutError(), 'TIMEOUT', 504],
    ['연결 실패', () => new Anthropic.APIConnectionError({ message: 'down' }), 'UPSTREAM_ERROR', 502],
    ['알 수 없는 오류', () => new Error('boom'), 'INTERNAL', 500],
  ]
  for (const [name, makeError, code, status] of sdkErrors) {
    it(name, async () => {
      const parse = vi.fn(async () => {
        throw makeError()
      })
      const client = { messages: { parse } } as unknown as VisionClient
      const res = await handleAnalysis('inbody', { image: validImage }, { env, client })
      expect(res.status).toBe(status)
      expect(res.body).toMatchObject({ ok: false, error: { code } })
      expect(res.body).not.toHaveProperty('data')
    })
  }

  it('에러 로그에 이미지(base64)나 API Key가 남지 않는다', async () => {
    const parse = vi.fn(async () => {
      throw Anthropic.APIError.generate(500, undefined, 'oops', new Headers())
    })
    const client = { messages: { parse } } as unknown as VisionClient
    await handleAnalysis('food', { image: validImage }, { env, client })
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)
    expect(logged).not.toContain(validImage.slice(0, 40))
    expect(logged).not.toContain('test-key-not-real')
  })
})
