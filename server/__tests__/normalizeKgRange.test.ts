import { describe, expect, it } from 'vitest'
import type { InBodyExtraction } from '../../shared/analysis.js'
import { normalizeInBody } from '../normalize.js'

const raw = (o: Partial<InBodyExtraction>): InBodyExtraction => ({
  isInBodyReport: true,
  weightKg: 107.1,
  ageYears: 30,
  heightCm: 175,
  skeletalMuscleMassKg: 38,
  bodyFatMassKg: 33.3,
  bodyFatPercentage: 31.1,
  bodyWaterL: 50,
  proteinMassKg: 13,
  mineralMassKg: 4,
  bmi: 35,
  basalMetabolicRateKcal: 1900,
  testedAtDate: null,
  weightStandardRange: null,
  skeletalMuscleMassStandardRange: null,
  bodyFatMassStandardRange: null,
  muscleFatAnalysisBox: null,
  confidence: 0.9,
  warnings: [],
  ...o,
})

describe('normalizeInBody: 숫자 표준범위(kg) 접미사', () => {
  it('체중·체지방량의 "|kgMin-kgMax"는 검증해서 남기고, 골격근량에는 남기지 않는다', () => {
    const n = normalizeInBody(
      raw({
        weightStandardRange: '85-115@115|57.9-78.3',
        skeletalMuscleMassStandardRange: '90-110@130|20-30',
        bodyFatMassStandardRange: '80-160@160|8.2-16.4',
      }),
    )
    expect(n.weightStandardRange).toBe('85-115@115|57.9-78.3')
    expect(n.bodyFatMassStandardRange).toBe('80-160@160|8.2-16.4')
    expect(n.skeletalMuscleMassStandardRange).toBe('90-110@130')
  })

  it('kg 범위가 이상하면(min≥max 등) 퍼센트 부분만 남긴다', () => {
    const n = normalizeInBody(raw({ bodyFatMassStandardRange: '80-160@160|16.4-8.2' }))
    expect(n.bodyFatMassStandardRange).toBe('80-160@160')
  })

  it('접미사가 없으면 기존과 똑같이 동작한다', () => {
    expect(normalizeInBody(raw({ bodyFatMassStandardRange: '80-160@160' })).bodyFatMassStandardRange).toBe('80-160@160')
  })
})
