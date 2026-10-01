import { FOOD_DATABASE, getFoodById, searchFoodDatabase, type FoodDbEntry } from '../data/foodDatabase'
import type { MealComboDef } from '../data/mealCombos'
import type { MealComboIngredientDisplay } from '../types'

/**
 * nutritionService — 음식 이름 + 중량(g)으로 영양소를 계산한다.
 *
 * AI(Claude)는 "음식 종류와 예상 중량"만 식별하고, 칼로리·영양소 숫자는 여기서
 * 영양 데이터셋으로 계산한다. AI가 영양소 숫자를 상상해서 만들지 않는다.
 *
 * 영양 데이터 출처는 NutritionProvider 인터페이스 뒤에 숨겨져 있어, 지금의 임시 로컬 DB
 * (src/data/foodDatabase.ts)를 식약처 식품영양성분DB 등 신뢰할 수 있는 API로 교체할 수 있다.
 */

export interface NutrientTotals {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

export type MatchType = 'exact' | 'partial' | 'none'

export interface FoodMatch {
  entry: FoodDbEntry | null
  matchType: MatchType
}

export interface NutritionProvider {
  /** AI가 식별한 음식 이름을 영양 DB 항목에 연결한다. */
  match(name: string): FoodMatch
  /** 사용자가 음식 이름을 직접 검색할 때(자동완성) 사용한다. */
  search(query: string, limit?: number): FoodDbEntry[]
}

export const EMPTY_TOTALS: NutrientTotals = { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 }

// ---------------------------------------------------------------------------
// 로컬(임시) 영양 DB Provider
// ---------------------------------------------------------------------------

export function normalizeFoodName(name: string): string {
  return name.toLowerCase().replace(/[\s·・,.()[\]/_\-+&]+/g, '')
}

// AI가 자주 쓰는 다른 표현 → DB 항목 id
const ALIASES: Record<string, string> = {
  쌀밥: 'white-rice',
  공기밥: 'white-rice',
  밥: 'white-rice',
  백미밥: 'white-rice',
  흰밥: 'white-rice',
  계란: 'egg',
  삶은계란: 'egg',
  구운계란: 'egg',
  계란후라이: 'egg',
  계란프라이: 'egg',
  달걀후라이: 'egg',
  달걀프라이: 'egg',
  소고기: 'beef-sirloin',
  쇠고기: 'beef-sirloin',
  요거트: 'yogurt-plain',
  요구르트: 'yogurt-plain',
  그릭요구르트: 'greek-yogurt',
  샐러드: 'green-salad',
  빵: 'bread',
  커피: 'americano',
}

function createLocalProvider(entries: FoodDbEntry[]): NutritionProvider {
  const byNormalizedName = new Map<string, FoodDbEntry>()
  const byId = new Map<string, FoodDbEntry>()
  for (const entry of entries) {
    byId.set(entry.id, entry)
    const key = normalizeFoodName(entry.name)
    if (!byNormalizedName.has(key)) byNormalizedName.set(key, entry)
  }

  return {
    match(name) {
      const q = normalizeFoodName(name)
      if (!q) return { entry: null, matchType: 'none' }

      const exact = byNormalizedName.get(q)
      if (exact) return { entry: exact, matchType: 'exact' }

      const aliasId = ALIASES[q]
      const aliased = aliasId ? byId.get(aliasId) : undefined
      if (aliased) return { entry: aliased, matchType: 'exact' }

      // 부분 일치: "구운 닭가슴살" → 닭가슴살 처럼 DB 이름이 질의에 포함되는 경우를 우선(가장 긴 이름)
      let contained: FoodDbEntry | null = null
      let containedLength = 0
      for (const [key, entry] of byNormalizedName) {
        if (key.length >= 2 && q.includes(key) && key.length > containedLength) {
          contained = entry
          containedLength = key.length
        }
      }
      if (contained) return { entry: contained, matchType: 'partial' }

      // 질의가 DB 이름의 일부인 경우(가장 짧은 이름)
      if (q.length >= 2) {
        let containing: FoodDbEntry | null = null
        let containingLength = Infinity
        for (const [key, entry] of byNormalizedName) {
          if (key.includes(q) && key.length < containingLength) {
            containing = entry
            containingLength = key.length
          }
        }
        if (containing) return { entry: containing, matchType: 'partial' }
      }

      return { entry: null, matchType: 'none' }
    },
    search: (query, limit) => searchFoodDatabase(query, limit),
  }
}

export const localNutritionProvider: NutritionProvider = createLocalProvider(FOOD_DATABASE)

// ---------------------------------------------------------------------------
// 계산
// ---------------------------------------------------------------------------

/** 100g당 영양소 × 중량. 합산 오차를 줄이기 위해 여기서는 반올림하지 않는다. */
export function calculateNutrients(entry: FoodDbEntry, grams: number): NutrientTotals {
  const factor = Math.max(0, grams) / 100
  return {
    calories: entry.caloriesPer100g * factor,
    protein: entry.proteinPer100g * factor,
    carbohydrates: entry.carbsPer100g * factor,
    fat: entry.fatPer100g * factor,
    fiber: entry.fiberPer100g * factor,
  }
}

export function sumNutrients(list: NutrientTotals[]): NutrientTotals {
  return list.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein: acc.protein + n.protein,
      carbohydrates: acc.carbohydrates + n.carbohydrates,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
    }),
    EMPTY_TOTALS,
  )
}

export function roundNutrients(n: NutrientTotals): NutrientTotals {
  return {
    calories: Math.round(n.calories),
    protein: Math.round(n.protein),
    carbohydrates: Math.round(n.carbohydrates),
    fat: Math.round(n.fat),
    fiber: Math.round(n.fiber),
  }
}

export interface ResolvedMealCombo {
  ingredients: MealComboIngredientDisplay[]
  nutrients: NutrientTotals
}

/** 추천 식사 조합(mealCombos.ts)의 재료 id+중량을 실제 영양 수치로 계산한다. */
export function resolveMealCombo(combo: MealComboDef): ResolvedMealCombo {
  const resolved = combo.ingredients.map((ing) => {
    const entry = getFoodById(ing.foodId)
    return { name: entry.name, amount: `${ing.grams}g`, nutrients: calculateNutrients(entry, ing.grams) }
  })
  return {
    ingredients: resolved.map((r) => ({ name: r.name, amount: r.amount })),
    nutrients: roundNutrients(sumNutrients(resolved.map((r) => r.nutrients))),
  }
}
