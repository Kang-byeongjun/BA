import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { CoachMealRequestBody, CoachMessage } from '../shared/analysis.js'
import { AnalysisError } from '../shared/errors.js'
import { coachMessageSchema } from '../shared/schemas.js'
import { resolveEffort, resolveModel, type Env } from './config.js'
import { buildCoachUserPrompt, COACH_SYSTEM_PROMPT } from './prompts.js'
import { mapVisionError, type VisionClient } from './vision.js'

// 코칭 문구는 한두 문장이면 충분하므로, 이미지 수치 추출(MAX_OUTPUT_TOKENS)보다 훨씬 작게 잡는다.
const COACH_MAX_OUTPUT_TOKENS = 500

/**
 * 추천 식사에 대한 한 줄 코칭 문구를 생성한다.
 * 식사·수치는 이미 규칙 기반 엔진이 결정했고, 여기서는 그 결과를 설명하는 문장만 만든다(숫자 재생성 없음).
 */
export async function generateCoachMessage(
  client: VisionClient,
  env: Env,
  input: CoachMealRequestBody,
): Promise<CoachMessage> {
  const model = resolveModel(env)
  const effort = resolveEffort(env, model)

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: COACH_MAX_OUTPUT_TOKENS,
      system: COACH_SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(coachMessageSchema), ...(effort ? { effort } : {}) },
      messages: [{ role: 'user', content: buildCoachUserPrompt(input) }],
    })

    if (response.stop_reason === 'refusal') throw new AnalysisError('REFUSED', 'coach')
    if (response.stop_reason === 'max_tokens') throw new AnalysisError('PARSE_FAILED', 'coach')
    if (!response.parsed_output) throw new AnalysisError('PARSE_FAILED', 'coach')
    return response.parsed_output
  } catch (err) {
    throw mapVisionError(err, 'coach')
  }
}
