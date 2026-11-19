import type { BoxFraction } from './imagePrep'
import type { InBodyExtraction } from '../../shared/analysis'

/**
 * 1차 분석에서 InBody 표준범위(weightStandardRange 등)를 못 읽었을 때, "골격근·지방분석" 막대그래프
 * 구역만 잘라 확대해서 한 번 더 분석을 시도하는 로직 중 DOM 없이 테스트 가능한 순수 부분.
 */

const BOX_RE = /^(\d*\.?\d+),(\d*\.?\d+),(\d*\.?\d+),(\d*\.?\d+)$/

// 서버가 "xMin,yMin,xMax,yMax" 문자열로 내려준 박스를 크롭용 객체로 바꾼다. 형식이 안 맞거나
// 범위를 벗어나면 null — 크롭은 포기하고 1차 결과를 그대로 쓴다.
export function parseBoxFraction(raw: string | null): BoxFraction | null {
  if (raw === null) return null
  const match = BOX_RE.exec(raw.trim())
  if (!match) return null
  const [xMin, yMin, xMax, yMax] = match.slice(1, 5).map(Number)
  if (![xMin, yMin, xMax, yMax].every(Number.isFinite)) return null
  if (xMin < 0 || yMin < 0 || xMax > 1 || yMax > 1 || xMin >= xMax || yMin >= yMax) return null
  return { xMin, yMin, xMax, yMax }
}

// 1차 결과에서 비어 있던 표준범위만 재시도 결과로 채운다. 나머지 필드(체중·나이 등)는 항상 1차 결과를
// 그대로 둔다 — 재시도는 크롭된 막대그래프 구역만 보고 있어서 그 외 항목은 원래 null이기 때문이다.
export function mergeStandardRanges(primary: InBodyExtraction, retry: InBodyExtraction): InBodyExtraction {
  return {
    ...primary,
    weightStandardRange: primary.weightStandardRange ?? retry.weightStandardRange,
    skeletalMuscleMassStandardRange: primary.skeletalMuscleMassStandardRange ?? retry.skeletalMuscleMassStandardRange,
    bodyFatMassStandardRange: primary.bodyFatMassStandardRange ?? retry.bodyFatMassStandardRange,
  }
}

// 표준범위 중 하나라도 못 읽었으면 재시도할 가치가 있다고 본다.
export function hasMissingStandardRange(extraction: InBodyExtraction): boolean {
  return (
    extraction.weightStandardRange === null ||
    extraction.skeletalMuscleMassStandardRange === null ||
    extraction.bodyFatMassStandardRange === null
  )
}
