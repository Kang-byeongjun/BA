// 타입만 가져온다(import type은 빌드 때 지워져서 운동 DB가 브라우저 코드에 들어가지 않는다)
import type { MuscleGroup } from '../../server/engine/types'
import { loadFromStorage, saveToStorage } from './storage'
import { volumeOf, type ExerciseLog, type LoggerDay } from './workoutLog'

/**
 * workoutHistory — 끝낸 운동의 세트 상세(kg·회)를 우리 전용 localStorage 키에 쌓는다.
 * 팀원 앱의 운동 기록(Workout 타입: 종류·시간만)에는 세트 상세를 담기 어려워서 따로 둔다.
 * 최근 MAX_HISTORY회까지만 보관한다(오래된 것부터 지움).
 */

// storage.ts의 STORAGE_KEYS와 같은 방식(접두사는 loadFromStorage/saveToStorage가 붙임).
export const WORKOUT_HISTORY_STORAGE_KEY = 'workoutHistory'
export const MAX_HISTORY = 20

export interface RecordedSet {
  kg: number
  reps: number
}

export interface RecordedExercise {
  /** 엔진 종목 id. "지난 기록"을 찾을 때 쓴다 */
  exerciseId: string
  name: string
  /** 근육 부위(추천 결과 RoutineExercise.group에서 가져옴). 예전 기록에는 없을 수 있다 → 요약에서 "기타" */
  group?: MuscleGroup
  sets: RecordedSet[]
  volume: number
}

export interface WorkoutSessionRecord {
  id: string
  /** 운동을 마친 시각(ms) */
  date: number
  startedAt: number
  day: number
  label: string
  /** 완료한 세트가 하나라도 있는 종목만 */
  exercises: RecordedExercise[]
  totalVolume: number
  durationSeconds: number
  completedSets: number
}

const num = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function countCompletedSets(logs: ExerciseLog[]): number {
  return logs.reduce((n, l) => n + l.sets.filter((s) => s.done).length, 0)
}

/** 기록 화면의 내용으로 저장할 기록을 만든다. 완료하지 않은 세트는 빠진다. */
export function buildSessionRecord(input: {
  id: string
  day: LoggerDay
  startedAt: number
  logs: ExerciseLog[]
  now: number
}): WorkoutSessionRecord {
  const groupOf = new Map(input.day.exercises.map((e) => [e.id, e.group]))
  const exercises: RecordedExercise[] = input.logs
    .map((l) => ({
      exerciseId: l.exerciseId,
      name: l.name,
      group: groupOf.get(l.exerciseId),
      sets: l.sets.filter((s) => s.done).map((s) => ({ kg: num(s.kg), reps: num(s.reps) })),
      volume: volumeOf(l.sets),
    }))
    .filter((e) => e.sets.length > 0)
  return {
    id: input.id,
    date: input.now,
    startedAt: input.startedAt,
    day: input.day.day,
    label: input.day.label,
    exercises,
    totalVolume: Math.round(exercises.reduce((s, e) => s + e.volume, 0) * 10) / 10,
    durationSeconds: Math.max(0, Math.floor((input.now - input.startedAt) / 1000)),
    completedSets: exercises.reduce((n, e) => n + e.sets.length, 0),
  }
}

/** 최근 기록이 앞에 오는 목록. 망가진 저장값은 빈 목록으로 본다 */
export function loadWorkoutHistory(): WorkoutSessionRecord[] {
  const v = loadFromStorage<unknown>(WORKOUT_HISTORY_STORAGE_KEY, [])
  if (!Array.isArray(v)) return []
  return v.filter(
    (r): r is WorkoutSessionRecord =>
      !!r && typeof r === 'object' && typeof (r as WorkoutSessionRecord).date === 'number' && Array.isArray((r as WorkoutSessionRecord).exercises),
  )
}

/** 맨 앞에 추가하고 최근 MAX_HISTORY회만 남긴다. 같은 id가 이미 있으면 다시 넣지 않는다(중복 저장 방지) */
export function appendWorkoutHistory(record: WorkoutSessionRecord): WorkoutSessionRecord[] {
  const list = loadWorkoutHistory()
  if (list.some((r) => r.id === record.id)) return list
  const next = [record, ...list].slice(0, MAX_HISTORY)
  saveToStorage(WORKOUT_HISTORY_STORAGE_KEY, next)
  return next
}

export interface LastRecord {
  date: number
  day: number
  label: string
  exercise: RecordedExercise
}

/** 같은 종목의 가장 최근 기록(날짜와 세트 목록). 없으면 null */
export function lastRecordOf(history: WorkoutSessionRecord[], exerciseId: string): LastRecord | null {
  for (const r of history) {
    const exercise = r.exercises.find((e) => e.exerciseId === exerciseId)
    if (exercise) return { date: r.date, day: r.day, label: r.label, exercise }
  }
  return null
}
