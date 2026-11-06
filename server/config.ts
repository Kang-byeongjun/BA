export type Env = Record<string, string | undefined>

export type AiProvider = 'anthropic' | 'openai'

// AI_PROVIDER=openai 로 바꾸면 Claude 대신 OpenAI 모델을 쓴다(둘 다 API Key만 있으면 전환 가능).
// 지정하지 않거나 다른 값이면 기본값인 anthropic(Claude)을 쓴다.
export function resolveProvider(env: Env): AiProvider {
  return env.AI_PROVIDER?.trim().toLowerCase() === 'openai' ? 'openai' : 'anthropic'
}

// 이미지 입력을 지원하는 현재 모델. 코드 수정 없이 ANTHROPIC_MODEL 환경변수로 교체할 수 있다.
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5'

// Vercel Function 요청 본문 한도(4.5MB)에 base64 인코딩(+33%)과 JSON 오버헤드를 감안한 이미지 상한(디코딩 기준)
export const MAX_IMAGE_BYTES = 3_200_000
export const MIN_IMAGE_BYTES = 200

// thinking 토큰도 max_tokens에 포함되므로 JSON 출력보다 넉넉하게 잡는다.
export const MAX_OUTPUT_TOKENS = 8192

// 재시도 1회 포함 최악의 경우에도 함수 실행 한도(Hobby 300초) 안에서 끝나도록 한다.
export const REQUEST_TIMEOUT_MS = 40_000
export const MAX_RETRIES = 1

/**
 * Claude는 설정 안 하면 기본 모델을 쓰지만, OpenAI는 어떤 모델을 쓸지(예: 비전 지원 모델인지)
 * 임의로 추측하지 않는다 — OPENAI_MODEL을 반드시 지정해야 하며, 비어 있으면 빈 문자열을 돌려주고
 * 호출하는 쪽(server/aiClient.ts)에서 MODEL_UNAVAILABLE로 처리한다.
 */
export function resolveModel(env: Env): string {
  if (resolveProvider(env) === 'openai') return env.OPENAI_MODEL?.trim() || ''
  return env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max']

// effort 파라미터를 지원하는 모델 계열 (미지원 모델에 보내면 400이 나므로 제한한다)
const EFFORT_CAPABLE = /^claude-(opus-5|sonnet-5|fable|mythos|opus-4-[678]|sonnet-4-6)/

/**
 * ANTHROPIC_EFFORT=low|medium|high|xhigh|max 로 지정하거나 none 으로 끌 수 있다.
 * 지정하지 않으면 지원 모델에서만 medium 을 쓴다(이미지 수치 추출은 과한 추론이 필요 없음).
 * OpenAI에는 없는 Anthropic 전용 파라미터라 OpenAI를 쓸 때는 항상 보내지 않는다.
 */
export function resolveEffort(env: Env, model: string): Effort | undefined {
  if (resolveProvider(env) === 'openai') return undefined
  const requested = env.ANTHROPIC_EFFORT?.trim().toLowerCase()
  if (requested === 'none') return undefined
  if (requested && EFFORTS.includes(requested)) return requested as Effort
  return EFFORT_CAPABLE.test(model) ? 'medium' : undefined
}

export type OpenAiReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
const OPENAI_EFFORTS: readonly string[] = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max']

// reasoning_effort 파라미터를 지원하는(= 추론 토큰을 쓰는) 모델 계열. 미지원 모델(gpt-4o 등)에
// 보내면 400 Unrecognized request argument가 나므로 이 모델들에만 보낸다.
const OPENAI_REASONING_MODEL = /^(o\d|gpt-5|gpt-6)/

/**
 * gpt-5 계열처럼 추론(reasoning)을 하는 모델은 답변 전에 쓰는 "생각" 토큰도 max_completion_tokens에서
 * 차감된다. 우리가 쓰는 작업(사진/텍스트 → 정해진 스키마로 추출)은 깊은 추론이 필요 없는데 기본 추론
 * 강도로 두면 토큰 예산을 생각하는 데만 다 쓰고 실제 JSON 출력을 못 받는 경우가 생겨서, 추론 모델에는
 * 기본값을 minimal로 둔다. OPENAI_EFFORT로 바꿀 수 있고, 추론을 지원하지 않는 모델에는 보내지 않는다.
 */
export function resolveOpenAiEffort(env: Env, model: string): OpenAiReasoningEffort | undefined {
  if (!OPENAI_REASONING_MODEL.test(model)) return undefined
  const requested = env.OPENAI_EFFORT?.trim().toLowerCase()
  if (requested === 'none') return undefined
  if (requested && OPENAI_EFFORTS.includes(requested)) return requested as OpenAiReasoningEffort
  return 'minimal'
}
