import { describe, expect, it } from 'vitest'
import type { WaterLog } from '../../types'
import { getTodayWaterTotal } from '../water'

const ONE_DAY_MS = 86_400_000

function waterLogAt(timestamp: number, amount: number): WaterLog {
  return { id: String(timestamp), timestamp, amount }
}

describe('getTodayWaterTotal — 오늘 마신 양만 더한다', () => {
  it('기록이 없으면 0이다', () => {
    expect(getTodayWaterTotal([])).toBe(0)
  })

  it('오늘 기록한 양만 더한다', () => {
    const now = Date.now()
    const logs = [waterLogAt(now, 200), waterLogAt(now - 3600_000, 500)]
    expect(getTodayWaterTotal(logs, now)).toBe(700)
  })

  it('다른 날 기록은 더하지 않는다', () => {
    const now = Date.now()
    const logs = [waterLogAt(now, 200), waterLogAt(now - ONE_DAY_MS, 500)]
    expect(getTodayWaterTotal(logs, now)).toBe(200)
  })
})
