import type { InBodyHistoryEntry } from '../types'

export interface WeightPoint {
  timestamp: number
  weight: number
}

// history는 최신순으로 저장돼 있다 — 차트는 과거 -> 최신 순서로 그려야 해서 뒤집고,
// weight를 측정하지 않은 기록은 뺀다.
export function getWeightSeries(history: InBodyHistoryEntry[]): WeightPoint[] {
  return history
    .filter((entry) => entry.weight !== null)
    .map((entry) => ({ timestamp: entry.timestamp, weight: entry.weight as number }))
    .sort((a, b) => a.timestamp - b.timestamp)
}
