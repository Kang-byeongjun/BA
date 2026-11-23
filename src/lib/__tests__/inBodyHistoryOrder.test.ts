import { describe, expect, it } from 'vitest'
import type { InBodyHistoryEntry } from '../../types'
import { getInBodySummaryLine } from '../dashboardSummaries'
import { sortInBodyHistory } from '../inBodyHistoryOrder'

const DAY = 86_400_000
const BASE = new Date(2026, 10, 1, 12).getTime()

function entry(id: string, dayOffset: number, weight: number): InBodyHistoryEntry {
  return {
    id,
    timestamp: BASE + dayOffset * DAY,
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
    standardRanges: null,
  }
}

describe('sortInBodyHistory', () => {
  it('측정일 내림차순으로 정렬한다(나중에 추가했어도 날짜가 옛날이면 뒤로)', () => {
    // 배열 맨 앞 = 마지막으로 추가한 기록(옛날 결과지를 나중에 올린 상황)
    const added = [entry('old-uploaded-last', -30, 80), entry('new', 0, 75), entry('mid', -14, 78)]
    expect(sortInBodyHistory(added).map((e) => e.id)).toEqual(['new', 'mid', 'old-uploaded-last'])
  })

  it('같은 날짜가 여러 개면 나중에 추가한(배열 앞쪽) 기록이 최신이다', () => {
    const added = [entry('second', 0, 74), entry('first', 0, 75), entry('older', -7, 77)]
    expect(sortInBodyHistory(added).map((e) => e.id)).toEqual(['second', 'first', 'older'])
  })

  it('원본 배열은 바꾸지 않는다', () => {
    const input = [entry('a', -10, 1), entry('b', 0, 2)]
    sortInBodyHistory(input)
    expect(input.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

describe('getInBodySummaryLine: 최근 측정은 배열 맨 앞이 아니라 날짜 기준', () => {
  it('옛날 기록을 나중에 추가해도 최신 날짜 기록 기준으로 요약한다', () => {
    const history = [entry('old-uploaded-last', -14, 80), entry('new', 0, 78)]
    expect(getInBodySummaryLine(history)).toBe('체중 -2kg')
  })

  it('같은 날짜가 두 개면 나중에 추가한 쪽을 최신으로 본다', () => {
    const history = [entry('second', 0, 74), entry('first', 0, 75)]
    expect(getInBodySummaryLine(history)).toBe('체중 74kg · 비교할 이전 측정 없음')
  })
})
