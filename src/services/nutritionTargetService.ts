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

const CALORIE_ADJUSTMENT: Record<Goal, number> = {
  fat_loss: -300,
  muscle_gain: 250,
  weight_maintain: 0,
  health_care: -100,
}

// 체지방률이 성별 기준 "높은 편"이면 체지방감량 감량폭을 살짝 늘리고, "낮은 편"이면 근손실 방지를 위해 줄인다.
// 의학적 진단이 아닌 참고용 보정이라 폭을 작게(±50kcal) 잡는다.
const BODY_FAT_PERCENTAGE_THRESHOLD: Record<Gender, { high: number; low: number }> = {
  male: { high: 25, low: 12 },
  female: { high: 32, low: 20 },
}
const BODY_FAT_CALORIE_NUDGE = 50

function resolveProteinTarget(profile: Pick<UserProfile, 'weight' | 'bodyFatMass' | 'goal'>): number {
  const { weight, bodyFatMass, goal } = profile
  if (bodyFatMass === null) return Math.round(weight * PROTEIN_PER_KG_WEIGHT[goal])

  // 체지방량이 체중 절반을 넘는 등 비정상적인 값이면 제지방량이 너무 작아지지 않게 하한을 둔다.
  const leanMass = Math.max(weight - bodyFatMass, weight * 0.5)
  return Math.round(leanMass * PROTEIN_PER_KG_LEAN_MASS[goal])
}

function resolveBodyFatCalorieNudge(profile: Pick<UserProfile, 'goal' | 'gender' | 'bodyFatPercentage'>): number {
  const { goal, gender, bodyFatPercentage } = profile
  if (goal !== 'fat_loss' || bodyFatPercentage === null) return 0
  const { high, low } = BODY_FAT_PERCENTAGE_THRESHOLD[gender]
  if (bodyFatPercentage >= high) return -BODY_FAT_CALORIE_NUDGE
  if (bodyFatPercentage <= low) return BODY_FAT_CALORIE_NUDGE
  return 0
}

export function generateNutritionTarget(profile: UserProfile): NutritionTarget {
  const { basalMetabolicRate, goal } = profile

  const activityFactor = 1.4 // 프로토타입용 고정 활동계수
  const calories = basalMetabolicRate * activityFactor + CALORIE_ADJUSTMENT[goal] + resolveBodyFatCalorieNudge(profile)

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
