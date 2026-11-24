// 발표 시연용 데이터 채우기(개발자용, ?dev=1에서만 쓰는 화면이 호출한다).
// AI·네트워크를 쓰지 않고, 이미 앱이 쓰는 저장 형식 그대로 localStorage에 직접 쓴다.
// 만든 기록의 id는 모두 "demo-seed-"로 시작해서 기존 demo-meal-* 와 구분된다.

import type { MuscleGroup } from '../../server/engine/types'
import type { InBodyHistoryEntry, Meal, MealSlot, NutritionTarget, UserProfile, Workout } from '../types'
import { classifyBodyType, type InBodyStandardRange } from './inBodyBodyType'
import { toCorrectedStandardRange } from './inBodyRangeCorrection'
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
  { weeksAgo: 6, weight: 110.2, muscle: 41.6, fat: 36.4 },
  { weeksAgo: 4, weight: 108.5, muscle: 42.0, fat: 35.0 },
  { weeksAgo: 1, weight: 107.1, muscle: 42.3, fat: 33.3 },
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
// 운동 기록: 최근 3주, 주 3회 수준(9회), 오늘은 없음
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
      { id: 'C04', name: '인클라인 덤벨 프레스', group: 'CHEST' },
      { id: 'S02', name: '덤벨 숄더 프레스', group: 'SHOULDER' },
      { id: 'S04', name: '덤벨 사이드 레터럴 레이즈', group: 'SHOULDER' },
      { id: 'A04', name: '케이블 트라이셉 푸시다운', group: 'ARM' },
    ],
  },
  {
    day: 2,
    label: '등·팔',
    exercises: [
      { id: 'B01', name: '랫 풀다운', group: 'BACK' },
      { id: 'B02', name: '시티드 케이블 로우', group: 'BACK' },
      { id: 'B04', name: '원암 덤벨 로우', group: 'BACK' },
      { id: 'S05', name: '케이블 페이스 풀', group: 'SHOULDER' },
      { id: 'A01', name: '덤벨 바이셉 컬', group: 'ARM' },
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

const BASE_KG: Partial<Record<MuscleGroup, number>> = { CHEST: 55, SHOULDER: 22, BACK: 50, ARM: 14, LEGS: 90 }
const SESSION_DAYS_AGO = [20, 18, 16, 13, 11, 9, 6, 4, 2] // 모두 어제 이전(오늘 없음)
const SESSION_MINUTES = [52, 48, 57, 45, 60, 50, 55, 47, 58]
const ROUND_KG = 2.5

function buildWorkouts(now: number, routine: SeedRoutineDay[]): { workouts: Workout[]; history: WorkoutSessionRecord[] } {
  const workouts: Workout[] = []
  const history: WorkoutSessionRecord[] = []
  SESSION_DAYS_AGO.forEach((daysAgo, i) => {
    const day = routine[i % routine.length]!
    // 팔 운동은 하루에 하나만, 4번째 단위 운동(i % 4 === 3)에서는 빼서 다른 부위보다 약간 적게 한다.
    // 맨몸·유산소는 볼륨이 없어 뺀다.
    let armCount = 0
    const picked = day.exercises.filter((e) => {
      if (BASE_KG[e.group] === undefined) return false
      if (e.group === 'ARM') return i % 4 !== 3 && armCount++ === 0
      return true
    })
    const perGroup: Partial<Record<MuscleGroup, number>> = {}
    const drafts = picked.map((e) => {
      const n = (perGroup[e.group] = (perGroup[e.group] ?? 0) + 1)
      const base = BASE_KG[e.group]! * (1 - 0.12 * (n - 1)) * (1 + 0.015 * i)
      return { e, base, sets: Math.min(4, Math.max(3, e.sets ?? 3)), reps: Math.min(12, Math.max(8, e.reps ?? 10)) }
    })
    const baseVolume = drafts.reduce((s, d) => s + d.base * d.sets * d.reps, 0)
    const target = 5600 + ((i * 937) % 2800) // 5,600~8,400kg
    const factor = target / baseVolume
    const exercises: RecordedExercise[] = drafts.map(({ e, base, sets, reps }) => {
      const kg = Math.max(ROUND_KG, Math.round((base * factor) / ROUND_KG) * ROUND_KG)
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
// 식단 기록: 어제까지 7일, 하루 3~4끼, 오늘은 없음
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

function buildMeals(now: number, targetKcal: number): Meal[] {
  const meals: Meal[] = []
  DAY_PERCENTS.forEach((percent, index) => {
    const daysAgo = DAY_PERCENTS.length - index // 7 … 1(어제)
    const slots: MealSlot[] = index % 2 === 0 ? ['아침', '점심', '저녁', '간식'] : ['아침', '점심', '저녁'] // 하루 3~4끼
    const shareSum = slots.reduce((s, sl) => s + SLOT_SHARE[sl], 0)
    for (const slot of slots) {
      const pool = MEAL_TEMPLATES[slot]
      const t = pool[(index + slots.indexOf(slot)) % pool.length]!
      const kcal = (targetKcal * (percent / 100) * SLOT_SHARE[slot]) / shareSum
      const [h, m] = SLOT_HOURS[slot]
      meals.push(scaleMeal(t, kcal, `${SEED_ID_PREFIX}meal-${daysAgo}-${slot}`, at(now, daysAgo, h, m)))
    }
  })
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
