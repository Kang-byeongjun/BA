/**
 * 이미지 분석 API의 에러 코드와 사용자용 한국어 메시지.
 * 서버(api/, server/)와 클라이언트(src/)가 함께 사용한다. (런타임 의존성 없음)
 */

export type AnalysisKind = 'inbody' | 'food'

export type AnalysisErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_IMAGE_TYPE'
  | 'IMAGE_TOO_LARGE'
  | 'INVALID_IMAGE'
  | 'NOT_IN_BODY_REPORT'
  | 'NOT_FOOD'
  | 'UNREADABLE'
  | 'PARSE_FAILED'
  | 'REFUSED'
  | 'AUTH_FAILED'
  | 'MODEL_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'API_UNAVAILABLE'
  | 'CANCELLED'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL'

const STATUS: Record<AnalysisErrorCode, number> = {
  MISSING_API_KEY: 500,
  INVALID_REQUEST: 400,
  UNSUPPORTED_IMAGE_TYPE: 415,
  IMAGE_TOO_LARGE: 413,
  INVALID_IMAGE: 422,
  NOT_IN_BODY_REPORT: 422,
  NOT_FOOD: 422,
  UNREADABLE: 422,
  PARSE_FAILED: 502,
  REFUSED: 422,
  AUTH_FAILED: 500,
  MODEL_UNAVAILABLE: 500,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  TIMEOUT: 504,
  NETWORK: 503,
  API_UNAVAILABLE: 503,
  CANCELLED: 499,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL: 500,
}

export function statusForCode(code: AnalysisErrorCode): number {
  return STATUS[code]
}

// 같은 사진으로 다시 시도해볼 만한 에러 (사진 자체의 문제가 아닌 경우)
const RETRYABLE: ReadonlySet<AnalysisErrorCode> = new Set([
  'PARSE_FAILED',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'TIMEOUT',
  'NETWORK',
  'INTERNAL',
])

export function isRetryable(code: AnalysisErrorCode): boolean {
  return RETRYABLE.has(code)
}

export function describeError(code: AnalysisErrorCode, kind: AnalysisKind): string {
  switch (code) {
    case 'MISSING_API_KEY':
      return 'AI 분석 서버가 아직 설정되지 않았어요. 관리자에게 ANTHROPIC_API_KEY 설정을 요청해주세요.'
    case 'INVALID_REQUEST':
      return '요청 형식이 올바르지 않아요. 사진을 다시 선택해주세요.'
    case 'UNSUPPORTED_IMAGE_TYPE':
      return '지원하지 않는 이미지 형식이에요. JPG, PNG, WEBP 사진을 사용해주세요.'
    case 'IMAGE_TOO_LARGE':
      return '이미지 용량이 너무 커요. 더 작은 사진을 선택하거나 다시 촬영해주세요.'
    case 'INVALID_IMAGE':
      return '이미지를 열 수 없어요. 파일이 손상되지 않았는지 확인하고 다른 사진을 선택해주세요.'
    case 'NOT_IN_BODY_REPORT':
      return 'InBody 결과지가 아닌 것 같아요. 결과지 전체가 화면에 나오도록 다시 촬영해주세요.'
    case 'NOT_FOOD':
      return '음식 사진이 아닌 것 같아요. 음식이 잘 보이도록 위에서 다시 촬영해주세요.'
    case 'UNREADABLE':
      return kind === 'inbody'
        ? '사진에서 InBody 수치를 정확히 읽지 못했어요. 결과지가 전체 화면에 나오도록 다시 촬영해주세요.'
        : '음식을 정확하게 구분하기 어려워요. 음식 전체가 보이도록 위에서 촬영해주세요.'
    case 'PARSE_FAILED':
      return 'AI 응답을 해석하지 못했어요. 잠시 후 다시 시도해주세요.'
    case 'REFUSED':
      return '이 사진은 분석할 수 없어요. 다른 사진으로 시도해주세요.'
    case 'AUTH_FAILED':
      return 'AI 서비스 인증에 실패했어요. 관리자에게 API Key 설정 확인을 요청해주세요.'
    case 'MODEL_UNAVAILABLE':
      return '설정된 AI 모델을 사용할 수 없어요. 관리자에게 ANTHROPIC_MODEL 설정 확인을 요청해주세요.'
    case 'RATE_LIMITED':
      return '요청이 많아 잠시 처리할 수 없어요. 잠시 후 다시 시도해주세요.'
    case 'UPSTREAM_ERROR':
      return 'AI 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.'
    case 'TIMEOUT':
      return '분석 시간이 너무 오래 걸렸어요. 다시 시도해주세요.'
    case 'NETWORK':
      return '네트워크 연결을 확인하고 다시 시도해주세요.'
    case 'API_UNAVAILABLE':
      return 'AI 분석 서버에 연결할 수 없어요. 배포된 앱(또는 npm run dev)에서 실행 중인지 확인해주세요.'
    case 'CANCELLED':
      return '분석이 취소되었어요.'
    case 'METHOD_NOT_ALLOWED':
      return '잘못된 요청 방식이에요.'
    case 'INTERNAL':
      return '분석 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.'
  }
}

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode
  readonly status: number

  // cause: 서버 로그용 원인(SDK 에러 등). 사용자에게는 보여주지 않는다.
  constructor(code: AnalysisErrorCode, kind: AnalysisKind = 'food', message?: string, cause?: unknown) {
    super(message ?? describeError(code, kind), cause === undefined ? undefined : { cause })
    this.name = 'AnalysisError'
    this.code = code
    this.status = statusForCode(code)
  }
}
