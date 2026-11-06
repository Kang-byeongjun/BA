import { normalizeFoodName } from '../services/nutritionService'
import { loadFromStorage, saveToStorage } from './storage'

/**
 * portionCorrection — 사용자가 AI의 양 추정을 고친 이력을 음식별로 모아두고, 다음에 같은
 * 음식을 찍었을 때 AI의 첫 추정치를 그 이력에 맞게 보정한다. AI 인식 자체를 바꾸는 게
 * 아니라, 과거 보정 비율(사용자가 고친 양 ÷ AI 추정 양)의 평균을 다음 추정에 곱하는 방식이다.
 */

const STORAGE_KEY = 'portionCorrections'

// 보정 비율이 과하게 튀는 걸 막는 범위 — 한두 번의 극단적인 수정으로 다음 추정이
// 터무니없이 바뀌지 않게 한다.
const MIN_FACTOR = 0.5
const MAX_FACTOR = 2
// 이 횟수 이상 수정 이력이 쌓여야 보정을 적용한다(한 번의 우연한 수정으로 바로 반영하지 않음).
const MIN_SAMPLES = 2
// 음식 하나당 최근 이력만 남긴다 — 오래전 습관보다 최근 수정이 더 많이 반영되게.
const MAX_SAMPLES_PER_FOOD = 10

// 정규화된 음식 이름 → 최근 보정 비율(사용자 최종 grams ÷ AI 추정 grams) 목록
type CorrectionHistory = Record<string, number[]>

function loadHistory(): CorrectionHistory {
  return loadFromStorage<CorrectionHistory>(STORAGE_KEY, {})
}

/** 사용자가 AI 추정 그램 수를 실제로 고쳐서 저장했을 때 호출한다. */
export function recordPortionCorrection(foodName: string, aiGrams: number, finalGrams: number): void {
  if (!(aiGrams > 0) || !(finalGrams > 0)) return
  const key = normalizeFoodName(foodName)
  if (!key) return

  const ratio = finalGrams / aiGrams
  const history = loadHistory()
  const samples = [...(history[key] ?? []), ratio].slice(-MAX_SAMPLES_PER_FOOD)
  saveToStorage(STORAGE_KEY, { ...history, [key]: samples })
}

/** 이 음식에 대해 믿을 만한 보정 이력이 있으면 보정 비율을, 없으면 null을 돌려준다. */
export function getPortionCorrectionFactor(foodName: string): number | null {
  const key = normalizeFoodName(foodName)
  if (!key) return null

  const samples = loadHistory()[key]
  if (!samples || samples.length < MIN_SAMPLES) return null

  const average = samples.reduce((sum, ratio) => sum + ratio, 0) / samples.length
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, average))
}

/** AI가 추정한 그램 수에 이 음식의 개인화 보정을 적용한다. 이력이 없으면 원래 값 그대로. */
export function applyPortionCorrection(foodName: string, aiGrams: number): number {
  const factor = getPortionCorrectionFactor(foodName)
  return factor === null ? aiGrams : Math.max(1, Math.round(aiGrams * factor))
}
