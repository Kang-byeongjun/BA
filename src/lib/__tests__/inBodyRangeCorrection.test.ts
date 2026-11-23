import { describe, expect, it } from 'vitest'
import type { InBodyExtraction } from '../../../shared/analysis'
import { toMeasurements } from '../../services/inBodyVisionService'
import { classifyBodyType, toStandardRange } from '../inBodyBodyType'
import { CORRECTION_THRESHOLD_PP, parseKgRange, toCorrectedStandardRange } from '../inBodyRangeCorrection'

// 실제 AI 호출 없이, AI가 읽은 값(문자열)을 가정해서 만든 추출 결과다.
const extraction = (o: Partial<InBodyExtraction>): InBodyExtraction => ({
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
  testedAtDate: '2026-11-20',
  weightStandardRange: null,
  skeletalMuscleMassStandardRange: '90-110@130',
  bodyFatMassStandardRange: null,
  muscleFatAnalysisBox: null,
  confidence: 0.9,
  warnings: [],
  ...o,
})

describe('막대 끝 위치 보정 (숫자 표준범위 kg 기반)', () => {
  it('(a) 체지방량 막대 끝을 AI가 160으로 읽어도 약 325%로, 체중은 약 157%로 보정되어 C형이 된다', () => {
    const m = toMeasurements(
      extraction({
        weightStandardRange: '85-115@115|57.9-78.3',
        bodyFatMassStandardRange: '80-160@160|8.2-16.4',
      }),
    )
    expect(m.standardRanges?.bodyFatMass?.value).toBe(325)
    expect(m.standardRanges?.weight?.value).toBe(157)
    expect(m.standardRanges?.skeletalMuscleMass).toEqual({ min: 90, max: 110, value: 130 }) // 골격근량은 그대로
    expect(m.bodyType).toBe('C')
  })

  it('(b) 숫자 범위가 없으면 보정하지 않고 AI가 읽은 값을 그대로 쓴다(이 경우 I형)', () => {
    const m = toMeasurements(extraction({ weightStandardRange: '85-115@115', bodyFatMassStandardRange: '80-160@160' }))
    expect(m.standardRanges?.bodyFatMass?.value).toBe(160)
    expect(m.standardRanges?.weight?.value).toBe(115)
    expect(m.bodyType).toBe('I')
  })

  it('(c) 계산값과 AI 값의 차이가 15%p 미만이면 AI 값을 유지한다', () => {
    expect(CORRECTION_THRESHOLD_PP).toBe(15)
    expect(toCorrectedStandardRange('80-160@320|8.2-16.4', 33.3)?.value).toBe(320) // 계산값 325, 차이 5
    expect(toCorrectedStandardRange('80-160@311|8.2-16.4', 33.3)?.value).toBe(311) // 차이 14 → 유지
    expect(toCorrectedStandardRange('80-160@310|8.2-16.4', 33.3)?.value).toBe(325) // 차이 15 → 보정
  })

  it('AI가 막대 위치를 못 읽었어도(value 없음) 숫자 범위가 있으면 계산값으로 채운다', () => {
    expect(toCorrectedStandardRange('80-160|8.2-16.4', 33.3)?.value).toBe(325)
  })

  it('측정 kg이 없거나, kg 범위 비율이 퍼센트 구간과 안 맞으면(잘못 읽음) 보정하지 않는다', () => {
    expect(toCorrectedStandardRange('80-160@160|8.2-16.4', null)?.value).toBe(160)
    expect(toCorrectedStandardRange('80-160@160|8.2-40', 33.3)?.value).toBe(160)
  })

  it('접미사가 붙은 문자열도 기존 파서(toStandardRange)가 그대로 읽는다', () => {
    expect(toStandardRange('80-160@160|8.2-16.4')).toEqual({ min: 80, max: 160, value: 160 })
    expect(parseKgRange('80-160@160|8.2-16.4')).toEqual({ min: 8.2, max: 16.4 })
    expect(parseKgRange('80-160@160')).toBeNull()
  })

  it('보정된 값으로 classifyBodyType을 직접 호출해도 C형이다', () => {
    const muscle = toStandardRange('90-110@130')
    const fat = toCorrectedStandardRange('80-160@160|8.2-16.4', 33.3)
    expect(classifyBodyType(muscle, fat)).toBe('C')
  })
})
