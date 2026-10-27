import { getFoodById } from '../data/foodDatabase'
import { INGREDIENT_MEAL_COMBOS, type MealComboDef } from '../data/mealCombos'
import { computeGoalFit, resolveMealCombo, type ResolvedMealCombo } from '../services/nutritionService'
import type {
  Gender,
  Goal,
  Meal,
  MealComboIngredientDisplay,
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
  // 보조 정보(그램 수). 사진 기반 섭취량 추정은 본질적으로 정밀하지 않으므로, 메인 메시지는
  // 퍼센트·단계로만 말하고 그램 수는 "약 OOg" 식으로 부가 정보로만 보여준다.
  detail: string | null
}

const FEEDBACK_LABELS: Record<Exclude<NutrientKey, 'calories'>, string> = {
  protein: '단백질',
  carbohydrates: '탄수화물',
  fat: '지방',
  fiber: '식이섬유',
}

// 사진 기반 추정값에 그램 단위까지 정밀하게 보여주면 실제보다 더 정확한 것처럼 보인다.
// 5g 단위로 뭉뚱그려서 "약 30g" 식으로만 보여준다.
function approximateGrams(value: number): number {
  return Math.round(value / 5) * 5
}

/**
 * 현재 섭취량 vs 목표량을 비교하는 단순 규칙 기반 피드백.
 * 메시지는 퍼센트·단계(부족/적정/목표 근접/초과)로 먼저 말하고, 그램 수는 보조 정보로만 덧붙인다 —
 * 사진으로 추정한 섭취량 자체가 정밀하지 않은데 "30g 더 필요해요"처럼 숫자를 메인으로 내세우면
 * 실제보다 더 정확한 것처럼 보이기 때문이다.
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
    const status = getNutritionStatus(percent)
    const remaining = Math.max(0, target[nutrient] - consumed[nutrient])
    const over = Math.max(0, consumed[nutrient] - target[nutrient])

    if (status === 'exceeded') {
      feedback.push({
        nutrient,
        message: `${label}이(가) 목표보다 많이 초과했어요.`,
        detail: over > 0 ? `약 ${approximateGrams(over)}g 더 섭취했어요` : null,
      })
    } else if (status === 'near_goal') {
      feedback.push({ nutrient, message: `${label}은(는) 목표량에 거의 도달했어요.`, detail: null })
    } else if (status === 'deficient') {
      feedback.push({
        nutrient,
        message: `${label}이(가) 목표의 ${percent}%밖에 채워지지 않았어요.`,
        detail: remaining > 0 ? `약 ${approximateGrams(remaining)}g 더 필요해요` : null,
      })
    } else {
      feedback.push({
        nutrient,
        message: `${label}이(가) 아직 목표에 조금 못 미쳤어요.`,
        detail: remaining > 0 ? `약 ${approximateGrams(remaining)}g 더 필요해요` : null,
      })
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

interface RankedCombo {
  combo: MealComboDef
  resolved: ResolvedMealCombo
}

// 콩 4종(렌틸콩·병아리콩·검은콩·강낭콩)처럼 영양 비율이 거의 같은 재료가 추천/대체 목록을
// 독점하지 않도록, 단백질·탄수화물·지방 칼로리 비율(10% 단위)과 식이섬유 밀도(100kcal당 2g 단위)가
// 같은 재료는 "같은 프로필"로 보고 하나만 남긴다. 이 비율은 그램 수를 어떻게 잡아도 변하지
// 않으므로(스케일 불변) 실제 재료 종류 차이만 반영한다.
// 단, 밥류·면류(FoodDbEntry.staple)는 영양 비율이 비슷해도 실제 식사에서는 서로 대체재가 아니라
// 각자 고를 수 있어야 하는 주식이라 이 중복 제거 대상에서 뺀다(항상 자기 자신만의 키를 가진다).
function macroProfileKey(combo: MealComboDef, nutrients: ResolvedMealCombo['nutrients']): string {
  const isStaple = combo.ingredients.length === 1 && getFoodById(combo.ingredients[0].foodId).staple
  if (isStaple) return `staple:${combo.id}`

  const totalKcal = nutrients.calories
  if (totalKcal <= 0) return 'zero'
  const proteinRatio = Math.round(((nutrients.protein * 4) / totalKcal) * 10) / 10
  const carbRatio = Math.round(((nutrients.carbohydrates * 4) / totalKcal) * 10) / 10
  const fatRatio = Math.round(((nutrients.fat * 9) / totalKcal) * 10) / 10
  const fiberDensity = Math.round(((nutrients.fiber / totalKcal) * 100) / 2) * 2
  return `${proteinRatio}|${carbRatio}|${fatRatio}|${fiberDensity}`
}

function dedupeByMacroProfile(items: RankedCombo[]): RankedCombo[] {
  const seen = new Set<string>()
  const result: RankedCombo[] = []
  for (const item of items) {
    const key = macroProfileKey(item.combo, item.resolved.nutrients)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

/**
 * 오늘 이미 먹은 재료로만 구성된 조합은 뒤로 미룬다(완전히 겹칠 때만 제외 — 재료 하나가 겹친다고
 * 막으면 풀이 과도하게 줄어든다). 사용자의 식단 목적(goal)과 맞는 조합을 그다음으로 우선한다 —
 * "어울림"은 조합마다 미리 정해둔 값이 아니라, 실제 계산된 영양 비율로 그때그때 판정한다
 * (nutritionService.computeGoalFit).
 */
function rankCombos(pool: MealComboDef[], goal: Goal, seed: number, eatenTodayNames: Set<string>): RankedCombo[] {
  const notFullyEaten = pool.filter((combo) => {
    if (eatenTodayNames.size === 0) return true
    const ingredientNames = combo.ingredients.map((ing) => getFoodById(ing.foodId).name)
    return !ingredientNames.every((name) => eatenTodayNames.has(name))
  })
  const candidates = notFullyEaten.length > 0 ? notFullyEaten : pool
  const resolvedCandidates: RankedCombo[] = dedupeByMacroProfile(candidates.map((combo) => ({ combo, resolved: resolveMealCombo(combo) })))

  const shuffled = shuffleWithSeed(resolvedCandidates, seed)
  const goalMatched = shuffled.filter((c) => computeGoalFit(c.resolved.nutrients).includes(goal))
  const others = shuffled.filter((c) => !computeGoalFit(c.resolved.nutrients).includes(goal))
  return [...goalMatched, ...others]
}

// 체지방률이 성별 기준 "높은 편"이고 목적이 체지방감량이면, 같은 달성률이라도 단백질을 더 급하게,
// 지방을 덜 급하게 취급해 추천 우선순위를 저탄고단 쪽으로 살짝 기울인다(참고용 보정 — 실제 달성률
// 숫자 자체는 바꾸지 않고, 추천 순서에만 영향을 준다. generateFeedback에서 보여주는 수치는 그대로다).
const BODY_FAT_HIGH_THRESHOLD: Record<Gender, number> = { male: 25, female: 32 }
const PRIORITY_BIAS = 15

export interface RecommendationProfile {
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

function buildRecommendedMeal(
  combo: MealComboDef,
  resolved: ResolvedMealCombo,
  deficiencyPercent: number,
  alternatives: MealComboIngredientDisplay[],
): RecommendedMeal {
  return {
    id: combo.id,
    title: combo.title,
    emoji: combo.emoji,
    ingredients: resolved.ingredients,
    nutrients: resolved.nutrients,
    primaryNutrient: combo.primaryNutrient,
    deficiencyPercent,
    alternatives,
  }
}

// 대체 재료는 한눈에 훑어볼 정도로만 보여준다(너무 많으면 "오늘 보충하면 좋은 재료" 카드가 길어진다).
const ALTERNATIVE_LIMIT = 6

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

  // 완성된 한 끼 조합은 못 먹는 음식이거나 만들기 번거로울 수 있어 추천하지 않는다 —
  // 지금 먹는 식단에 더하기만 하면 되는 재료 단위 풀에서만 추천한다.
  const candidatesByNutrient = priorityNutrients.map((nutrient) => {
    const pool = INGREDIENT_MEAL_COMBOS.filter((c) => c.primaryNutrient === nutrient)
    const ranked = rankCombos(pool, profile.goal, daySeed + macros.indexOf(nutrient), eatenTodayNames)
    const percent = getPercentage(consumed[nutrient], target[nutrient])
    return { nutrient, ranked, percent, cursor: 0 }
  })

  // 부족한 영양소가 여러 개면 한 영양소에서 자리를 다 채우지 않고, 한 바퀴 돌며 영양소마다
  // 한 자리씩 먼저 채운다(라운드로빈) — 그래야 "단백질만 3개" 대신 부족한 영양소가 고르게 보인다.
  // 자리가 남으면(부족한 영양소가 적을 때) 다음 순위 재료로 마저 채운다.
  const chosen: { combo: MealComboDef; resolved: ResolvedMealCombo; nutrient: Exclude<NutrientKey, 'calories'>; percent: number }[] = []
  let addedInPass = true
  while (chosen.length < MAX_RECOMMENDATIONS && addedInPass) {
    addedInPass = false
    for (const candidate of candidatesByNutrient) {
      if (chosen.length >= MAX_RECOMMENDATIONS) break
      while (candidate.cursor < candidate.ranked.length) {
        const { combo, resolved } = candidate.ranked[candidate.cursor]
        candidate.cursor += 1
        if (chosen.some((c) => c.combo.id === combo.id)) continue
        chosen.push({ combo, resolved, nutrient: candidate.nutrient, percent: candidate.percent })
        addedInPass = true
        break
      }
    }
  }

  // 추천한 재료가 집에 없을 때를 위해, 같은 영양소를 채우는 다른 재료도 몇 개 같이 들려보낸다.
  // 이미 카드로 나온 재료는 대체 목록에서 또 안 보이게 뺀다.
  const chosenIds = new Set(chosen.map((c) => c.combo.id))
  const result = chosen.map((c) => {
    const candidate = candidatesByNutrient.find((cand) => cand.nutrient === c.nutrient)
    const alternatives = (candidate?.ranked ?? [])
      .filter((entry) => !chosenIds.has(entry.combo.id))
      .slice(0, ALTERNATIVE_LIMIT)
      .map((entry) => entry.resolved.ingredients[0])
      .filter((ingredient): ingredient is MealComboIngredientDisplay => ingredient !== undefined)
    return buildRecommendedMeal(c.combo, c.resolved, c.percent, alternatives)
  })

  return result.slice(0, MAX_RECOMMENDATIONS)
}
