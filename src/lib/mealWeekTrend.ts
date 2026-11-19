import type { Meal, NutrientKey } from '../types'

export type DayNutrition = Record<NutrientKey, number> & { date: number }

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function weekdayLabel(timestamp: number): string {
  return WEEKDAY_LABELS[new Date(timestamp).getDay()]
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

// "11월 16일 - 11월 22일" 형태로 주간 범위를 표시한다.
export function formatWeekRange(mondayTs: number, sundayTs: number): string {
  const m = new Date(mondayTs)
  const s = new Date(sundayTs)
  return `${m.getMonth() + 1}월 ${m.getDate()}일 - ${s.getMonth() + 1}월 ${s.getDate()}일`
}
