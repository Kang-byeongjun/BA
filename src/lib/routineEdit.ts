import { EXERCISES, getPrescription } from '../../server/engine/data'
import { generateId } from './id'
import type {
  BurdenLevel,
  Exercise,
  Experience,
  MuscleGroup,
  PainPart,
  RoutineExercise,
  WorkoutResult,
} from '../../server/engine/types'

/**
 * routineEdit — 추천 루틴에서 종목을 "바꾸기 / 추가 / 삭제"하는 계산 규칙만 모은 파일.
 * 화면(React)·저장(localStorage)·AI 호출에 의존하지 않는 순수 함수라 테스트하기 쉽다.
 * 입력 result는 절대 직접 고치지 않고, 바뀐 새 result를 돌려준다.
 */

export type RoutineDay = WorkoutResult['days'][number]

/** 편집에 필요한 사용자 정보: 통증 부위(경고용)와 경험 수준(처방을 못 찾을 때 대비) */
export interface EditContext {
  pain: PainPart[]
  experience: Experience
}

/** 직접 고른 종목에 붙는 이유 문구. AI가 쓴 예전 이유가 새 종목에 남지 않게 한다. */
export const CUSTOM_REASON = '직접 고른 종목이에요'
/** 이름을 직접 입력해 추가한 종목의 이유 문구 */
export const TYPED_REASON = '직접 입력한 종목이에요'

/** 직접 입력 종목의 id 접두사. exercises.json의 id(C01, L02, CA01 …)와 절대 겹치지 않는다. */
export const TYPED_ID_PREFIX = 'custom-'
export const isTypedExercise = (e: Pick<RoutineExercise, 'id'>): boolean => e.id.startsWith(TYPED_ID_PREFIX)

export const TYPED_NAME_MAX = 30

/** "종목 추가"에서 고를 수 있는 부위 순서 */
export const EDIT_GROUPS: MuscleGroup[] = ['CHEST', 'SHOULDER', 'BACK', 'ARM', 'LEGS', 'ABS', 'CARDIO']

export const GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: '가슴',
  SHOULDER: '어깨',
  BACK: '등',
  ARM: '팔',
  LEGS: '하체',
  ABS: '복근',
  CARDIO: '유산소',
}

const PAIN_KO: Record<PainPart, string> = { LOWBACK: '허리', KNEE: '무릎', SHOULDER: '어깨' }

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]))

export function findExercise(id: string): Exercise | undefined {
  return BY_ID.get(id)
}

// ---------- 통증 경고 ----------

export interface BurdenInfo {
  /** 가장 심한 수준: 하나라도 HIGH면 HIGH, 아니면 MID가 있으면 MID, 아니면 NONE */
  level: BurdenLevel
  highParts: PainPart[]
  midParts: PainPart[]
}

export function burdenInfo(ex: Exercise, pain: PainPart[]): BurdenInfo {
  const highParts = pain.filter((p) => ex.burden[p] === 'HIGH')
  const midParts = pain.filter((p) => ex.burden[p] === 'MID')
  const level: BurdenLevel = highParts.length > 0 ? 'HIGH' : midParts.length > 0 ? 'MID' : 'NONE'
  return { level, highParts, midParts }
}

/** 통증 부위에 부담이 큰(HIGH) 종목이 없는 대체 종목. 없으면 undefined */
function safeAlternative(ex: Exercise, pain: PainPart[]): Exercise | undefined {
  const alt = ex.altId ? BY_ID.get(ex.altId) : undefined
  return alt && !pain.some((p) => alt.burden[p] === 'HIGH') ? alt : undefined
}

/**
 * 화면의 ⚠ 박스에 쓰는 caution을 만든다(RoutineView가 이미 그리는 모양 그대로).
 * - MID: 엔진(generate.ts)이 붙이는 문구와 똑같이 만든다.
 * - HIGH: 엔진은 이런 종목을 추천하지 않으므로, 직접 고른 경우를 위한 더 강한 문구를 쓴다.
 */
export function cautionFor(ex: Exercise, pain: PainPart[]): RoutineExercise['caution'] {
  const { level, highParts, midParts } = burdenInfo(ex, pain)
  if (level === 'NONE') return null
  const alt = safeAlternative(ex, pain)
  if (level === 'HIGH') {
    const parts = highParts.map((p) => PAIN_KO[p]).join('·')
    return {
      parts: highParts,
      text: `⚠ ${parts}에 부담이 큰 종목이에요. 통증이 느껴지면 바로 멈추고${alt ? ` ${alt.name}(으)로 바꿔주세요.` : ' 하지 말고 쉬어주세요.'}`,
      alternativeId: alt?.id ?? null,
    }
  }
  const parts = midParts.map((p) => PAIN_KO[p]).join('·')
  return {
    parts: midParts,
    text: `⚠ ${parts}에 부담이 있을 수 있어요. 통증이 느껴지면 바로 멈추고${alt ? ` ${alt.name}(으)로 바꿔주세요.` : ' 쉬운 강도로 낮춰주세요.'}`,
    alternativeId: alt?.id ?? null,
  }
}

// ---------- 고르기 목록 ----------

export interface PickOption {
  exercise: Exercise
  burden: BurdenInfo
  /** 이미 그 일차에 있어서 고를 수 없음 */
  taken: boolean
}

const LEVEL_RANK: Record<BurdenLevel, number> = { NONE: 0, MID: 1, HIGH: 2 }

/**
 * 한 부위의 종목 목록. 부담 없음 → 보통 → 큼 순으로, 같으면 쉬운 것부터 보여준다.
 * takenIds는 그 일차에 이미 있는 종목 id (고를 수 없게 표시).
 */
export function optionsForGroup(group: MuscleGroup, pain: PainPart[], takenIds: ReadonlySet<string>): PickOption[] {
  return EXERCISES.filter((e) => e.group === group)
    .map((exercise) => ({ exercise, burden: burdenInfo(exercise, pain), taken: takenIds.has(exercise.id) }))
    .sort(
      (a, b) =>
        LEVEL_RANK[a.burden.level] - LEVEL_RANK[b.burden.level] ||
        a.exercise.difficulty - b.exercise.difficulty ||
        a.exercise.id.localeCompare(b.exercise.id),
    )
}

// ---------- 처방(세트·횟수·휴식) ----------

type Rx = NonNullable<RoutineExercise['prescription']>

/**
 * 새 종목에 붙일 처방. 유산소는 null.
 * 같은 일차의 근력 종목 처방 → 다른 일차의 근력 종목 처방 → 처방표(목표·경험) 순으로 찾는다.
 * (엔진은 한 루틴의 근력 종목에 모두 같은 처방을 붙이므로 복사하면 일치한다)
 */
export function prescriptionFor(type: Exercise['type'], result: WorkoutResult, day: RoutineDay, experience: Experience): Rx | null {
  if (type !== 'STRENGTH') return null
  const found =
    day.exercises.find((e) => e.prescription)?.prescription ??
    result.days.flatMap((d) => d.exercises).find((e) => e.prescription)?.prescription
  if (found) return { ...found }
  const t = getPrescription(result.resolvedGoal, experience)
  return {
    setsMin: t.setsMin, setsMax: t.setsMax, repsMin: t.repsMin, repsMax: t.repsMax,
    rirMin: t.rirMin, rirMax: t.rirMax, restMin: t.restMin, restMax: t.restMax,
  }
}

// ---------- 바꾸기 / 추가 / 삭제 ----------

/** 이름 비교용: 대소문자·공백 차이는 같은 이름으로 본다 */
export const normalizeName = (name: string): string => name.replace(/\s+/g, '').toLowerCase()
const sameName = (a: string, b: string) => normalizeName(a) === normalizeName(b)

/**
 * 그 일차에서 고를 수 없는 목록 종목 id: 이미 있는 종목 + 이름이 같은 종목(직접 입력한 이름 포함).
 */
export function takenIdsOf(day: RoutineDay): Set<string> {
  const names = new Set(day.exercises.map((e) => normalizeName(e.name)))
  const taken = new Set(day.exercises.map((e) => e.id))
  for (const e of EXERCISES) if (names.has(normalizeName(e.name))) taken.add(e.id)
  return taken
}

const renumber = (list: RoutineExercise[]): RoutineExercise[] => list.map((e, i) => ({ ...e, order: i + 1 }))

function withDay(result: WorkoutResult, dayNo: number, edit: (day: RoutineDay) => RoutineExercise[] | null): WorkoutResult {
  const day = result.days.find((d) => d.day === dayNo)
  if (!day) return result
  const exercises = edit(day)
  if (!exercises) return result
  return { ...result, days: result.days.map((d) => (d === day ? { ...d, exercises: renumber(exercises) } : d)) }
}

function customExercise(ex: Exercise, order: number, result: WorkoutResult, day: RoutineDay, ctx: EditContext): RoutineExercise {
  return {
    order,
    id: ex.id,
    name: ex.name,
    group: ex.group,
    reason: CUSTOM_REASON,
    caution: cautionFor(ex, ctx.pain),
    prescription: prescriptionFor(ex.type, result, day, ctx.experience),
    custom: true,
  }
}

/** dayNo일차의 order번 종목을 newId 종목으로 바꾼다. 번호·자리는 그대로. 잘못된 요청이면 result를 그대로 돌려준다. */
export function replaceExercise(result: WorkoutResult, dayNo: number, order: number, newId: string, ctx: EditContext): WorkoutResult {
  const ex = BY_ID.get(newId)
  if (!ex) return result
  return withDay(result, dayNo, (day) => {
    const idx = day.exercises.findIndex((e) => e.order === order)
    if (idx < 0 || day.exercises.some((e, i) => i !== idx && (e.id === newId || sameName(e.name, ex.name)))) return null
    const next = [...day.exercises]
    next[idx] = customExercise(ex, order, result, day, ctx)
    return next
  })
}

/** dayNo일차에 종목을 추가한다. 근력은 맨 뒤 유산소 앞에, 유산소는 맨 끝에 넣는다. 이미 있으면 그대로. */
export function addExercise(result: WorkoutResult, dayNo: number, newId: string, ctx: EditContext): WorkoutResult {
  const ex = BY_ID.get(newId)
  if (!ex) return result
  return withDay(result, dayNo, (day) => {
    if (day.exercises.some((e) => e.id === newId || sameName(e.name, ex.name))) return null
    const added = customExercise(ex, day.exercises.length + 1, result, day, ctx)
    const firstCardio = day.exercises.findIndex((e) => e.group === 'CARDIO')
    const at = ex.type === 'STRENGTH' && firstCardio >= 0 ? firstCardio : day.exercises.length
    return [...day.exercises.slice(0, at), added, ...day.exercises.slice(at)]
  })
}

/** dayNo일차의 order번 종목을 지운다. 남은 종목은 번호를 다시 매긴다. */
export function removeExercise(result: WorkoutResult, dayNo: number, order: number): WorkoutResult {
  return withDay(result, dayNo, (day) => {
    if (!day.exercises.some((e) => e.order === order)) return null
    return day.exercises.filter((e) => e.order !== order)
  })
}

// ---------- 직접 입력 종목 ----------

export type NameCheck = { ok: true; name: string } | { ok: false; reason: 'empty' | 'tooLong' | 'duplicate' }

/** 앞뒤 공백을 지우고 1~30자인지, 같은 일차에 같은 이름이 없는지 확인한다(대소문자·공백 차이는 같은 이름). */
export function checkTypedName(existingNames: readonly string[], raw: string): NameCheck {
  const name = raw.trim()
  if (name.length === 0) return { ok: false, reason: 'empty' }
  if ([...name].length > TYPED_NAME_MAX) return { ok: false, reason: 'tooLong' }
  if (existingNames.some((n) => sameName(n, name))) return { ok: false, reason: 'duplicate' }
  return { ok: true, name }
}

/**
 * 우리 종목 목록에 없는 종목을 이름으로 추가한다. 부위(group)는 꼭 정해야 한다(부위별 볼륨 계산에 쓰임).
 * - id는 'custom-…'로 새로 만들어 exercises.json과 겹치지 않는다(저장된 루틴에 함께 들어가 새로고침해도 유지).
 * - 처방(세트·횟수·휴식)은 그 일차의 기존 처방을 복사한다. 유산소는 처방 없음.
 * - 통증 경고(caution)는 붙이지 않는다: 우리 데이터(exercises.json)에 없는 종목이라 부위별 부담 정보를 모른다.
 * 이름이 잘못됐거나 부위·일차가 없으면 result를 그대로 돌려준다.
 */
export function addTypedExercise(result: WorkoutResult, dayNo: number, group: MuscleGroup, rawName: string, ctx: EditContext): WorkoutResult {
  if (!EDIT_GROUPS.includes(group)) return result
  return withDay(result, dayNo, (day) => {
    const check = checkTypedName(day.exercises.map((e) => e.name), rawName)
    if (!check.ok) return null
    const added: RoutineExercise = {
      order: day.exercises.length + 1,
      id: generateId(TYPED_ID_PREFIX.slice(0, -1)),
      name: check.name,
      group,
      reason: TYPED_REASON,
      caution: null,
      prescription: prescriptionFor(group === 'CARDIO' ? 'CARDIO' : 'STRENGTH', result, day, ctx.experience),
      custom: true,
    }
    const firstCardio = day.exercises.findIndex((e) => e.group === 'CARDIO')
    const at = group !== 'CARDIO' && firstCardio >= 0 ? firstCardio : day.exercises.length
    return [...day.exercises.slice(0, at), added, ...day.exercises.slice(at)]
  })
}
