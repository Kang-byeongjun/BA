import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { ZodType } from 'zod'
import { AnalysisError } from '../shared/errors.js'
import type { AnalysisErrorCode, AnalysisKind } from '../shared/errors.js'
import { MAX_RETRIES, REQUEST_TIMEOUT_MS, resolveEffort, resolveModel, resolveOpenAiEffort, resolveProvider, type Env } from './config.js'
import type { ValidatedImage } from './image.js'

/**
 * aiClient — "이미지(선택)+프롬프트+zod 스키마를 주면 구조화된 JSON을 받아온다"를
 * Claude/OpenAI 어느 쪽으로도 쓸 수 있게 감싼 공통 인터페이스.
 * 어느 모델을 실제로 호출하는지는 AI_PROVIDER 환경변수로만 결정되고, 호출하는 쪽
 * (vision.ts/coach.ts/nutritionEstimate.ts)은 어떤 공급자인지 몰라도 된다.
 */
export interface StructuredRequest<T> {
  schema: ZodType<T>
  system: string
  prompt: string
  image?: ValidatedImage
  maxTokens: number
}

export interface AiClient {
  parseStructured<T>(req: StructuredRequest<T>): Promise<T>
}

/** AI_PROVIDER(기본 anthropic)에 따라 Claude 또는 OpenAI 클라이언트를 만든다. API Key가 없으면 바로 던진다. */
export function createAiClient(env: Env, kind: AnalysisKind): AiClient {
  return resolveProvider(env) === 'openai' ? createOpenAiClient(env, kind) : createAnthropicClient(env, kind)
}

/** 로그용 원인 요약. 요청 내용(이미지 등)이나 API Key는 포함하지 않는다. */
export function describeCause(error: unknown): string {
  const err = error instanceof AnalysisError && error.cause !== undefined ? error.cause : error
  if (err instanceof Anthropic.APIError) return `${err.name} ${err.status ?? ''} ${err.message.slice(0, 160)}`.trim()
  if (err instanceof OpenAI.APIError) return `${err.name} ${err.status ?? ''} ${err.message.slice(0, 160)}`.trim()
  if (err instanceof Error) return err.name
  return typeof err
}

// ---------------------------------------------------------------------------
// Anthropic (Claude)
// ---------------------------------------------------------------------------

/**
 * rawClient는 테스트 전용 주입 지점이다 — 넘기지 않으면 실제 Anthropic SDK 클라이언트를 만든다.
 * (핸들러 쪽 production 코드는 항상 createAiClient(env, kind)만 쓰고 이 매개변수를 쓰지 않는다)
 */
export function createAnthropicClient(env: Env, kind: AnalysisKind, rawClient?: Pick<Anthropic, 'messages'>): AiClient {
  const apiKey = env.ANTHROPIC_API_KEY?.trim()
  if (!rawClient && !apiKey) throw new AnalysisError('MISSING_API_KEY', kind)
  const client = rawClient ?? new Anthropic({ apiKey: apiKey!, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES })

  return {
    async parseStructured<T>({ schema, system, prompt, image, maxTokens }: StructuredRequest<T>): Promise<T> {
      const model = resolveModel(env)
      const effort = resolveEffort(env, model)

      try {
        const response = await client.messages.parse({
          model,
          max_tokens: maxTokens,
          system,
          output_config: { format: zodOutputFormat(schema), ...(effort ? { effort } : {}) },
          messages: [
            {
              role: 'user',
              content: image
                ? [
                    { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
                    { type: 'text', text: prompt },
                  ]
                : prompt,
            },
          ],
        })

        if (response.stop_reason === 'refusal') throw new AnalysisError('REFUSED', kind)
        if (response.stop_reason === 'max_tokens') throw new AnalysisError('PARSE_FAILED', kind)
        if (!response.parsed_output) throw new AnalysisError('PARSE_FAILED', kind)
        return response.parsed_output
      } catch (err) {
        throw mapAnthropicError(err, kind)
      }
    },
  }
}

export function mapAnthropicError(err: unknown, kind: AnalysisKind): AnalysisError {
  if (err instanceof AnalysisError) return err
  const wrap = (code: AnalysisErrorCode) => new AnalysisError(code, kind, undefined, err)
  // 타임아웃은 연결 에러의 하위 클래스이므로 먼저 검사한다.
  if (err instanceof Anthropic.APIConnectionTimeoutError) return wrap('TIMEOUT')
  if (err instanceof Anthropic.APIConnectionError) return wrap('UPSTREAM_ERROR')
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return wrap('AUTH_FAILED')
  }
  if (err instanceof Anthropic.NotFoundError) return wrap('MODEL_UNAVAILABLE')
  if (err instanceof Anthropic.RateLimitError) return wrap('RATE_LIMITED')
  if (err instanceof Anthropic.BadRequestError) return wrap(kind === 'coach' || kind === 'nutrition' ? 'INVALID_REQUEST' : 'INVALID_IMAGE')
  if (err instanceof Anthropic.APIError) return wrap('UPSTREAM_ERROR')
  if (err instanceof Anthropic.AnthropicError) return wrap('PARSE_FAILED')
  if (err instanceof SyntaxError || (err instanceof Error && err.name === 'ZodError')) return wrap('PARSE_FAILED')
  return wrap('INTERNAL')
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

/** rawClient는 테스트 전용 주입 지점이다 — 넘기지 않으면 실제 OpenAI SDK 클라이언트를 만든다. */
export function createOpenAiClient(env: Env, kind: AnalysisKind, rawClient?: Pick<OpenAI, 'chat'>): AiClient {
  const apiKey = env.OPENAI_API_KEY?.trim()
  if (!rawClient && !apiKey) {
    throw new AnalysisError('MISSING_API_KEY', kind, 'AI 분석 서버가 아직 설정되지 않았어요. 관리자에게 OPENAI_API_KEY 설정을 요청해주세요.')
  }
  const model = resolveModel(env)
  if (!model) {
    throw new AnalysisError(
      'MODEL_UNAVAILABLE',
      kind,
      '사용할 OpenAI 모델이 지정되지 않았어요. 관리자에게 OPENAI_MODEL 설정을 요청해주세요.',
    )
  }
  const client = rawClient ?? new OpenAI({ apiKey: apiKey!, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES })

  return {
    async parseStructured<T>({ schema, system, prompt, image, maxTokens }: StructuredRequest<T>): Promise<T> {
      try {
        const response = await client.chat.completions.parse({
          model,
          max_completion_tokens: maxTokens,
          reasoning_effort: resolveOpenAiEffort(env, model),
          response_format: zodResponseFormat(schema, 'result'),
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: image
                ? [
                    { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } },
                    { type: 'text', text: prompt },
                  ]
                : prompt,
            },
          ],
        })

        const choice = response.choices[0]
        if (choice?.message?.refusal) throw new AnalysisError('REFUSED', kind)
        if (choice?.finish_reason === 'length') throw new AnalysisError('PARSE_FAILED', kind)
        if (!choice?.message?.parsed) throw new AnalysisError('PARSE_FAILED', kind)
        return choice.message.parsed
      } catch (err) {
        throw mapOpenAiError(err, kind)
      }
    },
  }
}

export function mapOpenAiError(err: unknown, kind: AnalysisKind): AnalysisError {
  if (err instanceof AnalysisError) return err
  const wrap = (code: AnalysisErrorCode) => new AnalysisError(code, kind, undefined, err)
  if (err instanceof OpenAI.APIConnectionTimeoutError) return wrap('TIMEOUT')
  if (err instanceof OpenAI.APIConnectionError) return wrap('UPSTREAM_ERROR')
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) return wrap('AUTH_FAILED')
  if (err instanceof OpenAI.NotFoundError) return wrap('MODEL_UNAVAILABLE')
  if (err instanceof OpenAI.RateLimitError) return wrap('RATE_LIMITED')
  if (err instanceof OpenAI.BadRequestError) return wrap(kind === 'coach' || kind === 'nutrition' ? 'INVALID_REQUEST' : 'INVALID_IMAGE')
  if (err instanceof OpenAI.APIError) return wrap('UPSTREAM_ERROR')
  if (err instanceof OpenAI.OpenAIError) return wrap('PARSE_FAILED')
  if (err instanceof SyntaxError || (err instanceof Error && err.name === 'ZodError')) return wrap('PARSE_FAILED')
  return wrap('INTERNAL')
}
