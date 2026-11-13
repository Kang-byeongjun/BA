import type { RoutineExercise } from '../../server/engine/types'

/**
 * workoutLog — 운동 기록 화면(WorkoutLogger)의 계산 규칙만 모은 파일.
 * 화면(React)과 저장(localStorage)에 의존하지 않는 순수 함수라 테스트하기 쉽다.
 */

export interface LoggerDay {
  day: number
  label: string
  exercises: RoutineExercise[]
}

export interface SetRow {
  id: number
  /** 입력 중인 글자 그대로 보관(빈칸·"22." 같은 중간 상태 허용) */
  kg: string
  /** kg가 자동으로 채워진 경우, 값을 준 세트의 id. 사용자가 직접 입력했으면 null */
  kgFrom: number | null
  reps: string
  done: boolean
}

export interface ExerciseLog {
  key: string
  name: string
  defaultReps: number
  /** 세트 완료 시 시작할 휴식 시간(초). 화면의 "휴식 60~90초" 중 앞 숫자 */
  restSeconds: number
  memo: string
  sets: SetRow[]
}

export interface RestState {
  /** 휴식 타이머 ON/OFF */
  enabled: boolean
  /** 휴식이 끝나는 시각(Date.now 기준 ms). 쉬는 중이 아니면 null */
  endsAt: number | null
  /** 마지막 휴식이 끝난 시각. "휴식 끝!" 표시용 */
  endedAt: number | null
}

export const INITIAL_REST: RestState = { enabled: true, endsAt: null, endedAt: null }

/** "휴식 끝!"을 보여주는 시간 */
export const REST_DONE_SHOW_MS = 5_000

export function newSet(id: number, kg: string, reps: string): SetRow {
  return { id, kg, kgFrom: null, reps, done: false }
}

/** 지금 쓰인 세트 id 중 가장 큰 값 + 1 (새로고침 후 복원했을 때 id가 겹치지 않게) */
export function nextSetIdOf(logs: ExerciseLog[]): number {
  return logs.reduce((max, l) => l.sets.reduce((m, s) => Math.max(m, s.id), max), 0) + 1
}

/** 근력 종목(처방이 있는 것)만 기록 대상으로 만든다. 세트 수=최대 세트, 횟수=최대 횟수, kg는 빈칸. */
export function buildLogs(exercises: RoutineExercise[]): ExerciseLog[] {
  let id = 1
  return exercises
    .filter((e) => e.prescription)
    .map((e) => {
      const rx = e.prescription!
      return {
        key: `${e.order}-${e.id}`,
        name: e.name,
        defaultReps: rx.repsMax,
        restSeconds: rx.restMin,
        memo: '',
        sets: Array.from({ length: rx.setsMax }, () => newSet(id++, '', String(rx.repsMax))),
      }
    })
}

const toNum = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** 완료 체크된 세트의 kg × 회 합계 (소수점 한 자리까지) */
export function volumeOf(sets: SetRow[]): number {
  const v = sets.reduce((sum, s) => (s.done ? sum + toNum(s.kg) * toNum(s.reps) : sum), 0)
  return Math.round(v * 10) / 10
}

export function totalVolumeOf(logs: ExerciseLog[]): number {
  return Math.round(logs.reduce((sum, l) => sum + volumeOf(l.sets), 0) * 10) / 10
}

/**
 * 세트 kg를 바꾸고, 그 아래 세트 중 kg가 비어 있는 세트에 같은 값을 채운다.
 * - 사용자가 직접 넣은 값이 있는 세트는 건드리지 않는다.
 * - 이 세트가 자동으로 채워 준 세트는 계속 따라 바뀐다("6" → "60"처럼 한 글자씩 입력해도 맞게).
 *   이 세트를 지우면 자동으로 채워졌던 값도 같이 지워진다.
 */
export function setKg(sets: SetRow[], id: number, kg: string): SetRow[] {
  const i = sets.findIndex((s) => s.id === id)
  if (i === -1) return sets
  return sets.map((s, j) => {
    if (j === i) return { ...s, kg, kgFrom: null }
    if (j < i) return s
    const followsThis = s.kgFrom === id
    if (s.kg === '' || followsThis) return kg === '' ? { ...s, kg: '', kgFrom: null } : { ...s, kg, kgFrom: id }
    return s
  })
}

// ---------- 휴식 타이머 (모두 Date.now() 기준 시각으로 계산 → 다른 탭에 갔다 와도 정확) ----------

/** 남은 휴식 시간(초, 올림). 쉬는 중이 아니면 0 */
export function restRemaining(rest: RestState, now: number): number {
  if (rest.endsAt === null) return 0
  return Math.max(0, Math.ceil((rest.endsAt - now) / 1000))
}

export function startRest(rest: RestState, seconds: number, now: number): RestState {
  if (!rest.enabled || seconds <= 0) return rest
  return { ...rest, endsAt: now + seconds * 1000, endedAt: null }
}

/** −10초 / +10초. 0초 아래로는 내려가지 않는다(0이 되면 휴식 끝으로 처리됨) */
export function adjustRest(rest: RestState, deltaSeconds: number, now: number): RestState {
  if (rest.endsAt === null) return rest
  return { ...rest, endsAt: Math.max(now, rest.endsAt + deltaSeconds * 1000) }
}

/** 건너뛰기: 알림 없이 바로 끝낸다 */
export function skipRest(rest: RestState): RestState {
  return { ...rest, endsAt: null, endedAt: null }
}

/** ON/OFF 전환. OFF로 바꾸면 돌던 타이머도 멈춘다 */
export function toggleRest(rest: RestState): RestState {
  return rest.enabled ? { enabled: false, endsAt: null, endedAt: null } : { ...rest, enabled: true }
}

/** 시간이 다 됐으면 '끝남' 상태로 바꾼다. 바뀌었는지(=알림을 낼지)도 함께 돌려준다 */
export function settleRest(rest: RestState, now: number): { rest: RestState; finished: boolean } {
  if (rest.endsAt === null || now < rest.endsAt) return { rest, finished: false }
  return { rest: { ...rest, endsAt: null, endedAt: rest.endsAt }, finished: true }
}

export function isRestDoneShowing(rest: RestState, now: number): boolean {
  return rest.endsAt === null && rest.endedAt !== null && now - rest.endedAt < REST_DONE_SHOW_MS
}

/** 0:45, 1:30 같은 짧은 형식 */
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
