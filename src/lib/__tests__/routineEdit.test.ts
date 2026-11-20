import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../../../server/engine/data'
import { generateRoutine } from '../../../server/engine/generate'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import {
  addExercise,
  burdenInfo,
  CUSTOM_REASON,
  cautionFor,
  findExercise,
  optionsForGroup,
  removeExercise,
  replaceExercise,
  type EditContext,
} from '../routineEdit'

// 실제 종목 데이터(exercises.json)를 쓰고, AI는 부르지 않는다.

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
        ex({ order: 2, id: 'B01', name: '등 종목', group: 'BACK' }),
        ex({ order: 3, id: 'CA01', name: '트레드밀 경사 걷기', group: 'CARDIO', prescription: null }),
      ],
    },
    { day: 2, label: '하체', exercises: [ex({ order: 1, id: 'L01', name: '레그 프레스', group: 'LEGS' })] },
  ],
})

const none: EditContext = { pain: [], experience: 'BEGINNER' }
const knee: EditContext = { pain: ['KNEE'], experience: 'BEGINNER' }
const shoulder: EditContext = { pain: ['SHOULDER'], experience: 'BEGINNER' }
const ids = (r: WorkoutResult, day = 1) => r.days.find((d) => d.day === day)!.exercises.map((e) => e.id)

describe('replaceExercise', () => {
  it('그 자리의 종목만 바꾸고 순서 번호·다른 종목·다른 일차는 그대로 둔다', () => {
    const before = base()
    const after = replaceExercise(before, 1, 1, 'C06', none)
    expect(ids(after)).toEqual(['C06', 'B01', 'CA01'])
    expect(after.days[0]!.exercises.map((e) => e.order)).toEqual([1, 2, 3])
    expect(after.days[0]!.exercises[1]).toEqual(before.days[0]!.exercises[1])
    expect(after.days[1]).toBe(before.days[1])
  })

  it('원본을 고치지 않는다', () => {
    const before = base()
    replaceExercise(before, 1, 1, 'C06', none)
    expect(ids(before)).toEqual(['C01', 'B01', 'CA01'])
  })

  it('새 종목에는 이름·부위, 직접 고름 표시, 새 이유, 그 일차의 처방을 붙인다', () => {
    const e = replaceExercise(base(), 1, 1, 'C06', none).days[0]!.exercises[0]!
    expect(e).toMatchObject({ id: 'C06', name: findExercise('C06')!.name, group: 'CHEST', reason: CUSTOM_REASON, custom: true, prescription: rx })
  })

  it('유산소로 바꾸면 처방이 없고, 근력으로 바꾸면 처방이 생긴다', () => {
    const toCardio = replaceExercise(base(), 1, 3, 'CA02', none).days[0]!.exercises[2]!
    expect(toCardio.prescription).toBeNull()
    const toStrength = replaceExercise(base(), 1, 3, 'C06', none).days[0]!.exercises[2]!
    expect(toStrength.prescription).toEqual(rx)
  })

  it('이미 그 일차에 있는 종목, 없는 종목, 없는 자리는 그대로 돌려준다', () => {
    const r = base()
    expect(replaceExercise(r, 1, 1, 'B01', none)).toBe(r)
    expect(replaceExercise(r, 1, 1, 'NOPE', none)).toBe(r)
    expect(replaceExercise(r, 1, 9, 'C06', none)).toBe(r)
    expect(replaceExercise(r, 9, 1, 'C06', none)).toBe(r)
  })
})

describe('addExercise', () => {
  it('근력 종목은 유산소 앞에 넣고 번호를 다시 매긴다', () => {
    const after = addExercise(base(), 1, 'C06', none)
    expect(ids(after)).toEqual(['C01', 'B01', 'C06', 'CA01'])
    expect(after.days[0]!.exercises.map((e) => e.order)).toEqual([1, 2, 3, 4])
    expect(after.days[0]!.exercises[2]).toMatchObject({ custom: true, prescription: rx })
  })

  it('유산소는 맨 뒤에, 처방 없이 넣는다', () => {
    const after = addExercise(base(), 2, 'CA02', none)
    expect(ids(after, 2)).toEqual(['L01', 'CA02'])
    expect(after.days[1]!.exercises[1]!.prescription).toBeNull()
  })

  it('그 일차에 이미 있으면 그대로 돌려준다', () => {
    const r = base()
    expect(addExercise(r, 1, 'C01', none)).toBe(r)
  })

  it('그 일차에 근력 처방이 없으면 다른 일차 → 처방표 순으로 찾는다', () => {
    const r = base()
    r.days[1]!.exercises = []
    // 다른 일차(1일차)의 처방을 복사
    expect(addExercise(r, 2, 'L02', none).days[1]!.exercises[0]!.prescription).toEqual(rx)
    // 모든 일차에 처방이 없으면 처방표(MUSCLE/BEGINNER: 2세트 12회, 휴식 60~90초)
    const noRx = base()
    noRx.days = noRx.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e, prescription: null })) }))
    expect(addExercise(noRx, 2, 'L02', none).days[1]!.exercises.at(-1)!.prescription).toMatchObject({ setsMin: 2, repsMin: 12, restMin: 60, restMax: 90 })
  })
})

describe('removeExercise', () => {
  it('지우고 번호를 다시 매긴다', () => {
    const after = removeExercise(base(), 1, 2)
    expect(ids(after)).toEqual(['C01', 'CA01'])
    expect(after.days[0]!.exercises.map((e) => e.order)).toEqual([1, 2])
  })

  it('없는 자리·일차는 그대로 돌려준다', () => {
    const r = base()
    expect(removeExercise(r, 1, 9)).toBe(r)
    expect(removeExercise(r, 9, 1)).toBe(r)
  })
})

describe('통증 경고', () => {
  it('통증이 없으면 caution이 없다', () => {
    expect(replaceExercise(base(), 1, 1, 'C02', none).days[0]!.exercises[0]!.caution).toBeNull()
  })

  it('부담 보통(MID): 엔진과 같은 문구로 ⚠를 붙이고 안전한 대체 종목을 알려준다', () => {
    const c = cautionFor(findExercise('C01')!, shoulder.pain)!
    expect(c).toMatchObject({ parts: ['SHOULDER'], alternativeId: 'C06' })
    expect(c.text).toBe('⚠ 어깨에 부담이 있을 수 있어요. 통증이 느껴지면 바로 멈추고 펙덱 플라이(으)로 바꿔주세요.')
  })

  it('부담 큼(HIGH): 더 강한 문구로 ⚠를 붙이고, 카드의 caution으로 들어간다', () => {
    const e = replaceExercise(base(), 1, 1, 'C02', shoulder).days[0]!.exercises[0]!
    expect(e.caution!.parts).toEqual(['SHOULDER'])
    expect(e.caution!.text.startsWith('⚠ 어깨에 부담이 큰 종목이에요')).toBe(true)
    expect(e.caution!.alternativeId).toBe('C06')
  })

  it('안전한 대체 종목만 권한다', () => {
    expect(cautionFor(findExercise('L06')!, knee.pain)!.alternativeId).toBe('L08')
    expect(cautionFor(findExercise('L08')!, knee.pain)).toBeNull()
  })

  it('MID 문구 형식이 엔진이 만든 것과 같다(엔진 기본 루틴과 비교)', async () => {
    const res = await generateRoutine({ goal: 'MUSCLE', experience: 'BEGINNER', frequency: 'FREQ_4P', time: 'TIME_90', pain: ['KNEE', 'SHOULDER', 'LOWBACK'] })
    const withCaution = res.days.flatMap((d) => d.exercises).filter((e) => e.caution)
    expect(withCaution.length).toBeGreaterThan(0)
    for (const e of withCaution) {
      expect(cautionFor(findExercise(e.id)!, ['KNEE', 'SHOULDER', 'LOWBACK'])).toEqual(e.caution)
    }
  })

  it('burdenInfo는 가장 심한 수준을 돌려준다', () => {
    expect(burdenInfo(findExercise('L02')!, ['KNEE', 'LOWBACK'])).toMatchObject({ level: 'HIGH', highParts: ['KNEE', 'LOWBACK'] })
    expect(burdenInfo(findExercise('L03')!, ['KNEE'])).toMatchObject({ level: 'MID', midParts: ['KNEE'] })
    expect(burdenInfo(findExercise('L03')!, [])).toMatchObject({ level: 'NONE' })
  })
})

describe('optionsForGroup', () => {
  it('그 부위 종목만, 이미 있는 것은 taken으로 표시한다', () => {
    const opts = optionsForGroup('CHEST', [], new Set(['C01']))
    expect(opts.length).toBe(EXERCISES.filter((e) => e.group === 'CHEST').length)
    expect(opts.every((o) => o.exercise.group === 'CHEST')).toBe(true)
    expect(opts.find((o) => o.exercise.id === 'C01')!.taken).toBe(true)
    expect(opts.find((o) => o.exercise.id === 'C02')!.taken).toBe(false)
  })

  it('부담 없음 → 보통 → 큼 순으로 정렬한다', () => {
    const levels = optionsForGroup('LEGS', ['KNEE'], new Set()).map((o) => o.burden.level)
    const rank = { NONE: 0, MID: 1, HIGH: 2 }
    expect(levels).toEqual([...levels].sort((a, b) => rank[a] - rank[b]))
    expect(levels).toContain('HIGH')
  })
})
