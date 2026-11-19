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

// 실제 InBody 결과지의 체중/골격근량/체지방량 막대는 항목마다 찍힌 kg 눈금은 달라도, 막대 길이 자체는
// "표준 구간 중앙값 대비 비율"이라는 공통 척도로 그려진다. 그래서 세 막대 끝점을 이으면 그 사람이 표준보다
// 얼마나, 그리고 어느 항목에서 더 벗어났는지가 기울기로 드러나 체형(C/D/I)을 시각적으로 보여줄 수 있다.
// 항목별로 범위를 따로 0~1에 욱여넣으면(이전 버전의 방식) 표준을 크게 벗어난 값들이 전부 같은 끝자리에
// 뭉개져서 모양을 구분할 수 없어진다 — 그래서 세 항목을 하나의 비율 축 위에 함께 놓는다.
export function computeShapePositions(
  rows: { value: number | null; range: InBodyStandardRange | null }[],
): (ShapeRowPosition | null)[] {
  const entries = rows.map((r) => {
    if (!r.range) return null
    const zoneMin = ratioToStandard(r.range.min, r.range)
    const zoneMax = ratioToStandard(r.range.max, r.range)
    const value = r.value !== null ? ratioToStandard(r.value, r.range) : null
    return { zoneMin, zoneMax, value }
  })

  const allRatios = entries.flatMap((e) => (e ? [e.zoneMin, e.zoneMax, ...(e.value !== null ? [e.value] : [])] : []))
  if (allRatios.length === 0) return rows.map(() => null)

  // 양 끝에 여유를 둬서 점이 그래프 가장자리에 바짝 붙지 않게 한다.
  const padding = 0.15
  const lo = Math.min(...allRatios) - padding
  const hi = Math.max(...allRatios) + padding
  const span = hi - lo
  const pos = (ratio: number) => (span > 0 ? clamp((ratio - lo) / span, 0, 1) : 0.5)

  return entries.map((e) => (e ? { zoneMinPos: pos(e.zoneMin), zoneMaxPos: pos(e.zoneMax), valuePos: e.value !== null ? pos(e.value) : null } : null))
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
