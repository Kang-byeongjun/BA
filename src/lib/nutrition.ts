import { RECOMMENDATION_FOODS } from '../data/mockData'
import type {
  Meal,
  NutrientKey,
  NutritionStatus,
  NutritionTarget,
  RecommendedFood,
  UserProfile,
} from '../types'

/**
 * InBody + 목표(goal) 데이터를 기반으로 개인 영양 목표를 산출하는 mock 로직.
 * 실제 서비스에서는 이 함수를 서버/영양 알고리즘 API 호출로 대체한다.
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

export function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbohydrates: acc.carbohydrates + meal.carbohydrates,
      fat: acc.fat + meal.fat,
      fiber: acc.fiber + meal.fiber,
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 },
  )
}

export function getPercentage(consumed: number, target: number): number {
  if (target <= 0) return 0
  return Math.round((consumed / target) * 100)
}

export function getNutritionStatus(percent: number): NutritionStatus {
  if (percent >= 110) return 'exceeded'
  if (percent >= 90) return 'near_goal'
  if (percent >= 60) return 'adequate'
  return 'deficient'
}

export interface MacroFeedback {
  nutrient: NutrientKey
  message: string
}

const FEEDBACK_LABELS: Record<Exclude<NutrientKey, 'calories'>, string> = {
  protein: '단백질',
  carbohydrates: '탄수화물',
  fat: '지방',
  fiber: '식이섬유',
}

/**
 * 현재 섭취량 vs 목표량을 비교하는 단순 규칙 기반 피드백.
 */
export function generateFeedback(
  consumed: Record<NutrientKey, number>,
  target: NutritionTarget,
): MacroFeedback[] {
  const macros: Exclude<NutrientKey, 'calories'>[] = ['protein', 'carbohydrates', 'fat', 'fiber']
  const feedback: MacroFeedback[] = []

  for (const nutrient of macros) {
    const percent = getPercentage(consumed[nutrient], target[nutrient])
    const label = FEEDBACK_LABELS[nutrient]
    const remaining = Math.max(0, target[nutrient] - consumed[nutrient])
    const over = Math.max(0, consumed[nutrient] - target[nutrient])

    if (percent >= 110) {
      feedback.push({ nutrient, message: `${label}이(가) 목표보다 ${over}g 초과했어요.` })
    } else if (percent >= 90) {
      feedback.push({ nutrient, message: `${label}은(는) 목표량에 거의 도달했어요.` })
    } else if (percent < 60) {
      feedback.push({
        nutrient,
        message: `${label}이(가) 목표의 ${percent}%밖에 채워지지 않았어요. ${remaining}g 더 필요해요.`,
      })
    } else {
      feedback.push({ nutrient, message: `오늘 ${label}이(가) ${remaining}g 부족해요.` })
    }
  }

  return feedback
}

/**
 * 가장 부족한(달성률이 낮은) 영양소를 기준으로 추천 음식을 뽑는 규칙 기반 로직.
 */
export function getRecommendedFoods(
  consumed: Record<NutrientKey, number>,
  target: NutritionTarget,
): RecommendedFood[] {
  const macros: Exclude<NutrientKey, 'calories'>[] = ['protein', 'carbohydrates', 'fat', 'fiber']

  const deficiency = macros
    .map((nutrient) => ({ nutrient, percent: getPercentage(consumed[nutrient], target[nutrient]) }))
    .filter((m) => m.percent < 100)
    .sort((a, b) => a.percent - b.percent)

  const priorityNutrients = deficiency.length > 0 ? deficiency.map((d) => d.nutrient) : macros

  const result: RecommendedFood[] = []
  for (const nutrient of priorityNutrients) {
    const candidates = RECOMMENDATION_FOODS.filter((f) => f.nutrient === nutrient)
    for (const food of candidates) {
      if (result.length >= 4) break
      if (!result.some((r) => r.id === food.id)) result.push(food)
    }
    if (result.length >= 4) break
  }

  return result.slice(0, 4)
}
