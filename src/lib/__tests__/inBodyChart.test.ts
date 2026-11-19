import { describe, expect, it } from 'vitest'
import type { InBodyHistoryEntry } from '../../types'
import { getWeightSeries } from '../inBodyChart'

function entry(timestamp: number, weight: number | null): InBodyHistoryEntry {
  return {
    id: `entry-${timestamp}`,
    timestamp,
    source: 'scan',
    weight,
    skeletalMuscleMass: null,
    bodyFatMass: null,
    bodyFatPercentage: null,
    bodyWater: null,
    proteinMass: null,
    mineralMass: null,
    basalMetabolicRate: null,
    bodyType: null,
  }
}

describe('getWeightSeries — 체중 기록을 과거->최신 순서로, 측정 안 한 건 빼고 뽑는다', () => {
  it('빈 기록이면 빈 배열이다', () => {
    expect(getWeightSeries([])).toEqual([])
  })

  it('체중을 측정하지 않은 기록은 뺀다', () => {
    const history = [entry(300, null), entry(200, 70)]
    expect(getWeightSeries(history)).toEqual([{ timestamp: 200, weight: 70 }])
  })

  it('최신순으로 들어온 기록을 과거->최신 순서로 뒤집어 정렬한다', () => {
    const history = [entry(300, 68), entry(200, 69), entry(100, 70)]
    expect(getWeightSeries(history)).toEqual([
      { timestamp: 100, weight: 70 },
      { timestamp: 200, weight: 69 },
      { timestamp: 300, weight: 68 },
    ])
  })
})
