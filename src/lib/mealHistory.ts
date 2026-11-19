import type { Meal } from '../types'

export interface MealDayGroup {
  date: number // 그 날 자정 timestamp
  meals: Meal[] // 그 날의 식사, 최신순
}

// 식사를 최신순으로 정렬한 뒤 날짜별로 묶는다. 누적될수록 평평한 목록이 한없이 길어지는 걸 막고,
// 날짜 하나를 고르면 그 날의 식사(사진 포함)만 보게 하기 위함.
export function groupMealsByDay(meals: Meal[]): MealDayGroup[] {
  const sorted = [...meals].sort((a, b) => b.timestamp - a.timestamp)
  const groups: MealDayGroup[] = []
  for (const meal of sorted) {
    const d = new Date(meal.timestamp)
    d.setHours(0, 0, 0, 0)
    const dayStart = d.getTime()
    const last = groups[groups.length - 1]
    if (last && last.date === dayStart) {
      last.meals.push(meal)
    } else {
      groups.push({ date: dayStart, meals: [meal] })
    }
  }
  return groups
}
