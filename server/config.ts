export type Env = Record<string, string | undefined>

// 이미지 입력을 지원하는 현재 모델. 코드 수정 없이 ANTHROPIC_MODEL 환경변수로 교체할 수 있다.
export const DEFAULT_MODEL = 'claude-opus-5'

// Vercel Function 요청 본문 한도(4.5MB)에 base64 인코딩(+33%)과 JSON 오버헤드를 감안한 이미지 상한(디코딩 기준)
export const MAX_IMAGE_BYTES = 3_200_000
export const MIN_IMAGE_BYTES = 200

// thinking 토큰도 max_tokens에 포함되므로 JSON 출력보다 넉넉하게 잡는다.
export const MAX_OUTPUT_TOKENS = 8192

// 재시도 1회 포함 최악의 경우에도 함수 실행 한도(Hobby 300초) 안에서 끝나도록 한다.
export const REQUEST_TIMEOUT_MS = 40_000
export const MAX_RETRIES = 1

export function resolveModel(env: Env): string {
  return env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max']

// effort 파라미터를 지원하는 모델 계열 (미지원 모델에 보내면 400이 나므로 제한한다)
const EFFORT_CAPABLE = /^claude-(opus-5|sonnet-5|fable|mythos|opus-4-[678]|sonnet-4-6)/

/**
 * ANTHROPIC_EFFORT=low|medium|high|xhigh|max 로 지정하거나 none 으로 끌 수 있다.
 * 지정하지 않으면 지원 모델에서만 medium 을 쓴다(이미지 수치 추출은 과한 추론이 필요 없음).
 */
export function resolveEffort(env: Env, model: string): Effort | undefined {
  const requested = env.ANTHROPIC_EFFORT?.trim().toLowerCase()
  if (requested === 'none') return undefined
  if (requested && EFFORTS.includes(requested)) return requested as Effort
  return EFFORT_CAPABLE.test(model) ? 'medium' : undefined
}
