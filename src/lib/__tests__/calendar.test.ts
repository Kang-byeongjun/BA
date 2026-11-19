import { describe, expect, it } from 'vitest'
import type { Meal, NutritionTarget } from '../../types'
import { getDayStatusesInRange, getMonthlyDayStatuses } from '../calendar'

const target: NutritionTarget = { calories: 2000, protein: 120, carbohydrates: 250, fat: 70, fiber: 30 }

function mealOn(year: number, month: number, day: number, calories: number): Meal {
  return {
    id: `${year}-${month}-${day}-${calories}`,
    timestamp: new Date(year, month, day, 13).getTime(),
    slot: '점심',
    title: '테스트 식사',
    image: null,
    foods: [],
    calories,
    protein: 20,
    carbohydrates: 50,
    fat: 10,
    fiber: 5,
    hasLowConfidencePortions: false,
  }
}

describe('getMonthlyDayStatuses — 월별 날짜마다 칼로리 달성 상태를 매긴다', () => {
  it('그 달의 일수만큼 반환한다(기록 없는 날도 포함)', () => {
    const result = getMonthlyDayStatuses([], target, 2026, 1) // 2월(윤년 아님, 28일)
    expect(result).toHaveLength(28)
    expect(result.every((d) => d.status === 'none')).toBe(true)
  })

  it('기록이 없는 날은 none이다', () => {
    const result = getMonthlyDayStatuses([], target, 2026, 10)
    expect(result[0].status).toBe('none')
  })

  it('하루 섭취 칼로리를 목표와 비교해 상태를 매긴다', () => {
    const meals = [mealOn(2026, 10, 5, 2000)]
    const result = getMonthlyDayStatuses(meals, target, 2026, 10)
    const day5 = result.find((d) => new Date(d.date).getDate() === 5)
    expect(day5?.status).toBe('near_goal')
    expect(day5?.calories).toBe(2000)
  })

  it('같은 날 여러 끼는 합산해서 하나의 상태로 판정한다', () => {
    const meals = [mealOn(2026, 10, 5, 1000), mealOn(2026, 10, 5, 1000)]
    const result = getMonthlyDayStatuses(meals, target, 2026, 10)
    const day5 = result.find((d) => new Date(d.date).getDate() === 5)
    expect(day5?.calories).toBe(2000)
    expect(day5?.status).toBe('near_goal')
  })

  it('목표보다 많이 초과하면 exceeded, 많이 부족하면 deficient다', () => {
    const meals = [mealOn(2026, 10, 10, 3000), mealOn(2026, 10, 20, 500)]
    const result = getMonthlyDayStatuses(meals, target, 2026, 10)
    expect(result.find((d) => new Date(d.date).getDate() === 10)?.status).toBe('exceeded')
    expect(result.find((d) => new Date(d.date).getDate() === 20)?.status).toBe('deficient')
  })
})

describe('getDayStatusesInRange — 월 경계와 무관하게 임의의 두 날짜 사이를 센다', () => {
  it('시작일과 종료일을 모두 포함해서 반환한다', () => {
    const result = getDayStatusesInRange([], target, new Date(2026, 9, 28).getTime(), new Date(2026, 10, 3).getTime())
    expect(result).toHaveLength(7) // 10/28~11/3
  })

  it('월을 넘어가도 각 날짜의 섭취 상태를 제대로 매긴다', () => {
    // 10월은 31일까지라, 10/30~11/1은 10/30·10/31·11/1 세 날짜다.
    const meals = [mealOn(2026, 9, 30, 2000), mealOn(2026, 10, 1, 500)]
    const result = getDayStatusesInRange(meals, target, new Date(2026, 9, 30).getTime(), new Date(2026, 10, 1).getTime())
    expect(result).toEqual(['near_goal', 'none', 'deficient'])
  })
})
