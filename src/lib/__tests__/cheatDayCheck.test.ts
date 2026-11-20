import { describe, expect, it } from 'vitest'
import { buildCheatDayCheck } from '../cheatDayCheck'
import type { Meal, NutritionTarget } from '../../types'

const DAY_MS = 24 * 60 * 60 * 1000
// 2026-11-19는 목요일(이번 주 월요일은 11/16) — 정오로 잡아 자정 경계 문제를 피한다.
const THURSDAY_NOON = new Date(2026, 10, 19, 12, 0, 0).getTime()
const MONDAY_NOON = new Date(2026, 10, 16, 12, 0, 0).getTime()

const TARGET: NutritionTarget = { calories: 2000, protein: 130, carbohydrates: 220, fat: 60, fiber: 25 }

function meal(timestamp: number, calories: number): Meal {
  return {
    id: `meal-${timestamp}-${Math.random()}`,
    timestamp,
    slot: '점심',
    title: '테스트 식사',
    image: null,
    foods: [],
    calories,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    hasLowConfidencePortions: false,
  }
}

describe('buildCheatDayCheck', () => {
  it('이번 주 월요일이면(오늘 이전 날이 없으면) 중립 메시지를 준다', () => {
    const check = buildCheatDayCheck([], TARGET, MONDAY_NOON)
    expect(check.tone).toBe('neutral')
  })

  it('오늘 이전 날이 있어도 기록이 전혀 없으면 중립 메시지를 준다', () => {
    const check = buildCheatDayCheck([], TARGET, THURSDAY_NOON)
    expect(check.tone).toBe('neutral')
  })

  it('목표보다 적게 먹어온 날들이 있으면 좋음 톤과 쌓인 여유를 알려준다', () => {
    const meals = [
      meal(MONDAY_NOON, 1500), // 월(화,수는 기록 없음)
      meal(MONDAY_NOON + DAY_MS, 1500), // 화
    ]
    const check = buildCheatDayCheck(meals, TARGET, THURSDAY_NOON)
    expect(check.tone).toBe('good')
    expect(check.headline).toContain('2일')
    expect(check.headline).toContain('500kcal') // (2000-1500) 평균
  })

  it('이미 목표보다 많이 먹어왔으면 주의 톤을 준다', () => {
    const meals = [meal(MONDAY_NOON, 2800)]
    const check = buildCheatDayCheck(meals, TARGET, THURSDAY_NOON)
    expect(check.tone).toBe('caution')
    expect(check.headline).toContain('800kcal')
  })

  it('기록 없는 날은 "0kcal 먹음"으로 치지 않고 평균에서 뺀다', () => {
    // 월요일만 기록 있고(목표 그대로 2000kcal), 화/수는 기록이 없다 — 화/수를 0kcal로 치면
    // "많이 덜 먹음"으로 오판하게 된다. 실제로는 기록된 월요일만으로 평가해야 한다.
    const meals = [meal(MONDAY_NOON, 2000)]
    const check = buildCheatDayCheck(meals, TARGET, THURSDAY_NOON)
    expect(check.headline).toContain('1일')
  })

  it('오늘 기록한 식사는 평가에서 제외한다(오늘은 치팅 후보일이라)', () => {
    const meals = [meal(MONDAY_NOON, 1500), meal(THURSDAY_NOON, 5000)]
    const check = buildCheatDayCheck(meals, TARGET, THURSDAY_NOON)
    expect(check.tone).toBe('good')
    expect(check.headline).toContain('1일')
  })
})
