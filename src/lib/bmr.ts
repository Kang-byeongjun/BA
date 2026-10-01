import type { Gender } from '../types'

/**
 * Mifflin-St Jeor 공식으로 기초대사량(BMR)을 추정한다.
 * InBody 실측값이 없는 "간편 온보딩" 경로에서만 사용한다 — 실측값이 있으면 항상 그 값을 우선한다.
 */
export function estimateBasalMetabolicRate(gender: Gender, age: number, heightCm: number, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}
