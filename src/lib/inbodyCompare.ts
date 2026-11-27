import type { CoachingGoal } from '../../shared/coaching'
import type { InBodyHistoryEntry } from '../types'
import { sortInBodyHistory } from './inBodyHistoryOrder'

/**
 * inbodyCompare — "어느 인바디 측정끼리 비교하고, 얼마나 움직여야 변했다고 보는가"의 기준.
 * 진단 카드(coachingInsight)와 구간 분석(intervalReport)이 함께 쓴다. 기준은 이 파일에서만 바꾼다.
 * 간격은 달력 날짜로 센다(측정 시각은 무시).
 */

export const COMPARE_RULES = {
  /** 비교할 두 측정의 최소 간격(일) */
  minGapDays: 14,
  /** 근육 목표(근육 증가·근력 향상)의 골격근은 이 일수 이상 앞선 가장 가까운 측정과 비교한다 */
  muscleGoalMinDays: 28,
  /** 변화가 이 값(kg) 미만이면 "오차 범위" */
  fatNoiseKg: 0.5,
  muscleNoiseKg: 0.3,
} as const

const DAY_MS = 86_400_000

export const startOfDay = (ms: number) => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
/** 달력 날짜 차이(같은 날 = 0) */
export const calendarDays = (from: number, to: number) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS)

const round1 = (v: number) => Math.round(v * 10) / 10
const round2 = (v: number) => Math.round(v * 100) / 100

// ---------------------------------------------------------------------------
// 어느 측정끼리 비교할지
// ---------------------------------------------------------------------------

/** 체지방량이나 골격근량이 하나라도 있는 측정만 비교에 쓴다(최근 것이 앞) */
export const usableMeasurements = (history: InBodyHistoryEntry[]) =>
  sortInBodyHistory(history).filter((e) => e.bodyFatMass !== null || e.skeletalMuscleMass !== null)

export interface IntervalPair {
  base: InBodyHistoryEntry
  end: InBodyHistoryEntry
  days: number
}

/**
 * 가장 최근 측정과, 그보다 14일 이상 앞선 측정 중 가장 가까운 것을 짝짓는다.
 * 지난 구간은 방금 고른 시작 측정을 끝으로 삼아 같은 규칙을 반복한다(구간끼리 겹치지 않는다).
 */
export function selectIntervals(history: InBodyHistoryEntry[]): IntervalPair[] {
  const sorted = usableMeasurements(history)
  const pairs: IntervalPair[] = []
  let endIndex = 0
  for (let i = 1; i < sorted.length; i++) {
    const end = sorted[endIndex]!
    const base = sorted[i]!
    const days = calendarDays(base.timestamp, end.timestamp)
    if (days < COMPARE_RULES.minGapDays) continue
    pairs.push({ base, end, days })
    endIndex = i
  }
  return pairs
}

// ---------------------------------------------------------------------------
// 변했는지 판단
// ---------------------------------------------------------------------------

export interface Change {
  start: number | null
  end: number | null
  change: number | null
}

/** noise = 오차 범위, pending = 판단 보류(근육 목표인데 28일 이상 앞선 측정이 없음) */
export type MetricState = 'increase' | 'decrease' | 'noise' | 'pending' | 'unknown'

export interface MetricResult extends Change {
  /** 비교한 시작 측정 시각과 그 간격(일). 근육 목표의 골격근은 구간과 다를 수 있다 */
  from: number
  days: number
  perWeek: number | null
  state: MetricState
}

export function changeOf(start: number | null, end: number | null): Change {
  return { start, end, change: start === null || end === null ? null : round1(end - start) }
}

export function stateOf(change: number | null, noiseKg: number, pending = false): MetricState {
  if (change === null) return 'unknown'
  if (pending) return 'pending'
  return Math.abs(change) < noiseKg ? 'noise' : change > 0 ? 'increase' : 'decrease'
}

export function metricOf(
  from: InBodyHistoryEntry,
  to: InBodyHistoryEntry,
  key: 'bodyFatMass' | 'skeletalMuscleMass',
  noiseKg: number,
  pending = false,
): MetricResult {
  const c = changeOf(from[key], to[key])
  const days = calendarDays(from.timestamp, to.timestamp)
  return {
    ...c,
    from: from.timestamp,
    days,
    perWeek: c.change === null ? null : round2((c.change / days) * 7),
    state: stateOf(c.change, noiseKg, pending),
  }
}

export const isMuscleGoal = (goal: CoachingGoal) => goal === 'muscle_gain' || goal === 'strength'

/**
 * 골격근 결과. 근육 목표만 "28일 이상 앞선 가장 가까운 측정"과 비교하고, 그런 측정이 없으면 구간 값으로 보류한다.
 * 다른 목표는 구간의 시작 측정과 비교한다.
 */
export function muscleResultOf(goal: CoachingGoal, pair: IntervalPair, measurements: InBodyHistoryEntry[]): MetricResult {
  const { base, end } = pair
  if (!isMuscleGoal(goal)) return metricOf(base, end, 'skeletalMuscleMass', COMPARE_RULES.muscleNoiseKg)
  const older = measurements.find(
    (e) => e.skeletalMuscleMass !== null && calendarDays(e.timestamp, end.timestamp) >= COMPARE_RULES.muscleGoalMinDays,
  )
  return metricOf(older ?? base, end, 'skeletalMuscleMass', COMPARE_RULES.muscleNoiseKg, older === undefined)
}
