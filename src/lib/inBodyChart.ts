import type { InBodyHistoryEntry } from '../types'

export type InBodyMetricKey = 'weight' | 'skeletalMuscleMass' | 'bodyFatMass' | 'bodyFatPercentage'

export interface InBodyMetricField {
  key: InBodyMetricKey
  label: string
  unit: string
  decimals: number
}

export const IN_BODY_METRIC_FIELDS: InBodyMetricField[] = [
  { key: 'weight', label: '체중', unit: 'kg', decimals: 1 },
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg', decimals: 1 },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg', decimals: 1 },
  { key: 'bodyFatPercentage', label: '체지방률', unit: '%', decimals: 1 },
]

export interface MetricPoint {
  timestamp: number
  value: number
}

// history는 최신순으로 저장돼 있다 — 차트는 과거 -> 최신 순서로 그려야 해서 뒤집고,
// 그 항목을 측정하지 않은 기록은 뺀다.
export function getMetricSeries(history: InBodyHistoryEntry[], key: InBodyMetricKey): MetricPoint[] {
  return history
    .filter((entry) => entry[key] !== null)
    .map((entry) => ({ timestamp: entry.timestamp, value: entry[key] as number }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

export interface NiceAxis {
  min: number
  max: number
  step: number
  ticks: number[]
}

const TARGET_TICK_COUNT = 4

// 1, 2, 5 × 10^n 중 가장 가까운 "보기 좋은" 눈금 간격을 고른다(표준 nice-number 알고리즘).
function niceStep(roughStep: number): number {
  if (!Number.isFinite(roughStep) || roughStep <= 0) return 1
  const exponent = Math.floor(Math.log10(roughStep))
  const fraction = roughStep / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

// 실제 최소~최대값을 그대로 차트 높이에 꽉 채우면 아주 작은 변화도 극적으로 보인다.
// 대신 보기 좋은 단위(niceStep)로 반올림한 눈금선을 기준으로 삼아, 변화량이 그 눈금 단위에
// 비례해 적당한 크기로 보이게 한다.
export function computeNiceAxis(values: number[]): NiceAxis {
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  // 값이 전부 같으면(변화 없음) 값 크기의 10%를 임의 폭으로 삼아 눈금이 한 줄로 찌그러지지 않게 한다.
  const rawRange = dataMax - dataMin || Math.abs(dataMax) * 0.1 || 1
  const step = niceStep(rawRange / TARGET_TICK_COUNT)
  const min = Math.floor(dataMin / step) * step
  // dataMin·dataMax가 둘 다 step의 배수면 floor/ceil이 같은 값을 줘서 범위가 0이 될 수 있다.
  const max = Math.max(Math.ceil(dataMax / step) * step, min + step)
  const ticks: number[] = []
  for (let v = min; v <= max + step / 2; v += step) {
    ticks.push(Math.round(v / step) * step)
  }
  return { min, max, step, ticks }
}
