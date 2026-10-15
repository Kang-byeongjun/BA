import type { Gender, Goal, InBodyMeasurements, NutritionTarget, UserProfile, WorkoutProfile } from '../types'

/**
 * nutritionTargetService — InBody 체성분 데이터 + 사용자가 선택한 목표로 하루 영양 목표를 계산한다.
 *
 * 프로토타입용 단순 공식이며 의학적 진단이나 처방이 아니다. 사용자는 계산된 목표를 언제든 직접 수정할 수 있다.
 * InBody 데이터나 목표가 바뀌면 이 서비스로 다시 계산한다. (추후 서버의 영양 목표 산출 API로 교체 가능)
 *
 * 근거 문헌:
 * - 단백질(체지방감량 외 목적) — ISSN Position Stand(Jäger et al., 2017, 1.4–2.0g/kg)와
 *   ACSM/AND/DC 공동 성명(2016, 1.2–2.0g/kg) 범위 안에서 목적별로 보간한 값.
 * - 단백질(체지방감량, 제지방량 기준) — Helms et al.(2014) 체계적 문헌고찰: 저체지방·근력훈련자가
 *   칼로리 제한 중 필요한 단백질은 2.3–3.1g/kg 제지방량(마르고 제한이 강할수록 상단).
 * - 탄수화물 — ACSM/AND/DC 공동 성명(2016)의 운동량별 탄수화물 g/kg 권고(가벼운 운동 3–5,
 *   중강도 5–7, 고강도 6–10, 초고강도 8–12g/kg)를 WorkoutProfile의 주당 운동량으로 근사해 적용.
 * - 지방 — IOM(현 NAM) Dietary Reference Intakes AMDR, 성인 총열량의 20–35%.
 * - 식이섬유 — IOM AMDR, 1,000kcal당 14g.
 * - 활동계수(TDEE) — Mifflin-St Jeor(1990) 공식이 전제하는 표준 활동계수 5단계(좌식 1.2~매우 활발함 1.9)
 *   중, WorkoutProfile로 추정한 훈련량에 맞는 단계를 적용(고정값 사용 안 함).
 */

// 체중 기준(체지방량 없음 — 간편 온보딩 등 그레이스풀 디그레이데이션 경로)
const PROTEIN_PER_KG_WEIGHT: Record<Goal, number> = {
  fat_loss: 1.6,
  muscle_gain: 1.8,
  weight_maintain: 1.4,
  health_care: 1.2,
}

// 제지방량(체중 − 체지방량) 기준 — 단백질 필요량은 지방보다 근육·수분 등 제지방 조직에 더 좌우된다.
// 체중 기준보다 계수를 높게 잡는다(같은 사람이라도 제지방량은 체중보다 작으므로).
// fat_loss는 칼로리 제한 중 근손실 방지가 핵심이라 별도 근거(Helms et al., 2014)로 체지방률별로 세분화한다.
const PROTEIN_PER_KG_LEAN_MASS: Record<Exclude<Goal, 'fat_loss'>, number> = {
  muscle_gain: 2.2,
  weight_maintain: 1.8,
  health_care: 1.6,
}

// Helms et al.(2014): 칼로리 제한 중인 저체지방·근력훈련자는 2.3–3.1g/kg 제지방량 필요,
// 마르고(leanness) 제한이 강할수록(severity) 상단에 가깝다. 체지방률이 낮을수록(=더 마름) 상단,
// 높을수록(=지방 여유가 더 있음, Helms의 연구 대상 범위를 벗어나는 체지방률) 하단(=문헌 범위의 최소값)을 쓴다.
const FAT_LOSS_PROTEIN_PER_KG_LEAN_MASS: Record<'high' | 'normal' | 'low', number> = {
  high: 2.3,
  normal: 2.6,
  low: 3.0,
}

// 체지방 1kg ≈ 7,700kcal — "주당 체중 변화율(%)" 목표를 하루 칼로리 보정폭으로 역산할 때 쓰는
// 에너지 밀도 환산값(널리 쓰이는 근사치). 완벽한 개인 대사 측정은 아니지만, 체중과 무관하게
// 고정된 숫자(-300kcal 등)를 쓰는 것보다 체격에 비례해 스케일된다는 점에서 더 근거가 있다.
const KCAL_PER_KG_FAT = 7700
const DAYS_PER_WEEK = 7
// 하루 보정폭 상한 — 체중이 매우 크거나 작은 경우에도 비현실적인 적자/잉여가 나오지 않게 막는 안전장치.
const MAX_DAILY_CALORIE_ADJUSTMENT = 750

// 체중 대비 주당 변화율(%) 목표 — 스포츠영양학에서 통상 "안전한 범위"로 인용되는 수치다.
// 체지방감량: 0.5%/주 기본, 체지방률이 높으면 더 밀어붙이고(0.7%) 낮으면 근손실 방지를 위해 늦춘다(0.3%).
const FAT_LOSS_WEEKLY_RATE_PCT: Record<'high' | 'normal' | 'low', number> = { high: 0.7, normal: 0.5, low: 0.3 }
// 근육증가(린벌크): 0.25%/주 기본, 체지방률이 이미 높으면 불필요한 체지방 증가를 줄이려고 0.15%로 보수적으로.
const MUSCLE_GAIN_WEEKLY_RATE_PCT: Record<'high' | 'normal', number> = { high: 0.15, normal: 0.25 }
// 건강관리는 특정 체중 변화 목표가 없는 목적이라, 체중이 아니라 대사량(TDEE) 대비 비율로 가볍게 보정한다.
const HEALTH_CARE_TDEE_DEFICIT_RATIO = 0.05

// 체지방률이 성별 기준 어디쯤인지 분류한다. 데이터가 없으면 "보통"으로 취급한다(그레이스풀 디그레이데이션).
const BODY_FAT_PERCENTAGE_THRESHOLD: Record<Gender, { high: number; low: number }> = {
  male: { high: 25, low: 12 },
  female: { high: 32, low: 20 },
}

function bodyFatCategory(gender: Gender, bodyFatPercentage: number | null): 'high' | 'normal' | 'low' {
  if (bodyFatPercentage === null) return 'normal'
  const { high, low } = BODY_FAT_PERCENTAGE_THRESHOLD[gender]
  if (bodyFatPercentage >= high) return 'high'
  if (bodyFatPercentage <= low) return 'low'
  return 'normal'
}

function resolveProteinTarget(profile: Pick<UserProfile, 'weight' | 'bodyFatMass' | 'bodyFatPercentage' | 'gender' | 'goal'>): number {
  const { weight, bodyFatMass, bodyFatPercentage, gender, goal } = profile
  if (bodyFatMass === null) return Math.round(weight * PROTEIN_PER_KG_WEIGHT[goal])

  // 체지방량이 체중 절반을 넘는 등 비정상적인 값이면 제지방량이 너무 작아지지 않게 하한을 둔다.
  const leanMass = Math.max(weight - bodyFatMass, weight * 0.5)
  const perKgLeanMass =
    goal === 'fat_loss'
      ? FAT_LOSS_PROTEIN_PER_KG_LEAN_MASS[bodyFatCategory(gender, bodyFatPercentage)]
      : PROTEIN_PER_KG_LEAN_MASS[goal]
  return Math.round(leanMass * perKgLeanMass)
}

// ACSM/AND/DC 공동 성명(2016)의 운동량별 탄수화물 권고(g/kg)를 각 구간의 중간값으로 근사한다.
// WorkoutProfile의 "주당 횟수 × 1회 시간"을 하루 평균 운동 시간으로 환산해 구간을 고른다.
const CARB_PER_KG_BY_TRAINING_VOLUME = { light: 4, moderate: 6, high: 8, very_high: 10 } as const
type TrainingVolume = keyof typeof CARB_PER_KG_BY_TRAINING_VOLUME

function resolveTrainingVolume(workoutProfile: WorkoutProfile | null): TrainingVolume {
  if (!workoutProfile) return 'light'
  const avgDailyMinutes = (workoutProfile.weeklyFrequency * workoutProfile.sessionDuration) / 7
  if (avgDailyMinutes < 30) return 'light'
  if (avgDailyMinutes < 60) return 'moderate'
  if (avgDailyMinutes < 120) return 'high'
  return 'very_high'
}

// Mifflin-St Jeor 공식의 표준 활동계수(TDEE = BMR × 활동계수) 5단계 중, 이 앱 온보딩의 운동 가능
// 횟수·시간 선택지가 "전혀 운동 안 함"을 허용하지 않아 실제로 나올 수 있는 light~very_high 4단계만 쓴다.
// (가벼운 활동 1.375 / 중간 1.55 / 활발함 1.725 / 매우 활발함 1.9 — 좌식 1.2는 선택지상 나오지 않음)
const ACTIVITY_FACTOR_BY_TRAINING_VOLUME: Record<TrainingVolume, number> = {
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
}

const TRAINING_VOLUME_LABEL: Record<TrainingVolume, string> = {
  light: '가벼움',
  moderate: '중간',
  high: '높음',
  very_high: '매우 높음',
}

const BODY_FAT_CATEGORY_LABEL: Record<'high' | 'normal' | 'low', string> = {
  high: '높음',
  normal: '보통',
  low: '낮음',
}

// 지방 AMDR(IOM, 총열량의 20–35%) 안에서 탄수화물·지방을 나눈다.
// 탄수화물은 운동량 기준 g/kg을 우선 반영하되, 그 결과로 지방이 AMDR 하한 아래로 내려가면 탄수화물을 줄이고,
// 반대로 지방이 AMDR 상한을 넘기면(=운동량 대비 탄수화물 필요량이 적음) 남는 여유를 탄수화물로 돌린다.
const FAT_AMDR_MIN_RATIO = 0.2
const FAT_AMDR_MAX_RATIO = 0.35

function resolveCarbsAndFat(
  calories: number,
  proteinKcal: number,
  workoutProfile: WorkoutProfile | null,
  weight: number,
): { carbohydrates: number; fat: number } {
  const availableKcal = Math.max(0, calories - proteinKcal)
  const minFatKcal = calories * FAT_AMDR_MIN_RATIO
  const maxFatKcal = calories * FAT_AMDR_MAX_RATIO

  const carbPerKg = CARB_PER_KG_BY_TRAINING_VOLUME[resolveTrainingVolume(workoutProfile)]
  let carbKcal = carbPerKg * weight * 4
  carbKcal = Math.min(carbKcal, Math.max(0, availableKcal - minFatKcal))

  let fatKcal = availableKcal - carbKcal
  if (fatKcal > maxFatKcal) {
    fatKcal = maxFatKcal
    carbKcal = availableKcal - fatKcal
  }

  return {
    carbohydrates: Math.max(0, Math.round(carbKcal / 4)),
    fat: Math.max(0, Math.round(fatKcal / 9)),
  }
}

/** 주당 체중 변화율(%) 목표를 하루 칼로리 보정폭(kcal)으로 역산한다. */
function weeklyRateToDailyCalories(weightKg: number, weeklyRatePct: number): number {
  const weeklyKg = weightKg * (weeklyRatePct / 100)
  return (weeklyKg * KCAL_PER_KG_FAT) / DAYS_PER_WEEK
}

function clampAdjustment(kcal: number): number {
  return Math.max(-MAX_DAILY_CALORIE_ADJUSTMENT, Math.min(MAX_DAILY_CALORIE_ADJUSTMENT, kcal))
}

function resolveCalorieAdjustment(profile: Pick<UserProfile, 'goal' | 'gender' | 'weight' | 'bodyFatPercentage'>, tdee: number): number {
  const { goal, gender, weight, bodyFatPercentage } = profile
  const category = bodyFatCategory(gender, bodyFatPercentage)

  if (goal === 'weight_maintain') return 0
  if (goal === 'health_care') return clampAdjustment(-Math.round(tdee * HEALTH_CARE_TDEE_DEFICIT_RATIO))

  if (goal === 'fat_loss') {
    const ratePct = FAT_LOSS_WEEKLY_RATE_PCT[category]
    return clampAdjustment(-Math.round(weeklyRateToDailyCalories(weight, ratePct)))
  }

  // muscle_gain — 체지방률이 "낮은 편"이라고 더 밀어붙일 근거는 약해서, normal과 동일하게 취급한다.
  const ratePct = category === 'high' ? MUSCLE_GAIN_WEEKLY_RATE_PCT.high : MUSCLE_GAIN_WEEKLY_RATE_PCT.normal
  return clampAdjustment(Math.round(weeklyRateToDailyCalories(weight, ratePct)))
}

export function generateNutritionTarget(profile: UserProfile, workoutProfile: WorkoutProfile | null = null): NutritionTarget {
  const { basalMetabolicRate, weight } = profile

  // 운동 프로필(주당 횟수×시간)로 추정한 훈련량에 맞춰 Mifflin-St Jeor 표준 활동계수를 적용한다.
  // 탄수화물 산출(resolveCarbsAndFat)과 같은 훈련량 분류(resolveTrainingVolume)를 재사용해 일관성을 맞춘다.
  const activityFactor = ACTIVITY_FACTOR_BY_TRAINING_VOLUME[resolveTrainingVolume(workoutProfile)]
  const tdee = basalMetabolicRate * activityFactor
  const calories = tdee + resolveCalorieAdjustment(profile, tdee)

  const protein = resolveProteinTarget(profile)
  const proteinKcal = protein * 4
  const { carbohydrates, fat } = resolveCarbsAndFat(calories, proteinKcal, workoutProfile, weight)
  const fiber = Math.round((calories / 1000) * 14)

  return {
    calories: Math.round(calories / 10) * 10,
    protein,
    carbohydrates,
    fat,
    fiber,
  }
}

export interface NutrientRationale {
  /** 이 사용자에게 실제로 적용된 계수/구간을 담은 한 줄 설명 (예: "제지방량 61.5kg × 2.6g/kg") */
  summary: string
  /** 근거 문헌 */
  citation: string
}

/**
 * generateNutritionTarget이 각 영양소를 어떤 공식·문헌 근거로 계산했는지 사람이 읽을 수 있는 설명으로 돌려준다.
 * 앱 UI에서 "이 숫자는 어떻게 나왔나요?" 같은 근거 노출에 쓰인다. (계산 자체는 하지 않고 같은 로직을 설명만 재구성)
 */
export function describeNutritionRationale(
  profile: UserProfile,
  workoutProfile: WorkoutProfile | null,
): Record<keyof NutritionTarget, NutrientRationale> {
  const { weight, bodyFatMass, bodyFatPercentage, gender, goal } = profile

  let protein: NutrientRationale
  if (bodyFatMass === null) {
    protein = {
      summary: `체성분(체지방량) 정보가 없어 체중 ${weight}kg × ${PROTEIN_PER_KG_WEIGHT[goal]}g/kg으로 추정했어요.`,
      citation: 'ISSN Position Stand(Jäger et al., 2017), ACSM·AND·DC 공동성명(2016) — 운동하는 성인 1.2~2.0g/kg/일 권고',
    }
  } else {
    const leanMass = Math.max(weight - bodyFatMass, weight * 0.5)
    if (goal === 'fat_loss') {
      const category = bodyFatCategory(gender, bodyFatPercentage)
      const perKg = FAT_LOSS_PROTEIN_PER_KG_LEAN_MASS[category]
      protein = {
        summary: `제지방량 ${leanMass.toFixed(1)}kg × ${perKg}g/kg (체지방률 ${BODY_FAT_CATEGORY_LABEL[category]} 구간)`,
        citation: 'Helms et al.(2014) 체계적 문헌고찰 — 칼로리 제한 중 저체지방·근력훈련자는 2.3~3.1g/kg 제지방량 필요(마를수록 상단)',
      }
    } else {
      const perKg = PROTEIN_PER_KG_LEAN_MASS[goal]
      protein = {
        summary: `제지방량 ${leanMass.toFixed(1)}kg × ${perKg}g/kg`,
        citation: 'ISSN Position Stand(Jäger et al., 2017), ACSM·AND·DC 공동성명(2016) — 1.2~2.0g/kg/일 권고 범위 안에서 목적별로 적용',
      }
    }
  }

  const volume = resolveTrainingVolume(workoutProfile)
  const carbohydrates: NutrientRationale = {
    summary: `체중 ${weight}kg × ${CARB_PER_KG_BY_TRAINING_VOLUME[volume]}g/kg (운동량: ${TRAINING_VOLUME_LABEL[volume]}${
      workoutProfile ? '' : ' — 운동 프로필 없어 보수적으로 가정'
    })`,
    citation: 'ACSM·AND·DC 공동성명(2016) — 운동량별 탄수화물 권고 3~12g/kg/일 중 해당 구간',
  }

  const fat: NutrientRationale = {
    summary: '단백질·탄수화물을 뺀 나머지 칼로리를, 총 열량의 20~35% 범위 안에서 맞췄어요.',
    citation: 'IOM(현 NAM) Dietary Reference Intakes AMDR — 성인 지방 20~35%',
  }

  const fiber: NutrientRationale = {
    summary: '하루 섭취 칼로리 1,000kcal당 14g을 적용했어요.',
    citation: 'IOM Dietary Reference Intakes — 1,000kcal당 14g 권고',
  }

  const activityFactor = ACTIVITY_FACTOR_BY_TRAINING_VOLUME[volume]
  const calories: NutrientRationale = {
    summary: `기초대사량 × 활동계수(${activityFactor}, 운동량: ${TRAINING_VOLUME_LABEL[volume]})에서 목적·체지방률에 따른 보정폭(±하루 최대 750kcal)을 더하거나 뺐어요.`,
    citation: 'Mifflin-St Jeor(1990) 활동계수 표준값 + 체지방 1kg≈7,700kcal 환산, 스포츠영양학에서 통상 안전 범위로 보는 주당 체중변화율(%) 관행치',
  }

  return { calories, protein, carbohydrates, fat, fiber }
}

/** InBody 측정값 중 값이 있는 항목만 프로필에 반영한다. (null은 기존 값을 유지) */
export function mergeInBodyMeasurements(profile: UserProfile, measurements: InBodyMeasurements): UserProfile {
  return {
    ...profile,
    weight: measurements.weight ?? profile.weight,
    skeletalMuscleMass: measurements.skeletalMuscleMass ?? profile.skeletalMuscleMass,
    bodyFatMass: measurements.bodyFatMass ?? profile.bodyFatMass,
    bodyFatPercentage: measurements.bodyFatPercentage ?? profile.bodyFatPercentage,
    bodyWater: measurements.bodyWater ?? profile.bodyWater,
    proteinMass: measurements.proteinMass ?? profile.proteinMass,
    mineralMass: measurements.mineralMass ?? profile.mineralMass,
    basalMetabolicRate: measurements.basalMetabolicRate ?? profile.basalMetabolicRate,
    // 실측 기초대사량이 새로 들어왔으면 더 이상 추정값이 아니다.
    basalMetabolicRateEstimated: measurements.basalMetabolicRate !== null ? false : profile.basalMetabolicRateEstimated,
  }
}
