import { loadFromStorage, removeFromStorage, saveToStorage } from '../../lib/storage'
import { buildLogs, INITIAL_REST, type ExerciseLog, type LoggerDay, type RestState } from '../../lib/workoutLog'

/**
 * 기록 중인 운동(세트 값·완료 여부·메모·시작 시각·휴식 타이머)을 localStorage에 저장한다.
 * 새로고침해도 기록 화면과 내용이 그대로 돌아온다. "중단하기"를 누르면 지운다.
 * 키는 storage.ts의 STORAGE_KEYS와 같은 방식(접두사는 loadFromStorage/saveToStorage가 붙임).
 * storage.ts는 수정하지 않기로 해서 여기 따로 둔다.
 */

export const WORKOUT_LOG_STORAGE_KEY = 'workoutLog'

// 저장 형식이 바뀌면 숫자를 올려 예전 저장값을 무시한다.
const LOG_VERSION = 1

export interface SavedWorkoutLog {
  version: typeof LOG_VERSION
  day: LoggerDay
  /** 기록 화면에 들어온 시각(Date.now 기준 ms). 전체 운동 시간은 여기서부터 흐른다 */
  startedAt: number
  logs: ExerciseLog[]
  rest: RestState
}

export function createWorkoutLog(day: LoggerDay, now: number): SavedWorkoutLog {
  return { version: LOG_VERSION, day, startedAt: now, logs: buildLogs(day.exercises), rest: INITIAL_REST }
}

// 저장값이 망가졌거나 예전 형식이면 복원하지 않는다(화면이 깨지는 것보다 처음부터가 낫다).
function isValid(v: unknown): v is SavedWorkoutLog {
  if (!v || typeof v !== 'object') return false
  const s = v as Partial<SavedWorkoutLog>
  return (
    s.version === LOG_VERSION &&
    typeof s.startedAt === 'number' &&
    !!s.day &&
    Array.isArray(s.day.exercises) &&
    Array.isArray(s.logs) &&
    s.logs.every((l) => l && Array.isArray(l.sets)) &&
    !!s.rest &&
    typeof s.rest.enabled === 'boolean'
  )
}

export function loadWorkoutLog(): SavedWorkoutLog | null {
  const v = loadFromStorage<unknown>(WORKOUT_LOG_STORAGE_KEY, null)
  return isValid(v) ? v : null
}

export function hasSavedWorkoutLog(): boolean {
  return loadWorkoutLog() !== null
}

export function saveWorkoutLog(log: SavedWorkoutLog): void {
  saveToStorage(WORKOUT_LOG_STORAGE_KEY, log)
}

export function clearWorkoutLog(): void {
  removeFromStorage(WORKOUT_LOG_STORAGE_KEY)
}
