// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutResult } from '../../../server/engine/types'
import App from '../../App'
import { DEFAULT_WORKOUT_PROFILE } from '../../types'
import { createWorkoutLog, loadWorkoutLog, saveWorkoutLog } from '../workout/workoutLogStorage'

// 앱 전체(App.tsx)에서 기록 화면 ↔ 하단 메뉴, 새로고침 복원을 확인한다. 실제 AI는 부르지 않는다.

const rx = { setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 }
const result: WorkoutResult = {
  resolvedGoal: 'MUSCLE',
  goalReason: null,
  source: 'llm',
  attempts: 1,
  attemptErrors: [],
  summary: '요약',
  warnings: [],
  prescriptionNote: '',
  days: [
    {
      day: 1,
      label: '상체',
      exercises: [{ order: 1, id: 'bench', name: '벤치프레스', group: 'CHEST', reason: '이유', caution: null, prescription: rx }],
    },
  ],
}

const nav = () => screen.queryByRole('navigation') // 하단 메뉴(<nav>)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:aiMode', '"mock"')
  localStorage.setItem('ai-diet-app:workoutProfile', JSON.stringify(DEFAULT_WORKOUT_PROFILE))
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ ok: true, data: result }), { headers: { 'Content-Type': 'application/json' } })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App — 운동 기록 화면', () => {
  it('기록 화면에서는 하단 메뉴를 숨기고, 중단하면 다시 보여준다', async () => {
    render(<App />)
    expect(nav()).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '운동' }))
    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    fireEvent.click(await screen.findByRole('button', { name: '이 루틴으로 운동 시작' }))

    expect(screen.getByRole('heading', { name: '1일차 · 상체' })).toBeTruthy()
    expect(nav()).toBeNull()
    expect(screen.getByRole('button', { name: '운동 완료' })).toBeTruthy()
    expect(loadWorkoutLog()).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '중단하기' }))
    expect(nav()).toBeTruthy()
    expect(screen.getByRole('region', { name: '추천 루틴' })).toBeTruthy()
    // 중단하면 저장된 기록을 지운다
    expect(loadWorkoutLog()).toBeNull()
  })

  it('새로고침하면 저장된 기록 화면으로 바로 돌아온다(하단 메뉴 없음)', () => {
    const log = createWorkoutLog({ day: result.days[0]!.day, label: '상체', exercises: result.days[0]!.exercises }, Date.now())
    log.logs[0]!.sets[0]!.kg = '70'
    saveWorkoutLog(log)

    render(<App />)
    expect(screen.getByRole('heading', { name: '1일차 · 상체' })).toBeTruthy()
    expect((screen.getByLabelText('1세트 kg') as HTMLInputElement).value).toBe('70')
    expect(nav()).toBeNull()
  })
})
