import { toStandardRange, type InBodyStandardRange } from './inBodyBodyType'

// AI가 읽은 막대 끝 위치(value%)가 결과지의 숫자 표준범위(kg)와 어긋날 때 계산값으로 바로잡는다.
// 숫자 범위는 서버가 "min-max@value|kgMin-kgMax" 형태로 문자열 뒤에 덧붙여 내려준다
// (새 필드를 만들면 Anthropic 구조화 출력의 nullable 필드 상한을 넘기 때문).

/** 계산값과 AI가 읽은 값이 이만큼(%p) 이상 차이 나면 계산값을 쓴다. 한 곳에서 바꾼다. */
export const CORRECTION_THRESHOLD_PP = 15
/** 표준 구간 비율(max/min)과 kg 범위 비율이 이 정도(상대 오차)보다 어긋나면 kg 범위를 잘못 읽은 것으로 보고 쓰지 않는다 */
const RANGE_RATIO_TOLERANCE = 0.2
const VALUE_BOUNDS = { min: 10, max: 500 }

const KG_SUFFIX_RE = /\|(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\s*$/

export interface KgRange {
  min: number
  max: number
}

/** "80-160@160|8.2-16.4"에서 kg 범위만 꺼낸다(없거나 이상하면 null) */
export function parseKgRange(raw: string | null): KgRange | null {
  if (raw === null) return null
  const match = KG_SUFFIX_RE.exec(raw.trim())
  if (!match) return null
  const min = Number(match[1])
  const max = Number(match[2])
  return Number.isFinite(min) && Number.isFinite(max) && min > 0 && min < max ? { min, max } : null
}

/** value% = 측정kg ÷ (minKg ÷ (minPct/100)). 계산할 수 없으면 null */
export function computeValuePercent(measuredKg: number | null, range: InBodyStandardRange, kg: KgRange | null): number | null {
  if (measuredKg === null || !Number.isFinite(measuredKg) || measuredKg <= 0 || !kg || range.min <= 0) return null
  const percentRatio = range.max / range.min
  const kgRatio = kg.max / kg.min
  if (Math.abs(kgRatio - percentRatio) / percentRatio > RANGE_RATIO_TOLERANCE) return null
  const value = Math.round((measuredKg * range.min) / kg.min)
  return value >= VALUE_BOUNDS.min && value <= VALUE_BOUNDS.max ? value : null
}

/**
 * 표준범위 문자열을 해석하고, 숫자 표준범위(kg)와 측정값(kg)이 있으면 막대 끝 위치를 보정한다.
 * 숫자 범위가 없거나 차이가 기준(CORRECTION_THRESHOLD_PP) 미만이면 AI가 읽은 값을 그대로 쓴다.
 */
export function toCorrectedStandardRange(raw: string | null, measuredKg: number | null): InBodyStandardRange | null {
  const range = toStandardRange(raw)
  if (!range) return null
  const computed = computeValuePercent(measuredKg, range, parseKgRange(raw))
  if (computed === null) return range
  if (range.value === null || Math.abs(computed - range.value) >= CORRECTION_THRESHOLD_PP) return { ...range, value: computed }
  return range
}
