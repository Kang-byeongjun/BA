import type { ZodType } from 'zod'
import { AnalysisError } from '../shared/errors.js'
import type { AnalysisKind } from '../shared/errors.js'
import { createAiClient, describeCause as describeAiCause, type AiClient } from './aiClient.js'
import { MAX_OUTPUT_TOKENS, type Env } from './config.js'
import type { ValidatedImage } from './image.js'

/**
 * vision.ts — handlers.ts/coach.ts/nutritionEstimate.ts가 쓰는 얇은 호환 레이어.
 * 실제 Claude/OpenAI 전환 로직은 aiClient.ts에 있다 — 이 파일은 "이미지 분석"이라는
 * 기존 이름(VisionClient 등)을 그대로 유지해서 호출하는 쪽 코드를 바꾸지 않아도 되게 한다.
 */
export type VisionClient = AiClient

export function createVisionClient(env: Env, kind: AnalysisKind): VisionClient {
  return createAiClient(env, kind)
}

// aiClient.ts의 각 어댑터가 SDK 에러를 이미 AnalysisError로 변환해서 던지므로, 여기 도착하는
// 시점엔 대부분 이미 AnalysisError다. 혹시 모를 예상 밖의 에러만 INTERNAL로 감싼다.
export function mapVisionError(err: unknown, kind: AnalysisKind): AnalysisError {
  if (err instanceof AnalysisError) return err
  return new AnalysisError('INTERNAL', kind, undefined, err)
}

export const describeCause = describeAiCause

interface ExtractArgs<T> {
  client: VisionClient
  env: Env
  kind: AnalysisKind
  schema: ZodType<T>
  system: string
  prompt: string
  image: ValidatedImage
}

/** 이미지 1장 + 프롬프트를 보내고, 스키마에 맞는 구조화 JSON을 받아온다. */
export async function extractStructured<T>({ client, schema, system, prompt, image }: ExtractArgs<T>): Promise<T> {
  return client.parseStructured({ schema, system, prompt, image, maxTokens: MAX_OUTPUT_TOKENS })
}
