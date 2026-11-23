import { describe, expect, it } from 'vitest'
import { formatMeasureDate, formatPointDates, labelsFit, layoutTrend, visibleLabelIndexes } from '../inBodyTrendChart'

const box = { width: 300, height: 120, padX: 24, padTop: 28, padBottom: 30 }
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime()

describe('layoutTrend', () => {
  it('값이 모두 같으면 선이 평평하다(같은 y, 세로 가운데)', () => {
    const pts = layoutTrend([{ timestamp: 1, value: 70 }, { timestamp: 2, value: 70 }, { timestamp: 3, value: 70 }], box)
    expect(new Set(pts.map((p) => p.y)).size).toBe(1)
    expect(pts[0]!.y).toBe(28 + (120 - 28 - 30) / 2)
  })
  it('점이 하나면 가운데, 값이 클수록 위(y가 작다)', () => {
    expect(layoutTrend([{ timestamp: 1, value: 70 }], box)[0]!.x).toBe(150)
    const [a, b] = layoutTrend([{ timestamp: 1, value: 60 }, { timestamp: 2, value: 70 }], box)
    expect(b!.y).toBeLessThan(a!.y)
    expect(a!.x).toBe(24)
    expect(b!.x).toBe(276)
  })
})

describe('라벨 겹침', () => {
  it('간격이 충분하면 모두, 좁으면 처음·마지막만 보인다', () => {
    expect(labelsFit(5, 252, 40)).toBe(true)
    expect(visibleLabelIndexes(5, true).size).toBe(5)
    expect(labelsFit(20, 252, 30)).toBe(false)
    expect([...visibleLabelIndexes(20, false)]).toEqual([0, 19])
    expect([...visibleLabelIndexes(1, false)]).toEqual([0])
  })
})

describe('날짜 표기', () => {
  it('같은 연도면 MM.DD, 연도가 섞이면 YY.MM.DD', () => {
    expect(formatPointDates([d(2026, 3, 4), d(2026, 11, 20)])).toEqual(['03.04', '11.20'])
    expect(formatPointDates([d(2025, 12, 30), d(2026, 1, 5)])).toEqual(['25.12.30', '26.01.05'])
  })
  it('측정일 막대 표기', () => {
    expect(formatMeasureDate(d(2025, 8, 4))).toBe('2025년 08월 04일')
  })
})
