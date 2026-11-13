import { describe, expect, it } from 'vitest'
import {
  adjustRest,
  buildLogs,
  formatRest,
  INITIAL_REST,
  isRestDoneShowing,
  newSet,
  nextSetIdOf,
  restRemaining,
  setKg,
  settleRest,
  skipRest,
  startRest,
  toggleRest,
  type SetRow,
} from '../workoutLog'

const rows = (...kgs: string[]): SetRow[] => kgs.map((kg, i) => newSet(i + 1, kg, '10'))
const kgs = (sets: SetRow[]) => sets.map((s) => s.kg)

describe('buildLogs', () => {
  it('세트=최대 세트, 횟수=최대 횟수, 휴식=화면의 앞 숫자(restMin), 유산소 제외', () => {
    const logs = buildLogs([
      {
        order: 1,
        id: 'bench',
        name: '벤치프레스',
        group: 'CHEST',
        reason: '',
        caution: null,
        prescription: { setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 },
      },
      { order: 2, id: 'bike', name: '자전거', group: 'CARDIO', reason: '', caution: null, prescription: null },
    ])
    expect(logs).toHaveLength(1)
    expect(logs[0]!.restSeconds).toBe(60)
    expect(logs[0]!.sets.map((s) => [s.kg, s.reps])).toEqual([['', '12'], ['', '12'], ['', '12']])
    expect(nextSetIdOf(logs)).toBe(4)
  })
})

describe('setKg (아래 빈 세트 자동 채우기)', () => {
  it('아래의 빈 세트만 채우고, 값이 있는 세트와 위 세트는 건드리지 않는다', () => {
    const next = setKg(rows('', '', '50', ''), 2, '60')
    expect(kgs(next)).toEqual(['', '60', '50', '60'])
  })

  it('한 글자씩 입력해도 자동으로 채운 세트가 따라 바뀐다', () => {
    let s = rows('', '', '')
    s = setKg(s, 1, '6')
    s = setKg(s, 1, '60')
    s = setKg(s, 1, '62.5')
    expect(kgs(s)).toEqual(['62.5', '62.5', '62.5'])
  })

  it('자동으로 채워진 세트를 직접 고치면 그 뒤로는 따라 바뀌지 않는다', () => {
    let s = setKg(rows('', '', ''), 1, '60')
    s = setKg(s, 2, '70') // 2세트 직접 수정 → 3세트는 이미 60(1세트 값)이라 그대로
    expect(kgs(s)).toEqual(['60', '70', '60'])
    s = setKg(s, 1, '65') // 1세트를 바꾸면 1세트가 채운 3세트만 따라감, 직접 고친 2세트는 그대로
    expect(kgs(s)).toEqual(['65', '70', '65'])
  })

  it('다른 세트가 채운 값은 건드리지 않는다', () => {
    let s = setKg(rows('', '', ''), 2, '70') // 3세트 ← 2세트
    s = setKg(s, 1, '60') // 2세트는 직접 입력값, 3세트는 2세트가 채운 값 → 둘 다 그대로
    expect(kgs(s)).toEqual(['60', '70', '70'])
  })

  it('값을 지우면 자동으로 채웠던 세트도 같이 비운다', () => {
    let s = setKg(rows('', '', '50'), 1, '60')
    s = setKg(s, 1, '')
    expect(kgs(s)).toEqual(['', '', '50'])
  })
})

describe('휴식 타이머 계산', () => {
  const T = 1_000_000

  it('시작하면 끝나는 시각을 기록하고, 남은 시간은 시각 차이로 계산한다', () => {
    const r = startRest(INITIAL_REST, 60, T)
    expect(r.endsAt).toBe(T + 60_000)
    expect(restRemaining(r, T)).toBe(60)
    expect(restRemaining(r, T + 15_500)).toBe(45) // 44.5초 남음 → 올림
    expect(restRemaining(r, T + 999_999)).toBe(0)
  })

  it('OFF면 시작하지 않는다', () => {
    const off = toggleRest(INITIAL_REST)
    expect(off.enabled).toBe(false)
    expect(startRest(off, 60, T)).toBe(off)
  })

  it('돌던 중 OFF로 바꾸면 멈추고, 다시 ON 해도 저절로 시작하지 않는다', () => {
    const off = toggleRest(startRest(INITIAL_REST, 60, T))
    expect(off.endsAt).toBeNull()
    expect(toggleRest(off)).toEqual({ enabled: true, endsAt: null, endedAt: null })
  })

  it('−10초 / +10초 / 건너뛰기', () => {
    const r = startRest(INITIAL_REST, 60, T)
    expect(restRemaining(adjustRest(r, 10, T), T)).toBe(70)
    expect(restRemaining(adjustRest(r, -10, T), T)).toBe(50)
    expect(adjustRest(startRest(INITIAL_REST, 5, T), -10, T).endsAt).toBe(T) // 0 아래로 안 내려감
    expect(skipRest(r)).toEqual({ enabled: true, endsAt: null, endedAt: null })
  })

  it('시간이 되면 끝남으로 바꾸고, "휴식 끝!"은 5초 동안만 보인다', () => {
    const r = startRest(INITIAL_REST, 60, T)
    expect(settleRest(r, T + 59_999).finished).toBe(false)
    const { rest, finished } = settleRest(r, T + 60_000)
    expect(finished).toBe(true)
    expect(rest.endedAt).toBe(T + 60_000)
    expect(isRestDoneShowing(rest, T + 61_000)).toBe(true)
    expect(isRestDoneShowing(rest, T + 66_000)).toBe(false)
    expect(isRestDoneShowing(skipRest(r), T)).toBe(false)
  })

  it('formatRest', () => {
    expect(formatRest(45)).toBe('0:45')
    expect(formatRest(90)).toBe('1:30')
  })
})
