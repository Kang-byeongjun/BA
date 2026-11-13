// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoutineExercise } from '../../../server/engine/types'
import App from '../../App'
import { appendWorkoutHistory, loadWorkoutHistory, type WorkoutSessionRecord } from '../../lib/workoutHistory'
import type { LoggerDay } from '../../lib/workoutLog'
import WorkoutLogger from '../workout/WorkoutLogger'
import { createWorkoutLog, loadWorkoutLog, saveWorkoutLog } from '../workout/workoutLogStorage'

// 3단계: 운동 완료 → 저장(우리 기록 + 팀원 "최근 운동 기록") → 요약 화면, 그리고 "지난 기록" 시트.
vi.mock('../../lib/restAlarm', () => ({ playRestAlarm: vi.fn(), unlockRestAlarm: vi.fn() }))

const rx = { setsMin: 2, setsMax: 2, repsMin: 8, repsMax: 10, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 }
const ex = (o: Pick<RoutineExercise, 'order' | 'id' | 'name'>): RoutineExercise => ({
  group: 'CHEST',
  reason: '',
  caution: null,
  prescription: rx,
  ...o,
})
const day: LoggerDay = {
  day: 1,
  label: '상체',
  exercises: [ex({ order: 1, id: 'bench', name: '벤치프레스' }), ex({ order: 2, id: 'row', name: '바벨로우' })],
}

const T0 = new Date('2026-11-13T10:00:00').getTime()
const text = (el: Element | null | undefined) => el?.textContent ?? ''
const card = (name: string) => screen.getByRole('region', { name })
const kg = (name: string, n: number) => within(card(name)).getByLabelText(`${n}세트 kg`)
const done = (name: string, n: number) => within(card(name)).getByRole('checkbox', { name: `${n}세트 완료` })
const dialog = () => screen.getByRole('dialog')
const clickIn = (el: HTMLElement, name: string | RegExp) => fireEvent.click(within(el).getByRole('button', { name }))

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(T0)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('WorkoutLogger — 운동 완료', () => {
  it('완료한 세트가 없으면 "완료한 세트가 없어요"만 안내하고 저장하지 않는다', () => {
    const onFinish = vi.fn()
    render(<WorkoutLogger initial={createWorkoutLog(day, T0)} onExit={() => {}} onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: '운동 완료' }))
    expect(text(dialog())).toContain('완료한 세트가 없어요')
    clickIn(dialog(), '확인')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('확인 모달에서 "계속하기"를 누르면 저장하지 않는다', () => {
    const onFinish = vi.fn()
    render(<WorkoutLogger initial={createWorkoutLog(day, T0)} onExit={() => {}} onFinish={onFinish} />)
    fireEvent.click(done('벤치프레스', 1))
    fireEvent.click(screen.getByRole('button', { name: '운동 완료' }))
    const d = screen.getByRole('dialog', { name: '운동을 마칠까요?' })
    expect(text(d)).toContain('완료하지 않은 세트는 기록되지 않아요')
    clickIn(d, '계속하기')
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('확인하면 완료한 세트만 담은 기록을 넘긴다(운동 시간 = 기록 화면의 운동 시간)', () => {
    const onFinish = vi.fn<(r: WorkoutSessionRecord) => void>()
    render(<WorkoutLogger initial={createWorkoutLog(day, T0)} onExit={() => {}} onFinish={onFinish} />)
    fireEvent.change(kg('벤치프레스', 1), { target: { value: '60' } }) // 2세트도 60
    fireEvent.click(done('벤치프레스', 1))
    act(() => void vi.advanceTimersByTime(125_000))
    expect(text(screen.getByLabelText('전체 운동 시간'))).toBe('00:02:05')

    fireEvent.click(screen.getByRole('button', { name: '운동 완료' }))
    clickIn(dialog(), '완료하기')
    const r = onFinish.mock.calls[0]![0]
    expect(r.durationSeconds).toBe(125)
    expect(r.completedSets).toBe(1)
    expect(r.totalVolume).toBe(600)
    expect(r.exercises).toEqual([{ exerciseId: 'bench', name: '벤치프레스', group: 'CHEST', sets: [{ kg: 60, reps: 10 }], volume: 600 }])
  })
})

describe('WorkoutLogger — 지난 기록', () => {
  it('기록이 없으면 "아직 기록이 없어요"', () => {
    render(<WorkoutLogger initial={createWorkoutLog(day, T0)} onExit={() => {}} onFinish={() => {}} />)
    clickIn(card('벤치프레스'), /지난 기록/)
    const sheet = screen.getByRole('dialog', { name: '벤치프레스 지난 기록' })
    expect(text(sheet)).toContain('아직 기록이 없어요')
    clickIn(sheet, '닫기')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('같은 종목의 가장 최근 기록을 날짜와 세트별 kg×회로 보여준다', () => {
    const rec = (id: string, date: number, sets: { kg: number; reps: number }[]): WorkoutSessionRecord => ({
      id,
      date,
      startedAt: date - 1000,
      day: 2,
      label: '등',
      exercises: [{ exerciseId: 'bench', name: '벤치프레스', sets, volume: 0 }],
      totalVolume: 0,
      durationSeconds: 1,
      completedSets: sets.length,
    })
    appendWorkoutHistory(rec('a', new Date('2026-11-05T10:00:00').getTime(), [{ kg: 50, reps: 10 }]))
    appendWorkoutHistory(
      rec('b', new Date('2026-11-12T10:00:00').getTime(), [
        { kg: 60, reps: 10 },
        { kg: 62.5, reps: 8 },
      ]),
    )

    render(<WorkoutLogger initial={createWorkoutLog(day, T0)} onExit={() => {}} onFinish={() => {}} />)
    clickIn(card('벤치프레스'), /지난 기록/)
    const sheet = screen.getByRole('dialog', { name: '벤치프레스 지난 기록' })
    expect(text(sheet)).toContain('11월 12일 (어제)')
    const items = within(sheet).getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toEqual(['1세트60kg × 10회', '2세트62.5kg × 8회'])

    // 다른 종목은 기록 없음
    clickIn(sheet, '닫기')
    clickIn(card('바벨로우'), /지난 기록/)
    expect(text(dialog())).toContain('아직 기록이 없어요')
  })
})

describe('App — 운동 완료 흐름', () => {
  beforeEach(() => {
    localStorage.setItem('ai-diet-app:onboarded', 'true')
    localStorage.setItem('ai-diet-app:aiMode', '"mock"')
    saveWorkoutLog(createWorkoutLog(day, T0)) // 기록 화면에서 시작
  })

  function finishWithTwoSets() {
    render(<App />)
    fireEvent.change(kg('벤치프레스', 1), { target: { value: '60' } })
    fireEvent.click(done('벤치프레스', 1))
    fireEvent.click(done('벤치프레스', 2))
    fireEvent.change(kg('바벨로우', 1), { target: { value: '40' } })
    fireEvent.click(done('바벨로우', 1))
    act(() => void vi.advanceTimersByTime(30 * 60_000))
    fireEvent.click(screen.getByRole('button', { name: '운동 완료' }))
    clickIn(dialog(), '완료하기')
  }

  it('저장 후 요약 화면(총 볼륨·운동 시간·완료 세트·종목별 볼륨)을 보여준다', () => {
    finishWithTwoSets()
    expect(screen.getByRole('heading', { name: '운동 완료!' })).toBeTruthy()
    expect(text(screen.getByLabelText('총 볼륨'))).toBe('1,600kg')
    expect(text(screen.getByLabelText('운동 시간'))).toBe('00:30:00')
    expect(text(screen.getByLabelText('완료한 세트'))).toBe('3세트')
    const items = within(screen.getByRole('region', { name: '종목별 볼륨' })).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['벤치프레스 · 2세트1,200kg', '바벨로우 · 1세트400kg'])
    // 요약 화면에서도 하단 메뉴는 숨김
    expect(screen.queryByRole('button', { name: '음식 촬영' })).toBeNull()

    // 세트 상세는 우리 전용 기록에
    const history = loadWorkoutHistory()
    expect(history).toHaveLength(1)
    expect(history[0]!.durationSeconds).toBe(1800)
    expect(history[0]!.exercises[0]!.sets).toEqual([
      { kg: 60, reps: 10 },
      { kg: 60, reps: 10 },
    ])
  })

  it('팀원 "최근 운동 기록"에 헬스·운동 시간으로 남고, "확인"을 누르면 추천 루틴으로 돌아가며 진행 중 기록을 지운다', () => {
    finishWithTwoSets()
    const teamWorkouts = JSON.parse(localStorage.getItem('ai-diet-app:workouts')!)
    expect(teamWorkouts).toHaveLength(1)
    expect(teamWorkouts[0]).toMatchObject({ type: '헬스', startTime: T0, endTime: T0 + 1_800_000, duration: 1800 })

    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(screen.getByRole('region', { name: '추천 루틴' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '음식 촬영' })).toBeTruthy()
    expect(loadWorkoutLog()).toBeNull()

    const list = screen.getByText('최근 운동 기록').parentElement!
    expect(text(list)).toContain('헬스')
    expect(text(list)).toContain('30분')
  })

  it('요약 화면에서 새로고침해도 요약이 다시 보이고, 같은 운동이 두 번 저장되지 않는다', () => {
    finishWithTwoSets()
    cleanup() // 새로고침
    render(<App />)
    expect(screen.getByRole('heading', { name: '운동 완료!' })).toBeTruthy()
    expect(loadWorkoutHistory()).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('ai-diet-app:workouts')!)).toHaveLength(1)
  })

  it('방금 저장한 기록이 다음 운동의 "지난 기록"에 나온다', () => {
    finishWithTwoSets()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    cleanup()
    saveWorkoutLog(createWorkoutLog(day, Date.now()))
    render(<App />)
    clickIn(card('바벨로우'), /지난 기록/)
    expect(text(dialog())).toContain('40kg × 10회')
  })
})
