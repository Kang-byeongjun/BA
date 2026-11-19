import { describe, expect, it } from 'vitest'
import type { InBodyExtraction } from '../../../shared/analysis'
import { hasMissingStandardRange, mergeStandardRanges, parseBoxFraction } from '../inBodyStandardRangeRetry'

const base: InBodyExtraction = {
  isInBodyReport: true,
  weightKg: 75.2,
  ageYears: 30,
  heightCm: 175,
  skeletalMuscleMassKg: 34.1,
  bodyFatMassKg: 13.8,
  bodyFatPercentage: 18.4,
  bodyWaterL: 42.5,
  proteinMassKg: 13,
  mineralMassKg: 4.5,
  bmi: 24.6,
  basalMetabolicRateKcal: 1702,
  testedAtDate: '2026-11-09',
  weightStandardRange: null,
  skeletalMuscleMassStandardRange: null,
  bodyFatMassStandardRange: null,
  muscleFatAnalysisBox: null,
  confidence: 0.9,
  warnings: [],
}

describe('parseBoxFraction', () => {
  it('"xMin,yMin,xMax,yMax" 형식을 객체로 바꾼다', () => {
    expect(parseBoxFraction('0.1,0.4,0.9,0.7')).toEqual({ xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.7 })
  })

  it('null은 그대로 null', () => {
    expect(parseBoxFraction(null)).toBeNull()
  })

  it('형식이 안 맞으면 null', () => {
    expect(parseBoxFraction('0.1,0.4,0.9')).toBeNull()
    expect(parseBoxFraction('가,나,다,라')).toBeNull()
  })

  it('xMin >= xMax 이거나 yMin >= yMax면 null', () => {
    expect(parseBoxFraction('0.5,0.4,0.5,0.7')).toBeNull()
    expect(parseBoxFraction('0.1,0.7,0.9,0.7')).toBeNull()
  })

  it('0~1 범위를 벗어나면 null', () => {
    expect(parseBoxFraction('-0.1,0.4,0.9,0.7')).toBeNull()
    expect(parseBoxFraction('0.1,0.4,1.1,0.7')).toBeNull()
  })
})

describe('hasMissingStandardRange', () => {
  it('표준범위 세 개 중 하나라도 null이면 true', () => {
    expect(hasMissingStandardRange({ ...base, weightStandardRange: '70-80' })).toBe(true)
  })

  it('세 개 모두 채워져 있으면 false', () => {
    expect(
      hasMissingStandardRange({
        ...base,
        weightStandardRange: '70-80',
        skeletalMuscleMassStandardRange: '32-40',
        bodyFatMassStandardRange: '10-18',
      }),
    ).toBe(false)
  })
})

describe('mergeStandardRanges', () => {
  it('1차 결과에서 비어 있던 표준범위만 재시도 결과로 채운다', () => {
    const primary: InBodyExtraction = { ...base, weightStandardRange: null, skeletalMuscleMassStandardRange: '32-40', bodyFatMassStandardRange: null }
    const retry: InBodyExtraction = { ...base, weightStandardRange: '70-80', skeletalMuscleMassStandardRange: '99-99', bodyFatMassStandardRange: '10-18' }
    const merged = mergeStandardRanges(primary, retry)
    expect(merged.weightStandardRange).toBe('70-80')
    expect(merged.skeletalMuscleMassStandardRange).toBe('32-40')
    expect(merged.bodyFatMassStandardRange).toBe('10-18')
  })

  it('1차 결과의 다른 필드(체중 등)는 그대로 둔다', () => {
    const primary: InBodyExtraction = { ...base, weightKg: 75.2 }
    const retry: InBodyExtraction = { ...base, weightKg: null, weightStandardRange: '70-80' }
    expect(mergeStandardRanges(primary, retry).weightKg).toBe(75.2)
  })

  it('재시도도 null이면 그대로 null', () => {
    const primary: InBodyExtraction = { ...base, weightStandardRange: null }
    const retry: InBodyExtraction = { ...base, weightStandardRange: null }
    expect(mergeStandardRanges(primary, retry).weightStandardRange).toBeNull()
  })
})
