// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { applyPortionCorrection, getPortionCorrectionFactor, recordPortionCorrection } from '../portionCorrection'

beforeEach(() => {
  localStorage.clear()
})

describe('recordPortionCorrection / getPortionCorrectionFactor', () => {
  it('이력이 1개뿐이면 아직 보정하지 않는다(우연한 수정 한 번으로 바로 반영하지 않음)', () => {
    recordPortionCorrection('닭가슴살', 100, 150)
    expect(getPortionCorrectionFactor('닭가슴살')).toBeNull()
  })

  it('이력이 2개 이상 쌓이면 평균 비율로 보정한다', () => {
    recordPortionCorrection('닭가슴살', 100, 150)
    recordPortionCorrection('닭가슴살', 100, 150)
    // 150/100 평균 = 1.5
    expect(getPortionCorrectionFactor('닭가슴살')).toBe(1.5)
  })

  it('이름을 정규화해서 같은 음식으로 취급한다(공백·대소문자 등)', () => {
    recordPortionCorrection('그릭 요거트', 200, 100)
    recordPortionCorrection('그릭요거트', 200, 100)
    expect(getPortionCorrectionFactor('그릭  요거트')).toBe(0.5)
  })

  it('비율이 너무 극단적이면 범위(0.5~2)로 눌러서 적용한다', () => {
    recordPortionCorrection('현미밥', 100, 500)
    recordPortionCorrection('현미밥', 100, 500)
    expect(getPortionCorrectionFactor('현미밥')).toBe(2)
  })

  it('다른 음식의 이력에는 영향을 주지 않는다', () => {
    recordPortionCorrection('닭가슴살', 100, 150)
    recordPortionCorrection('닭가슴살', 100, 150)
    expect(getPortionCorrectionFactor('두부')).toBeNull()
  })
})

describe('applyPortionCorrection', () => {
  it('이력이 없으면 AI 추정치를 그대로 돌려준다', () => {
    expect(applyPortionCorrection('새로운음식', 120)).toBe(120)
  })

  it('이력이 쌓인 음식은 보정된 그램 수를 돌려준다', () => {
    recordPortionCorrection('닭가슴살', 100, 150)
    recordPortionCorrection('닭가슴살', 100, 150)
    expect(applyPortionCorrection('닭가슴살', 100)).toBe(150)
  })
})
