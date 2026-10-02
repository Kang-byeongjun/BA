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

export const MEAL_COMBOS: MealComboDef[] = [
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
