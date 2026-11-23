import type { FoodExtraction, InBodyExtraction, NutritionEstimateResult } from '../shared/analysis.js'
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// 모델이 돌려준 검사일시를 검증한다: 형식이 올바르고, 실제 날짜이며, 미래이거나(시계/타임존 오차 1일은 허용)
// 너무 먼 과거(InBody가 보급된 시기 이전)가 아니어야 한다.
function validateTestedAtDate(raw: string | null): string | null {
  if (raw === null || !DATE_RE.test(raw)) return null
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const tomorrow = Date.now() + 24 * 60 * 60 * 1000
  if (date.getTime() > tomorrow) return null
  if (date.getFullYear() < 2000) return null
  return raw
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
  | 'ageYears'
  | 'heightCm'
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
  ageYears: { min: 5, max: 120, label: '나이', decimals: 0 },
  heightCm: { min: 100, max: 250, label: '키', decimals: 1 },
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

// InBody "골격근·지방분석" 그래프의 가로축은 kg이 아니라 "표준 대비 %"다(100 = 그 사람의 표준치).
// "표준"(정상) 구간의 좌우 경계와, 이 사람 측정값이 그 축 위 어디에 있는지(점/막대 끝 위치)를 함께
// 받는다: "zoneMin-zoneMax" 또는 측정값 위치까지 읽었으면 "zoneMin-zoneMax@value" 형태의 문자열
// (각각 별도 필드로 두면 Anthropic 구조화 출력의 nullable 파라미터 상한을 넘는다). 체지방량 그래프는
// 100%를 넘어가면 눈금 간격이 넓어지는 비선형 축이라, 상식 범위를 넉넉하게 잡는다.
// 체중·체지방량은 끝에 결과지의 숫자 표준범위(kg)가 "|kgMin-kgMax"로 붙을 수 있다(막대 끝 위치 보정용).
const PERCENT_STANDARD_RE = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(?:@(\d+(?:\.\d+)?))?(?:\|(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?))?$/
const KG_BOUNDS = { min: 0.5, max: 400 }
const ZONE_BOUNDS = { min: 40, max: 250 }
const VALUE_BOUNDS = { min: 10, max: 500 }

interface PercentStandard {
  min: number | null
  max: number | null
  value: number | null
  kg?: { min: number; max: number } | null
}

function validatePercentStandard(raw: string | null): PercentStandard {
  if (raw === null) return { min: null, max: null, value: null }
  const match = PERCENT_STANDARD_RE.exec(raw.trim())
  if (!match) return { min: null, max: null, value: null }
  const min = Number(match[1])
  const max = Number(match[2])
  const value = match[3] !== undefined ? Number(match[3]) : null
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: null, max: null, value: null }
  if (min >= max || min < ZONE_BOUNDS.min || max > ZONE_BOUNDS.max) return { min: null, max: null, value: null }
  const kgMin = match[4] !== undefined ? Number(match[4]) : null
  const kgMax = match[5] !== undefined ? Number(match[5]) : null
  const validKg =
    kgMin !== null && kgMax !== null && Number.isFinite(kgMin) && Number.isFinite(kgMax) && kgMin < kgMax && kgMin >= KG_BOUNDS.min && kgMax <= KG_BOUNDS.max
      ? { min: round(kgMin, 1), max: round(kgMax, 1) }
      : null
  const validValue = value !== null && Number.isFinite(value) && value >= VALUE_BOUNDS.min && value <= VALUE_BOUNDS.max ? value : null
  return { min: round(min, 0), max: round(max, 0), value: validValue !== null ? round(validValue, 0) : null, kg: validKg }
}

// withKg: 체중·체지방량만 숫자 표준범위(kg)를 남긴다(골격근량은 결과지에 숫자 범위가 없다).
function formatPercentStandard(range: PercentStandard, withKg = false): string | null {
  if (range.min === null || range.max === null) return null
  const base = range.value !== null ? `${range.min}-${range.max}@${range.value}` : `${range.min}-${range.max}`
  return withKg && range.kg ? `${base}|${range.kg.min}-${range.kg.max}` : base
}

const BOUNDING_BOX_RE = /^(\d*\.?\d+),(\d*\.?\d+),(\d*\.?\d+),(\d*\.?\d+)$/
const MIN_BOX_WIDTH = 0.03
const MIN_BOX_HEIGHT = 0.02

// "골격근·지방분석" 구역의 위치. 네 수 모두 0~1이고, 너비·높이가 너무 작지 않아야(=모델이 점 하나를
// 찍은 게 아니라 실제로 그 구역을 가리킨 것으로 보여야) 크롭에 쓴다 — 잘못된 박스로 엉뚱한 곳을
// 잘라내느니, 크롭을 포기하고 전체 이미지로 읽은 1차 결과를 그대로 쓰는 편이 낫다.
function validateBoundingBox(raw: string | null): string | null {
  if (raw === null) return null
  const match = BOUNDING_BOX_RE.exec(raw.trim())
  if (!match) return null
  const [xMin, yMin, xMax, yMax] = match.slice(1, 5).map(Number)
  if (![xMin, yMin, xMax, yMax].every(Number.isFinite)) return null
  if (xMin < 0 || yMin < 0 || xMax > 1 || yMax > 1) return null
  if (xMax - xMin < MIN_BOX_WIDTH || yMax - yMin < MIN_BOX_HEIGHT) return null
  return `${round(xMin, 4)},${round(yMin, 4)},${round(xMax, 4)},${round(yMax, 4)}`
}

export function normalizeInBody(raw: InBodyExtraction): InBodyExtraction {
  if (!raw.isInBodyReport) throw new AnalysisError('NOT_IN_BODY_REPORT', 'inbody')

  const warnings = cleanWarnings(raw.warnings)
  const values: Record<InBodyValueKey, number | null> = {
    weightKg: null,
    ageYears: null,
    heightCm: null,
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

  const weightRange = validatePercentStandard(raw.weightStandardRange)
  const muscleRange = validatePercentStandard(raw.skeletalMuscleMassStandardRange)
  const fatRange = validatePercentStandard(raw.bodyFatMassStandardRange)

  return {
    isInBodyReport: true,
    ...values,
    testedAtDate: validateTestedAtDate(raw.testedAtDate),
    weightStandardRange: formatPercentStandard(weightRange, true),
    skeletalMuscleMassStandardRange: formatPercentStandard(muscleRange),
    bodyFatMassStandardRange: formatPercentStandard(fatRange, true),
    muscleFatAnalysisBox: validateBoundingBox(raw.muscleFatAnalysisBox),
    confidence: clamp01(raw.confidence),
    warnings: cleanWarnings(warnings),
  }
}

// 표준범위 재시도(막대그래프 구역만 잘라 확대한 이미지)용. 이 패스는 그 구역 외엔 아무것도 안 보이는 게
// 정상이라, normalizeInBody와 달리 "읽은 값이 하나도 없으면 에러"로 보지 않는다 — 표준범위 세 개만
// 검증해서 돌려주고, 그마저도 다 null이면 호출한 쪽이 "재시도해도 못 읽었다"로 판단해 1차 결과를 쓴다.
export function normalizeInBodyStandardRangeOnly(raw: InBodyExtraction): InBodyExtraction {
  const weightRange = validatePercentStandard(raw.weightStandardRange)
  const muscleRange = validatePercentStandard(raw.skeletalMuscleMassStandardRange)
  const fatRange = validatePercentStandard(raw.bodyFatMassStandardRange)

  return {
    isInBodyReport: true,
    weightKg: null,
    ageYears: null,
    heightCm: null,
    skeletalMuscleMassKg: null,
    bodyFatMassKg: null,
    bodyFatPercentage: null,
    bodyWaterL: null,
    proteinMassKg: null,
    mineralMassKg: null,
    bmi: null,
    basalMetabolicRateKcal: null,
    testedAtDate: null,
    weightStandardRange: formatPercentStandard(weightRange),
    skeletalMuscleMassStandardRange: formatPercentStandard(muscleRange),
    bodyFatMassStandardRange: formatPercentStandard(fatRange),
    muscleFatAnalysisBox: null,
    confidence: clamp01(raw.confidence),
    warnings: cleanWarnings(raw.warnings),
  }
}

type NutritionEstimateKey = 'caloriesPer100g' | 'proteinPer100g' | 'carbsPer100g' | 'fatPer100g' | 'fiberPer100g'

// InBody 값과 달리 여기서는 범위를 벗어나도 null로 버리지 않고 범위 안으로 눌러 담는다 —
// 이 기능 자체가 "정밀한 실측"이 아니라 "대략적인 AI 추정"이라고 밝히고 쓰는 값이기 때문이다.
const NUTRITION_ESTIMATE_RANGES: Record<NutritionEstimateKey, { min: number; max: number; label: string }> = {
  caloriesPer100g: { min: 0, max: 900, label: '칼로리' },
  proteinPer100g: { min: 0, max: 100, label: '단백질' },
  carbsPer100g: { min: 0, max: 100, label: '탄수화물' },
  fatPer100g: { min: 0, max: 100, label: '지방' },
  fiberPer100g: { min: 0, max: 50, label: '식이섬유' },
}

export function normalizeNutritionEstimate(raw: NutritionEstimateResult): NutritionEstimateResult {
  if (!raw.isRecognized) throw new AnalysisError('UNREADABLE', 'nutrition')

  const warnings = cleanWarnings(raw.warnings)
  const values: Record<NutritionEstimateKey, number> = {
    caloriesPer100g: raw.caloriesPer100g,
    proteinPer100g: raw.proteinPer100g,
    carbsPer100g: raw.carbsPer100g,
    fatPer100g: raw.fatPer100g,
    fiberPer100g: raw.fiberPer100g,
  }

  for (const key of Object.keys(NUTRITION_ESTIMATE_RANGES) as NutritionEstimateKey[]) {
    const { min, max, label } = NUTRITION_ESTIMATE_RANGES[key]
    const value = values[key]
    if (!Number.isFinite(value)) {
      values[key] = min
      continue
    }
    if (value < min || value > max) {
      warnings.push(`${label} 추정값이 비정상적이라 범위 안으로 조정했어요.`)
      values[key] = Math.min(max, Math.max(min, value))
    }
  }

  return { ...values, isRecognized: true, confidence: clamp01(raw.confidence), warnings: cleanWarnings(warnings) }
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
