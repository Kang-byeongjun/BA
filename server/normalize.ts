import type { FoodExtraction, InBodyExtraction } from '../shared/analysis.js'
import { AnalysisError } from '../shared/errors.js'

/**
 * 모델 출력을 그대로 믿지 않고 한 번 더 검증·정리한다.
 * - 이미지가 아닌 대상이면 에러로 바꿔 "숫자를 만들어내는 것"을 막는다.
 * - 비현실적인 값은 null로 바꾸고 경고를 남긴다(값을 임의로 보정하지 않는다).
 */

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function cleanWarnings(warnings: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const w of warnings) {
    const text = typeof w === 'string' ? w.trim().slice(0, 160) : ''
    if (text && !seen.has(text)) {
      seen.add(text)
      result.push(text)
    }
    if (result.length >= 8) break
  }
  return result
}

type InBodyValueKey =
  | 'weightKg'
  | 'skeletalMuscleMassKg'
  | 'bodyFatMassKg'
  | 'bodyFatPercentage'
  | 'bodyWaterL'
  | 'proteinMassKg'
  | 'mineralMassKg'
  | 'bmi'
  | 'basalMetabolicRateKcal'

const IN_BODY_RANGES: Record<InBodyValueKey, { min: number; max: number; label: string; decimals: number }> = {
  weightKg: { min: 20, max: 300, label: '체중', decimals: 1 },
  skeletalMuscleMassKg: { min: 5, max: 100, label: '골격근량', decimals: 1 },
  bodyFatMassKg: { min: 1, max: 200, label: '체지방량', decimals: 1 },
  bodyFatPercentage: { min: 1, max: 75, label: '체지방률', decimals: 1 },
  bodyWaterL: { min: 5, max: 150, label: '체수분', decimals: 1 },
  proteinMassKg: { min: 2, max: 40, label: '단백질량', decimals: 1 },
  mineralMassKg: { min: 0.5, max: 10, label: '무기질량', decimals: 2 },
  bmi: { min: 10, max: 70, label: 'BMI', decimals: 1 },
  basalMetabolicRateKcal: { min: 600, max: 4500, label: '기초대사량', decimals: 0 },
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

export function normalizeInBody(raw: InBodyExtraction): InBodyExtraction {
  if (!raw.isInBodyReport) throw new AnalysisError('NOT_IN_BODY_REPORT', 'inbody')

  const warnings = cleanWarnings(raw.warnings)
  const values: Record<InBodyValueKey, number | null> = {
    weightKg: null,
    skeletalMuscleMassKg: null,
    bodyFatMassKg: null,
    bodyFatPercentage: null,
    bodyWaterL: null,
    proteinMassKg: null,
    mineralMassKg: null,
    bmi: null,
    basalMetabolicRateKcal: null,
  }

  for (const key of Object.keys(IN_BODY_RANGES) as InBodyValueKey[]) {
    const { min, max, label, decimals } = IN_BODY_RANGES[key]
    const value = raw[key]
    if (value === null || value === undefined || !Number.isFinite(value)) continue
    if (value < min || value > max) {
      warnings.push(`${label} 값이 비정상적이라 제외했어요. 결과지를 확인하고 직접 입력해주세요.`)
      continue
    }
    values[key] = round(value, decimals)
  }

  if (Object.values(values).every((v) => v === null)) {
    throw new AnalysisError('UNREADABLE', 'inbody')
  }

  const { weightKg, bodyFatMassKg, bodyFatPercentage, skeletalMuscleMassKg } = values
  if (weightKg !== null && bodyFatMassKg !== null && bodyFatPercentage !== null) {
    const implied = (bodyFatMassKg / weightKg) * 100
    if (Math.abs(implied - bodyFatPercentage) > 5) {
      warnings.push('체지방량과 체지방률이 서로 맞지 않아요. 결과지를 보고 값을 확인해주세요.')
    }
  }
  if (weightKg !== null && skeletalMuscleMassKg !== null && skeletalMuscleMassKg > weightKg * 0.75) {
    warnings.push('골격근량이 체중에 비해 너무 커요. 결과지를 보고 값을 확인해주세요.')
  }

  // 체수분 + 단백질 + 무기질 + 체지방량은 체중과 거의 같아야 한다(InBody 체성분 구성의 기본 원리).
  const { bodyWaterL, proteinMassKg, mineralMassKg } = values
  if (weightKg !== null && bodyWaterL !== null && proteinMassKg !== null && mineralMassKg !== null && bodyFatMassKg !== null) {
    const sum = bodyWaterL + proteinMassKg + mineralMassKg + bodyFatMassKg
    if (Math.abs(sum - weightKg) > weightKg * 0.1) {
      warnings.push('체수분·단백질·무기질·체지방량을 더한 값이 체중과 맞지 않아요. 결과지를 보고 값을 확인해주세요.')
    }
  }

  return {
    isInBodyReport: true,
    ...values,
    confidence: clamp01(raw.confidence),
    warnings: cleanWarnings(warnings),
  }
}

const MAX_FOODS = 12
const MIN_GRAMS = 5
const MAX_GRAMS = 2000
const MIN_OVERALL_CONFIDENCE = 0.2

export function normalizeFood(raw: FoodExtraction): FoodExtraction {
  if (!raw.isFood) throw new AnalysisError('NOT_FOOD', 'food')

  const foods: FoodExtraction['foods'] = []
  for (const item of raw.foods) {
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (!name || !Number.isFinite(item.estimatedGrams)) continue
    const cooking = typeof item.cookingMethod === 'string' ? item.cookingMethod.trim() : ''
    foods.push({
      name: name.slice(0, 60),
      estimatedGrams: Math.round(Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, item.estimatedGrams))),
      cookingMethod: cooking ? cooking.slice(0, 30) : null,
      confidence: clamp01(item.confidence),
    })
    if (foods.length >= MAX_FOODS) break
  }

  const overallConfidence = clamp01(raw.overallConfidence)
  if (foods.length === 0 || overallConfidence < MIN_OVERALL_CONFIDENCE) {
    throw new AnalysisError('UNREADABLE', 'food')
  }

  const mealName =
    raw.mealName?.trim().slice(0, 60) ||
    foods
      .slice(0, 3)
      .map((f) => f.name)
      .join(' ')

  return {
    isFood: true,
    mealName,
    foods,
    overallConfidence,
    warnings: cleanWarnings(raw.warnings),
  }
}
