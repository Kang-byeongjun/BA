import type { RoutineExercise } from '../../server/engine/types'

/**
 * 루틴 하루치의 예상 운동 시간(분)을 대충 어림하는 순수 함수.
 * 종목마다 (세트 수 × (세트 하는 시간 약 40초 + 쉬는 시간))을 더하고, 유산소(처방 없음)는 10분으로 본다.
 * 5분 단위로 올림 없이 반올림하고 최소 5분이다.
 */
const SET_WORK_SECONDS = 40
const CARDIO_MINUTES = 10

const fin = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export function estimateDayMinutes(exercises: Pick<RoutineExercise, 'prescription'>[]): number {
  if (exercises.length === 0) return 0
  let seconds = 0
  for (const e of exercises) {
    const p = e.prescription
    if (!p) {
      seconds += CARDIO_MINUTES * 60
      continue
    }
    const sets = (fin(p.setsMin, 3) + fin(p.setsMax, 3)) / 2
    const rest = (fin(p.restMin, 60) + fin(p.restMax, 60)) / 2
    seconds += sets * (SET_WORK_SECONDS + rest)
  }
  return Math.max(5, Math.round(seconds / 60 / 5) * 5)
}
