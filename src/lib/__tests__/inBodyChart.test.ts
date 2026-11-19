import { describe, expect, it } from 'vitest'
import type { InBodyHistoryEntry } from '../../types'
import { computeNiceAxis, getMetricSeries } from '../inBodyChart'

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

describe('computeNiceAxis — 보기 좋은 단위로 반올림한 눈금 축을 만든다', () => {
  it('눈금 범위가 실제 최소~최대값을 포함한다', () => {
    const axis = computeNiceAxis([74.2, 75.8, 73.9])
    expect(axis.min).toBeLessThanOrEqual(73.9)
    expect(axis.max).toBeGreaterThanOrEqual(75.8)
  })

  it('눈금 간격은 1·2·5 × 10^n 중 하나다', () => {
    const axis = computeNiceAxis([74.2, 75.8, 73.9])
    const exponent = Math.floor(Math.log10(axis.step))
    const fraction = Math.round(axis.step / 10 ** exponent)
    expect([1, 2, 5]).toContain(fraction)
  })

  it('눈금선은 최소 3개 이상 생긴다(변화가 거의 없어도 평평해 보이지 않게)', () => {
    const axis = computeNiceAxis([70, 70, 70])
    expect(axis.ticks.length).toBeGreaterThanOrEqual(2)
    expect(axis.max).toBeGreaterThan(axis.min)
  })

  it('첫/끝 눈금이 step 간격으로 순서대로 나열된다', () => {
    const axis = computeNiceAxis([18.1, 19.4, 18.8])
    for (let i = 1; i < axis.ticks.length; i++) {
      expect(Math.round((axis.ticks[i] - axis.ticks[i - 1]) * 1000) / 1000).toBe(axis.step)
    }
  })
})
