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

// 이번 주(월요일 시작, 캘린더 기준)를 월 -> 일 순서로 돌려준다. getDay()는 일요일이 0이라
// 월요일까지 거슬러 올라가는 일수를 따로 계산한다(일요일이면 6일 전).
export function currentWeekDays(now: number = Date.now()): number[] {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const dow = startOfToday.getDay()
  const daysSinceMonday = dow === 0 ? 6 : dow - 1
  const monday = startOfToday.getTime() - daysSinceMonday * DAY_MS
  return Array.from({ length: 7 }, (_, i) => monday + i * DAY_MS)
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

// 끼니 구분 없이, 이번 주(월요일 시작) 하루 전체 영양소 합계를 월 -> 일 순서로 돌려준다.
// "주간 목표"는 월요일에 리셋되는 개념이라 롤링 7일이 아니라 캘린더 주를 쓴다 — 아직 지나지
// 않은 요일은 자연히 0으로 채워진다(기록이 없는 게 아니라 아직 안 온 날).
export function getDayWeekSeries(meals: Meal[], now: number = Date.now()): DayNutrition[] {
  const days = currentWeekDays(now)
  return days.map((dayStart) => {
    const dayEnd = dayStart + DAY_MS
    const dayMeals = meals.filter((m) => m.timestamp >= dayStart && m.timestamp < dayEnd)
    return sumDay(dayMeals, dayStart)
  })
}
