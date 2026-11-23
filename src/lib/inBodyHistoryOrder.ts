import type { InBodyHistoryEntry } from '../types'

/**
 * 인바디 기록을 측정일(timestamp) 내림차순으로 정렬한 새 배열을 돌려준다(맨 앞 = 가장 최근 측정).
 * 새 기록은 배열 앞에 추가되므로, 같은 시각이면 원래 배열에서 앞에 있던(나중에 추가한) 쪽이 앞에 온다
 * (Array.prototype.sort는 안정 정렬이다).
 */
export function sortInBodyHistory(history: InBodyHistoryEntry[]): InBodyHistoryEntry[] {
  return [...history].sort((a, b) => b.timestamp - a.timestamp)
}
