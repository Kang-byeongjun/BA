import { describe, expect, it } from 'vitest'
import { buildHomeGreeting } from '../greeting'

const base = { streakDays: 0, hasLoggedToday: true, yesterdayStatus: 'none' as const, hour: 9 }

describe('buildHomeGreeting — 상황에 맞는 인사말 한 줄을 고른다', () => {
  it('스트릭이 3일 이상이면 스트릭을 자랑한다(최우선)', () => {
    const greeting = buildHomeGreeting({ ...base, streakDays: 5, yesterdayStatus: 'deficient' })
    expect(greeting).toContain('5일 연속')
  })

  it('스트릭이 2일 이하면 아직 자랑하지 않는다', () => {
    const greeting = buildHomeGreeting({ ...base, streakDays: 2 })
    expect(greeting).not.toContain('연속')
  })

  it('스트릭이 없고 오후인데 오늘 기록이 없으면 리마인드한다', () => {
    const greeting = buildHomeGreeting({ ...base, hasLoggedToday: false, hour: 15 })
    expect(greeting).toContain('기록이 없네요')
  })

  it('오전이면 기록이 없어도 리마인드하지 않는다', () => {
    const greeting = buildHomeGreeting({ ...base, hasLoggedToday: false, hour: 9 })
    expect(greeting).not.toContain('기록이 없네요')
  })

  it('어제 부족/초과였으면 격려 문구를 보여준다', () => {
    expect(buildHomeGreeting({ ...base, yesterdayStatus: 'deficient' })).toContain('멀어졌는데')
    expect(buildHomeGreeting({ ...base, yesterdayStatus: 'exceeded' })).toContain('멀어졌는데')
  })

  it('어제 적정/목표근접이었으면 긍정적인 문구를 보여준다', () => {
    expect(buildHomeGreeting({ ...base, yesterdayStatus: 'adequate' })).toContain('좋은 흐름 이어가볼까요')
    expect(buildHomeGreeting({ ...base, yesterdayStatus: 'near_goal' })).toContain('좋은 흐름 이어가볼까요')
  })

  it('아무 조건도 해당 안 되면 기본 문구를 보여준다', () => {
    expect(buildHomeGreeting(base)).toBe('오늘도 목표를 향해 달려볼까요?')
  })
})
