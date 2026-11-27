// 발표 시연용 데이터 채우기(개발자용, ?dev=1에서만 쓰는 화면이 호출한다).
// AI·네트워크를 쓰지 않고, 이미 앱이 쓰는 저장 형식 그대로 localStorage에 직접 쓴다.
// 만든 기록의 id는 모두 "demo-seed-"로 시작해서 기존 demo-meal-* 와 구분된다.

import type { MuscleGroup } from '../../server/engine/types'
import type { InBodyHistoryEntry, Meal, MealSlot, NutritionTarget, UserProfile, Workout } from '../types'
import { classifyBodyType, type InBodyStandardRange } from './inBodyBodyType'
import { toCorrectedStandardRange } from './inBodyRangeCorrection'
import { EXERCISE_CATALOG } from './exerciseCatalog'
import { sortInBodyHistory } from './inBodyHistoryOrder'
import { loadFromStorage } from './storage'
import type { RecordedExercise, WorkoutSessionRecord } from './workoutHistory'

export const SEED_ID_PREFIX = 'demo-seed-'
export const DEMO_BACKUP_KEY = 'demoBackup'
/** 시연 데이터를 채울 때 백업하는 저장 키(접두사 ai-diet-app: 는 storage가 붙인다) */
export const DEMO_SEED_KEYS = [
  'inBodyHistory',
  'workouts',
  'workoutHistory',
  'meals',
  'nutritionTarget',
  'profile',
  'workoutProfile',
  'workoutRoutine',
  'workoutRoutineEdit',
] as const
/** 시연 데이터로 "교체"하는 키(나머지는 백업만 하고 그대로 둔다) */
export const DEMO_REPLACED_KEYS = ['inBodyHistory', 'workouts', 'workoutHistory', 'meals'] as const

const PREFIX = 'ai-diet-app:'
const DEFAULT_TARGET_KCAL = 1920

const at = (now: number, daysAgo: number, hour: number, minute = 0) => {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo, hour, minute, 0, 0).getTime()
}
const round1 = (n: number) => Math.round(n * 10) / 10

// ---------------------------------------------------------------------------
// 인바디 4회: 남성 27세 176cm, 8·6·4·1주 전
// ---------------------------------------------------------------------------

export const SEED_HEIGHT_CM = 176
export const SEED_AGE = 27
const SEED_INBODY = [
  { weeksAgo: 8, weight: 112.4, muscle: 41.2, fat: 38.1 },
  { weeksAgo: 6, weight: 110.2, muscle: 41.8, fat: 36.2 },
  { weeksAgo: 4, weight: 108.5, muscle: 42.2, fat: 35.1 },
  { weeksAgo: 1, weight: 107.1, muscle: 42.3, fat: 33.8 },
] as const

// 결과지 막대의 "표준 대비 %" 범위와 그에 해당하는 kg 범위(176cm 남성 기준). 서버가 내려주는
// "min-max@value|kgMin-kgMax" 문자열 형식을 그대로 만든 뒤, 앱의 기존 보정·해석 함수로 객체로 바꾼다.
const STD = {
  weight: { minPct: 85, maxPct: 115, kgMin: 58.0, kgMax: 78.4 },
  skeletalMuscleMass: { minPct: 90, maxPct: 110, kgMin: 30.2, kgMax: 36.9 },
  bodyFatMass: { minPct: 80, maxPct: 160, kgMin: 8.2, kgMax: 16.3 },
} as const

function rawRange(key: keyof typeof STD, measuredKg: number): string {
  const s = STD[key]
  const value = Math.round((measuredKg * s.minPct) / s.kgMin)
  return `${s.minPct}-${s.maxPct}@${value}|${s.kgMin}-${s.kgMax}`
}

function buildInBody(now: number): InBodyHistoryEntry[] {
  const entries = SEED_INBODY.map((m, i): InBodyHistoryEntry => {
    const range = (key: keyof typeof STD, kg: number): InBodyStandardRange | null => toCorrectedStandardRange(rawRange(key, kg), kg)
    const weight = range('weight', m.weight)
    const muscle = range('skeletalMuscleMass', m.muscle)
    const fat = range('bodyFatMass', m.fat)
    const ffm = m.weight - m.fat
    const water = round1(ffm * 0.732)
    const protein = round1(ffm * 0.196)
    return {
      id: `${SEED_ID_PREFIX}inbody-${i + 1}`,
      timestamp: at(now, m.weeksAgo * 7, 9),
      source: 'scan',
      weight: m.weight,
      skeletalMuscleMass: m.muscle,
      bodyFatMass: m.fat,
      bodyFatPercentage: round1((m.fat / m.weight) * 100),
      bodyWater: water,
      proteinMass: protein,
      mineralMass: round1(ffm - water - protein),
      basalMetabolicRate: Math.round(370 + 21.6 * ffm), // 제지방량 기반(InBody 방식)
      bodyType: classifyBodyType(muscle, fat),
      standardRanges: { weight, skeletalMuscleMass: muscle, bodyFatMass: fat },
    }
  })
  // 앱은 새 기록을 배열 앞에 넣는다(맨 앞 = 가장 최근)
  return sortInBodyHistory(entries)
}

/** 만든 마지막 인바디와 프로필의 "인바디 기준" 값(체중·골격근량)이 어긋나는 항목을 문장으로 돌려준다 */
export function findProfileMismatch(profile: UserProfile | null, inBody: InBodyHistoryEntry[]): string[] {
  const latest = sortInBodyHistory(inBody)[0]
  if (!profile || !latest) return []
  const out: string[] = []
  if (latest.weight !== null && profile.weight !== latest.weight) out.push(`체중 ${profile.weight}kg(프로필) ≠ ${latest.weight}kg(마지막 인바디)`)
  if (latest.skeletalMuscleMass !== null && profile.skeletalMuscleMass !== latest.skeletalMuscleMass) {
    out.push(`골격근량 ${profile.skeletalMuscleMass ?? '-'}kg(프로필) ≠ ${latest.skeletalMuscleMass}kg(마지막 인바디)`)
  }
  return out
}

// ---------------------------------------------------------------------------
// 운동 기록: 최근 49일, 19회, 오늘은 없음
// 마지막 인바디 구간(4주 전~1주 전)은 벤치프레스는 늘고, 스쿼트는 60kg×10회 그대로, 하체 세트가 적다.
// 무게는 체중 107kg 초중급 남성 기준으로 종목마다 날짜별로 정한다(덤벨은 한 손 무게).
// ---------------------------------------------------------------------------

export interface SeedRoutineExercise {
  id: string
  name: string
  group: MuscleGroup
  sets?: number
  reps?: number
}
export interface SeedRoutineDay {
  day: number
  label: string
  exercises: SeedRoutineExercise[]
}

// 저장된 추천 루틴이 없을 때만 쓰는 기본 3일 루틴(엔진 종목 id·이름)
const FALLBACK_ROUTINE: SeedRoutineDay[] = [
  {
    day: 1,
    label: '가슴·어깨·팔',
    exercises: [
      { id: 'C03', name: '바벨 벤치 프레스', group: 'CHEST' },
      { id: 'C04', name: '인클라인 덤벨 프레스', group: 'CHEST', sets: 4, reps: 12 },
      { id: 'C06', name: '펙덱 플라이', group: 'CHEST', sets: 4, reps: 12 },
      { id: 'S02', name: '덤벨 숄더 프레스', group: 'SHOULDER', sets: 4, reps: 12 },
      { id: 'S04', name: '덤벨 사이드 레터럴 레이즈', group: 'SHOULDER', sets: 4, reps: 15 },
      { id: 'A04', name: '케이블 트라이셉 푸시다운', group: 'ARM', sets: 4, reps: 12 },
    ],
  },
  {
    day: 2,
    label: '등·팔',
    exercises: [
      { id: 'B01', name: '랫 풀다운', group: 'BACK', sets: 4, reps: 12 },
      { id: 'B02', name: '시티드 케이블 로우', group: 'BACK', sets: 4, reps: 12 },
      { id: 'B04', name: '원암 덤벨 로우', group: 'BACK', sets: 4, reps: 10 },
      { id: 'S05', name: '케이블 페이스 풀', group: 'SHOULDER', sets: 4, reps: 15 },
      { id: 'A01', name: '덤벨 바이셉 컬', group: 'ARM', sets: 3, reps: 12 },
    ],
  },
  {
    day: 3,
    label: '하체',
    exercises: [
      { id: 'L02', name: '바벨 스쿼트', group: 'LEGS' },
      { id: 'L01', name: '레그 프레스', group: 'LEGS' },
      { id: 'L09', name: '루마니안 데드리프트', group: 'LEGS' },
      { id: 'L08', name: '레그 컬', group: 'LEGS' },
      { id: 'L12', name: '카프 레이즈', group: 'LEGS' },
    ],
  },
]

interface CachedRoutineLike {
  result?: {
    days?: { day: number; label: string; exercises: { id: string; name: string; group: MuscleGroup; prescription?: { setsMax?: number; repsMin?: number; repsMax?: number } | null }[] }[]
  }
}

/** 지금 화면에 보이는 추천 루틴(직접 고친 것이 있으면 그것)의 일차별 종목. 없으면 기본 루틴 */
export function readRoutineDays(): SeedRoutineDay[] {
  for (const key of ['workoutRoutineEdit', 'workoutRoutine']) {
    const days = loadFromStorage<CachedRoutineLike | null>(key, null)?.result?.days
    if (!Array.isArray(days) || days.length === 0) continue
    const mapped = days
      .map((d) => ({
        day: d.day,
        label: d.label,
        exercises: (d.exercises ?? []).map((e) => ({
          id: e.id,
          name: e.name,
          group: e.group,
          sets: e.prescription?.setsMax,
          reps: e.prescription ? Math.round(((e.prescription.repsMin ?? 10) + (e.prescription.repsMax ?? 10)) / 2) : undefined,
        })),
      }))
      .filter((d) => d.exercises.length > 0)
    if (mapped.length > 0) return mapped
  }
  return FALLBACK_ROUTINE
}

/** 시연 기록에 넣는 부위(복근·유산소는 볼륨이 없어 뺀다) */
const SEED_GROUPS: MuscleGroup[] = ['CHEST', 'SHOULDER', 'BACK', 'ARM', 'LEGS']
// 모두 어제 이전(오늘 없음). 앞의 7회는 지난 구간, 뒤의 9회(20일 전~)는 진단 카드의 "최근 3주"
const SESSION_DAYS_AGO = [48, 45, 41, 38, 36, 34, 30, 27, 25, 23, 20, 18, 16, 13, 11, 9, 6, 4, 2]
const SESSION_MINUTES = [50, 55, 47, 58, 49, 53, 46, 54, 51, 56, 52, 48, 57, 45, 60, 50, 55, 47, 58]
/** 루틴 일차를 맞추는 기준: 이 순번(27일 전)의 운동이 루틴 1일차 */
const FIRST_DAY_INDEX = SESSION_DAYS_AGO.indexOf(27)
/** 마지막 인바디 구간이 시작되는 날(4주 전). 이때부터 하체를 줄인다 */
const LAST_INTERVAL_FROM = 28

const BENCH: SeedRoutineExercise = { id: 'C03', name: '바벨 벤치 프레스', group: 'CHEST' }
const SQUAT: SeedRoutineExercise = { id: 'L02', name: '바벨 스쿼트', group: 'LEGS' }
/** 루틴에 없어도 이날에는 벤치프레스·스쿼트를 넣는다(주 1회씩) */
const BENCH_DAYS_AGO = [27, 20, 13, 6]
const SQUAT_DAYS_AGO = [23, 16, 9, 2]
/** 대표 종목(벤치·스쿼트)은 5세트: 운동 분석의 "대표 종목"으로 잡히게 */
const MAIN_SETS = 5
const MAIN_REPS = 10
/** 7일 단위의 순번: 43일 전 이상 = 0 … 8~14일 전 = 5, 최근 7일 = 6 */
const weekStep = (daysAgo: number) => Math.max(0, Math.min(6, 6 - Math.floor((daysAgo - 1) / 7)))
/**
 * 주차별 무게(kg, 순번 0~6). 벤치프레스는 마지막 구간에서 55→57.5→60으로 늘고, 스쿼트는 마지막 구간부터 60kg에서 멈춘다.
 * 스쿼트 외의 종목은 3주 이상 같은 무게가 이어지지 않게 한다.
 */
const WEEKLY_KG: Record<string, number[]> = {
  C03: [50, 50, 52.5, 55, 57.5, 60, 60],
  C04: [18, 18, 18, 20, 20, 22, 22],
  C06: [35, 35, 40, 40, 40, 45, 45],
  S02: [14, 14, 14, 16, 16, 18, 18],
  S04: [6, 6, 6, 7, 7, 8, 8],
  A04: [22.5, 22.5, 22.5, 25, 25, 27.5, 27.5],
  B01: [45, 45, 47.5, 50, 50, 52.5, 55],
  B02: [40, 40, 42.5, 45, 45, 47.5, 50],
  B04: [20, 20, 22, 22, 24, 24, 26],
  S05: [17.5, 17.5, 17.5, 20, 20, 22.5, 22.5],
  A01: [10, 10, 10, 11, 11, 12, 12],
  L02: [50, 55, 55, 60, 60, 60, 60],
  L01: [85, 90, 95, 100, 105, 110, 112.5],
  L09: [40, 42.5, 45, 47.5, 50, 52.5, 55],
  L08: [20, 22.5, 25, 27.5, 30, 32.5, 35],
  L12: [35, 37.5, 40, 42.5, 45, 47.5, 50],
}
/** 표에 없는 종목(저장된 추천 루틴)은 기구별 시작 무게에서 2주마다 조금씩 올린다. 맨몸은 0kg */
const EQUIPMENT_KG: Record<string, { start: number; step: number }> = {
  덤벨: { start: 8, step: 2 },
  케이블: { start: 17.5, step: 2.5 },
  머신: { start: 30, step: 2.5 },
  바벨: { start: 30, step: 2.5 },
  맨몸: { start: 0, step: 0 },
}
const EQUIPMENT_OF = new Map(EXERCISE_CATALOG.map((e) => [e.id, e.equipment]))

function seedKg(id: string, daysAgo: number): number {
  const week = weekStep(daysAgo)
  const table = WEEKLY_KG[id]
  if (table) return table[week]!
  const { start, step } = EQUIPMENT_KG[EQUIPMENT_OF.get(id) ?? ''] ?? { start: 20, step: 2.5 }
  return start + step * Math.floor((week + 1) / 2)
}

/** 그날 할 종목. 마지막 구간부터는 스쿼트 하는 날에만 하체(스쿼트 + 1종목)를 한다 */
function pickExercises(day: SeedRoutineDay, i: number, daysAgo: number): SeedRoutineExercise[] {
  // 팔 운동은 하루에 하나만, 4번째 단위 운동(i % 4 === 3)에서는 빼서 다른 부위보다 약간 적게 한다.
  // 맨몸·유산소는 볼륨이 없어 뺀다.
  let armCount = 0
  let picked = day.exercises.filter((e) => {
    if (!SEED_GROUPS.includes(e.group)) return false
    if (e.group === 'ARM') return i % 4 !== 3 && armCount++ === 0
    return true
  })
  if (BENCH_DAYS_AGO.includes(daysAgo) && !picked.some((e) => e.id === BENCH.id)) picked = [...picked, BENCH]
  if (daysAgo > LAST_INTERVAL_FROM) return picked

  if (SQUAT_DAYS_AGO.includes(daysAgo)) {
    const squat = picked.find((e) => e.id === SQUAT.id)
    const other = picked.find((e) => e.group === 'LEGS' && e.id !== SQUAT.id)
    const rest = picked.filter((e) => e.group !== 'LEGS' || e === other)
    return squat ? picked.filter((e) => e.group !== 'LEGS' || e === squat || e === other) : [...rest, SQUAT]
  }
  const upper = picked.filter((e) => e.group !== 'LEGS')
  return upper.length > 0 ? upper : picked
}

function buildWorkouts(now: number, routine: SeedRoutineDay[]): { workouts: Workout[]; history: WorkoutSessionRecord[] } {
  const workouts: Workout[] = []
  const history: WorkoutSessionRecord[] = []
  SESSION_DAYS_AGO.forEach((daysAgo, i) => {
    const n = routine.length
    const day = routine[(((i - FIRST_DAY_INDEX) % n) + n) % n]!
    const exercises: RecordedExercise[] = pickExercises(day, i, daysAgo).map((e) => {
      const main = e.id === BENCH.id || e.id === SQUAT.id
      // 하체는 3세트. 마지막 구간부터 레그 프레스만 4세트(하체 날 볼륨이 너무 낮아지지 않게)
      const legSets = e.id === 'L01' && daysAgo <= LAST_INTERVAL_FROM ? 4 : 3
      const sets = main ? MAIN_SETS : e.group === 'LEGS' ? legSets : Math.min(4, Math.max(3, e.sets ?? 3))
      const reps = main ? MAIN_REPS : Math.min(15, Math.max(8, e.reps ?? 10))
      const kg = seedKg(e.id, daysAgo)
      return {
        exerciseId: e.id,
        name: e.name,
        group: e.group,
        sets: Array.from({ length: sets }, () => ({ kg, reps })),
        volume: kg * reps * sets,
      }
    })
    const end = at(now, daysAgo, 19, 10 + i)
    const durationSeconds = SESSION_MINUTES[i]! * 60
    const id = `${SEED_ID_PREFIX}workout-${i + 1}`
    const total = exercises.reduce((s, e) => s + e.volume, 0)
    history.push({
      id,
      date: end,
      startedAt: end - durationSeconds * 1000,
      day: day.day,
      label: day.label,
      exercises,
      totalVolume: total,
      durationSeconds,
      completedSets: exercises.reduce((n, e) => n + e.sets.length, 0),
    })
    workouts.push({ id, type: '헬스', startTime: end - durationSeconds * 1000, endTime: end, duration: durationSeconds })
  })
  // 앱은 새 기록을 앞에 둔다(최근 순)
  return { workouts: workouts.reverse(), history: history.reverse() }
}

// ---------------------------------------------------------------------------
// 식단 기록: 어제까지 49일, 오늘은 없음
// - 최근 7일: 하루 3~4끼(진단 카드용 달성률이 섞이게)
// - 마지막 인바디 구간(4주 전~1주 전): 저녁이 크고, 주말에는 야식(치킨·맥주·라면·피자 등). 요일마다 칼로리가 다르다
// - 그 전: 평범한 하루 3~4끼
// ---------------------------------------------------------------------------

interface FoodT {
  name: string
  grams: number
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}
interface MealT {
  title: string
  slot: MealSlot
  foods: FoodT[]
}

const MEAL_TEMPLATES: Record<MealSlot, MealT[]> = {
  아침: [
    { title: '그릭요거트 + 바나나', slot: '아침', foods: [
      { name: '그릭요거트', grams: 150, calories: 130, protein: 15, carbohydrates: 8, fat: 4, fiber: 0 },
      { name: '바나나', grams: 120, calories: 190, protein: 5, carbohydrates: 37, fat: 2, fiber: 3 },
    ] },
    { title: '오트밀 + 삶은 달걀', slot: '아침', foods: [
      { name: '오트밀', grams: 60, calories: 230, protein: 8, carbohydrates: 40, fat: 4, fiber: 6 },
      { name: '삶은 달걀', grams: 100, calories: 140, protein: 12, carbohydrates: 1, fat: 10, fiber: 0 },
    ] },
    { title: '통밀 토스트 + 달걀', slot: '아침', foods: [
      { name: '통밀 식빵', grams: 70, calories: 180, protein: 7, carbohydrates: 32, fat: 3, fiber: 4 },
      { name: '스크램블 에그', grams: 100, calories: 170, protein: 12, carbohydrates: 2, fat: 13, fiber: 0 },
    ] },
  ],
  점심: [
    { title: '치킨 라이스 볼', slot: '점심', foods: [
      { name: '닭가슴살', grams: 150, calories: 250, protein: 40, carbohydrates: 0, fat: 6, fiber: 0 },
      { name: '현미밥', grams: 210, calories: 370, protein: 8, carbohydrates: 70, fat: 9, fiber: 6 },
    ] },
    { title: '소고기 비빔밥', slot: '점심', foods: [
      { name: '소고기', grams: 100, calories: 200, protein: 22, carbohydrates: 0, fat: 12, fiber: 0 },
      { name: '잡곡밥', grams: 210, calories: 330, protein: 7, carbohydrates: 68, fat: 2, fiber: 5 },
      { name: '나물 모음', grams: 120, calories: 60, protein: 3, carbohydrates: 8, fat: 2, fiber: 5 },
    ] },
    { title: '연어 포케볼', slot: '점심', foods: [
      { name: '연어', grams: 120, calories: 250, protein: 25, carbohydrates: 0, fat: 16, fiber: 0 },
      { name: '현미밥', grams: 180, calories: 320, protein: 7, carbohydrates: 60, fat: 8, fiber: 5 },
      { name: '아보카도', grams: 50, calories: 80, protein: 1, carbohydrates: 4, fat: 7, fiber: 3 },
    ] },
  ],
  저녁: [
    { title: '두부 스테이크 + 샐러드', slot: '저녁', foods: [
      { name: '두부', grams: 200, calories: 160, protein: 17, carbohydrates: 4, fat: 9, fiber: 2 },
      { name: '그린샐러드', grams: 150, calories: 60, protein: 3, carbohydrates: 8, fat: 2, fiber: 4 },
      { name: '고구마', grams: 150, calories: 190, protein: 3, carbohydrates: 44, fat: 0, fiber: 4 },
    ] },
    { title: '닭가슴살 샐러드 + 고구마', slot: '저녁', foods: [
      { name: '닭가슴살', grams: 150, calories: 250, protein: 40, carbohydrates: 0, fat: 6, fiber: 0 },
      { name: '그린샐러드', grams: 150, calories: 60, protein: 3, carbohydrates: 8, fat: 2, fiber: 4 },
      { name: '고구마', grams: 150, calories: 190, protein: 3, carbohydrates: 44, fat: 0, fiber: 4 },
    ] },
    { title: '제육볶음 + 잡곡밥', slot: '저녁', foods: [
      { name: '제육볶음', grams: 150, calories: 330, protein: 26, carbohydrates: 14, fat: 19, fiber: 2 },
      { name: '잡곡밥', grams: 210, calories: 330, protein: 7, carbohydrates: 68, fat: 2, fiber: 5 },
    ] },
  ],
  간식: [
    { title: '아몬드 + 우유', slot: '간식', foods: [
      { name: '아몬드', grams: 25, calories: 150, protein: 5, carbohydrates: 5, fat: 13, fiber: 3 },
      { name: '우유', grams: 200, calories: 130, protein: 7, carbohydrates: 10, fat: 7, fiber: 0 },
    ] },
    { title: '프로틴 쉐이크', slot: '간식', foods: [
      { name: '프로틴 쉐이크', grams: 300, calories: 160, protein: 24, carbohydrates: 8, fat: 3, fiber: 1 },
    ] },
    { title: '사과 + 땅콩버터', slot: '간식', foods: [
      { name: '사과', grams: 150, calories: 80, protein: 0, carbohydrates: 20, fat: 0, fiber: 3 },
      { name: '땅콩버터', grams: 20, calories: 120, protein: 5, carbohydrates: 4, fat: 10, fiber: 1 },
    ] },
  ],
}

// 어제부터 7일 전까지의 하루 칼로리가 목표의 몇 %인지(앱의 getNutritionStatus 기준:
// 110↑ 초과 / 90↑ 목표 근접 / 60↑ 적정 / 그 아래 부족). 오래된 날 → 어제 순.
// 7일 중 4일이 "목표 근접"이고 적정·부족·초과가 하루씩 섞인다.
const DAY_PERCENTS = [98, 72, 101, 118, 94, 52, 99]
const SLOT_SHARE: Record<MealSlot, number> = { 아침: 0.25, 점심: 0.35, 저녁: 0.3, 간식: 0.1 }
const SLOT_HOURS: Record<MealSlot, [number, number]> = { 아침: [8, 20], 점심: [12, 40], 저녁: [19, 0], 간식: [15, 30] }

const CHICKEN: FoodT = { name: '후라이드 치킨', grams: 250, calories: 700, protein: 45, carbohydrates: 25, fat: 46, fiber: 1 }
const BEER: FoodT = { name: '맥주', grams: 500, calories: 220, protein: 2, carbohydrates: 18, fat: 0, fiber: 0 }
const PIZZA: FoodT = { name: '피자', grams: 300, calories: 800, protein: 32, carbohydrates: 90, fat: 34, fiber: 5 }
const PORK_BELLY: FoodT = { name: '삼겹살', grams: 200, calories: 660, protein: 34, carbohydrates: 1, fat: 57, fiber: 0 }
const JOKBAL: FoodT = { name: '족발', grams: 250, calories: 600, protein: 55, carbohydrates: 5, fat: 38, fiber: 0 }

const dinner = (...foods: FoodT[]): MealT => ({ title: foods.map((f) => f.name).join(' + '), slot: '저녁', foods })
const snack = (name: string, grams: number, calories: number, protein: number, carbohydrates: number, fat: number, fiber: number): MealT => ({
  title: name,
  slot: '간식',
  foods: [{ name, grams, calories, protein, carbohydrates, fat, fiber }],
})
const SNACK_RAMEN = snack('라면', 120, 500, 10, 78, 17, 3)

/**
 * 마지막 구간의 주말 6일(오래된 것부터)의 저녁·간식. 자주 먹은 횟수가 서로 다르게:
 * 맥주 4회 · 후라이드 치킨 3회 · 라면 2회 · 피자 1회(나머지는 1회씩)
 */
const WEEKEND_MENUS: [MealT, MealT][] = [
  [dinner(CHICKEN, BEER), SNACK_RAMEN],
  [dinner(PORK_BELLY, BEER), snack('아이스크림', 150, 300, 5, 34, 16, 0)],
  [dinner(CHICKEN, BEER), snack('감자칩', 60, 320, 4, 32, 20, 2)],
  [dinner(PIZZA), SNACK_RAMEN],
  [dinner(CHICKEN), snack('치즈 케이크', 120, 390, 7, 32, 26, 1)],
  [dinner(JOKBAL, BEER), snack('떡볶이', 250, 400, 8, 78, 6, 3)],
]
/** 마지막 구간의 요일별 하루 칼로리(일~토 순, Date.getDay()). 평일 1,600~1,900, 토·일 2,400~2,800 */
const LAST_INTERVAL_KCAL = [2700, 1640, 1760, 1690, 1840, 1870, 2520]
/** 같은 요일이라도 주마다 조금 다르게(구간의 1·2·3주차) */
const WEEK_KCAL_OFFSET = [-30, 20, 10]

function scaleMeal(t: MealT, kcal: number, id: string, timestamp: number): Meal {
  const baseKcal = t.foods.reduce((s, f) => s + f.calories, 0)
  const k = kcal / baseKcal
  const foods = t.foods.map((f) => ({
    name: f.name,
    amount: `${Math.round(f.grams * k)}g`,
    calories: Math.round(f.calories * k),
    protein: Math.round(f.protein * k),
    carbohydrates: Math.round(f.carbohydrates * k),
    fat: Math.round(f.fat * k),
    fiber: Math.round(f.fiber * k),
  }))
  const sum = (key: 'calories' | 'protein' | 'carbohydrates' | 'fat' | 'fiber') => foods.reduce((s, f) => s + f[key], 0)
  return {
    id,
    timestamp,
    slot: t.slot,
    title: t.title,
    image: null,
    foods,
    calories: sum('calories'),
    protein: sum('protein'),
    carbohydrates: sum('carbohydrates'),
    fat: sum('fat'),
    fiber: sum('fiber'),
    hasLowConfidencePortions: false,
  }
}

export const SEED_MEAL_DAYS = 49
/** 지난 구간(8일 전보다 오래되고 마지막 구간 전)의 하루 칼로리 % */
const OLDER_PERCENTS = [96, 90, 102, 98, 88, 105, 94]

function buildMeals(now: number, targetKcal: number): Meal[] {
  const meals: Meal[] = []
  const add = (daysAgo: number, t: MealT, kcal: number, suffix: string, [h, m]: [number, number]) =>
    meals.push(scaleMeal(t, kcal, `${SEED_ID_PREFIX}meal-${daysAgo}-${suffix}`, at(now, daysAgo, h, m)))
  const pick = (slot: MealSlot, n: number) => MEAL_TEMPLATES[slot][n % MEAL_TEMPLATES[slot].length]!

  /** 평범한 하루: 하루 3~4끼를 그날의 목표 %에 맞춘다 */
  const normalDay = (daysAgo: number, index: number, percent: number) => {
    const slots: MealSlot[] = index % 2 === 0 ? ['아침', '점심', '저녁', '간식'] : ['아침', '점심', '저녁'] // 하루 3~4끼
    const shareSum = slots.reduce((s, sl) => s + SLOT_SHARE[sl], 0)
    for (const slot of slots) {
      const kcal = (targetKcal * (percent / 100) * SLOT_SHARE[slot]) / shareSum
      add(daysAgo, pick(slot, index + slots.indexOf(slot)), kcal, slot, SLOT_HOURS[slot])
    }
  }

  /**
   * 마지막 구간의 하루. 요일은 실행일에 따라 달라지므로 날짜의 실제 요일로 정한다.
   * 칼로리는 목표와 상관없이 요일별 값(LAST_INTERVAL_KCAL)을 쓴다.
   */
  let weekendCount = 0
  const lastIntervalDay = (daysAgo: number) => {
    const weekDay = new Date(at(now, daysAgo, 12)).getDay()
    const kcal = LAST_INTERVAL_KCAL[weekDay]! + WEEK_KCAL_OFFSET[Math.floor((LAST_INTERVAL_FROM - daysAgo) / 7)]!
    if (weekDay === 0 || weekDay === 6) {
      // 주말: 대부분 저녁·간식
      const [evening, late] = WEEKEND_MENUS[weekendCount++ % WEEKEND_MENUS.length]!
      add(daysAgo, pick('점심', daysAgo), kcal * 0.28, '점심', SLOT_HOURS.점심)
      add(daysAgo, evening, kcal * 0.5, '저녁', [19, 30])
      add(daysAgo, late, kcal * 0.22, '간식', [22, 0])
    } else {
      // 평일: 저녁이 45%
      add(daysAgo, pick('아침', daysAgo), kcal * 0.2, '아침', SLOT_HOURS.아침)
      add(daysAgo, pick('점심', daysAgo + 1), kcal * 0.35, '점심', SLOT_HOURS.점심)
      add(daysAgo, pick('저녁', daysAgo + 2), kcal * 0.45, '저녁', SLOT_HOURS.저녁)
    }
  }

  for (let daysAgo = SEED_MEAL_DAYS; daysAgo >= 1; daysAgo--) {
    if (daysAgo <= DAY_PERCENTS.length) {
      const index = DAY_PERCENTS.length - daysAgo // 7일 전(0) … 어제(6)
      normalDay(daysAgo, index, DAY_PERCENTS[index]!)
    } else if (daysAgo <= LAST_INTERVAL_FROM) {
      lastIntervalDay(daysAgo)
    } else {
      normalDay(daysAgo, daysAgo, OLDER_PERCENTS[daysAgo % OLDER_PERCENTS.length]!)
    }
  }
  return meals.sort((a, b) => b.timestamp - a.timestamp)
}

// ---------------------------------------------------------------------------
// 전체 묶음 + localStorage 쓰기/백업/복원
// ---------------------------------------------------------------------------

export interface SeedData {
  inBodyHistory: InBodyHistoryEntry[]
  workouts: Workout[]
  workoutHistory: WorkoutSessionRecord[]
  meals: Meal[]
}

export function buildSeedData(now: number = Date.now(), options: { targetKcal?: number; routine?: SeedRoutineDay[] } = {}): SeedData {
  const { workouts, history } = buildWorkouts(now, options.routine ?? readRoutineDays())
  return {
    inBodyHistory: buildInBody(now),
    workouts,
    workoutHistory: history,
    meals: buildMeals(now, options.targetKcal ?? DEFAULT_TARGET_KCAL),
  }
}

interface Backup {
  savedAt: number
  values: Record<string, string | null>
}

export function hasDemoBackup(): boolean {
  try {
    return localStorage.getItem(PREFIX + DEMO_BACKUP_KEY) !== null
  } catch {
    return false
  }
}

export interface ApplyResult {
  /** 이미 백업이 있어서 덮어쓰지 않고 그대로 둔 경우 true */
  keptExistingBackup: boolean
  /** 프로필의 "인바디 기준" 값과 마지막 인바디가 어긋나는 항목 */
  mismatch: string[]
}

/** 현재 값을 백업하고(이미 있으면 그대로 둠) 시연 기록으로 교체한다. 같은 날 여러 번 눌러도 교체라서 쌓이지 않는다. */
export function applyDemoSeed(now: number = Date.now()): ApplyResult {
  const keptExistingBackup = hasDemoBackup()
  if (!keptExistingBackup) {
    const values: Record<string, string | null> = {}
    for (const key of DEMO_SEED_KEYS) values[key] = localStorage.getItem(PREFIX + key)
    const backup: Backup = { savedAt: now, values }
    localStorage.setItem(PREFIX + DEMO_BACKUP_KEY, JSON.stringify(backup))
  }
  const target = loadFromStorage<NutritionTarget | null>('nutritionTarget', null)
  const data = buildSeedData(now, { targetKcal: target?.calories })
  for (const key of DEMO_REPLACED_KEYS) localStorage.setItem(PREFIX + key, JSON.stringify(data[key]))
  return { keptExistingBackup, mismatch: findProfileMismatch(loadFromStorage<UserProfile | null>('profile', null), data.inBodyHistory) }
}

/** 백업으로 되돌리고 백업을 지운다. 백업이 없으면 false */
export function restoreDemoBackup(): boolean {
  const raw = localStorage.getItem(PREFIX + DEMO_BACKUP_KEY)
  if (raw === null) return false
  let backup: Backup
  try {
    backup = JSON.parse(raw) as Backup
  } catch {
    return false
  }
  for (const key of DEMO_SEED_KEYS) {
    const v = backup.values?.[key]
    if (typeof v === 'string') localStorage.setItem(PREFIX + key, v)
    else localStorage.removeItem(PREFIX + key)
  }
  localStorage.removeItem(PREFIX + DEMO_BACKUP_KEY)
  return true
}
