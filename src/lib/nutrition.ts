import { getFoodById } from '../data/foodDatabase'
import { MEAL_COMBOS, type MealComboDef } from '../data/mealCombos'
import { resolveMealCombo } from '../services/nutritionService'
import type {
  Gender,
  Goal,
  Meal,
  NutrientKey,
  NutritionStatus,
  NutritionTarget,
  RecommendedMeal,
} from '../types'

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

// 풀이 넓어져서(영양소별 6개씩) 호출마다 항상 같은 상위 조합만 나오지 않도록
// "오늘" 기준으로 고정된 순서로 섞는다. 같은 날에는 같은 추천이 유지되고, 날이 바뀌면 달라진다.
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const MAX_RECOMMENDATIONS = 3

/**
 * 오늘 이미 먹은 재료로만 구성된 조합은 뒤로 미룬다(완전히 겹칠 때만 제외 — 재료 하나가 겹친다고
 * 막으면 풀이 과도하게 줄어든다). 사용자의 식단 목적(goal)과 맞는 조합을 그다음으로 우선한다.
 */
function rankCombos(pool: MealComboDef[], goal: Goal, seed: number, eatenTodayNames: Set<string>): MealComboDef[] {
  const notFullyEaten = pool.filter((combo) => {
    if (eatenTodayNames.size === 0) return true
    const ingredientNames = combo.ingredients.map((ing) => getFoodById(ing.foodId).name)
    return !ingredientNames.every((name) => eatenTodayNames.has(name))
  })
  const candidates = notFullyEaten.length > 0 ? notFullyEaten : pool

  const shuffled = shuffleWithSeed(candidates, seed)
  const goalMatched = shuffled.filter((c) => c.bestFor.length === 0 || c.bestFor.includes(goal))
  const others = shuffled.filter((c) => c.bestFor.length > 0 && !c.bestFor.includes(goal))
  return [...goalMatched, ...others]
}

// 체지방률이 성별 기준 "높은 편"이고 목적이 체지방감량이면, 같은 달성률이라도 단백질을 더 급하게,
// 지방을 덜 급하게 취급해 추천 우선순위를 저탄고단 쪽으로 살짝 기울인다(참고용 보정 — 실제 달성률
// 숫자 자체는 바꾸지 않고, 추천 순서에만 영향을 준다. generateFeedback에서 보여주는 수치는 그대로다).
const BODY_FAT_HIGH_THRESHOLD: Record<Gender, number> = { male: 25, female: 32 }
const PRIORITY_BIAS = 15

interface RecommendationProfile {
  goal: Goal
  gender: Gender
  bodyFatPercentage: number | null
}

function priorityBias(profile: RecommendationProfile): Partial<Record<Exclude<NutrientKey, 'calories'>, number>> {
  const { goal, gender, bodyFatPercentage } = profile
  if (goal !== 'fat_loss' || bodyFatPercentage === null) return {}
  if (bodyFatPercentage < BODY_FAT_HIGH_THRESHOLD[gender]) return {}
  return { protein: -PRIORITY_BIAS, fat: PRIORITY_BIAS }
}

function buildRecommendedMeal(combo: MealComboDef, deficiencyPercent: number): RecommendedMeal {
  const resolved = resolveMealCombo(combo)
  return {
    id: combo.id,
    title: combo.title,
    emoji: combo.emoji,
    ingredients: resolved.ingredients,
    nutrients: resolved.nutrients,
    primaryNutrient: combo.primaryNutrient,
    deficiencyPercent,
  }
}

/**
 * 가장 부족한(달성률이 낮은) 영양소를 기준으로 "다음 식사" 조합을 추천하는 규칙 기반 로직.
 * 결정(무엇을 추천할지)은 전부 여기서 계산한다 — AI는 이 결과를 설명하는 코칭 문구만 덧붙인다
 * (src/services/coachService.ts).
 */
export function getRecommendedMeals(
  consumed: Record<NutrientKey, number>,
  target: NutritionTarget,
  profile: RecommendationProfile,
  eatenTodayFoodNames: string[],
): RecommendedMeal[] {
  const macros: Exclude<NutrientKey, 'calories'>[] = ['protein', 'carbohydrates', 'fat', 'fiber']
  const bias = priorityBias(profile)

  const deficiency = macros
    .map((nutrient) => ({ nutrient, percent: getPercentage(consumed[nutrient], target[nutrient]) + (bias[nutrient] ?? 0) }))
    .filter((m) => m.percent < 100)
    .sort((a, b) => a.percent - b.percent)

  const priorityNutrients = deficiency.length > 0 ? deficiency.map((d) => d.nutrient) : macros
  const eatenTodayNames = new Set(eatenTodayFoodNames)
  const daySeed = Math.floor(Date.now() / 86400000)

  const result: RecommendedMeal[] = []
  for (const nutrient of priorityNutrients) {
    const pool = MEAL_COMBOS.filter((c) => c.primaryNutrient === nutrient)
    const ranked = rankCombos(pool, profile.goal, daySeed + macros.indexOf(nutrient), eatenTodayNames)
    const percent = getPercentage(consumed[nutrient], target[nutrient])
    for (const combo of ranked) {
      if (result.length >= MAX_RECOMMENDATIONS) break
      if (!result.some((r) => r.id === combo.id)) result.push(buildRecommendedMeal(combo, percent))
    }
    if (result.length >= MAX_RECOMMENDATIONS) break
  }

  return result.slice(0, MAX_RECOMMENDATIONS)
}
