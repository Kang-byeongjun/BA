import { getDayStatusesInRange } from './calendar'
import { countOnTrackDays } from './trend'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../types'

const DAY_MS = 86_400_000
// InBody는 2주 주기로 측정한다고 가정한다 — 다음 측정 리마인드에 쓴다.
const MEASUREMENT_CYCLE_DAYS = 14

export interface DietInBodyInsight {
  message: string
  onTrackDays: number
  totalDays: number
}

function weightChangePhrase(delta: number): string {
  const rounded = Math.round(delta * 10) / 10
  if (rounded === 0) return '체중은 변화가 없었어요'
  return rounded < 0 ? `체중이 ${Math.abs(rounded)}kg 줄었어요` : `체중이 ${rounded}kg 늘었어요`
}

/**
 * 두 InBody 측정 사이 기간의 식단 준수(적정 섭취일 수)와 체중 변화를 한 문장으로 엮는다.
 * 둘 중 하나라도 체중 측정값이 없으면("측정 안 함") 비교할 수 없어 null을 반환한다.
 */
export function buildDietInBodyInsight(
  meals: Meal[],
  target: NutritionTarget,
  latest: InBodyHistoryEntry,
  comparison: InBodyHistoryEntry,
): DietInBodyInsight | null {
  if (latest.weight === null || comparison.weight === null) return null

  const statuses = getDayStatusesInRange(meals, target, comparison.timestamp, latest.timestamp)
  const onTrackDays = countOnTrackDays(statuses)
  const totalDays = statuses.length

  return {
    message: `이 기간 적정 섭취일이 ${onTrackDays}/${totalDays}일이었고, ${weightChangePhrase(latest.weight - comparison.weight)}.`,
    onTrackDays,
    totalDays,
  }
}

/** 마지막 측정일 기준, 2주 주기상 다음 측정까지 남은 일수(이미 지났으면 0). */
export function daysUntilNextMeasurement(latestTimestamp: number, now: number = Date.now()): number {
  const elapsedDays = Math.floor((now - latestTimestamp) / DAY_MS)
  return Math.max(0, MEASUREMENT_CYCLE_DAYS - elapsedDays)
}
