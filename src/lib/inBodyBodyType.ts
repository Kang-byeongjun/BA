// InBody 결과지의 "골격근·지방분석" 막대그래프를 간이로 재현한 체형 분류.
// 공식 InBody 알고리즘이 아니라, 골격근량·체지방량이 각자의 표준 구간 대비 얼마나 벗어났는지 비교한 근사치다.
export type InBodyBodyType = 'C' | 'D'

interface StandardRange {
  min: number
  max: number
}

export const BODY_TYPE_LABELS: Record<InBodyBodyType, string> = {
  D: 'D자형 · 근육 우세',
  C: 'C자형 · 지방 우세',
}

function ratioToStandard(value: number, range: StandardRange): number {
  const midpoint = (range.min + range.max) / 2
  return midpoint > 0 ? value / midpoint : 0
}

export function classifyBodyType(
  skeletalMuscleMass: number | null,
  bodyFatMass: number | null,
  skeletalMuscleMassRange: StandardRange | null,
  bodyFatMassRange: StandardRange | null,
): InBodyBodyType | null {
  if (skeletalMuscleMass === null || bodyFatMass === null || !skeletalMuscleMassRange || !bodyFatMassRange) {
    return null
  }
  const muscleRatio = ratioToStandard(skeletalMuscleMass, skeletalMuscleMassRange)
  const fatRatio = ratioToStandard(bodyFatMass, bodyFatMassRange)
  if (muscleRatio === fatRatio) return null
  return muscleRatio > fatRatio ? 'D' : 'C'
}
