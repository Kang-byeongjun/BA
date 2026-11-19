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
