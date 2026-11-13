import { describe, expect, it } from 'vitest'
import { WorkoutRequest } from '../../../server/engine/types'
import { DEFAULT_WORKOUT_PROFILE, type WorkoutProfile } from '../../types'
import { toFrequency, toTimeSlot, toWorkoutRequest, unsupportedPainNotice } from '../workoutAdapter'

const profile = (o: Partial<WorkoutProfile> = {}): WorkoutProfile => ({ ...DEFAULT_WORKOUT_PROFILE, ...o })

describe('toWorkoutRequest', () => {
  it.each([
    ['fat_loss', 'DIET'],
    ['muscle_gain', 'MUSCLE'],
    ['strength', 'MUSCLE'],
    ['body_shape', 'FITNESS'],
  ] as const)('목표 %s → %s', (goal, expected) => {
    expect(toWorkoutRequest(profile({ goal })).request.goal).toBe(expected)
  })

  it.each([
    ['beginner', 'BEGINNER'],
    ['intermediate', 'INTERMEDIATE'],
    ['advanced', 'ADVANCED'],
  ] as const)('경험 %s → %s', (experience, expected) => {
    expect(toWorkoutRequest(profile({ experience })).request.experience).toBe(expected)
  })

  it('어깨·허리·무릎은 엔진 값으로 바꾸고, 손목·발목은 빼서 따로 돌려준다', () => {
    const { request, unsupportedPains } = toWorkoutRequest(
      profile({ painAreas: ['wrist', 'knee', 'shoulder', 'back', 'ankle', 'wrist'] }),
    )
    expect(request.pain).toEqual(['KNEE', 'LOWBACK', 'SHOULDER'])
    expect(unsupportedPains).toEqual(['wrist', 'ankle'])
  })

  it('통증이 없으면 둘 다 빈 배열', () => {
    const { request, unsupportedPains } = toWorkoutRequest(profile({ painAreas: [] }))
    expect(request.pain).toEqual([])
    expect(unsupportedPains).toEqual([])
  })

  it('집중 부위·인바디 취약은 아직 빈 값으로 보낸다', () => {
    const { request } = toWorkoutRequest(profile())
    expect(request.focus).toEqual([])
    expect(request.inbody.weak).toEqual({ arm: false, trunk: false, leg: false })
  })

  it('만든 요청은 엔진의 요청 스키마를 그대로 통과한다', () => {
    const { request } = toWorkoutRequest(profile({ goal: 'strength', painAreas: ['back', 'ankle'], weeklyFrequency: 5, sessionDuration: 90 }))
    expect(WorkoutRequest.parse(request)).toEqual(request)
  })

  it('통증 순서만 다르면 같은 요청이 된다(결과 재사용 키)', () => {
    const a = toWorkoutRequest(profile({ painAreas: ['knee', 'shoulder'] })).request
    const b = toWorkoutRequest(profile({ painAreas: ['shoulder', 'knee'] })).request
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('구간 변환', () => {
  it.each([
    [1, 'FREQ_2'],
    [2, 'FREQ_2'],
    [3, 'FREQ_3'],
    [4, 'FREQ_4P'],
    [6, 'FREQ_4P'],
  ] as const)('주 %i회 → %s', (n, expected) => {
    expect(toFrequency(n)).toBe(expected)
  })

  it.each([
    [20, 'TIME_30'],
    [30, 'TIME_30'],
    [31, 'TIME_60'],
    [45, 'TIME_60'],
    [60, 'TIME_60'],
    [61, 'TIME_90'],
    [120, 'TIME_90'],
  ] as const)('%i분 → %s', (min, expected) => {
    expect(toTimeSlot(min)).toBe(expected)
  })
})

describe('unsupportedPainNotice', () => {
  it('빠진 부위가 없으면 null', () => {
    expect(unsupportedPainNotice([])).toBeNull()
  })
  it('빠진 부위 이름을 한국어로 안내한다', () => {
    expect(unsupportedPainNotice(['wrist', 'ankle'])).toContain('손목·발목 통증은 아직 추천에 반영되지 않아요')
  })
})
