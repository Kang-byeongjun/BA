import { getNutritionStatus, getPercentage, sumMeals } from './nutrition'
import { isSameDay } from './time'
import type { Meal, NutritionStatus, NutritionTarget } from '../types'

export type DayStatus = NutritionStatus | 'none'

export interface CalendarDay {
  date: number // 그 날 정오 타임스탬프(같은 날짜 비교·표시에만 쓴다)
  status: DayStatus
  calories: number
}

/** 하루치 칼로리 섭취가 목표에 얼마나 가까웠는지를 상태로 분류한다. 기록이 없으면 'none'. */
export function getDayStatus(meals: Meal[], target: NutritionTarget, timestamp: number): DayStatus {
  const dayMeals = meals.filter((m) => isSameDay(m.timestamp, timestamp))
  if (dayMeals.length === 0) return 'none'

  const calories = sumMeals(dayMeals).calories
  return getNutritionStatus(getPercentage(calories, target.calories))
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
    const calories = dayMeals.length > 0 ? sumMeals(dayMeals).calories : 0
    const status: DayStatus = dayMeals.length === 0 ? 'none' : getNutritionStatus(getPercentage(calories, target.calories))
    result.push({ date, status, calories })
  }

  return result
}

/**
 * 임의의 두 날짜(두 InBody 측정 사이 등) 사이의 하루하루 상태를 분류한다. 월 경계와 무관하게
 * startTs~endTs(둘 다 포함) 구간을 그대로 센다.
 */
export function getDayStatusesInRange(meals: Meal[], target: NutritionTarget, startTs: number, endTs: number): DayStatus[] {
  const start = new Date(startTs)
  const end = new Date(endTs)
  const result: DayStatus[] = []

  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12)
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12)
  while (cursor.getTime() <= endDay.getTime()) {
    result.push(getDayStatus(meals, target, cursor.getTime()))
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
