import type { WorkoutResult } from '../../server/engine/types'
import { getWorkoutSummary, mergeSessions, type WorkoutDashboardSummary, type WorkoutSummaryInput } from './workoutSummary'

/** 홈·대시보드 운동 카드 3개가 함께 쓰는 데이터 */
export interface WorkoutCardData {
  summary: WorkoutDashboardSummary
  /** 지금 추천 루틴(없으면 null) */
  routine: Pick<WorkoutResult, 'days'> | null
  /** 이번 주 월~일 중 운동한 날(길이 7) */
  weekDots: boolean[]
}

/** 그 날 0시에서 n일 뒤 0시(서머타임에도 안전) */
function addDaysToDayStart(dayStart: number, n: number): number {
  const d = new Date(dayStart)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime()
}

/** 이번 주 월~일 각각 운동 기록이 있는지(팀원 기록 + 우리 기록 합쳐서) */
export function getWeekDots(input: WorkoutSummaryInput, weekStart: number): boolean[] {
  const sessions = mergeSessions(input.workouts ?? [], input.history ?? [])
  return Array.from({ length: 7 }, (_, i) => {
    const from = addDaysToDayStart(weekStart, i)
    const to = addDaysToDayStart(weekStart, i + 1)
    return sessions.some((s) => s.startTime >= from && s.startTime < to)
  })
}

export function buildWorkoutCardData(input: WorkoutSummaryInput, now: number): WorkoutCardData {
  const summary = getWorkoutSummary(input, now)
  return { summary, routine: input.routine ?? null, weekDots: getWeekDots(input, summary.week.start) }
}
