import { AnalysisError } from '../shared/errors.js'
import { createAiClient, describeCause } from './aiClient.js'
import type { Env } from './config.js'
import { generateRoutine } from './engine/generate.js'
import type { LlmClient } from './engine/llm.js'
import { WorkoutRequest } from './engine/types.js'
import type { HandlerResult } from './handlers.js'
import { createWorkoutLlm } from './workoutLlm.js'

// 운동 추천은 이미지가 없는 텍스트 요청이라, 에러 종류(kind)는 같은 성격인 기존 'coach'를 그대로 쓴다.
// ('workout'을 새로 추가하면 src/services/analysisApi.ts 타입까지 고쳐야 해서 지금은 피한다)
const KIND = 'coach' as const
const INVALID_MESSAGE = '운동 추천 요청 형식이 올바르지 않아요. 입력한 운동 정보를 다시 확인해주세요.'

export interface WorkoutHandlerDeps {
  // 기본값은 process.env. 로컬 개발/테스트에서 주입할 수 있다.
  env?: Env
  // 테스트용 가짜 LLM. null이면 LLM 없이 규칙 기반 기본 루틴만 만든다.
  llm?: LlmClient | null
}

function parseWorkoutBody(raw: unknown): WorkoutRequest {
  let value: unknown = raw
  if (Buffer.isBuffer(value)) value = value.toString('utf8')
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      throw new AnalysisError('INVALID_REQUEST', KIND, INVALID_MESSAGE)
    }
  }
  const parsed = WorkoutRequest.safeParse(value)
  if (!parsed.success) throw new AnalysisError('INVALID_REQUEST', KIND, INVALID_MESSAGE)
  return parsed.data
}

/** AI 키·모델이 설정돼 있지 않으면 에러 대신 undefined → 엔진이 규칙 기반 기본 루틴을 만든다. */
function createLlmOrSkip(env: Env): LlmClient | undefined {
  try {
    return createWorkoutLlm(createAiClient(env, KIND))
  } catch (err) {
    if (err instanceof AnalysisError && (err.code === 'MISSING_API_KEY' || err.code === 'MODEL_UNAVAILABLE')) {
      console.warn(`[workout] AI 미설정(${err.code}) → 기본 루틴으로 응답`)
      return undefined
    }
    throw err
  }
}

/**
 * POST /api/workout 처리. 요청 검사 → (가능하면) AI가 종목 선택 → 엔진 검증 → 실패 시 기본 루틴.
 * AI가 실패해도 엔진이 기본 루틴으로 대신하므로, 에러 응답은 요청 형식이 틀렸을 때와 예상 밖 문제뿐이다.
 */
export async function handleWorkout(rawBody: unknown, deps: WorkoutHandlerDeps = {}): Promise<HandlerResult> {
  const env: Env = deps.env ?? process.env

  try {
    const input = parseWorkoutBody(rawBody)
    const llm = deps.llm !== undefined ? (deps.llm ?? undefined) : createLlmOrSkip(env)
    const data = await generateRoutine(input, { llm })
    if (data.source === 'fallback' && data.attemptErrors.length > 0) {
      console.warn(`[workout] AI 루틴 ${data.attempts}회 실패 → 기본 루틴 사용`)
    }
    return { status: 200, body: { ok: true, data } }
  } catch (err) {
    const error = err instanceof AnalysisError ? err : new AnalysisError('INTERNAL', KIND, undefined, err)
    // 사용자 입력·API Key는 로그에 남기지 않는다.
    console.error(`[workout] ${error.code} (${describeCause(err)})`)
    return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message } } }
  }
}
