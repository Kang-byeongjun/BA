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

const STANDARD_RANGE_RE = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/

// 서버가 "min-max" 형태의 문자열로 내려주는 표준 구간을 파싱한다(비교 가능한 값이 없으면 null).
export function toStandardRange(raw: string | null): InBodyStandardRange | null {
  if (raw === null) return null
  const match = STANDARD_RANGE_RE.exec(raw.trim())
  if (!match) return null
  return { min: Number(match[1]), max: Number(match[2]) }
}

export function ratioToStandard(value: number, range: InBodyStandardRange): number {
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

export interface ShapeRowPosition {
  // 그 항목의 "표준" 구간이 공유 축 위에서 차지하는 시작/끝 위치(0~1)
  zoneMinPos: number
  zoneMaxPos: number
  // 측정값의 위치(0~1). 값이 없으면 null.
  valuePos: number | null
}

// 실제 InBody 결과지는 표준이하·표준·표준이상 세 칸의 위치/폭을 모든 항목에서 똑같이 고정해 두고(상단
// 헤더가 세 줄 전체를 관통한다), 항목마다 찍힌 kg 눈금만 그 칸에 맞춰 다르게 표시한다. 표준 칸을 매번
// 그래프마다 다른 위치/폭으로 그리면(이전 버전처럼 데이터에 따라 동적으로 계산하면) 볼 때마다 표준이 어디
// 있는지 달라져 보여서 위화감이 든다 — 그래서 칸은 고정하고, 점의 위치만 "표준 대비 비율"로 그 칸 안
// 어디에 해당하는지 계산한다. 표준을 벗어날수록 표준이하/표준이상 칸 안에서 더 가장자리로 밀려나므로,
// 세 항목이 표준에서 벗어난 정도가 다르면 끝점도 서로 다른 자리에 찍혀 체형의 기울기가 드러난다.
const ZONE_BELOW_END = 0.3
const ZONE_STANDARD_END = 0.45
// 표준이하/표준이상 칸이 담당하는 비율의 바깥쪽 한계. 이보다 더 벗어난 값은 칸 끝에서 멈춘다.
const RATIO_FLOOR = 0.4
const RATIO_CEIL = 3.0

function ratioToPosition(ratio: number, zoneMinRatio: number, zoneMaxRatio: number): number {
  if (ratio <= zoneMinRatio) {
    if (zoneMinRatio <= RATIO_FLOOR) return 0
    const t = (ratio - RATIO_FLOOR) / (zoneMinRatio - RATIO_FLOOR)
    return clamp(t, 0, 1) * ZONE_BELOW_END
  }
  if (ratio >= zoneMaxRatio) {
    if (RATIO_CEIL <= zoneMaxRatio) return 1
    const t = (ratio - zoneMaxRatio) / (RATIO_CEIL - zoneMaxRatio)
    return ZONE_STANDARD_END + clamp(t, 0, 1) * (1 - ZONE_STANDARD_END)
  }
  return ZONE_BELOW_END + ((ratio - zoneMinRatio) / (zoneMaxRatio - zoneMinRatio)) * (ZONE_STANDARD_END - ZONE_BELOW_END)
}

export function computeShapePositions(
  rows: { value: number | null; range: InBodyStandardRange | null }[],
): (ShapeRowPosition | null)[] {
  return rows.map((r) => {
    if (!r.range) return null
    const zoneMin = ratioToStandard(r.range.min, r.range)
    const zoneMax = ratioToStandard(r.range.max, r.range)
    const value = r.value !== null ? ratioToStandard(r.value, r.range) : null
    return {
      zoneMinPos: ZONE_BELOW_END,
      zoneMaxPos: ZONE_STANDARD_END,
      valuePos: value !== null ? ratioToPosition(value, zoneMin, zoneMax) : null,
    }
  })
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
