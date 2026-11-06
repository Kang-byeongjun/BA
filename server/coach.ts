import type { CoachMealRequestBody, CoachMessage } from '../shared/analysis.js'
import { coachMessageSchema } from '../shared/schemas.js'
import { buildCoachUserPrompt, COACH_SYSTEM_PROMPT } from './prompts.js'
import { mapVisionError, type VisionClient } from './vision.js'

// 코칭 문구는 한두 문장이면 충분하므로, 이미지 수치 추출(MAX_OUTPUT_TOKENS)보다 훨씬 작게 잡는다.
const COACH_MAX_OUTPUT_TOKENS = 500

/**
 * 추천 식사에 대한 한 줄 코칭 문구를 생성한다.
 * 식사·수치는 이미 규칙 기반 엔진이 결정했고, 여기서는 그 결과를 설명하는 문장만 만든다(숫자 재생성 없음).
 */
export async function generateCoachMessage(client: VisionClient, input: CoachMealRequestBody): Promise<CoachMessage> {
  try {
    return await client.parseStructured({
      schema: coachMessageSchema,
      system: COACH_SYSTEM_PROMPT,
      prompt: buildCoachUserPrompt(input),
      maxTokens: COACH_MAX_OUTPUT_TOKENS,
    })
  } catch (err) {
    throw mapVisionError(err, 'coach')
  }
}
