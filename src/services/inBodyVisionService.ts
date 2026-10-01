import type { InBodyExtraction } from '../../shared/analysis'
import { getMockInBodyExtraction } from '../data/mockData'
import type { PreparedImage } from '../lib/imagePrep'
import { sleep } from '../lib/sleep'
import type { InBodyMeasurements } from '../types'
import { requestAnalysis } from './analysisApi'
import type { AnalyzeOptions } from './foodVisionService'

function isInBodyExtraction(data: unknown): data is InBodyExtraction {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Partial<InBodyExtraction>
  return d.isInBodyReport === true && typeof d.confidence === 'number' && Array.isArray(d.warnings)
}

/**
 * inBodyVisionService — InBody 결과지 이미지에서 "실제로 보이는" 수치만 읽는다.
 *
 * - real: 업로드한 실제 이미지를 서버 API로 보내 Claude Vision으로 분석한다. 실패 시 mock으로 대체하지 않는다.
 * - mock: 데모 모드 전용 예시 결과.
 */
export async function analyzeInBodyImage(image: PreparedImage, { mode, signal }: AnalyzeOptions): Promise<InBodyExtraction> {
  if (mode === 'mock') {
    await sleep(1500, 'inbody', signal)
    return getMockInBodyExtraction()
  }
  return requestAnalysis<InBodyExtraction>('inbody', image.base64, isInBodyExtraction, signal)
}

/** API 응답 형식(…Kg 등)을 앱의 체성분 측정값 형식으로 변환한다. null은 null로 유지한다. */
export function toMeasurements(extraction: InBodyExtraction): InBodyMeasurements {
  return {
    weight: extraction.weightKg,
    skeletalMuscleMass: extraction.skeletalMuscleMassKg,
    bodyFatMass: extraction.bodyFatMassKg,
    bodyFatPercentage: extraction.bodyFatPercentage,
    bodyWater: extraction.bodyWaterL,
    proteinMass: extraction.proteinMassKg,
    mineralMass: extraction.mineralMassKg,
    basalMetabolicRate: extraction.basalMetabolicRateKcal,
  }
}
