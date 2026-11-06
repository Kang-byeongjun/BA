import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { AnalysisError } from '../../shared/errors.js'
import { createAnthropicClient, createOpenAiClient, describeCause, mapAnthropicError, mapOpenAiError } from '../aiClient.js'
import type { Env } from '../config.js'
import type { ValidatedImage } from '../image.js'

// aiClient.ts의 Claude/OpenAI 어댑터가 (1) SDK에 올바른 모양의 요청을 보내는지,
// (2) SDK 응답/에러를 올바른 AnalysisErrorCode로 매핑하는지 검증한다.
// 실제 API는 호출하지 않고, rawClient 주입 지점(테스트 전용)으로 SDK를 대체한다.

const schema = z.object({ foo: z.string() })
const image: ValidatedImage = { mediaType: 'image/png', base64: 'ZmFrZQ==', bytes: 4 }

describe('createAnthropicClient', () => {
  const env: Env = { ANTHROPIC_API_KEY: 'test-key' }

  it('API Key가 없으면 MISSING_API_KEY를 던진다 (실제 SDK도 만들지 않는다)', () => {
    let caught: unknown
    try {
      createAnthropicClient({}, 'food')
    } catch (err) {
      caught = err
    }
    expect((caught as { code?: string } | undefined)?.code).toBe('MISSING_API_KEY')
  })

  it('이미지+프롬프트를 image/text 블록으로, 스키마를 output_config.format으로 전달한다', async () => {
    const parse = vi.fn(async (_params: any) => ({ stop_reason: 'end_turn', parsed_output: { foo: 'bar' } }))
    const client = createAnthropicClient(env, 'food', { messages: { parse } } as unknown as Anthropic)

    const result = await client.parseStructured({ schema, system: 'sys', prompt: 'prompt', image, maxTokens: 123 })

    expect(result).toEqual({ foo: 'bar' })
    expect(parse).toHaveBeenCalledTimes(1)
    const params = parse.mock.calls[0]![0] as any
    expect(params.model).toBe('claude-opus-5')
    expect(params.max_tokens).toBe(123)
    expect(params.system).toBe('sys')
    expect(params.output_config.format).toBeDefined()
    expect(params.output_config.effort).toBe('medium')
    expect(params.messages[0].content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'ZmFrZQ==' } },
      { type: 'text', text: 'prompt' },
    ])
  })

  it('이미지가 없으면 순수 텍스트 문자열로 보낸다', async () => {
    const parse = vi.fn(async (_params: any) => ({ stop_reason: 'end_turn', parsed_output: { foo: 'bar' } }))
    const client = createAnthropicClient(env, 'coach', { messages: { parse } } as unknown as Anthropic)

    await client.parseStructured({ schema, system: 'sys', prompt: 'prompt', maxTokens: 50 })

    const params = parse.mock.calls[0]![0] as any
    expect(params.messages[0].content).toBe('prompt')
  })

  it('ANTHROPIC_MODEL로 모델을 교체할 수 있고, 미지원 모델에는 effort를 보내지 않는다', async () => {
    const parse = vi.fn(async (_params: any) => ({ stop_reason: 'end_turn', parsed_output: { foo: 'bar' } }))
    const client = createAnthropicClient({ ...env, ANTHROPIC_MODEL: 'claude-haiku-4-5' }, 'food', {
      messages: { parse },
    } as unknown as Anthropic)

    await client.parseStructured({ schema, system: 'sys', prompt: 'p', image, maxTokens: 10 })

    const params = parse.mock.calls[0]![0] as any
    expect(params.model).toBe('claude-haiku-4-5')
    expect(params.output_config.effort).toBeUndefined()
  })

  const replies: Array<[string, unknown, string]> = [
    ['모델 거절', { stop_reason: 'refusal', parsed_output: null }, 'REFUSED'],
    ['출력 잘림', { stop_reason: 'max_tokens', parsed_output: null }, 'PARSE_FAILED'],
    ['파싱 결과 없음', { stop_reason: 'end_turn', parsed_output: null }, 'PARSE_FAILED'],
  ]
  for (const [name, reply, code] of replies) {
    it(`응답이 ${name}이면 ${code}`, async () => {
      const parse = vi.fn(async () => reply)
      const client = createAnthropicClient(env, 'food', { messages: { parse } } as unknown as Anthropic)
      await expect(client.parseStructured({ schema, system: 's', prompt: 'p', maxTokens: 10 })).rejects.toMatchObject({ code })
    })
  }

  const sdkErrors: Array<[string, () => unknown, string]> = [
    ['인증 실패(401)', () => Anthropic.APIError.generate(401, undefined, 'invalid x-api-key', new Headers()), 'AUTH_FAILED'],
    ['모델 없음(404)', () => Anthropic.APIError.generate(404, undefined, 'model not found', new Headers()), 'MODEL_UNAVAILABLE'],
    ['요청 한도(429)', () => Anthropic.APIError.generate(429, undefined, 'rate limited', new Headers()), 'RATE_LIMITED'],
    ['이미지 처리 실패(400)', () => Anthropic.APIError.generate(400, undefined, 'bad image', new Headers()), 'INVALID_IMAGE'],
    ['서버 오류(500)', () => Anthropic.APIError.generate(500, undefined, 'oops', new Headers()), 'UPSTREAM_ERROR'],
    ['과부하(529)', () => Anthropic.APIError.generate(529, undefined, 'overloaded', new Headers()), 'UPSTREAM_ERROR'],
    ['타임아웃', () => new Anthropic.APIConnectionTimeoutError(), 'TIMEOUT'],
    ['연결 실패', () => new Anthropic.APIConnectionError({ message: 'down' }), 'UPSTREAM_ERROR'],
    ['알 수 없는 오류', () => new Error('boom'), 'INTERNAL'],
  ]
  for (const [name, makeError, code] of sdkErrors) {
    it(`SDK 에러(${name}) → ${code}`, async () => {
      const parse = vi.fn(async () => {
        throw makeError()
      })
      const client = createAnthropicClient(env, 'inbody', { messages: { parse } } as unknown as Anthropic)
      await expect(client.parseStructured({ schema, system: 's', prompt: 'p', image, maxTokens: 10 })).rejects.toMatchObject({ code })
    })
  }

  it('mapAnthropicError는 이미 AnalysisError인 경우 그대로 반환한다', () => {
    const original = new AnalysisError('TIMEOUT', 'food')
    expect(mapAnthropicError(original, 'food')).toBe(original)
  })
})

describe('createOpenAiClient', () => {
  const env: Env = { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-5' }

  it('API Key가 없으면 MISSING_API_KEY를 던진다', () => {
    let caught: unknown
    try {
      createOpenAiClient({ OPENAI_MODEL: 'gpt-5' }, 'food')
    } catch (err) {
      caught = err
    }
    expect((caught as { code?: string } | undefined)?.code).toBe('MISSING_API_KEY')
  })

  it('OPENAI_MODEL이 없으면 MODEL_UNAVAILABLE을 던진다 (rawClient를 주입해도 마찬가지)', () => {
    const parse = vi.fn()
    let caught: unknown
    try {
      createOpenAiClient({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k' }, 'food', { chat: { completions: { parse } } } as unknown as OpenAI)
    } catch (err) {
      caught = err
    }
    expect((caught as { code?: string } | undefined)?.code).toBe('MODEL_UNAVAILABLE')
  })

  it('이미지+프롬프트를 image_url/text 블록으로, 스키마를 response_format으로 전달한다', async () => {
    const parse = vi.fn(async (_params: any) => ({ choices: [{ finish_reason: 'stop', message: { parsed: { foo: 'bar' }, refusal: null } }] }))
    const client = createOpenAiClient(env, 'food', { chat: { completions: { parse } } } as unknown as OpenAI)

    const result = await client.parseStructured({ schema, system: 'sys', prompt: 'prompt', image, maxTokens: 123 })

    expect(result).toEqual({ foo: 'bar' })
    const params = parse.mock.calls[0]![0] as any
    expect(params.model).toBe('gpt-5')
    expect(params.max_completion_tokens).toBe(123)
    expect(params.response_format).toBeDefined()
    expect(params.messages[0]).toMatchObject({ role: 'system', content: 'sys' })
    expect(params.messages[1].content).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,ZmFrZQ==' } },
      { type: 'text', text: 'prompt' },
    ])
  })

  it('이미지가 없으면 순수 텍스트 문자열로 보낸다', async () => {
    const parse = vi.fn(async (_params: any) => ({ choices: [{ finish_reason: 'stop', message: { parsed: { foo: 'bar' }, refusal: null } }] }))
    const client = createOpenAiClient(env, 'coach', { chat: { completions: { parse } } } as unknown as OpenAI)

    await client.parseStructured({ schema, system: 'sys', prompt: 'prompt', maxTokens: 50 })

    const params = parse.mock.calls[0]![0] as any
    expect(params.messages[1].content).toBe('prompt')
  })

  const replies: Array<[string, unknown, string]> = [
    ['모델 거절', { choices: [{ finish_reason: 'stop', message: { parsed: null, refusal: '거절' } }] }, 'REFUSED'],
    ['출력 잘림', { choices: [{ finish_reason: 'length', message: { parsed: null, refusal: null } }] }, 'PARSE_FAILED'],
    ['파싱 결과 없음', { choices: [{ finish_reason: 'stop', message: { parsed: null, refusal: null } }] }, 'PARSE_FAILED'],
  ]
  for (const [name, reply, code] of replies) {
    it(`응답이 ${name}이면 ${code}`, async () => {
      const parse = vi.fn(async () => reply)
      const client = createOpenAiClient(env, 'food', { chat: { completions: { parse } } } as unknown as OpenAI)
      await expect(client.parseStructured({ schema, system: 's', prompt: 'p', maxTokens: 10 })).rejects.toMatchObject({ code })
    })
  }

  const sdkErrors: Array<[string, () => unknown, string]> = [
    ['인증 실패(401)', () => OpenAI.APIError.generate(401, undefined, 'invalid api key', new Headers()), 'AUTH_FAILED'],
    ['모델 없음(404)', () => OpenAI.APIError.generate(404, undefined, 'model not found', new Headers()), 'MODEL_UNAVAILABLE'],
    ['요청 한도(429)', () => OpenAI.APIError.generate(429, undefined, 'rate limited', new Headers()), 'RATE_LIMITED'],
    ['이미지 처리 실패(400)', () => OpenAI.APIError.generate(400, undefined, 'bad image', new Headers()), 'INVALID_IMAGE'],
    ['서버 오류(500)', () => OpenAI.APIError.generate(500, undefined, 'oops', new Headers()), 'UPSTREAM_ERROR'],
    ['타임아웃', () => new OpenAI.APIConnectionTimeoutError(), 'TIMEOUT'],
    ['연결 실패', () => new OpenAI.APIConnectionError({ message: 'down' }), 'UPSTREAM_ERROR'],
    ['알 수 없는 오류', () => new Error('boom'), 'INTERNAL'],
  ]
  for (const [name, makeError, code] of sdkErrors) {
    it(`SDK 에러(${name}) → ${code}`, async () => {
      const parse = vi.fn(async () => {
        throw makeError()
      })
      const client = createOpenAiClient(env, 'inbody', { chat: { completions: { parse } } } as unknown as OpenAI)
      await expect(client.parseStructured({ schema, system: 's', prompt: 'p', image, maxTokens: 10 })).rejects.toMatchObject({ code })
    })
  }

  it('mapOpenAiError는 이미 AnalysisError인 경우 그대로 반환한다', () => {
    const original = new AnalysisError('TIMEOUT', 'food')
    expect(mapOpenAiError(original, 'food')).toBe(original)
  })
})

describe('describeCause', () => {
  it('Anthropic/OpenAI APIError는 이름+status+메시지 일부를 요약한다 (API Key/이미지 포함 안 함)', () => {
    const err = Anthropic.APIError.generate(500, undefined, 'oops', new Headers())
    expect(describeCause(err)).toContain('500')
    expect(describeCause(err)).toContain('oops')
  })

  it('알 수 없는 값도 던지지 않고 설명한다', () => {
    expect(describeCause('weird')).toBe('string')
    expect(describeCause(new Error('boom'))).toBe('Error')
  })
})
