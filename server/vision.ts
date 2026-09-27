import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { ZodType } from 'zod'
import { AnalysisError } from '../shared/errors.js'
import type { AnalysisErrorCode, AnalysisKind } from '../shared/errors.js'
import {
  MAX_OUTPUT_TOKENS,
  MAX_RETRIES,
  REQUEST_TIMEOUT_MS,
  resolveEffort,
  resolveModel,
  type Env,
} from './config.js'
import type { ValidatedImage } from './image.js'

// 테스트에서 가짜 클라이언트를 주입할 수 있도록 messages API만 요구한다.
export type VisionClient = Pick<Anthropic, 'messages'>

/** API Key는 서버 환경변수에서만 읽는다. 브라우저 번들에는 절대 포함되지 않는다. */
export function createVisionClient(env: Env, kind: AnalysisKind): Anthropic {
  const apiKey = env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new AnalysisError('MISSING_API_KEY', kind)
  return new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES })
}

/** Anthropic SDK 에러를 사용자에게 보여줄 수 있는 AnalysisError로 변환한다. */
export function mapVisionError(err: unknown, kind: AnalysisKind): AnalysisError {
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
  if (err instanceof Anthropic.BadRequestError) return wrap('INVALID_IMAGE')
  if (err instanceof Anthropic.APIError) return wrap('UPSTREAM_ERROR')
  if (err instanceof Anthropic.AnthropicError) return wrap('PARSE_FAILED')
  if (err instanceof SyntaxError || (err instanceof Error && err.name === 'ZodError')) return wrap('PARSE_FAILED')
  return wrap('INTERNAL')
}

/** 로그용 원인 요약. 요청 내용(이미지 등)이나 API Key는 포함하지 않는다. */
export function describeCause(error: unknown): string {
  const err = error instanceof AnalysisError && error.cause !== undefined ? error.cause : error
  if (err instanceof Anthropic.APIError) return `${err.name} ${err.status ?? ''} ${err.message.slice(0, 160)}`.trim()
  if (err instanceof Error) return err.name
  return typeof err
}

interface ExtractArgs<T> {
  client: VisionClient
  env: Env
  kind: AnalysisKind
  schema: ZodType<T>
  system: string
  prompt: string
  image: ValidatedImage
}

/**
 * 이미지 1장 + 프롬프트를 Claude에 보내고, 스키마에 맞는 구조화 JSON을 받아온다.
 * 스키마에 맞지 않거나 거절/잘림이 발생하면 에러를 던진다(임의의 기본값으로 대체하지 않는다).
 */
export async function extractStructured<T>({ client, env, kind, schema, system, prompt, image }: ExtractArgs<T>): Promise<T> {
  const model = resolveModel(env)
  const effort = resolveEffort(env, model)

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      output_config: { format: zodOutputFormat(schema), ...(effort ? { effort } : {}) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') throw new AnalysisError('REFUSED', kind)
    if (response.stop_reason === 'max_tokens') throw new AnalysisError('PARSE_FAILED', kind)
    if (!response.parsed_output) throw new AnalysisError('PARSE_FAILED', kind)
    return response.parsed_output
  } catch (err) {
    throw mapVisionError(err, kind)
  }
}
