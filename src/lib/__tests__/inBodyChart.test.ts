import { describe, expect, it } from 'vitest'
import type { InBodyHistoryEntry } from '../../types'
import { getMetricSeries } from '../inBodyChart'

function entry(timestamp: number, overrides: Partial<InBodyHistoryEntry> = {}): InBodyHistoryEntry {
  return {
    id: `entry-${timestamp}`,
    timestamp,
    source: 'scan',
    weight: null,
    skeletalMuscleMass: null,
    bodyFatMass: null,
    bodyFatPercentage: null,
    bodyWater: null,
    proteinMass: null,
    mineralMass: null,
    basalMetabolicRate: null,
    bodyType: null,
    standardRanges: null,
    ...overrides,
  }
}

describe('getMetricSeries — 항목별 기록을 과거->최신 순서로, 측정 안 한 건 빼고 뽑는다', () => {
  it('빈 기록이면 빈 배열이다', () => {
    expect(getMetricSeries([], 'weight')).toEqual([])
  })

  it('해당 항목을 측정하지 않은 기록은 뺀다', () => {
    const history = [entry(300, { weight: null }), entry(200, { weight: 70 })]
    expect(getMetricSeries(history, 'weight')).toEqual([{ timestamp: 200, value: 70 }])
  })

  it('최신순으로 들어온 기록을 과거->최신 순서로 뒤집어 정렬한다', () => {
    const history = [entry(300, { weight: 68 }), entry(200, { weight: 69 }), entry(100, { weight: 70 })]
    expect(getMetricSeries(history, 'weight')).toEqual([
      { timestamp: 100, value: 70 },
      { timestamp: 200, value: 69 },
      { timestamp: 300, value: 68 },
    ])
  })

  it('다른 항목(key)을 지정하면 그 항목 기준으로 뽑는다', () => {
    const history = [entry(100, { skeletalMuscleMass: 30, weight: 70 })]
    expect(getMetricSeries(history, 'skeletalMuscleMass')).toEqual([{ timestamp: 100, value: 30 }])
  })
})
