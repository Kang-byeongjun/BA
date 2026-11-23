// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NUTRITION_TARGET, DEMO_PROFILE, DEMO_WORKOUT_PROFILE } from '../../data/mockData'
import { AppProvider } from '../../context/AppContext'
import { isDevMode } from '../../lib/devMode'
import type { InBodyHistoryEntry } from '../../types'
import Profile from '../profile/Profile'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

const put = (key: string, value: unknown) => localStorage.setItem(`ai-diet-app:${key}`, JSON.stringify(value))

const entry = (o: Partial<InBodyHistoryEntry>): InBodyHistoryEntry => ({
  id: 'h1',
  timestamp: new Date(2026, 5, 10).getTime(),
  source: 'scan',
  weight: 70,
  skeletalMuscleMass: 30,
  bodyFatMass: 15,
  bodyFatPercentage: 20,
  bodyWater: 40,
  proteinMass: 10,
  mineralMass: 3,
  basalMetabolicRate: 1500,
  bodyType: 'C',
  standardRanges: null,
  ...o,
})

beforeEach(() => {
  localStorage.clear()
  put('onboarded', true)
  put('profile', DEMO_PROFILE)
  put('nutritionTarget', DEMO_NUTRITION_TARGET)
  put('workoutProfile', DEMO_WORKOUT_PROFILE)
})

const open = () => render(<AppProvider><Profile /></AppProvider>)

describe('마이 탭 구성', () => {
  it('안내 한 줄, 기본 정보·운동 프로필·인바디·영양 목표 카드를 보여주고 12개 지표 목록은 없다', () => {
    put('inBodyHistory', [entry({})])
    open()
    expect(screen.getByText('내 정보를 바꾸면 영양 목표와 운동 추천이 함께 바뀌어요.')).toBeTruthy()
    for (const t of ['기본 정보', '운동 프로필', '인바디', '하루 영양 목표']) expect(screen.getByText(t)).toBeTruthy()
    expect(screen.getByText('인바디 기준')).toBeTruthy()
    expect(screen.getByText('골격근량·체지방량 등 자세한 수치는 리포트의 인바디 추이에서 볼 수 있어요.')).toBeTruthy()
    expect(screen.queryByText('체수분')).toBeNull()
    expect(screen.queryByText('무기질량')).toBeNull()
  })

  it('인바디 기록이 없으면 "아직 측정 기록이 없어요"를 보여주고, 있으면 최근 측정일과 C형 배지를 보여준다', () => {
    open()
    expect(screen.getByText('아직 측정 기록이 없어요')).toBeTruthy()
    cleanup()
    put('inBodyHistory', [entry({})])
    open()
    expect(screen.queryByText('아직 측정 기록이 없어요')).toBeNull()
    expect(screen.getByText('2026년 6월 10일')).toBeTruthy()
    expect(screen.getByText('C형')).toBeTruthy()
    expect(screen.getByRole('button', { name: /결과지 사진으로 업데이트/ })).toBeTruthy()
  })

  it('영양 목표 입력칸은 처음엔 숨겨져 있고 "수정"을 눌러야 열리며, 저장하면 다시 닫힌다', () => {
    open()
    expect(screen.queryByLabelText('칼로리')).toBeNull()
    const card = screen.getByText('하루 영양 목표').closest('div')!.parentElement!
    fireEvent.click(within(card).getByRole('button', { name: '수정' }))
    const kcal = screen.getByLabelText('칼로리') as HTMLInputElement
    fireEvent.change(kcal, { target: { value: '2222' } })
    fireEvent.click(screen.getByRole('button', { name: '목표 저장하기' }))
    expect(screen.queryByLabelText('칼로리')).toBeNull()
    expect(screen.getByText('2222')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('ai-diet-app:nutritionTarget')!).calories).toBe(2222)
  })

  it('"InBody 기준 다시 계산"과 근거 보기는 그대로 있다', () => {
    open()
    expect(screen.getByRole('button', { name: 'InBody 기준 다시 계산' })).toBeTruthy()
    expect(screen.getByText(/이 숫자는 어떻게 나왔나요/)).toBeTruthy()
  })
})

describe('?dev=1 — 앱 설정·관리 도구', () => {
  it('isDevMode는 dev=1일 때만 true', () => {
    expect(isDevMode('?dev=1')).toBe(true)
    expect(isDevMode('?a=2&dev=1')).toBe(true)
    expect(isDevMode('')).toBe(false)
    expect(isDevMode('?dev=0')).toBe(false)
    expect(isDevMode('?dev=true')).toBe(false)
  })

  it('평소에는 관리 도구·데이터 초기화·AI 분석 방식이 보이지 않는다', () => {
    put('isDemo', true)
    open()
    expect(screen.queryByText('관리 도구')).toBeNull()
    expect(screen.queryByText('데모 모드 AI 분석 방식')).toBeNull()
    expect(screen.queryByText('전체 데이터 초기화')).toBeNull()
  })

  it('?dev=1이면 맨 아래에 보이고 기존처럼 동작한다', () => {
    window.history.replaceState(null, '', '/?dev=1')
    put('isDemo', true)
    open()
    expect(screen.getByText('데모 모드 AI 분석 방식')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /관리 도구/ }))
    fireEvent.click(screen.getByRole('button', { name: '전체 데이터 초기화' }))
    expect(screen.getByRole('button', { name: '초기화하기' })).toBeTruthy()
  })
})

describe('나의 목표 — 식단 목적과 운동 목표를 함께 바꾼다', () => {
  const stored = (key: string) => JSON.parse(localStorage.getItem(`ai-diet-app:${key}`)!)

  it.each([
    ['체지방 감량', 'fat_loss', 'fat_loss'],
    ['근육 증가', 'muscle_gain', 'muscle_gain'],
    ['체중 유지', 'weight_maintain', 'body_shape'],
    ['건강 관리', 'health_care', 'strength'],
  ])('"%s" 버튼 → 식단 목적 %s, 운동 목표 %s', (label, dietGoal, workoutGoal) => {
    // 시작은 대응표와 다른 값으로 둔다
    put('profile', { ...DEMO_PROFILE, goal: dietGoal === 'fat_loss' ? 'muscle_gain' : 'fat_loss' })
    put('workoutProfile', { ...DEMO_WORKOUT_PROFILE, goal: workoutGoal === 'strength' ? 'body_shape' : 'strength' })
    open()
    expect(screen.getByText('나의 목표')).toBeTruthy()
    expect(screen.queryByText('관리 목적')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(stored('profile').goal).toBe(dietGoal)
    expect(stored('workoutProfile').goal).toBe(workoutGoal)
  })

  it('두 값이 달라도 선택됨 표시는 식단 목적(기존 관리 목적) 기준이다', () => {
    put('profile', { ...DEMO_PROFILE, goal: 'muscle_gain' })
    put('workoutProfile', { ...DEMO_WORKOUT_PROFILE, goal: 'fat_loss' })
    open()
    const selected = (name: string) => screen.getByRole('button', { name }).className.includes('bg-primary')
    expect(selected('근육 증가')).toBe(true)
    expect(selected('체지방 감량')).toBe(false)
  })

  it('운동 프로필이 없으면 식단 목적만 바뀐다', () => {
    localStorage.removeItem('ai-diet-app:workoutProfile')
    open()
    fireEvent.click(screen.getByRole('button', { name: '체중 유지' }))
    expect(stored('profile').goal).toBe('weight_maintain')
    expect(stored('workoutProfile')).toBeNull()
  })

  it('저장된 루틴이 새 운동 목표와 안 맞게 되면 초기화 안내를 보여주고, 그대로 쓸 수 있으면 안 보여준다', () => {
    const routine = { v: 1, savedAt: 'x', result: { source: 'llm', days: [], summary: 's' } }
    const seed = (wp: typeof DEMO_WORKOUT_PROFILE) => {
      put('workoutProfile', wp)
      // 현재 프로필의 요청 키로 저장해 "이 프로필의 저장된 루틴"을 만든다
      return import('../../services/workoutService').then(({ saveEditedWorkoutRoutine }) =>
        saveEditedWorkoutRoutine(wp, routine.result as never),
      )
    }
    return seed({ ...DEMO_WORKOUT_PROFILE, goal: 'fat_loss' }).then(() => {
      put('profile', { ...DEMO_PROFILE, goal: 'muscle_gain' })
      open()
      fireEvent.click(screen.getByRole('button', { name: '체중 유지' })) // → body_shape: 요청이 달라진다
      expect(screen.getByText(/저장돼 있던 루틴.*초기화돼요/)).toBeTruthy()
      cleanup()
      localStorage.clear()
      put('onboarded', true)
      put('nutritionTarget', DEMO_NUTRITION_TARGET)
      put('profile', { ...DEMO_PROFILE, goal: 'fat_loss' })
      return seed({ ...DEMO_WORKOUT_PROFILE, goal: 'muscle_gain' })
    }).then(() => {
      open()
      fireEvent.click(screen.getByRole('button', { name: '건강 관리' })) // → strength: 엔진 값은 같은 MUSCLE
      expect(screen.queryByText(/초기화돼요/)).toBeNull()
      expect(screen.getByText(/나의 목표가 바뀌어/)).toBeTruthy()
    })
  })
})
