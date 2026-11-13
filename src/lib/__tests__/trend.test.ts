import { describe, expect, it } from 'vitest'
import { buildMonthlyTrendSummary, getComparableDayCount } from '../trend'

describe('buildMonthlyTrendSummary — 이번 달과 저번 달의 적정 섭취일 수를 비교한다', () => {
  it('둘 다 기록이 없으면 보여줄 코멘트가 없다', () => {
    expect(buildMonthlyTrendSummary([], [])).toBeNull()
    expect(buildMonthlyTrendSummary(['none', 'deficient'], ['none', 'exceeded'])).toBeNull()
  })

  it('이번 달 적정 섭취일이 늘었으면 늘어난 일수를 말해준다', () => {
    const trend = buildMonthlyTrendSummary(['adequate', 'near_goal', 'adequate'], ['adequate'])
    expect(trend?.direction).toBe('up')
    expect(trend?.message).toContain('2일 늘었어요')
  })

  it('이번 달 적정 섭취일이 줄었으면 줄어든 일수를 말해준다', () => {
    const trend = buildMonthlyTrendSummary(['deficient'], ['adequate', 'near_goal'])
    expect(trend?.direction).toBe('down')
    expect(trend?.message).toContain('2일 줄었어요')
  })

  it('적정 섭취일 수가 같으면(0이 아닌 한) 비슷하다고 말해준다', () => {
    const trend = buildMonthlyTrendSummary(['adequate', 'deficient'], ['near_goal', 'exceeded'])
    expect(trend?.direction).toBe('flat')
    expect(trend?.message).toContain('비슷해요')
  })

  it('deficient/exceeded/none은 적정 섭취일로 세지 않는다', () => {
    const trend = buildMonthlyTrendSummary(['deficient', 'exceeded', 'none', 'adequate'], [])
    expect(trend?.direction).toBe('up')
    expect(trend?.message).toContain('1일 늘었어요')
  })
})

describe('getComparableDayCount — 공정하게 비교할 일수를 정한다', () => {
  it('진행 중인 이번 달이면 오늘까지의 날짜만 비교 대상이다', () => {
    const now = new Date(2026, 10, 13).getTime() // 2026-11-13
    expect(getComparableDayCount(2026, 10, now)).toBe(13)
  })

  it('이미 끝난 달이면 그 달 전체 일수가 비교 대상이다', () => {
    const now = new Date(2026, 10, 13).getTime() // 2026-11-13
    expect(getComparableDayCount(2026, 9, now)).toBe(31) // 2026년 10월은 31일
  })
})
