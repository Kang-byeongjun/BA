import type { InBodyHistoryEntry } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000
const TARGET_GAP_DAYS = 14

export function daysBetween(a: number, b: number): number {
  return Math.round(Math.abs(a - b) / DAY_MS)
}

/**
 * 최신 측정과 비교할 "약 2주 전" 기록을 찾는다. 사용자가 정확히 14일마다 재지는 않으므로,
 * 14일 전과 가장 가까운 과거 기록을 고른다(정확히 14일일 필요는 없다).
 */
export function findComparisonEntry(
  history: InBodyHistoryEntry[],
  latest: InBodyHistoryEntry,
): InBodyHistoryEntry | null {
  const past = history.filter((e) => e.timestamp < latest.timestamp)
  if (past.length === 0) return null

  const targetTime = latest.timestamp - TARGET_GAP_DAYS * DAY_MS
  return past.reduce((best, entry) =>
    Math.abs(entry.timestamp - targetTime) < Math.abs(best.timestamp - targetTime) ? entry : best,
  )
}
