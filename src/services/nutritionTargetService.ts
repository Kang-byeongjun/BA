import type { Gender, Goal, InBodyMeasurements, NutritionTarget, UserProfile } from '../types'

/**
 * nutritionTargetService — InBody 체성분 데이터 + 사용자가 선택한 목표로 하루 영양 목표를 계산한다.
 *
 * 프로토타입용 단순 공식이며 의학적 진단이나 처방이 아니다. 사용자는 계산된 목표를 언제든 직접 수정할 수 있다.
 * InBody 데이터나 목표가 바뀌면 이 서비스로 다시 계산한다. (추후 서버의 영양 목표 산출 API로 교체 가능)
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
const PROTEIN_PER_KG_LEAN_MASS: Record<Goal, number> = {
  fat_loss: 2.0,
  muscle_gain: 2.2,
  weight_maintain: 1.8,
  health_care: 1.6,
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

function resolveProteinTarget(profile: Pick<UserProfile, 'weight' | 'bodyFatMass' | 'goal'>): number {
  const { weight, bodyFatMass, goal } = profile
  if (bodyFatMass === null) return Math.round(weight * PROTEIN_PER_KG_WEIGHT[goal])

  // 체지방량이 체중 절반을 넘는 등 비정상적인 값이면 제지방량이 너무 작아지지 않게 하한을 둔다.
  const leanMass = Math.max(weight - bodyFatMass, weight * 0.5)
  return Math.round(leanMass * PROTEIN_PER_KG_LEAN_MASS[goal])
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

export function generateNutritionTarget(profile: UserProfile): NutritionTarget {
  const { basalMetabolicRate } = profile

  const activityFactor = 1.4 // 프로토타입용 고정 활동계수
  const tdee = basalMetabolicRate * activityFactor
  const calories = tdee + resolveCalorieAdjustment(profile, tdee)

  const protein = resolveProteinTarget(profile)
  const fat = Math.round((calories * 0.25) / 9)
  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const carbohydrates = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4))
  const fiber = Math.round((calories / 1000) * 14)

  return {
    calories: Math.round(calories / 10) * 10,
    protein,
    carbohydrates,
    fat,
    fiber,
  }
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
