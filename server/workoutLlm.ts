import { AnalysisError, isRetryable } from '../shared/errors.js'
import type { AiClient } from './aiClient.js'
import { MAX_OUTPUT_TOKENS } from './config.js'
import type { LlmClient } from './engine/llm.js'
import { LlmOutput } from './engine/types.js'

/**
 * 엔진의 LlmClient("system·user 문장 → JSON 문자열")를 기존 server/aiClient.ts로 연결하는 어댑터.
 * - 어떤 AI(Claude/OpenAI)를 쓸지는 aiClient가 AI_PROVIDER로 정한다. 여기서는 신경 쓰지 않는다.
 * - parseStructured에 엔진의 출력 스키마(LlmOutput)를 넘겨 "정해진 모양의 JSON"만 받는다.
 * - 엔진은 실패하면 최대 2번 더 시도하는데, 키 없음·인증 실패처럼 다시 해도 소용없는 에러가 한 번 나면
 *   그 뒤 시도는 API를 부르지 않고 바로 같은 에러를 던진다(교수님 지원 키 한도를 아끼기 위해).
 */
export function createWorkoutLlm(ai: AiClient): LlmClient {
  let blocked: AnalysisError | undefined

  return {
    async complete({ system, user }) {
      if (blocked) throw blocked
      try {
        const output = await ai.parseStructured({ schema: LlmOutput, system, prompt: user, maxTokens: MAX_OUTPUT_TOKENS })
        return JSON.stringify(output)
      } catch (err) {
        if (err instanceof AnalysisError && !isRetryable(err.code)) blocked = err
        throw err
      }
    },
  }
}
