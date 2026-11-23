import type { InBodyExtraction } from '../../shared/analysis'
import { getMockInBodyExtraction } from '../data/mockData'
import { classifyBodyType, toStandardRange } from '../lib/inBodyBodyType'
import { toCorrectedStandardRange } from '../lib/inBodyRangeCorrection'
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

// 1차 분석에서 표준범위를 못 읽었을 때, 막대그래프 구역만 잘라 확대한 이미지로 그 부분만 다시 읽는다.
// mock 모드에서는 쓰지 않는다(데모 데이터는 애초에 표준범위가 없어서 재시도할 의미가 없다).
export async function analyzeInBodyStandardRangeCrop(image: PreparedImage, signal?: AbortSignal): Promise<InBodyExtraction> {
  return requestAnalysis<InBodyExtraction>('inbody', image.base64, isInBodyExtraction, signal, 'inbody_standard_range')
}

/** API 응답 형식(…Kg 등)을 앱의 체성분 측정값 형식으로 변환한다. null은 null로 유지한다. */
export function toMeasurements(extraction: InBodyExtraction): InBodyMeasurements {
  // 체중·체지방량은 결과지의 숫자 표준범위(kg)가 있으면 막대 끝 위치를 계산값으로 보정한다.
  const weightRange = toCorrectedStandardRange(extraction.weightStandardRange, extraction.weightKg)
  const skeletalMuscleMassRange = toStandardRange(extraction.skeletalMuscleMassStandardRange)
  const bodyFatMassRange = toCorrectedStandardRange(extraction.bodyFatMassStandardRange, extraction.bodyFatMassKg)
  return {
    weight: extraction.weightKg,
    age: extraction.ageYears,
    height: extraction.heightCm,
    skeletalMuscleMass: extraction.skeletalMuscleMassKg,
    bodyFatMass: extraction.bodyFatMassKg,
    bodyFatPercentage: extraction.bodyFatPercentage,
    bodyWater: extraction.bodyWaterL,
    proteinMass: extraction.proteinMassKg,
    mineralMass: extraction.mineralMassKg,
    basalMetabolicRate: extraction.basalMetabolicRateKcal,
    measuredAt: extraction.testedAtDate,
    bodyType: classifyBodyType(skeletalMuscleMassRange, bodyFatMassRange),
    standardRanges: { weight: weightRange, skeletalMuscleMass: skeletalMuscleMassRange, bodyFatMass: bodyFatMassRange },
  }
}
