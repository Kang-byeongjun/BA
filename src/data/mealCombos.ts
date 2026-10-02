import { FOOD_DATABASE, type FoodCategory, type FoodDbEntry } from './foodDatabase'
import type { NutrientKey } from '../types'

/**
 * 부족 영양소 기반 "다음 식사" 추천 풀.
 *
 * 개별 재료가 아니라 실제로 먹을 법한 한 끼 조합(2~3가지 재료)으로 추천한다.
 * 영양소 숫자는 여기서 만들지 않는다 — foodId로 src/data/foodDatabase.ts를 참조하고,
 * 실제 수치는 nutritionService.resolveMealCombo()가 100g당 데이터로 계산한다.
 *
 * 이 조합이 어떤 식단 목적에 어울리는지도 여기서 직접 정하지 않는다 — 조합마다 사람이
 * goal을 지정하던 방식에서, 계산된 영양 비율로 자동 판정하는 방식(nutritionService.computeGoalFit)
 * 으로 바꿨다.
 *
 * 풀 자체도 두 부분으로 구성된다:
 * - CURATED_MEAL_COMBOS: 재료 2~3가지를 사람이 직접 짝지은 조합(아래)
 * - generateDishCombos(): foodDatabase.ts의 한식/중식/일식/양식/분식 "완성 요리"를
 *   전부 1인분 추천 조합으로 자동 변환한 것. 하나씩 고르는 대신 요리당 1인분 칼로리(500kcal
 *   기준)로 환산하고, primaryNutrient도 계산된 비율로 자동 분류한다 — 그래서 손으로 24개를
 *   고르는 방식보다 풀이 훨씬 커지고(150개 이상), 식재료가 바뀌면 자동으로 따라간다.
 */

export interface MealComboIngredientSpec {
  foodId: string
  grams: number
}

export interface MealComboDef {
  id: string
  title: string
  emoji: string
  ingredients: MealComboIngredientSpec[]
  // 이 조합을 추천할 때 기준이 되는 영양소
  primaryNutrient: Exclude<NutrientKey, 'calories'>
}

const CURATED_MEAL_COMBOS: MealComboDef[] = [
  // ------------------------------------------------------------------
  // 단백질
  // ------------------------------------------------------------------
  {
    id: 'combo-chicken-rice-broccoli',
    title: '닭가슴살 현미밥 브로콜리',
    emoji: '🍗',
    ingredients: [
      { foodId: 'chicken-breast', grams: 120 },
      { foodId: 'brown-rice', grams: 150 },
      { foodId: 'broccoli', grams: 80 },
    ],
    primaryNutrient: 'protein',
  },
  {
    id: 'combo-salmon-salad',
    title: '연어 샐러드',
    emoji: '🐟',
    ingredients: [
      { foodId: 'salmon', grams: 120 },
      { foodId: 'green-salad', grams: 150 },
    ],
    primaryNutrient: 'protein',
  },
  {
    id: 'combo-tofu-rice',
    title: '두부조림 흰쌀밥',
    emoji: '🥢',
    ingredients: [
      { foodId: 'tofu', grams: 150 },
      { foodId: 'white-rice', grams: 100 },
    ],
    primaryNutrient: 'protein',
  },
  {
    id: 'combo-yogurt-blueberry',
    title: '그릭요거트 블루베리',
    emoji: '🥣',
    ingredients: [
      { foodId: 'greek-yogurt', grams: 200 },
      { foodId: 'blueberry', grams: 80 },
    ],
    primaryNutrient: 'protein',
  },
  {
    id: 'combo-shrimp-veggie',
    title: '새우 야채볶음',
    emoji: '🦐',
    ingredients: [
      { foodId: 'shrimp', grams: 120 },
      { foodId: 'broccoli', grams: 60 },
      { foodId: 'carrot', grams: 50 },
    ],
    primaryNutrient: 'protein',
  },
  {
    id: 'combo-beef-salad',
    title: '소고기 안심 샐러드',
    emoji: '🥩',
    ingredients: [
      { foodId: 'beef-tenderloin', grams: 130 },
      { foodId: 'green-salad', grams: 100 },
    ],
    primaryNutrient: 'protein',
  },

  // ------------------------------------------------------------------
  // 탄수화물
  // ------------------------------------------------------------------
  {
    id: 'combo-rice-bulgogi',
    title: '현미밥 불고기',
    emoji: '🍚',
    ingredients: [
      { foodId: 'brown-rice', grams: 150 },
      { foodId: 'bulgogi', grams: 100 },
    ],
    primaryNutrient: 'carbohydrates',
  },
  {
    id: 'combo-onigiri-edamame',
    title: '오니기리 에다마메',
    emoji: '🍙',
    ingredients: [
      { foodId: 'onigiri', grams: 100 },
      { foodId: 'edamame', grams: 80 },
    ],
    primaryNutrient: 'carbohydrates',
  },
  {
    id: 'combo-sweet-potato',
    title: '고구마 두 개',
    emoji: '🍠',
    ingredients: [{ foodId: 'sweet-potato', grams: 300 }],
    primaryNutrient: 'carbohydrates',
  },
  {
    id: 'combo-banana-oatmeal',
    title: '바나나 오트밀',
    emoji: '🍌',
    ingredients: [
      { foodId: 'banana', grams: 120 },
      { foodId: 'oatmeal', grams: 100 },
    ],
    primaryNutrient: 'carbohydrates',
  },
  {
    id: 'combo-multigrain-doenjang',
    title: '잡곡밥 된장찌개',
    emoji: '🍲',
    ingredients: [
      { foodId: 'multigrain-rice', grams: 150 },
      { foodId: 'doenjang-jjigae', grams: 200 },
    ],
    primaryNutrient: 'carbohydrates',
  },
  {
    id: 'combo-potato-salad',
    title: '감자 샐러드',
    emoji: '🥔',
    ingredients: [
      { foodId: 'potato', grams: 200 },
      { foodId: 'green-salad', grams: 100 },
    ],
    primaryNutrient: 'carbohydrates',
  },

  // ------------------------------------------------------------------
  // 지방
  // ------------------------------------------------------------------
  {
    id: 'combo-avocado-toast',
    title: '아보카도 토스트',
    emoji: '🥑',
    ingredients: [
      { foodId: 'avocado', grams: 100 },
      { foodId: 'bread', grams: 60 },
    ],
    primaryNutrient: 'fat',
  },
  {
    id: 'combo-nuts-yogurt',
    title: '견과류 그릭요거트',
    emoji: '🌰',
    ingredients: [
      { foodId: 'mixed-nuts', grams: 30 },
      { foodId: 'greek-yogurt', grams: 150 },
    ],
    primaryNutrient: 'fat',
  },
  {
    id: 'combo-salmon-steak-salad',
    title: '연어스테이크 샐러드',
    emoji: '🍣',
    ingredients: [
      { foodId: 'salmon-steak', grams: 150 },
      { foodId: 'green-salad', grams: 100 },
    ],
    primaryNutrient: 'fat',
  },
  {
    id: 'combo-porkbelly-cabbage',
    title: '삼겹살 구이 양배추쌈',
    emoji: '🥓',
    ingredients: [
      { foodId: 'pork-belly', grams: 150 },
      { foodId: 'cabbage', grams: 100 },
    ],
    primaryNutrient: 'fat',
  },
  {
    id: 'combo-tonkatsu-cabbage',
    title: '돈카츠 정식',
    emoji: '🍖',
    ingredients: [
      { foodId: 'tonkatsu', grams: 150 },
      { foodId: 'cabbage', grams: 100 },
    ],
    primaryNutrient: 'fat',
  },
  {
    id: 'combo-almond-soymilk',
    title: '아몬드 두유',
    emoji: '🥜',
    ingredients: [
      { foodId: 'almond', grams: 30 },
      { foodId: 'soy-milk', grams: 200 },
    ],
    primaryNutrient: 'fat',
  },

  // ------------------------------------------------------------------
  // 식이섬유
  // ------------------------------------------------------------------
  {
    id: 'combo-salad-sweetpotato',
    title: '그린샐러드 고구마',
    emoji: '🥗',
    ingredients: [
      { foodId: 'green-salad', grams: 150 },
      { foodId: 'sweet-potato', grams: 150 },
    ],
    primaryNutrient: 'fiber',
  },
  {
    id: 'combo-broccoli-rice',
    title: '브로콜리 현미밥',
    emoji: '🥦',
    ingredients: [
      { foodId: 'broccoli', grams: 150 },
      { foodId: 'brown-rice', grams: 100 },
    ],
    primaryNutrient: 'fiber',
  },
  {
    id: 'combo-apple-oatmeal',
    title: '사과 오트밀',
    emoji: '🍎',
    ingredients: [
      { foodId: 'apple', grams: 200 },
      { foodId: 'oatmeal', grams: 80 },
    ],
    primaryNutrient: 'fiber',
  },
  {
    id: 'combo-namul-rice',
    title: '나물무침 잡곡밥',
    emoji: '🥬',
    ingredients: [
      { foodId: 'namul-muchim', grams: 150 },
      { foodId: 'multigrain-rice', grams: 100 },
    ],
    primaryNutrient: 'fiber',
  },
  {
    id: 'combo-siraegi-rice',
    title: '시래기국 현미밥',
    emoji: '🍵',
    ingredients: [
      { foodId: 'siraegi-guk', grams: 200 },
      { foodId: 'brown-rice', grams: 100 },
    ],
    primaryNutrient: 'fiber',
  },
  {
    id: 'combo-edamame-salad',
    title: '에다마메 그린샐러드',
    emoji: '🫛',
    ingredients: [
      { foodId: 'edamame', grams: 100 },
      { foodId: 'green-salad', grams: 100 },
    ],
    primaryNutrient: 'fiber',
  },
]

// ---------------------------------------------------------------------------
// 완성 요리 자동 변환 — foodDatabase.ts의 한식/중식/일식/양식/분식 카테고리를 전부 1인분
// 추천 조합으로 바꾼다. 재료(단백질/탄수화물 등)·과일·채소·디저트·음료 카테고리는 제외한다
// (재료는 위 CURATED_MEAL_COMBOS에서 이미 의미 있게 조합했고, 과일/채소/디저트/음료 단독은
// "한 끼 식사"로 보기 어렵다).
// ---------------------------------------------------------------------------

const DISH_CATEGORIES: FoodCategory[] = ['한식', '중식', '일식', '양식', '분식']

// 칼로리 계산상 문제는 없지만 반찬(소량 곁들임)이라 "500g이 한 끼"로 환산하면 비현실적인
// 두 가지만 예외로 뺀다. 나머지는 그대로 자동 변환한다(판단을 최소화하기 위함).
const DISH_EXCLUDE_IDS = new Set(['kimchi', 'kkakdugi'])

const CATEGORY_EMOJI: Partial<Record<FoodCategory, string>> = {
  한식: '🍚',
  중식: '🥡',
  일식: '🍱',
  양식: '🍝',
  분식: '🍢',
}

// 한 끼로 추천할 만한 칼로리 — 이 칼로리에 맞춰 요리별 1인분 그램 수를 역산한다.
const TARGET_MEAL_CALORIES = 500
const MIN_SERVING_GRAMS = 120
const MAX_SERVING_GRAMS = 500

// computeGoalFit(nutritionService.ts)의 건강관리 판정 기준과 같은 값 — 식이섬유가
// 칼로리 대비 이 정도면 "식이섬유 중심" 음식으로 본다. 기준을 두 곳에서 따로 정하지 않기 위해 맞춘다.
const FIBER_PRIMARY_THRESHOLD_PER_1000KCAL = 8

interface EstimatedNutrients {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

function estimateNutrients(entry: FoodDbEntry, grams: number): EstimatedNutrients {
  const factor = grams / 100
  return {
    calories: entry.caloriesPer100g * factor,
    protein: entry.proteinPer100g * factor,
    carbohydrates: entry.carbsPer100g * factor,
    fat: entry.fatPer100g * factor,
    fiber: entry.fiberPer100g * factor,
  }
}

/** 식이섬유 비중이 충분히 높으면 식이섬유로, 아니면 칼로리 비중이 가장 큰 매크로로 분류한다. */
function determinePrimaryNutrient(n: EstimatedNutrients): Exclude<NutrientKey, 'calories'> {
  if (n.calories <= 0) return 'carbohydrates'

  const fiberPer1000Kcal = (n.fiber / n.calories) * 1000
  if (fiberPer1000Kcal >= FIBER_PRIMARY_THRESHOLD_PER_1000KCAL) return 'fiber'

  const proteinKcal = n.protein * 4
  const carbKcal = n.carbohydrates * 4
  const fatKcal = n.fat * 9
  const maxKcal = Math.max(proteinKcal, carbKcal, fatKcal)
  if (maxKcal === proteinKcal) return 'protein'
  if (maxKcal === fatKcal) return 'fat'
  return 'carbohydrates'
}

function generateDishCombos(): MealComboDef[] {
  return FOOD_DATABASE.filter((entry) => DISH_CATEGORIES.includes(entry.category) && !DISH_EXCLUDE_IDS.has(entry.id)).map(
    (entry) => {
      const rawGrams = (TARGET_MEAL_CALORIES / entry.caloriesPer100g) * 100
      const grams = Math.min(MAX_SERVING_GRAMS, Math.max(MIN_SERVING_GRAMS, Math.round(rawGrams / 10) * 10))
      const nutrients = estimateNutrients(entry, grams)
      return {
        id: `auto-${entry.id}`,
        title: entry.name,
        emoji: CATEGORY_EMOJI[entry.category] ?? '🍽️',
        ingredients: [{ foodId: entry.id, grams }],
        primaryNutrient: determinePrimaryNutrient(nutrients),
      }
    },
  )
}

export const MEAL_COMBOS: MealComboDef[] = [...CURATED_MEAL_COMBOS, ...generateDishCombos()]
