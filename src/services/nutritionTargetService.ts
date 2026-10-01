import type { InBodyMeasurements, NutritionTarget, UserProfile } from '../types'

/**
 * nutritionTargetService — InBody 체성분 데이터 + 사용자가 선택한 목표로 하루 영양 목표를 계산한다.
 *
 * 프로토타입용 단순 공식이며 의학적 진단이나 처방이 아니다. 사용자는 계산된 목표를 언제든 직접 수정할 수 있다.
 * InBody 데이터나 목표가 바뀌면 이 서비스로 다시 계산한다. (추후 서버의 영양 목표 산출 API로 교체 가능)
 */
export function generateNutritionTarget(profile: UserProfile): NutritionTarget {
  const { basalMetabolicRate, weight, goal } = profile

  const activityFactor = 1.4 // 프로토타입용 고정 활동계수
  let calories = basalMetabolicRate * activityFactor
  let proteinPerKg = 1.4

  switch (goal) {
    case 'fat_loss':
      calories -= 300
      proteinPerKg = 1.6
      break
    case 'muscle_gain':
      calories += 250
      proteinPerKg = 1.8
      break
    case 'weight_maintain':
      proteinPerKg = 1.4
      break
    case 'health_care':
      calories -= 100
      proteinPerKg = 1.2
      break
  }

  const protein = Math.round(weight * proteinPerKg)
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
