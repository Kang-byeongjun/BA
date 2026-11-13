import type { DayStatus } from './calendar'

// 캘린더 탭의 "목표를 잘 지켰어요" 집계와 같은 정의 — adequate/near_goal을 "적정 섭취일"로 본다.
function isOnTrack(status: DayStatus): boolean {
  return status === 'adequate' || status === 'near_goal'
}

export function countOnTrackDays(statuses: DayStatus[]): number {
  return statuses.filter(isOnTrack).length
}

export interface MonthlyTrend {
  message: string
  direction: 'up' | 'down' | 'flat'
}

/**
 * 이번 달 vs 저번 달 적정 섭취일 수를 비교하는 한 줄 코멘트. 두 배열은 호출부에서 이미
 * 같은 일수로 맞춰서 전달되어야 공정한 비교가 된다(예: 이번 달이 13일째면 저번 달도 13일만).
 * 비교할 기록이 둘 다 없으면(0일 vs 0일) 코멘트를 보여줄 가치가 없어 null을 반환한다.
 */
export function buildMonthlyTrendSummary(currentStatuses: DayStatus[], previousStatuses: DayStatus[]): MonthlyTrend | null {
  const currentCount = countOnTrackDays(currentStatuses)
  const previousCount = countOnTrackDays(previousStatuses)

  if (currentCount === 0 && previousCount === 0) return null

  const diff = currentCount - previousCount
  if (diff > 0) return { message: `이번 달엔 저번 달보다 적정 섭취일이 ${diff}일 늘었어요.`, direction: 'up' }
  if (diff < 0) return { message: `이번 달엔 저번 달보다 적정 섭취일이 ${Math.abs(diff)}일 줄었어요.`, direction: 'down' }
  return { message: '이번 달 적정 섭취일 수가 저번 달과 비슷해요.', direction: 'flat' }
}

// 이번 달과 저번 달을 공정하게 비교하려면 일수를 맞춰야 한다 — 아직 진행 중인 달이면
// 오늘까지의 날짜만, 이미 끝난 달이면 전체 일수를 "비교 가능한 일수"로 본다.
export function getComparableDayCount(year: number, month: number, now: number = Date.now()): number {
  const today = new Date(now)
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  if (isCurrentMonth) return today.getDate()
  return new Date(year, month + 1, 0).getDate()
}
