import type { AnalysisMode } from '../services/foodVisionService'

// 데모 모드에서 사용자가 고를 수 있는 AI 분석 방식
export type AiMode = 'real' | 'mock'

/**
 * 실제로 사용할 분석 방식을 결정한다.
 * mock(예시 결과)은 데모 모드에서만 가능하고, 그 외에는 항상 실제 AI(서버 API → Claude)를 사용한다.
 */
export function resolveAnalysisMode(isDemo: boolean, aiMode: AiMode): AnalysisMode {
  return isDemo && aiMode === 'mock' ? 'mock' : 'real'
}
