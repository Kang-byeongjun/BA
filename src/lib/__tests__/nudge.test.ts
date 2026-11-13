import { describe, expect, it } from 'vitest'
import { getHomeNudge } from '../nudge'

const base = { hour: 9, loggedSlots: new Set<'아침' | '점심' | '저녁' | '간식'>(), waterMl: 2000, waterTargetMl: 2000 }

describe('getHomeNudge — 가장 급한 넛지 하나만 고른다', () => {
  it('저녁 7시 전이면 저녁 미기록으로 넛지하지 않는다', () => {
    expect(getHomeNudge({ ...base, hour: 18, loggedSlots: new Set() })).toBeNull()
  })

  it('저녁 7시 넘었는데 저녁을 기록 안 했으면 저녁 넛지를 띄운다', () => {
    const nudge = getHomeNudge({ ...base, hour: 20, loggedSlots: new Set(['아침', '점심']) })
    expect(nudge?.action).toBe('log-dinner')
  })

  it('저녁을 이미 기록했으면 저녁 넛지는 안 뜬다', () => {
    const nudge = getHomeNudge({ ...base, hour: 20, loggedSlots: new Set(['저녁']) })
    expect(nudge?.action).not.toBe('log-dinner')
  })

  it('저녁 이후 물도 많이 못 마셨으면 물 넛지를 띄운다(저녁 기록은 돼 있을 때)', () => {
    const nudge = getHomeNudge({ ...base, hour: 20, loggedSlots: new Set(['저녁']), waterMl: 300, waterTargetMl: 2000 })
    expect(nudge?.action).toBe('add-water')
  })

  it('저녁 미기록과 물 부족이 동시에 해당하면 저녁 쪽을 우선한다', () => {
    const nudge = getHomeNudge({ ...base, hour: 20, loggedSlots: new Set(), waterMl: 100, waterTargetMl: 2000 })
    expect(nudge?.action).toBe('log-dinner')
  })

  it('물을 충분히 마셨으면 넛지가 없다', () => {
    expect(getHomeNudge({ ...base, hour: 20, loggedSlots: new Set(['저녁']), waterMl: 1800 })).toBeNull()
  })

  it('이른 시간이면 아무 조건도 해당하지 않는다', () => {
    expect(getHomeNudge({ ...base, hour: 10, loggedSlots: new Set(), waterMl: 0 })).toBeNull()
  })
})
