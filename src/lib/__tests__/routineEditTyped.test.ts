import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../../../server/engine/data'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import {
  addTypedExercise,
  checkTypedName,
  isTypedExercise,
  removeExercise,
  replaceExercise,
  takenIdsOf,
  TYPED_NAME_MAX,
  TYPED_REASON,
  type EditContext,
} from '../routineEdit'
import { buildSessionRecord } from '../workoutHistory'
import { buildLogs } from '../workoutLog'
import { getWorkoutSummary } from '../workoutSummary'

// 우리 목록(exercises.json)에 없는 종목을 이름으로 직접 추가하는 규칙. AI는 부르지 않는다.

const rx = { setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 10, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 }
const ex = (o: Partial<RoutineExercise> & Pick<RoutineExercise, 'order' | 'id' | 'name'>): RoutineExercise => ({
  group: 'CHEST',
  reason: 'AI가 쓴 이유',
  caution: null,
  prescription: rx,
  ...o,
})

const base = (): WorkoutResult => ({
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
      exercises: [
        ex({ order: 1, id: 'C01', name: '머신 체스트 프레스' }),
        ex({ order: 2, id: 'CA01', name: '트레드밀 경사 걷기', group: 'CARDIO', prescription: null }),
      ],
    },
    { day: 2, label: '하체', exercises: [ex({ order: 1, id: 'L01', name: '레그 프레스', group: 'LEGS' })] },
  ],
})

const ctx: EditContext = { pain: ['KNEE', 'SHOULDER'], experience: 'BEGINNER' }
const day1 = (r: WorkoutResult) => r.days[0]!.exercises

describe('checkTypedName', () => {
  it('앞뒤 공백을 지운 이름을 돌려준다', () => {
    expect(checkTypedName([], '  케이블 로우  ')).toEqual({ ok: true, name: '케이블 로우' })
  })

  it('빈 이름(공백만 포함)은 안 된다', () => {
    expect(checkTypedName([], '')).toEqual({ ok: false, reason: 'empty' })
    expect(checkTypedName([], '   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('1~30자까지만 된다', () => {
    expect(checkTypedName([], 'ㄱ').ok).toBe(true)
    expect(checkTypedName([], 'a'.repeat(TYPED_NAME_MAX)).ok).toBe(true)
    expect(checkTypedName([], 'a'.repeat(TYPED_NAME_MAX + 1))).toEqual({ ok: false, reason: 'tooLong' })
    // 공백은 세지 않고, 앞뒤 공백을 지운 뒤 길이를 본다
    expect(checkTypedName([], `  ${'a'.repeat(TYPED_NAME_MAX)}  `).ok).toBe(true)
  })

  it('같은 이름은 대소문자·공백 차이를 무시하고 막는다', () => {
    expect(checkTypedName(['Cable Row'], 'cable row')).toEqual({ ok: false, reason: 'duplicate' })
    expect(checkTypedName(['Cable Row'], ' CABLEROW ')).toEqual({ ok: false, reason: 'duplicate' })
    expect(checkTypedName(['머신 체스트 프레스'], '머신체스트프레스')).toEqual({ ok: false, reason: 'duplicate' })
    expect(checkTypedName(['Cable Row'], 'Cable Rows').ok).toBe(true)
  })
})

describe('addTypedExercise', () => {
  it('고른 부위로, custom- id와 직접 입력 표시, 일차의 처방을 붙여 근력 종목은 유산소 앞에 넣는다', () => {
    const after = addTypedExercise(base(), 1, 'BACK', '  원암 덤벨 로우 ', ctx)
    const list = day1(after)
    expect(list.map((e) => e.name)).toEqual(['머신 체스트 프레스', '원암 덤벨 로우', '트레드밀 경사 걷기'])
    expect(list.map((e) => e.order)).toEqual([1, 2, 3])
    const added = list[1]!
    expect(added).toMatchObject({ group: 'BACK', reason: TYPED_REASON, custom: true, prescription: rx })
    expect(added.id.startsWith('custom-')).toBe(true)
    expect(isTypedExercise(added)).toBe(true)
    expect(isTypedExercise(list[0]!)).toBe(false)
  })

  it('id는 exercises.json과 겹치지 않고 추가할 때마다 새로 만든다', () => {
    const a = addTypedExercise(base(), 1, 'ARM', '종목 A', ctx)
    const b = addTypedExercise(a, 1, 'ARM', '종목 B', ctx)
    const typedIds = day1(b).filter(isTypedExercise).map((e) => e.id)
    expect(new Set(typedIds).size).toBe(2)
    const known = new Set(EXERCISES.map((e) => e.id))
    expect(typedIds.some((id) => known.has(id))).toBe(false)
  })

  it('통증이 있어도 caution(⚠)을 붙이지 않는다', () => {
    expect(day1(addTypedExercise(base(), 1, 'LEGS', '불가리안 스플릿 스쿼트', ctx))[1]!.caution).toBeNull()
  })

  it('유산소를 고르면 처방 없이 맨 끝에 들어간다', () => {
    const after = addTypedExercise(base(), 2, 'CARDIO', '줄넘기', ctx)
    const added = after.days[1]!.exercises.at(-1)!
    expect(added).toMatchObject({ name: '줄넘기', group: 'CARDIO', prescription: null })
  })

  it('그 일차에 근력 처방이 하나도 없으면 다른 일차 → 처방표 순으로 찾는다', () => {
    const r = base()
    r.days[1]!.exercises = []
    expect(addTypedExercise(r, 2, 'LEGS', '내 종목', ctx).days[1]!.exercises[0]!.prescription).toEqual(rx)
    const noRx = base()
    noRx.days = noRx.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e, prescription: null })) }))
    expect(addTypedExercise(noRx, 2, 'LEGS', '내 종목', ctx).days[1]!.exercises.at(-1)!.prescription).toMatchObject({ setsMin: 2, repsMin: 12 })
  })

  it('잘못된 이름·같은 이름·없는 일차는 result를 그대로 돌려준다', () => {
    const r = base()
    expect(addTypedExercise(r, 1, 'BACK', '   ', ctx)).toBe(r)
    expect(addTypedExercise(r, 1, 'BACK', 'x'.repeat(31), ctx)).toBe(r)
    expect(addTypedExercise(r, 1, 'BACK', '머신 체스트프레스', ctx)).toBe(r)
    expect(addTypedExercise(r, 9, 'BACK', '새 종목', ctx)).toBe(r)
    // 다른 일차에 있는 이름은 괜찮다
    expect(addTypedExercise(r, 1, 'LEGS', '레그 프레스', ctx)).not.toBe(r)
  })

  it('원본을 고치지 않는다', () => {
    const r = base()
    addTypedExercise(r, 1, 'BACK', '새 종목', ctx)
    expect(day1(r)).toHaveLength(2)
  })
})

describe('직접 입력 종목의 바꾸기·삭제', () => {
  const withTyped = () => addTypedExercise(base(), 1, 'CHEST', '내 가슴 운동', ctx)

  it('목록 종목으로 바꿀 수 있고, 바꾸면 직접 입력 표시가 사라진다', () => {
    const r = withTyped()
    const order = day1(r).find(isTypedExercise)!.order
    const after = replaceExercise(r, 1, order, 'C06', ctx)
    expect(day1(after).some(isTypedExercise)).toBe(false)
    expect(day1(after)[order - 1]).toMatchObject({ id: 'C06', custom: true })
  })

  it('삭제할 수 있다', () => {
    const r = withTyped()
    const after = removeExercise(r, 1, day1(r).find(isTypedExercise)!.order)
    expect(day1(after).map((e) => e.name)).toEqual(['머신 체스트 프레스', '트레드밀 경사 걷기'])
  })
})

describe('이름이 같은 목록 종목은 고를 수 없다', () => {
  it('직접 입력한 이름과 같은 이름의 목록 종목은 taken에 들어간다', () => {
    const peck = EXERCISES.find((e) => e.id === 'C06')!
    const r = addTypedExercise(base(), 1, 'CHEST', ` ${peck.name.toUpperCase()} `, ctx)
    expect(takenIdsOf(r.days[0]!).has('C06')).toBe(true)
    expect(takenIdsOf(base().days[0]!).has('C06')).toBe(false)
  })
})

describe('직접 입력 종목으로 운동 기록·요약', () => {
  it('기록 → 저장 기록 → 대시보드 요약(부위별 볼륨)까지 목록에서 id를 못 찾아도 동작한다', () => {
    const routine = addTypedExercise(base(), 1, 'BACK', '내 등 운동', ctx)
    const day = routine.days[0]!
    const typed = day.exercises.find(isTypedExercise)!

    const logs = buildLogs(day.exercises).map((l) => ({
      ...l,
      sets: l.sets.map((s) => ({ ...s, kg: '20', reps: '10', done: true })),
    }))
    expect(logs.map((l) => l.exerciseId)).toContain(typed.id)

    const T = new Date('2026-11-18T10:00:00').getTime()
    const record = buildSessionRecord({ id: 'r1', day, startedAt: T, logs, now: T + 1_800_000 })
    const rec = record.exercises.find((e) => e.exerciseId === typed.id)!
    expect(rec).toMatchObject({ name: '내 등 운동', group: 'BACK', volume: 600 })

    const summary = getWorkoutSummary({ history: [record], workouts: [], profile: null, routine }, T + 1_800_000)
    expect(summary.muscleVolumes).toEqual(expect.arrayContaining([{ group: 'BACK', label: '등', volume: 600 }]))
    expect(summary.muscleVolumes.some((m) => m.group === 'OTHER')).toBe(false)
  })
})
