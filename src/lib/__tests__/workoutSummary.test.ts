import { describe, expect, it } from 'vitest'
import { DEFAULT_WORKOUT_PROFILE, type Workout, type WorkoutType } from '../../types'
import type { RecordedExercise, WorkoutSessionRecord } from '../workoutHistory'
import { getWorkoutSummary, mergeSessions, startOfWeek, type WorkoutSummaryInput } from '../workoutSummary'

// 날짜는 모두 기기 시간대 기준으로 만든다(new Date(년, 월-1, 일, 시)).
const at = (m: number, d: number, h = 10, min = 0) => new Date(2026, m - 1, d, h, min).getTime()
// 2026-11-13은 금요일 → 이번 주는 11/9(월) ~ 11/15(일), 지난주는 11/2(월) ~ 11/8(일)
const NOW = at(11, 13, 18)

const ex = (group: RecordedExercise['group'], volume: number, name = '종목'): RecordedExercise => ({
  exerciseId: `${name}-${group ?? 'none'}`,
  name,
  group,
  sets: [{ kg: volume / 10, reps: 10 }],
  volume,
})

let seq = 0
function rec(start: number, exercises: RecordedExercise[], o: Partial<WorkoutSessionRecord> = {}): WorkoutSessionRecord {
  const durationSeconds = o.durationSeconds ?? 3600
  return {
    id: `s${++seq}`,
    startedAt: start,
    date: start + durationSeconds * 1000,
    day: 1,
    label: '상체',
    exercises,
    totalVolume: exercises.reduce((s, e) => s + e.volume, 0),
    durationSeconds,
    completedSets: exercises.length,
    ...o,
  }
}
/** "운동 완료" 때 팀원 기록에도 생기는 짝 */
const teamOf = (r: WorkoutSessionRecord): Workout => ({
  id: `w-${r.id}`,
  type: '헬스',
  startTime: r.startedAt,
  endTime: r.date,
  duration: r.durationSeconds,
})
const team = (start: number, type: WorkoutType = '러닝', duration = 1800): Workout => ({
  id: `t${++seq}`,
  type,
  startTime: start,
  endTime: start + duration * 1000,
  duration,
})

const input = (o: Partial<WorkoutSummaryInput> = {}): WorkoutSummaryInput => ({
  history: [],
  workouts: [],
  profile: DEFAULT_WORKOUT_PROFILE,
  ...o,
})

describe('기록이 하나도 없을 때', () => {
  it('0과 null로 안전하게 돌려준다', () => {
    const s = getWorkoutSummary(input({ profile: null }), NOW)
    expect(s.week).toMatchObject({ count: 0, goal: null, progress: null, achieved: false })
    expect(s.volume).toEqual({ thisWeek: 0, lastWeek: 0, diff: 0, changeRate: null })
    expect(s.streakDays).toBe(0)
    expect(s.lastWorkout).toBeNull()
    expect(s.nextRoutine).toBeNull()
    expect(s.muscleVolumes).toEqual([])
    expect(s.recent).toEqual([])
  })

  it('루틴만 있으면 다음 루틴은 1일차', () => {
    const routine = { days: [{ day: 1, label: '상체', exercises: [] }, { day: 2, label: '하체', exercises: [] }] }
    expect(getWorkoutSummary(input({ routine }), NOW).nextRoutine).toEqual({ day: 1, label: '상체' })
  })
})

describe('주 계산(월요일 ~ 일요일)', () => {
  it('startOfWeek는 그 주 월요일 0시', () => {
    expect(new Date(NOW).getDay()).toBe(5) // 금요일
    expect(startOfWeek(NOW)).toBe(at(11, 9, 0))
    expect(startOfWeek(at(11, 15, 23, 59))).toBe(at(11, 9, 0)) // 일요일 밤도 같은 주
    expect(startOfWeek(at(11, 16, 0))).toBe(at(11, 16, 0)) // 월요일 0시는 새 주
    expect(startOfWeek(at(11, 9, 0))).toBe(at(11, 9, 0))
  })

  it('이번 주 횟수와 목표(주당 운동 횟수)', () => {
    const workouts = [
      team(at(11, 8, 23, 30)), // 지난주 일요일 → 제외
      team(at(11, 9, 0, 0)), // 월요일 0시 → 포함
      team(at(11, 12)),
      team(at(11, 16, 0)), // 다음 주 → 제외
    ]
    const s = getWorkoutSummary(input({ workouts, profile: { ...DEFAULT_WORKOUT_PROFILE, weeklyFrequency: 3 } }), NOW)
    expect(s.week).toMatchObject({ start: at(11, 9, 0), end: at(11, 16, 0), count: 2, goal: 3, achieved: false })
    expect(s.week.progress).toBeCloseTo(2 / 3)
  })

  it('목표를 넘겨도 progress는 1까지', () => {
    const workouts = [team(at(11, 9)), team(at(11, 10)), team(at(11, 11))]
    const s = getWorkoutSummary(input({ workouts, profile: { ...DEFAULT_WORKOUT_PROFILE, weeklyFrequency: 2 } }), NOW)
    expect(s.week).toMatchObject({ count: 3, goal: 2, progress: 1, achieved: true })
  })
})

describe('우리 기록과 팀원 기록 합치기', () => {
  it('"운동 완료"로 두 곳에 생긴 같은 운동은 한 번만 센다', () => {
    const r = rec(at(11, 12), [ex('CHEST', 1000)])
    const s = getWorkoutSummary(input({ history: [r], workouts: [teamOf(r), team(at(11, 11))] }), NOW)
    expect(s.week.count).toBe(2)
    expect(s.recent.map((x) => [x.type, x.totalVolume])).toEqual([
      ['헬스', 1000],
      ['러닝', null],
    ])
  })

  it('팀원 기록에 없는 우리 기록도 헬스로 센다', () => {
    const merged = mergeSessions([], [rec(at(11, 12), [])])
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ type: '헬스', day: 1, label: '상체' })
  })
})

describe('주간 볼륨', () => {
  it('이번 주와 지난주 볼륨, 차이와 변화율', () => {
    const history = [
      rec(at(11, 3), [ex('CHEST', 1000)]), // 지난주
      rec(at(11, 6), [ex('LEGS', 1000)]), // 지난주
      rec(at(11, 10), [ex('CHEST', 1500)]),
      rec(at(11, 12), [ex('BACK', 1000), ex('ARM', 500.5)]),
      rec(at(10, 20), [ex('CHEST', 9999)]), // 2주 전 → 제외
    ]
    const s = getWorkoutSummary(input({ history }), NOW)
    expect(s.volume.thisWeek).toBe(3000.5)
    expect(s.volume.lastWeek).toBe(2000)
    expect(s.volume.diff).toBe(1000.5)
    expect(s.volume.changeRate).toBeCloseTo(0.50025)
  })

  it('지난주가 0이면 변화율은 null', () => {
    const s = getWorkoutSummary(input({ history: [rec(at(11, 10), [ex('CHEST', 100)])] }), NOW)
    expect(s.volume).toMatchObject({ thisWeek: 100, lastWeek: 0, diff: 100, changeRate: null })
  })
})

describe('부위별 볼륨(이번 주)', () => {
  it('부위별로 더해 큰 순서로, 부위가 없는 예전 기록은 "기타"', () => {
    const history = [
      rec(at(11, 10), [ex('CHEST', 1200, '벤치'), ex(undefined, 300, '예전 종목')]),
      rec(at(11, 12), [ex('CHEST', 800, '인클라인'), ex('LEGS', 1500), ex('CARDIO', 0)]),
      rec(at(11, 3), [ex('BACK', 5000)]), // 지난주 → 제외
    ]
    const s = getWorkoutSummary(input({ history }), NOW)
    expect(s.muscleVolumes).toEqual([
      { group: 'CHEST', label: '가슴', volume: 2000 },
      { group: 'LEGS', label: '하체', volume: 1500 },
      { group: 'OTHER', label: '기타', volume: 300 },
    ])
  })
})

describe('연속 운동일', () => {
  it('오늘까지 하루도 빠짐없이 운동한 날 수(하루 여러 번은 하루로)', () => {
    const workouts = [team(at(11, 13, 7)), team(at(11, 13, 19 - 10)), team(at(11, 12)), team(at(11, 11)), team(at(11, 9))]
    expect(getWorkoutSummary(input({ workouts }), NOW).streakDays).toBe(3) // 13·12·11 (10일 쉼)
  })

  it('오늘 아직 안 했으면 어제까지로 센다', () => {
    const workouts = [team(at(11, 12)), team(at(11, 11))]
    expect(getWorkoutSummary(input({ workouts }), NOW).streakDays).toBe(2)
  })

  it('어제도 안 했으면 0', () => {
    expect(getWorkoutSummary(input({ workouts: [team(at(11, 11))] }), NOW).streakDays).toBe(0)
  })

  it('주가 바뀌어도(일요일 → 월요일) 이어진다', () => {
    const mon = at(11, 16, 20)
    const workouts = [team(at(11, 16, 8)), team(at(11, 15)), team(at(11, 14))]
    expect(getWorkoutSummary(input({ workouts }), mon).streakDays).toBe(3)
  })
})

describe('마지막 운동 · 최근 기록', () => {
  it('가장 최근 운동과 며칠 전인지(달력 기준)', () => {
    const r = rec(at(11, 11, 21), [ex('CHEST', 600)], { label: '가슴', day: 2 })
    const s = getWorkoutSummary(input({ history: [r], workouts: [teamOf(r), team(at(11, 10))] }), NOW)
    expect(s.lastWorkout).toMatchObject({ type: '헬스', label: '가슴', day: 2, totalVolume: 600, durationSeconds: 3600, daysAgo: 2 })
  })

  it('최근 기록은 최신 순 최대 5개', () => {
    const workouts = [1, 2, 3, 4, 5, 6, 7].map((d) => team(at(11, d)))
    const s = getWorkoutSummary(input({ workouts }), NOW)
    expect(s.recent).toHaveLength(5)
    expect(s.recent[0]!.startTime).toBe(at(11, 7))
    expect(s.recent[4]!.startTime).toBe(at(11, 3))
  })

  it('미래 시각 기록은 마지막 운동으로 보지 않는다', () => {
    const s = getWorkoutSummary(input({ workouts: [team(at(11, 20)), team(at(11, 12))] }), NOW)
    expect(s.lastWorkout!.startTime).toBe(at(11, 12))
  })
})

describe('다음 루틴', () => {
  const routine = {
    days: [
      { day: 1, label: '상체', exercises: [] },
      { day: 2, label: '하체', exercises: [] },
      { day: 3, label: '전신', exercises: [] },
    ],
  }

  it('가장 최근 기록의 다음 일차, 마지막 일차 다음은 1일차', () => {
    const h = (day: number, d: number) => rec(at(11, d), [], { day })
    expect(getWorkoutSummary(input({ routine, history: [h(1, 10), h(2, 12)] }), NOW).nextRoutine).toEqual({ day: 3, label: '전신' })
    expect(getWorkoutSummary(input({ routine, history: [h(3, 12), h(2, 10)] }), NOW).nextRoutine).toEqual({ day: 1, label: '상체' })
  })

  it('지난 일차가 지금 루틴에 없으면(루틴을 다시 만든 경우) 1일차', () => {
    const s = getWorkoutSummary(input({ routine: { days: routine.days.slice(0, 2) }, history: [rec(at(11, 12), [], { day: 3 })] }), NOW)
    expect(s.nextRoutine).toEqual({ day: 1, label: '상체' })
  })

  it('루틴을 모르면 null', () => {
    expect(getWorkoutSummary(input({ history: [rec(at(11, 12), [])], routine: null }), NOW).nextRoutine).toBeNull()
  })
})
