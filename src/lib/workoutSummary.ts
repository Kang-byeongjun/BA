import type { MuscleGroup, WorkoutResult } from '../../server/engine/types'
import type { Workout, WorkoutProfile, WorkoutType } from '../types'
import type { WorkoutSessionRecord } from './workoutHistory'

/**
 * workoutSummary — 운동 대시보드에 보여줄 요약을 계산하는 순수 함수.
 * localStorage·React·서버를 쓰지 않는다. 기록과 "지금 시각(now)"을 받아 계산만 한다 → 테스트하기 쉽다.
 *
 * 데이터 출처
 * - workouts(팀원 기록): 운동 종류·시간만 있다. 헬스 외 러닝 등도 들어 있다.
 * - history(우리 기록): 세트 상세·볼륨·부위가 있다. "운동 완료" 때 팀원 기록에도 같은 운동이 하나 생긴다.
 *   → 두 곳에 같은 운동이 있으면(시작·끝 시각이 같음) 하나로 합쳐서 두 번 세지 않는다.
 *
 * 주는 월요일 0시 ~ 일요일 24시(기기 시간대 기준)로 계산한다.
 */

export type MuscleGroupKey = MuscleGroup | 'OTHER'

export const MUSCLE_GROUP_LABEL: Record<MuscleGroupKey, string> = {
  CHEST: '가슴',
  SHOULDER: '어깨',
  BACK: '등',
  ARM: '팔',
  LEGS: '하체',
  ABS: '복근',
  CARDIO: '유산소',
  OTHER: '기타',
}

export interface WorkoutSummaryInput {
  /** 우리 운동 기록(loadWorkoutHistory 결과). 순서는 상관없다 */
  history: WorkoutSessionRecord[]
  /** 팀원 운동 기록(useApp().workouts) */
  workouts: Workout[]
  /** 운동 프로필. 없으면 주간 목표를 계산하지 않는다 */
  profile: WorkoutProfile | null
  /** (선택) 지금 추천 루틴. 있으면 "다음 루틴"을 알려준다 */
  routine?: Pick<WorkoutResult, 'days'> | null
}

/** 요약에 쓰는 운동 한 번(팀원 기록과 우리 기록을 합친 것) */
export interface SummarySession {
  startTime: number
  endTime: number
  type: WorkoutType
  durationSeconds: number
  /** 우리 기록에서 온 정보. 팀원 기록에만 있는 운동(러닝 등)은 null */
  day: number | null
  label: string | null
  totalVolume: number | null
  completedSets: number | null
}

export interface WorkoutDashboardSummary {
  week: {
    /** 이번 주 월요일 0시(ms) */
    start: number
    /** 다음 주 월요일 0시(ms, 이 시각은 포함하지 않음) */
    end: number
    count: number
    /** 주간 목표 횟수(운동 프로필의 weeklyFrequency). 프로필이 없으면 null */
    goal: number | null
    /** 0~1. 목표가 없으면 null */
    progress: number | null
    achieved: boolean
  }
  volume: {
    thisWeek: number
    lastWeek: number
    /** thisWeek - lastWeek */
    diff: number
    /** 지난주 대비 변화율(0.25 = 25% 증가). 지난주가 0이면 계산할 수 없어서 null */
    changeRate: number | null
  }
  /** 오늘(또는 오늘 아직 안 했으면 어제)까지 하루도 빠짐없이 운동한 날 수 */
  streakDays: number
  lastWorkout: (SummarySession & { daysAgo: number }) | null
  /** 지난 기록의 다음 일차. 루틴을 모르면 null */
  nextRoutine: { day: number; label: string } | null
  /** 이번 주 부위별 볼륨(큰 순서). 볼륨이 0인 부위는 빠진다 */
  muscleVolumes: { group: MuscleGroupKey; label: string; volume: number }[]
  /** 최근 운동(최신 순, 최대 RECENT_LIMIT개) */
  recent: SummarySession[]
}

export const RECENT_LIMIT = 5

const DAY_MS = 86_400_000
const round1 = (v: number) => Math.round(v * 10) / 10

/** 그 날 0시(기기 시간대). Date 생성자로 계산해서 서머타임이 있어도 안전하다 */
function startOfDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function addDays(dayStart: number, days: number): number {
  const d = new Date(dayStart)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime()
}

/** 그 주 월요일 0시. getDay(): 일=0, 월=1 … 토=6 → 월요일부터 센 날 수 = (getDay()+6)%7 */
export function startOfWeek(ms: number): number {
  const day = (new Date(ms).getDay() + 6) % 7
  return addDays(startOfDay(ms), -day)
}

/** 두 시각 사이의 달력상 날짜 차이(오늘=0, 어제=1) */
function calendarDaysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS)
}

/** 팀원 기록 + 우리 기록을 합쳐 최신 순으로 정렬한다(같은 운동은 하나로) */
export function mergeSessions(workouts: Workout[], history: WorkoutSessionRecord[]): SummarySession[] {
  const byTime = new Map<string, WorkoutSessionRecord>()
  for (const r of history) byTime.set(`${r.startedAt}-${r.date}`, r)

  const sessions: SummarySession[] = []
  const used = new Set<WorkoutSessionRecord>()
  for (const w of workouts) {
    const r = byTime.get(`${w.startTime}-${w.endTime}`)
    if (r) used.add(r)
    sessions.push({
      startTime: w.startTime,
      endTime: w.endTime,
      type: w.type,
      durationSeconds: w.duration,
      day: r?.day ?? null,
      label: r?.label ?? null,
      totalVolume: r?.totalVolume ?? null,
      completedSets: r?.completedSets ?? null,
    })
  }
  // 팀원 기록에 없는 우리 기록(예: 팀원 기록만 지워진 경우)도 헬스로 넣는다
  for (const r of history) {
    if (used.has(r)) continue
    sessions.push({
      startTime: r.startedAt,
      endTime: r.date,
      type: '헬스',
      durationSeconds: r.durationSeconds,
      day: r.day,
      label: r.label,
      totalVolume: r.totalVolume,
      completedSets: r.completedSets,
    })
  }
  return sessions.sort((a, b) => b.startTime - a.startTime)
}

const inRange = (t: number, start: number, end: number) => t >= start && t < end

function streakOf(sessions: SummarySession[], now: number): number {
  const days = new Set(sessions.map((s) => startOfDay(s.startTime)))
  const today = startOfDay(now)
  // 오늘 아직 안 했으면 어제부터 센다(오늘 하루가 끝나기 전에는 연속이 끊긴 게 아니다)
  let cursor = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

function nextRoutineOf(
  history: WorkoutSessionRecord[],
  routine: WorkoutSummaryInput['routine'],
): WorkoutDashboardSummary['nextRoutine'] {
  const days = routine?.days ?? []
  if (days.length === 0) return null
  const last = history.reduce<WorkoutSessionRecord | null>((a, r) => (!a || r.startedAt > a.startedAt ? r : a), null)
  const i = last ? days.findIndex((d) => d.day === last.day) : -1
  // 기록이 없거나 지난 일차가 지금 루틴에 없으면(루틴을 다시 만든 경우) 1일차부터
  const next = days[i === -1 ? 0 : (i + 1) % days.length]!
  return { day: next.day, label: next.label }
}

function muscleVolumesOf(records: WorkoutSessionRecord[]): WorkoutDashboardSummary['muscleVolumes'] {
  const sum = new Map<MuscleGroupKey, number>()
  for (const r of records) {
    for (const e of r.exercises) {
      const key: MuscleGroupKey = e.group && e.group in MUSCLE_GROUP_LABEL ? e.group : 'OTHER'
      sum.set(key, (sum.get(key) ?? 0) + (Number.isFinite(e.volume) ? e.volume : 0))
    }
  }
  return [...sum]
    .map(([group, volume]) => ({ group, label: MUSCLE_GROUP_LABEL[group], volume: round1(volume) }))
    .filter((g) => g.volume > 0)
    .sort((a, b) => b.volume - a.volume)
}

const volumeIn = (records: WorkoutSessionRecord[]) =>
  round1(records.reduce((s, r) => s + (Number.isFinite(r.totalVolume) ? r.totalVolume : 0), 0))

export function getWorkoutSummary(input: WorkoutSummaryInput, now: number): WorkoutDashboardSummary {
  const history = input.history ?? []
  const sessions = mergeSessions(input.workouts ?? [], history)

  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 7)
  const lastWeekStart = addDays(weekStart, -7)

  const count = sessions.filter((s) => inRange(s.startTime, weekStart, weekEnd)).length
  const goalRaw = input.profile?.weeklyFrequency
  const goal = typeof goalRaw === 'number' && goalRaw > 0 ? goalRaw : null

  const thisWeekRecords = history.filter((r) => inRange(r.startedAt, weekStart, weekEnd))
  const thisWeek = volumeIn(thisWeekRecords)
  const lastWeek = volumeIn(history.filter((r) => inRange(r.startedAt, lastWeekStart, weekStart)))

  // 미래 시각 기록(기기 시계가 바뀐 경우 등)은 "마지막 운동"으로 보지 않는다
  const last = sessions.find((s) => s.startTime <= now) ?? null

  return {
    week: {
      start: weekStart,
      end: weekEnd,
      count,
      goal,
      progress: goal === null ? null : Math.min(1, count / goal),
      achieved: goal !== null && count >= goal,
    },
    volume: {
      thisWeek,
      lastWeek,
      diff: round1(thisWeek - lastWeek),
      changeRate: lastWeek > 0 ? (thisWeek - lastWeek) / lastWeek : null,
    },
    streakDays: streakOf(sessions, now),
    lastWorkout: last ? { ...last, daysAgo: calendarDaysBetween(last.startTime, now) } : null,
    nextRoutine: nextRoutineOf(history, input.routine),
    muscleVolumes: muscleVolumesOf(thisWeekRecords),
    recent: sessions.slice(0, RECENT_LIMIT),
  }
}
