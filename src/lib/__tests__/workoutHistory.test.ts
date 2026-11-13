// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  appendWorkoutHistory,
  buildSessionRecord,
  countCompletedSets,
  lastRecordOf,
  loadWorkoutHistory,
  MAX_HISTORY,
  WORKOUT_HISTORY_STORAGE_KEY,
  type WorkoutSessionRecord,
} from '../workoutHistory'
import { newSet, type ExerciseLog } from '../workoutLog'

const T0 = new Date('2026-11-13T10:00:00').getTime()

const log = (exerciseId: string, name: string, sets: [string, string, boolean][]): ExerciseLog => ({
  key: `1-${exerciseId}`,
  exerciseId,
  name,
  defaultReps: 10,
  restSeconds: 60,
  memo: '',
  sets: sets.map(([kg, reps, done], i) => ({ ...newSet(i + 1, kg, reps), done })),
})

const record = (id: string, exercises: WorkoutSessionRecord['exercises'], date = T0): WorkoutSessionRecord => ({
  id,
  date,
  startedAt: date - 60_000,
  day: 1,
  label: '상체',
  exercises,
  totalVolume: 0,
  durationSeconds: 60,
  completedSets: 0,
})

beforeEach(() => localStorage.clear())

describe('buildSessionRecord', () => {
  it('완료한 세트만 담고, 종목·전체 볼륨·세트 수·운동 시간을 계산한다', () => {
    const logs = [
      log('bench', '벤치프레스', [
        ['60', '10', true],
        ['60', '8', true],
        ['60', '12', false],
      ]),
      log('row', '바벨로우', [['40', '12', false]]), // 완료 0 → 빠짐
      log('pushup', '푸시업', [['', '15', true]]), // kg 빈칸(맨몸) → 0kg로 저장
    ]
    expect(countCompletedSets(logs)).toBe(3)
    const r = buildSessionRecord({ id: 's1', day: { day: 2, label: '하체', exercises: [] }, startedAt: T0, logs, now: T0 + 2_725_400 })
    expect(r).toMatchObject({ id: 's1', date: T0 + 2_725_400, startedAt: T0, day: 2, label: '하체', durationSeconds: 2725 })
    expect(r.exercises.map((e) => e.exerciseId)).toEqual(['bench', 'pushup'])
    expect(r.exercises[0]).toEqual({
      exerciseId: 'bench',
      name: '벤치프레스',
      sets: [
        { kg: 60, reps: 10 },
        { kg: 60, reps: 8 },
      ],
      volume: 1080,
    })
    expect(r.exercises[1]!.sets).toEqual([{ kg: 0, reps: 15 }])
    expect(r.totalVolume).toBe(1080)
    expect(r.completedSets).toBe(3)
  })
})

describe('기록 보관', () => {
  it('최근 기록이 앞에 오고, 최근 20회까지만 보관한다', () => {
    for (let i = 1; i <= MAX_HISTORY + 5; i++) appendWorkoutHistory(record(`s${i}`, [], T0 + i))
    const list = loadWorkoutHistory()
    expect(list).toHaveLength(20)
    expect(list[0]!.id).toBe('s25')
    expect(list[19]!.id).toBe('s6')
  })

  it('같은 기록을 두 번 저장하지 않는다', () => {
    appendWorkoutHistory(record('s1', []))
    appendWorkoutHistory(record('s1', []))
    expect(loadWorkoutHistory()).toHaveLength(1)
  })

  it('망가진 저장값은 빈 목록으로 본다', () => {
    localStorage.setItem(`ai-diet-app:${WORKOUT_HISTORY_STORAGE_KEY}`, '{"a":1}')
    expect(loadWorkoutHistory()).toEqual([])
    localStorage.setItem(`ai-diet-app:${WORKOUT_HISTORY_STORAGE_KEY}`, 'not json')
    expect(loadWorkoutHistory()).toEqual([])
  })
})

describe('lastRecordOf', () => {
  it('같은 종목이 들어 있는 가장 최근 기록을 찾는다', () => {
    const bench = (kg: number) => ({ exerciseId: 'bench', name: '벤치프레스', sets: [{ kg, reps: 10 }], volume: kg * 10 })
    const squat = { exerciseId: 'squat', name: '스쿼트', sets: [{ kg: 80, reps: 5 }], volume: 400 }
    appendWorkoutHistory(record('old', [bench(50)], T0))
    appendWorkoutHistory(record('mid', [bench(55)], T0 + 1))
    appendWorkoutHistory(record('new', [squat], T0 + 2)) // 가장 최근이지만 벤치 없음
    const history = loadWorkoutHistory()

    const last = lastRecordOf(history, 'bench')!
    expect(last.date).toBe(T0 + 1)
    expect(last.exercise.sets).toEqual([{ kg: 55, reps: 10 }])
    expect(lastRecordOf(history, 'deadlift')).toBeNull()
  })
})
