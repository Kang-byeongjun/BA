import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { NutritionEstimateRequestBody, NutritionEstimateResult } from '../shared/analysis.js'
import { AnalysisError } from '../shared/errors.js'
import { nutritionEstimateResultSchema } from '../shared/schemas.js'
import { resolveEffort, resolveModel, type Env } from './config.js'
import { buildNutritionEstimateUserPrompt, NUTRITION_ESTIMATE_SYSTEM_PROMPT } from './prompts.js'
import { mapVisionError, type VisionClient } from './vision.js'

// 숫자 5개 + 신뢰도 정도라 이미지 수치 추출(MAX_OUTPUT_TOKENS)보다 훨씬 작게 잡는다.
const NUTRITION_ESTIMATE_MAX_OUTPUT_TOKENS = 500

/**
 * DB·검색으로 못 찾은 음식의 100g당 영양소를 Claude의 일반 지식으로 추정한다.
 * 이미지 없이 음식 이름(+조리법)만으로 추정하며, 실제 영양성분표를 조회하는 것이 아니다.
 */
export async function generateNutritionEstimate(
  client: VisionClient,
  env: Env,
  input: NutritionEstimateRequestBody,
): Promise<NutritionEstimateResult> {
  const model = resolveModel(env)
  const effort = resolveEffort(env, model)

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: NUTRITION_ESTIMATE_MAX_OUTPUT_TOKENS,
      system: NUTRITION_ESTIMATE_SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(nutritionEstimateResultSchema), ...(effort ? { effort } : {}) },
      messages: [{ role: 'user', content: buildNutritionEstimateUserPrompt(input) }],
    })

    if (response.stop_reason === 'refusal') throw new AnalysisError('REFUSED', 'nutrition')
    if (response.stop_reason === 'max_tokens') throw new AnalysisError('PARSE_FAILED', 'nutrition')
    if (!response.parsed_output) throw new AnalysisError('PARSE_FAILED', 'nutrition')
    return response.parsed_output
  } catch (err) {
    throw mapVisionError(err, 'nutrition')
  }
}
