import { describe, expect, it } from 'vitest'
import { getDayWeekSeries, getSlotWeekSeries, recentWeekDays, weekdayLabel } from '../mealWeekTrend'
import type { Meal } from '../../types'

const DAY_MS = 24 * 60 * 60 * 1000
// 2026-11-19는 목요일
const THURSDAY_NOON = new Date(2026, 10, 19, 12, 0, 0).getTime()

function meal(timestamp: number, overrides: Partial<Meal> = {}): Meal {
  return {
    id: `meal-${timestamp}-${Math.random()}`,
    timestamp,
    slot: '아침',
    title: '테스트 식사',
    image: null,
    foods: [],
    calories: 400,
    protein: 20,
    carbohydrates: 50,
    fat: 10,
    fiber: 4,
    hasLowConfidencePortions: false,
    ...overrides,
  }
}

describe('weekdayLabel', () => {
  it('타임스탬프의 요일을 한 글자로 돌려준다', () => {
    expect(weekdayLabel(THURSDAY_NOON)).toBe('목')
  })
})

describe('recentWeekDays', () => {
  it('오늘을 포함해 캘린더 날짜 자정 기준 최근 7일을 과거->오늘 순서로 돌려준다', () => {
    const days = recentWeekDays(THURSDAY_NOON)
    expect(days).toHaveLength(7)
    const startOfToday = new Date(THURSDAY_NOON)
    startOfToday.setHours(0, 0, 0, 0)
    expect(days[6]).toBe(startOfToday.getTime())
    expect(days[0]).toBe(startOfToday.getTime() - 6 * DAY_MS)
  })
})

describe('getSlotWeekSeries', () => {
  it('해당 끼니(slot)만, 날짜별로 합산해서 돌려준다', () => {
    const meals = [
      meal(THURSDAY_NOON, { slot: '아침', calories: 400, protein: 20 }),
      meal(THURSDAY_NOON - 1000, { slot: '아침', calories: 100, protein: 5 }), // 같은 날 두 번째 아침 기록
      meal(THURSDAY_NOON, { slot: '점심', calories: 900 }), // 다른 끼니는 제외돼야 함
    ]
    const series = getSlotWeekSeries(meals, '아침', THURSDAY_NOON)
    const today = series[series.length - 1]
    expect(today.calories).toBe(500)
    expect(today.protein).toBe(25)
  })

  it('기록이 없는 날은 0으로 채운다(날짜 칸을 비우지 않는다)', () => {
    const series = getSlotWeekSeries([], '아침', THURSDAY_NOON)
    expect(series).toHaveLength(7)
    expect(series.every((d) => d.calories === 0)).toBe(true)
  })

  it('최근 7일 범위 밖의 기록은 제외한다', () => {
    const tooOld = meal(THURSDAY_NOON - 10 * DAY_MS, { slot: '아침', calories: 999 })
    const series = getSlotWeekSeries([tooOld], '아침', THURSDAY_NOON)
    expect(series.reduce((s, d) => s + d.calories, 0)).toBe(0)
  })
})

describe('getDayWeekSeries', () => {
  it('끼니 구분 없이 그 날 전체를 합산한다', () => {
    const meals = [
      meal(THURSDAY_NOON, { slot: '아침', calories: 400 }),
      meal(THURSDAY_NOON, { slot: '점심', calories: 600 }),
      meal(THURSDAY_NOON, { slot: '저녁', calories: 500 }),
    ]
    const series = getDayWeekSeries(meals, THURSDAY_NOON)
    const today = series[series.length - 1]
    expect(today.calories).toBe(1500)
  })
})
