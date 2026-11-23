import { getDayStatusesInRange } from './calendar'
import { countOnTrackDays } from './trend'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../types'

const DAY_MS = 86_400_000
// InBody는 2주 주기로 측정한다고 가정한다 — 다음 측정 리마인드에 쓴다.
const MEASUREMENT_CYCLE_DAYS = 14
// 체중이 줄 때 골격근량도 함께 줄었다고 알려주는 기준(둘 중 하나라도 넘으면 근육 감소로 본다).
const MUSCLE_LOSS_MIN_KG = 0.5
const MUSCLE_LOSS_WEIGHT_RATIO = 0.5

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

const round1 = (v: number) => Math.round(v * 10) / 10

// 체중은 줄었는데 골격근량도 눈에 띄게 줄었으면(0.5kg 이상이거나 체중 감소량의 절반 이상) 근육 감소를 같이 알린다.
// 체지방량이 늘었으면 짧게 덧붙인다. 해당하지 않으면 null(기존 문장을 쓴다).
function muscleLossPhrase(latest: InBodyHistoryEntry, comparison: InBodyHistoryEntry): string | null {
  if (latest.weight === null || comparison.weight === null) return null
  if (latest.skeletalMuscleMass === null || comparison.skeletalMuscleMass === null) return null
  const weightLoss = -round1(latest.weight - comparison.weight)
  const muscleLoss = -round1(latest.skeletalMuscleMass - comparison.skeletalMuscleMass)
  if (weightLoss <= 0 || muscleLoss <= 0) return null
  if (muscleLoss < MUSCLE_LOSS_MIN_KG && muscleLoss < weightLoss * MUSCLE_LOSS_WEIGHT_RATIO) return null

  let phrase = `체중은 ${weightLoss}kg 줄었지만 골격근량도 ${muscleLoss}kg 줄었어요`
  if (latest.bodyFatMass !== null && comparison.bodyFatMass !== null) {
    const fatGain = round1(latest.bodyFatMass - comparison.bodyFatMass)
    if (fatGain > 0) phrase += `. 체지방량은 ${fatGain}kg 늘었어요`
  }
  return phrase
}

/**
 * 두 InBody 측정 사이 기간의 식단 준수(목표를 지킨 날 수)와 체중 변화를 한 문장으로 엮는다.
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
  const loggedDays = statuses.filter((st) => st !== 'none').length

  const bodyPhrase = muscleLossPhrase(latest, comparison) ?? weightChangePhrase(latest.weight - comparison.weight)
  // 식단 기록이 하루도 없으면 "0/N일" 대신 기록이 없다고 알린다.
  const message =
    loggedDays === 0
      ? `이 기간에는 식단 기록이 없어요. ${bodyPhrase}.`
      : `이 기간 기록한 ${loggedDays}일 중 ${onTrackDays}일 목표를 지켰고, ${bodyPhrase}.`

  return {
    message,
    onTrackDays,
    totalDays,
  }
}

/** 마지막 측정일 기준, 2주 주기상 다음 측정까지 남은 일수(이미 지났으면 0). */
export function daysUntilNextMeasurement(latestTimestamp: number, now: number = Date.now()): number {
  const elapsedDays = Math.floor((now - latestTimestamp) / DAY_MS)
  return Math.max(0, MEASUREMENT_CYCLE_DAYS - elapsedDays)
}
