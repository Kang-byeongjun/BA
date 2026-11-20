import { describe, expect, it } from 'vitest'
import { groupMealsByDay } from '../mealHistory'
import type { Meal } from '../../types'

function meal(id: string, timestamp: number): Meal {
  return {
    id,
    timestamp,
    slot: '점심',
    title: `식사 ${id}`,
    image: null,
    foods: [],
    calories: 500,
    protein: 20,
    carbohydrates: 50,
    fat: 10,
    fiber: 4,
    hasLowConfidencePortions: false,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

describe('groupMealsByDay', () => {
  it('빈 기록이면 빈 배열이다', () => {
    expect(groupMealsByDay([])).toEqual([])
  })

  it('같은 날 식사는 한 그룹으로 묶는다', () => {
    const base = new Date(2026, 10, 19, 8, 0, 0).getTime()
    const meals = [meal('a', base), meal('b', base + 3600_000)]
    const groups = groupMealsByDay(meals)
    expect(groups).toHaveLength(1)
    expect(groups[0].meals.map((m) => m.id)).toEqual(['b', 'a']) // 최신순
  })

  it('날짜가 다르면 그룹도 나뉘고, 최신 날짜가 먼저 온다', () => {
    const day1 = new Date(2026, 10, 18, 8, 0, 0).getTime()
    const day2 = new Date(2026, 10, 19, 8, 0, 0).getTime()
    const meals = [meal('old', day1), meal('new', day2)]
    const groups = groupMealsByDay(meals)
    expect(groups).toHaveLength(2)
    expect(groups[0].meals[0].id).toBe('new')
    expect(groups[1].meals[0].id).toBe('old')
  })

  it('그룹의 date는 그 날 자정 timestamp다', () => {
    const noon = new Date(2026, 10, 19, 13, 30, 0).getTime()
    const groups = groupMealsByDay([meal('a', noon)])
    const midnight = new Date(2026, 10, 19, 0, 0, 0).getTime()
    expect(groups[0].date).toBe(midnight)
  })

  it('입력 순서가 뒤섞여 있어도 날짜별로 올바르게 묶는다', () => {
    const day1 = new Date(2026, 10, 18, 8, 0, 0).getTime()
    const day2 = new Date(2026, 10, 19, 8, 0, 0).getTime()
    const meals = [meal('a', day1), meal('b', day2), meal('c', day1 + DAY_MS * 0)]
    const groups = groupMealsByDay(meals)
    expect(groups).toHaveLength(2)
    expect(groups[0].meals.map((m) => m.id).sort()).toEqual(['b'])
    expect(groups[1].meals.map((m) => m.id).sort()).toEqual(['a', 'c'])
  })
})
