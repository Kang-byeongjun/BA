import { currentWeekDays } from './mealWeekTrend'
import type { Meal, NutritionTarget } from '../types'

export type CheatDayTone = 'good' | 'caution' | 'neutral'

export interface CheatDayCheck {
  tone: CheatDayTone
  headline: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * "오늘 치팅해도 될까" 질문에 답한다. 이번 주(월요일 시작) 중 오늘 이전에 "실제로 기록된" 날만
 * 모아서, 그 날들의 칼로리 평균이 목표보다 쌓아둔 여유(또는 부족분)가 있는지로 판단한다.
 * 기록 안 한 날은 "0kcal 먹음"이 아니라 그냥 판단에서 뺀다 — 안 먹은 게 아니라 안 적은 걸 수도
 * 있어서, 포함하면 실제보다 과하게 "여유 있다"고 나올 수 있다.
 */
export function buildCheatDayCheck(meals: Meal[], target: NutritionTarget, now: number = Date.now()): CheatDayCheck {
  const days = currentWeekDays(now)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()
  const priorDays = days.filter((d) => d < todayStart)

  const loggedDays = priorDays.filter((dayStart) => {
    const dayEnd = dayStart + DAY_MS
    return meals.some((m) => m.timestamp >= dayStart && m.timestamp < dayEnd)
  })

  if (loggedDays.length === 0) {
    return {
      tone: 'neutral',
      headline:
        priorDays.length === 0
          ? '이번 주가 막 시작돼서 아직 비교할 기록이 없어요.'
          : '이번 주 들어 기록된 식사가 없어서 판단하기 어려워요.',
    }
  }

  const consumedSoFar = loggedDays.reduce((sum, dayStart) => {
    const dayEnd = dayStart + DAY_MS
    const dayCalories = meals
      .filter((m) => m.timestamp >= dayStart && m.timestamp < dayEnd)
      .reduce((s, m) => s + m.calories, 0)
    return sum + dayCalories
  }, 0)
  const expectedSoFar = target.calories * loggedDays.length
  const banked = expectedSoFar - consumedSoFar

  if (banked > 0) {
    return {
      tone: 'good',
      headline: `최근 ${loggedDays.length}일 동안 목표보다 평균 ${Math.round(banked / loggedDays.length)}kcal 적게 드셨어요. 오늘 목표보다 ${Math.round(banked)}kcal 정도 더 먹어도 이번 주 평균은 유지돼요.`,
    }
  }

  return {
    tone: 'caution',
    headline: `최근 ${loggedDays.length}일 동안 이미 목표보다 평균 ${Math.round(-banked / loggedDays.length)}kcal 더 드셨어요. 오늘 치팅하면 이번 주 평균을 넘길 가능성이 높아요.`,
  }
}
