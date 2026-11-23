import type { Gender } from '../types'
import type { InBodyStandardRange } from './inBodyBodyType'

// 결과지에서 읽은 표준 범위가 아니라, 일반 성인 기준의 "고정" 표준 구간이다.
// 인바디 결과 칸의 체지방률·BMI 막대에 쓴다. 기준을 바꾸려면 이 한 곳만 고친다.

/** BMI 표준(정상) 구간. bmi.ts의 classifyBmi 정상 구간(18.5 이상 23 미만)과 같은 값이다. */
export const BMI_STANDARD = { min: 18.5, max: 23 } as const

/** 체지방률(%) 표준 구간, 성별별 */
export const BODY_FAT_PERCENT_STANDARD: Record<Gender, { min: number; max: number }> = {
  male: { min: 10, max: 20 },
  female: { min: 18, max: 28 },
}

/** 막대 아래에 작게 붙이는 안내 — 결과지에서 읽은 값이 아니라는 뜻 */
export const FIXED_RANGE_NOTE = '기준: 일반 성인'

/** 체지방률 막대용 범위. 성별을 모르거나 값이 없으면 null(막대를 그리지 않는다) */
export function bodyFatPercentRange(gender: Gender | undefined | null, value: number | null): InBodyStandardRange | null {
  if (value === null || (gender !== 'male' && gender !== 'female')) return null
  return { ...BODY_FAT_PERCENT_STANDARD[gender], value }
}

/** BMI 막대용 범위. 값이 없으면 null */
export function bmiRange(value: number | null): InBodyStandardRange | null {
  return value === null ? null : { ...BMI_STANDARD, value }
}
