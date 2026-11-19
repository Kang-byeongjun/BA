import type { Meal, MealSlot, NutrientKey } from '../types'

export type DayNutrition = Record<NutrientKey, number> & { date: number }

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function weekdayLabel(timestamp: number): string {
  return WEEKDAY_LABELS[new Date(timestamp).getDay()]
}

// 오늘을 포함해 최근 7일(캘린더 날짜 자정 기준)을, 오래된 날 -> 오늘 순서로 돌려준다.
export function recentWeekDays(now: number = Date.now()): number[] {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const start = startOfToday.getTime()
  return Array.from({ length: 7 }, (_, i) => start - (6 - i) * DAY_MS)
}

function sumDay(dayMeals: Meal[], dayStart: number): DayNutrition {
  return {
    date: dayStart,
    calories: dayMeals.reduce((s, m) => s + m.calories, 0),
    protein: dayMeals.reduce((s, m) => s + m.protein, 0),
    carbohydrates: dayMeals.reduce((s, m) => s + m.carbohydrates, 0),
    fat: dayMeals.reduce((s, m) => s + m.fat, 0),
    fiber: dayMeals.reduce((s, m) => s + m.fiber, 0),
  }
}

// 지정한 끼니(slot)의 최근 7일치 일별 영양소 합계를, 오래된 날 -> 오늘 순서로 돌려준다.
// 그 날 그 끼니 기록이 없으면 0 — 날짜 칸 자체는 비우지 않는다(요일 축이 고정이어야 패턴이 보인다).
export function getSlotWeekSeries(meals: Meal[], slot: MealSlot, now: number = Date.now()): DayNutrition[] {
  const days = recentWeekDays(now)
  return days.map((dayStart) => {
    const dayEnd = dayStart + DAY_MS
    const dayMeals = meals.filter((m) => m.slot === slot && m.timestamp >= dayStart && m.timestamp < dayEnd)
    return sumDay(dayMeals, dayStart)
  })
}

// 끼니 구분 없이, 최근 7일치 하루 전체 영양소 합계를 오래된 날 -> 오늘 순서로 돌려준다.
// NutritionTarget이 끼니별이 아니라 하루 전체 기준이라, 목표와 비교하려면 끼니를 합쳐야 한다.
export function getDayWeekSeries(meals: Meal[], now: number = Date.now()): DayNutrition[] {
  const days = recentWeekDays(now)
  return days.map((dayStart) => {
    const dayEnd = dayStart + DAY_MS
    const dayMeals = meals.filter((m) => m.timestamp >= dayStart && m.timestamp < dayEnd)
    return sumDay(dayMeals, dayStart)
  })
}
