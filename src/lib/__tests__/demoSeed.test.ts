// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_PROFILE } from '../../data/mockData'
import { getDayStatus } from '../calendar'
import { classifyBodyType } from '../inBodyBodyType'
import { sortInBodyHistory } from '../inBodyHistoryOrder'
import {
  applyDemoSeed,
  buildSeedData,
  DEMO_BACKUP_KEY,
  findProfileMismatch,
  hasDemoBackup,
  restoreDemoBackup,
  SEED_ID_PREFIX,
} from '../demoSeed'
import { isSameDay } from '../time'

const NOW = new Date(2026, 10, 24, 12, 0).getTime()
const DAY = 86_400_000
const key = (k: string) => `ai-diet-app:${k}`
const read = <T>(k: string): T => JSON.parse(localStorage.getItem(key(k))!) as T

beforeEach(() => localStorage.clear())

describe('인바디 4회', () => {
  const { inBodyHistory } = buildSeedData(NOW)

  it('4개이고 최근 순(맨 앞이 가장 최근 = 1주 전)이며 날짜가 8·6·4·1주 전이다', () => {
    expect(inBodyHistory).toHaveLength(4)
    expect(inBodyHistory.every((e) => e.id.startsWith(SEED_ID_PREFIX))).toBe(true)
    expect(sortInBodyHistory(inBodyHistory).map((e) => e.id)).toEqual(inBodyHistory.map((e) => e.id))
    const weeksAgo = inBodyHistory.map((e) => Math.round((NOW - e.timestamp) / DAY / 7))
    expect(weeksAgo).toEqual([1, 4, 6, 8])
    expect(inBodyHistory[0]!.timestamp).toBeGreaterThan(inBodyHistory[1]!.timestamp)
  })

  it('체중·골격근량·체지방량이 서서히 좋아지고 체지방률은 일관되게 계산된다', () => {
    const asc = [...inBodyHistory].reverse()
    expect(asc.map((e) => e.weight)).toEqual([112.4, 110.2, 108.5, 107.1])
    expect(asc.map((e) => e.skeletalMuscleMass)).toEqual([41.2, 41.8, 42.2, 42.3])
    expect(asc.map((e) => e.bodyFatMass)).toEqual([38.1, 36.2, 35.1, 33.8])
    expect(asc.map((e) => e.bodyFatPercentage)).toEqual([33.9, 32.8, 32.4, 31.6])
  })

  it('체형은 기존 판정 함수로 모두 C형이다', () => {
    for (const e of inBodyHistory) {
      const r = e.standardRanges!
      expect(r.skeletalMuscleMass && r.bodyFatMass).toBeTruthy()
      expect(classifyBodyType(r.skeletalMuscleMass, r.bodyFatMass)).toBe('C')
      expect(e.bodyType).toBe('C')
    }
  })
})

describe('운동 기록', () => {
  const { workouts, workoutHistory } = buildSeedData(NOW)

  it('최근 49일 18~19회, 오늘 기록 없음, id는 demo-seed-', () => {
    expect(workoutHistory.length).toBeGreaterThanOrEqual(18)
    expect(workoutHistory.length).toBeLessThanOrEqual(19)
    expect(workouts).toHaveLength(workoutHistory.length)
    for (const r of workoutHistory) {
      expect(r.id.startsWith(SEED_ID_PREFIX)).toBe(true)
      expect(isSameDay(r.date, NOW)).toBe(false)
      expect(r.date).toBeLessThan(NOW)
      expect(NOW - r.date).toBeLessThanOrEqual(49 * DAY)
    }
    for (const w of workouts) expect(isSameDay(w.endTime, NOW)).toBe(false)
  })

  it('1회 45~60분(초 단위로 저장), 볼륨 5,000~9,000kg, 합계가 종목 볼륨과 맞다', () => {
    for (const r of workoutHistory) {
      expect(r.durationSeconds).toBeGreaterThanOrEqual(45 * 60)
      expect(r.durationSeconds).toBeLessThanOrEqual(60 * 60)
      expect(r.totalVolume).toBeGreaterThanOrEqual(5000)
      expect(r.totalVolume).toBeLessThanOrEqual(9000)
      expect(r.exercises.reduce((s, e) => s + e.volume, 0)).toBe(r.totalVolume)
      expect(r.date - r.startedAt).toBe(r.durationSeconds * 1000)
    }
    for (const w of workouts) {
      expect(w.type).toBe('헬스')
      expect(w.duration).toBeGreaterThanOrEqual(45 * 60)
      expect(w.endTime - w.startTime).toBe(w.duration * 1000)
    }
  })

  it('가슴·등·하체·어깨·팔이 섞이고 팔은 가슴보다 적다', () => {
    const count: Record<string, number> = {}
    for (const r of workoutHistory) for (const e of r.exercises) count[e.group!] = (count[e.group!] ?? 0) + 1
    for (const g of ['CHEST', 'BACK', 'LEGS', 'SHOULDER', 'ARM']) expect(count[g], g).toBeGreaterThan(0)
    expect(count.ARM!).toBeLessThan(count.CHEST!)
  })

  it('저장된 추천 루틴이 있으면 그 종목 이름으로 만든다', () => {
    localStorage.setItem(
      key('workoutRoutine'),
      JSON.stringify({
        result: {
          days: [
            { day: 1, label: '테스트일', exercises: [{ id: 'X1', name: '내 전용 종목', group: 'CHEST', prescription: { setsMax: 3, repsMin: 8, repsMax: 10 } }] },
          ],
        },
      }),
    )
    const { workoutHistory: h } = buildSeedData(NOW)
    expect(h.every((r) => r.label === '테스트일' && r.exercises[0]!.name === '내 전용 종목')).toBe(true)
  })
})

describe('식단 기록', () => {
  const { meals } = buildSeedData(NOW, { targetKcal: 1920 })
  const target = { calories: 1920, protein: 130, carbohydrates: 200, fat: 60, fiber: 28 }

  it('어제까지 7일, 하루 3~4끼, 오늘은 비어 있다', () => {
    expect(meals.every((m) => m.id.startsWith(SEED_ID_PREFIX) && !m.id.startsWith('demo-meal-'))).toBe(true)
    expect(meals.some((m) => isSameDay(m.timestamp, NOW))).toBe(false)
    for (let n = 1; n <= 7; n++) {
      const day = meals.filter((m) => isSameDay(m.timestamp, NOW - n * DAY))
      expect(day.length, `${n}일 전`).toBeGreaterThanOrEqual(3)
      expect(day.length).toBeLessThanOrEqual(4)
    }
  })

  it('날마다 상태가 섞이고 7일 중 3~4일은 "목표 근접" 이상이다', () => {
    const statuses = Array.from({ length: 7 }, (_, i) => getDayStatus(meals, target, NOW - (i + 1) * DAY))
    expect(new Set(statuses)).toEqual(new Set(['near_goal', 'adequate', 'deficient', 'exceeded']))
    const nearOrMore = statuses.filter((s) => s === 'near_goal' || s === 'exceeded').length
    expect(nearOrMore).toBeGreaterThanOrEqual(3)
    expect(nearOrMore).toBeLessThanOrEqual(5)
  })

  it('끼니의 영양소 합이 음식 합과 맞는 데모 식단 형식이다', () => {
    for (const m of meals) {
      expect(m.image).toBeNull()
      expect(m.foods.reduce((s, f) => s + f.calories, 0)).toBe(m.calories)
      expect(m.foods[0]).toEqual(expect.objectContaining({ name: expect.any(String), amount: expect.stringMatching(/g$/) }))
    }
  })
})

describe('마지막 인바디 구간의 식단', () => {
  // 실행 요일·식단 목표가 달라도 같아야 한다
  const NOWS = Array.from({ length: 7 }, (_, i) => NOW + i * DAY)
  const daysOf = (now: number, targetKcal: number) => {
    const { meals } = buildSeedData(now, { targetKcal })
    return Array.from({ length: 21 }, (_, i) => meals.filter((m) => isSameDay(m.timestamp, now - (28 - i) * DAY))) // 오래된 날부터
  }
  const isWeekend = (ts: number) => [0, 6].includes(new Date(ts).getDay())

  it('평일 1,600~1,900 / 토·일 2,400~2,800kcal이고 요일마다 평균이 다르다', () => {
    for (const now of NOWS) {
      for (const targetKcal of [1920, 2280]) {
        const byWeekday = new Map<number, number[]>()
        for (const meals of daysOf(now, targetKcal)) {
          const total = meals.reduce((s, m) => s + m.calories, 0)
          const [min, max] = isWeekend(meals[0]!.timestamp) ? [2400, 2800] : [1600, 1900]
          expect(total).toBeGreaterThanOrEqual(min)
          expect(total).toBeLessThanOrEqual(max)
          const weekday = new Date(meals[0]!.timestamp).getDay()
          byWeekday.set(weekday, [...(byWeekday.get(weekday) ?? []), total])
        }
        const averages = [...byWeekday.values()].map((list) => Math.round(list.reduce((s, x) => s + x, 0) / list.length))
        expect(new Set(averages).size).toBe(7)
        for (const list of byWeekday.values()) expect(new Set(list).size).toBeGreaterThan(1) // 같은 요일도 주마다 다르다
      }
    }
  })

  it('주말 저녁·간식은 맥주 4회, 후라이드 치킨 3회, 라면 2회, 피자 1회', () => {
    for (const now of NOWS) {
      const count = new Map<string, number>()
      for (const meals of daysOf(now, 1920)) {
        if (!isWeekend(meals[0]!.timestamp)) continue
        for (const m of meals.filter((x) => x.slot === '저녁' || x.slot === '간식')) for (const f of m.foods) count.set(f.name, (count.get(f.name) ?? 0) + 1)
      }
      expect(['맥주', '후라이드 치킨', '라면', '피자'].map((n) => count.get(n))).toEqual([4, 3, 2, 1])
      for (const [name, n] of count) if (!['맥주', '후라이드 치킨', '라면'].includes(name)) expect(n, name).toBe(1)
    }
  })
})

describe('백업·복원과 중복 방지', () => {
  it('채우면 현재 값을 백업하고, 다시 채워도 쌓이지 않고 첫 백업을 그대로 둔다', () => {
    localStorage.setItem(key('profile'), JSON.stringify(DEMO_PROFILE))
    localStorage.setItem(key('meals'), JSON.stringify([{ id: 'mine' }]))
    const first = applyDemoSeed(NOW)
    expect(first.keptExistingBackup).toBe(false)
    expect(hasDemoBackup()).toBe(true)
    const lens = () => ['inBodyHistory', 'workouts', 'workoutHistory', 'meals'].map((k) => read<unknown[]>(k).length)
    const afterFirst = lens()
    expect(afterFirst[0]).toBe(4)
    expect(read<{ id: string }[]>('meals').every((m) => m.id.startsWith(SEED_ID_PREFIX))).toBe(true)
    expect(read<typeof DEMO_PROFILE>('profile')).toEqual(DEMO_PROFILE) // 프로필은 그대로

    const second = applyDemoSeed(NOW)
    expect(second.keptExistingBackup).toBe(true)
    expect(lens()).toEqual(afterFirst)
    const backup = JSON.parse(localStorage.getItem(key(DEMO_BACKUP_KEY))!)
    expect(JSON.parse(backup.values.meals)).toEqual([{ id: 'mine' }]) // 시연 값이 아니라 처음 상태
  })

  it('되돌리면 원래 값으로 복원하고(없던 키는 지우고) 백업 키를 지운다', () => {
    localStorage.setItem(key('meals'), JSON.stringify([{ id: 'mine' }]))
    applyDemoSeed(NOW)
    expect(restoreDemoBackup()).toBe(true)
    expect(read('meals')).toEqual([{ id: 'mine' }])
    expect(localStorage.getItem(key('inBodyHistory'))).toBeNull() // 원래 없던 키
    expect(localStorage.getItem(key('workoutHistory'))).toBeNull()
    expect(hasDemoBackup()).toBe(false)
    expect(restoreDemoBackup()).toBe(false)
  })
})

describe('프로필 인바디 기준 확인', () => {
  it('마지막 인바디와 프로필의 체중·골격근량이 다르면 알려주고, 같으면 비어 있다', () => {
    const { inBodyHistory } = buildSeedData(NOW)
    expect(findProfileMismatch(DEMO_PROFILE, inBodyHistory).length).toBe(2)
    expect(findProfileMismatch({ ...DEMO_PROFILE, weight: 107.1, skeletalMuscleMass: 42.3 }, inBodyHistory)).toEqual([])
    expect(findProfileMismatch(null, inBodyHistory)).toEqual([])
  })
})
