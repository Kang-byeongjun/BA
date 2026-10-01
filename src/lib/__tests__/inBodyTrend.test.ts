import { describe, expect, it } from 'vitest'
import { daysBetween, findComparisonEntry } from '../inBodyTrend'
import type { InBodyHistoryEntry } from '../../types'

const DAY_MS = 24 * 60 * 60 * 1000

function entry(daysAgo: number, overrides: Partial<InBodyHistoryEntry> = {}): InBodyHistoryEntry {
  return {
    timestamp: Date.now() - daysAgo * DAY_MS,
    source: 'scan',
    weight: 70,
    skeletalMuscleMass: 30,
    bodyFatMass: 14,
    bodyFatPercentage: 20,
    bodyWater: 40,
    proteinMass: 12,
    mineralMass: 4,
    basalMetabolicRate: 1600,
    ...overrides,
  }
}

describe('daysBetween', () => {
  it('두 타임스탬프 사이의 일수를 구한다', () => {
    const now = Date.now()
    expect(daysBetween(now, now - 14 * DAY_MS)).toBe(14)
    expect(daysBetween(now - 14 * DAY_MS, now)).toBe(14)
  })
})

describe('findComparisonEntry', () => {
  it('이전 측정이 없으면 null을 반환한다', () => {
    const latest = entry(0)
    expect(findComparisonEntry([latest], latest)).toBeNull()
  })

  it('정확히 14일 전 기록이 있으면 그것을 고른다', () => {
    const latest = entry(0)
    const twoWeeksAgo = entry(14)
    const oneWeekAgo = entry(7)
    const history = [latest, oneWeekAgo, twoWeeksAgo]
    expect(findComparisonEntry(history, latest)).toBe(twoWeeksAgo)
  })

  it('정확히 14일 전 기록이 없으면 가장 가까운 과거 기록을 고른다', () => {
    const latest = entry(0)
    const twelveDaysAgo = entry(12)
    const thirtyDaysAgo = entry(30)
    const history = [latest, twelveDaysAgo, thirtyDaysAgo]
    expect(findComparisonEntry(history, latest)).toBe(twelveDaysAgo)
  })

  it('최신 측정 이후의 기록은 비교 대상에서 제외한다', () => {
    const past = entry(14)
    const latest = entry(0)
    const future = entry(-5) // 최신보다 더 나중 시점(있을 수 없지만 방어적으로 확인)
    const history = [future, latest, past]
    expect(findComparisonEntry(history, latest)).toBe(past)
  })
})
