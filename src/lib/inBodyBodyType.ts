// InBody 결과지의 "골격근·지방분석" 막대그래프를 간이로 재현한 체형 분류.
// 공식 InBody 알고리즘이 아니라, 골격근량·체지방량이 각자의 표준 구간 대비 얼마나 벗어났는지 비교한 근사치다.
export type InBodyBodyType = 'C' | 'D' | 'I'

export interface InBodyStandardRange {
  min: number
  max: number
}

export const BODY_TYPE_LABELS: Record<InBodyBodyType, string> = {
  D: 'D자형 · 근육 우세',
  I: 'I자형 · 균형형',
  C: 'C자형 · 지방 우세',
}

// 표준 구간이 둘 다 있어야만 비교 가능하므로, 둘 중 하나라도 없으면 null로 통일해서 다룬다.
export function toStandardRange(min: number | null, max: number | null): InBodyStandardRange | null {
  return min !== null && max !== null ? { min, max } : null
}

function ratioToStandard(value: number, range: InBodyStandardRange): number {
  const midpoint = (range.min + range.max) / 2
  return midpoint > 0 ? value / midpoint : 0
}

// 두 비율 차이가 이 안쪽이면 "어느 한쪽이 뚜렷하게 우세하다"고 보기 어려워 균형형(I자형)으로 본다.
const BALANCED_THRESHOLD = 0.05

export function classifyBodyType(
  skeletalMuscleMass: number | null,
  bodyFatMass: number | null,
  skeletalMuscleMassRange: InBodyStandardRange | null,
  bodyFatMassRange: InBodyStandardRange | null,
): InBodyBodyType | null {
  if (skeletalMuscleMass === null || bodyFatMass === null || !skeletalMuscleMassRange || !bodyFatMassRange) {
    return null
  }
  const muscleRatio = ratioToStandard(skeletalMuscleMass, skeletalMuscleMassRange)
  const fatRatio = ratioToStandard(bodyFatMass, bodyFatMassRange)
  if (Math.abs(muscleRatio - fatRatio) < BALANCED_THRESHOLD) return 'I'
  return muscleRatio > fatRatio ? 'D' : 'C'
}

// 표준이하(0~1/3) · 표준(1/3~2/3) · 표준이상(2/3~1) 세 구간짜리 막대 위에서, 값이 놓일 위치(0~1)를 계산한다.
// 표준 구간을 벗어난 쪽은 "표준 구간 폭의 1.5배"를 그 구간의 끝으로 잡아 시각적으로 뭉개지지 않게 한다.
export function standardZonePosition(value: number, range: InBodyStandardRange): number {
  const width = range.max - range.min
  if (width <= 0) return 0.5
  if (value < range.min) {
    const floor = range.min - width * 1.5
    const t = floor >= range.min ? 0 : (value - floor) / (range.min - floor)
    return clamp(t, 0, 1) * (1 / 3)
  }
  if (value > range.max) {
    const ceil = range.max + width * 1.5
    const t = ceil <= range.max ? 1 : (value - range.max) / (ceil - range.max)
    return 2 / 3 + clamp(t, 0, 1) * (1 / 3)
  }
  return 1 / 3 + ((value - range.min) / width) * (1 / 3)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
