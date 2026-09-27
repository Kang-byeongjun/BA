import type { FoodExtraction } from '../../shared/analysis'
import type { FoodDbEntry } from '../data/foodDatabase'
import { generateId } from '../lib/id'
import type { AnalyzedFoodItem, Meal, MealSlot } from '../types'
import {
  calculateNutrients,
  localNutritionProvider,
  roundNutrients,
  sumNutrients,
  type MatchType,
  type NutrientTotals,
  type NutritionProvider,
} from './nutritionService'

/**
 * mealService — 분석 결과(음식 + 중량)를 사용자가 수정 가능한 행으로 바꾸고,
 * 영양소를 계산해 식사 기록(Meal)을 만든다.
 *
 * foodVisionService(무엇을, 얼마나) → nutritionService(영양소 계산) → mealService(식사 기록)
 */

export interface FoodRow {
  key: string
  name: string
  grams: number
  // 영양 DB와 연결된 항목. null이면 영양 정보를 아직 찾지 못한 상태.
  entry: FoodDbEntry | null
  matchType: MatchType
  cookingMethod: string | null
  // AI가 이 음식을 식별한 확신도(0~1). 사용자가 직접 추가한 행은 null.
  confidence: number | null
}

export function createRowsFromExtraction(extraction: FoodExtraction, provider: NutritionProvider = localNutritionProvider): FoodRow[] {
  return extraction.foods.map((food) => {
    const { entry, matchType } = provider.match(food.name)
    return {
      key: generateId('row'),
      name: food.name,
      grams: food.estimatedGrams,
      entry,
      matchType,
      cookingMethod: food.cookingMethod,
      confidence: food.confidence,
    }
  })
}

export function createEmptyRow(): FoodRow {
  return { key: generateId('row'), name: '', grams: 100, entry: null, matchType: 'none', cookingMethod: null, confidence: null }
}

/** 이름을 입력하지 않은 빈 행은 계산·저장에서 제외한다. */
export function isActiveRow(row: FoodRow): boolean {
  return row.name.trim() !== ''
}

/** 영양 DB와 연결된 행의 영양소. 연결되지 않았으면 null (숫자를 임의로 만들지 않는다). */
export function rowNutrients(row: FoodRow): NutrientTotals | null {
  return row.entry ? calculateNutrients(row.entry, row.grams) : null
}

export interface RowsSummary {
  totals: NutrientTotals
  activeCount: number
  // 영양 정보를 찾지 못해 계산에서 빠진 행 수
  unresolvedCount: number
}

export function summarizeRows(rows: FoodRow[]): RowsSummary {
  const active = rows.filter(isActiveRow)
  const resolved = active.flatMap((row) => {
    const n = rowNutrients(row)
    return n ? [n] : []
  })
  return {
    totals: roundNutrients(sumNutrients(resolved)),
    activeCount: active.length,
    unresolvedCount: active.length - resolved.length,
  }
}

export interface BuildMealInput {
  title: string
  slot: MealSlot
  rows: FoodRow[]
  thumbnail: string | null
  timestamp?: number
}

/** 모든 행의 영양 정보가 확정된 경우에만 식사 기록을 만든다. */
export function buildMeal({ title, slot, rows, thumbnail, timestamp }: BuildMealInput): Meal {
  const active = rows.filter(isActiveRow)
  const foods: AnalyzedFoodItem[] = active.map((row) => {
    if (!row.entry) throw new Error('영양 정보를 찾지 못한 음식이 있어 식사를 기록할 수 없습니다.')
    return { name: row.name.trim(), amount: `${Math.round(row.grams)}g`, ...roundNutrients(calculateNutrients(row.entry, row.grams)) }
  })
  const totals = summarizeRows(rows).totals

  return {
    id: generateId('meal'),
    timestamp: timestamp ?? Date.now(),
    slot,
    title: title.trim() || '식사 기록',
    image: thumbnail,
    foods,
    ...totals,
  }
}
