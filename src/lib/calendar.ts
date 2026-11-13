import { getNutritionStatus, getPercentage, sumMeals } from './nutrition'
import { isSameDay } from './time'
import type { Meal, NutritionStatus, NutritionTarget } from '../types'

export type DayStatus = NutritionStatus | 'none'

export interface CalendarDay {
  date: number // 그 날 정오 타임스탬프(같은 날짜 비교·표시에만 쓴다)
  status: DayStatus
  calories: number
}

/**
 * year/month(0-11)에 해당하는 달의 하루하루에 대해, 그날 칼로리 섭취가 목표에 얼마나
 * 가까웠는지를 상태(부족/적정/목표근접/초과)로 분류한다. 기록이 없는 날은 'none'.
 */
export function getMonthlyDayStatuses(
  meals: Meal[],
  target: NutritionTarget,
  year: number,
  month: number,
): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result: CalendarDay[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day, 12).getTime()
    const dayMeals = meals.filter((m) => isSameDay(m.timestamp, date))

    if (dayMeals.length === 0) {
      result.push({ date, status: 'none', calories: 0 })
      continue
    }

    const calories = sumMeals(dayMeals).calories
    const percent = getPercentage(calories, target.calories)
    result.push({ date, status: getNutritionStatus(percent), calories })
  }

  return result
}
