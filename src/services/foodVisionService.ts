import type { FoodExtraction } from '../../shared/analysis'
import { getMockFoodExtraction } from '../data/mockData'
import type { PreparedImage } from '../lib/imagePrep'
import { sleep } from '../lib/sleep'
import { requestAnalysis } from './analysisApi'

export type AnalysisMode = 'real' | 'mock'

export interface AnalyzeOptions {
  mode: AnalysisMode
  signal?: AbortSignal
}

function isFoodExtraction(data: unknown): data is FoodExtraction {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Partial<FoodExtraction>
  return (
    d.isFood === true &&
    Array.isArray(d.foods) &&
    d.foods.every((f) => typeof f?.name === 'string' && typeof f?.estimatedGrams === 'number') &&
    Array.isArray(d.warnings)
  )
}

/**
 * foodVisionService — 사진에서 "어떤 음식이 얼마나" 있는지만 식별한다. (영양소 계산은 nutritionService)
 *
 * - real: 업로드한 실제 이미지를 서버 API로 보내 Claude Vision으로 분석한다. 실패 시 mock으로 대체하지 않는다.
 * - mock: 데모 모드 전용 예시 결과.
 */
export async function analyzeFoodImage(image: PreparedImage, { mode, signal }: AnalyzeOptions): Promise<FoodExtraction> {
  if (mode === 'mock') {
    await sleep(1500, 'food', signal)
    return getMockFoodExtraction()
  }
  return requestAnalysis<FoodExtraction>('food', image.base64, isFoodExtraction, signal)
}
