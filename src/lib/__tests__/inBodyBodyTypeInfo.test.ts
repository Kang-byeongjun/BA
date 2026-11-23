import { describe, expect, it } from 'vitest'
import { classifyBodyType, type InBodyStandardRange } from '../inBodyBodyType'
import { BODY_TYPE_INFO, describeMissingReason } from '../inBodyBodyTypeInfo'

// 표준 구간 90~110(중간값 100)에서 측정값 위치(value)만 바꿔 판정을 확인한다
const range = (value: number | null): InBodyStandardRange => ({ min: 90, max: 110, value })

describe('체형 판정 규칙(classifyBodyType)', () => {
  it('골격근이 지방보다 표준 대비 뚜렷하게 낮으면 C형', () => {
    expect(classifyBodyType(range(85), range(120))).toBe('C')
  })
  it('둘이 비슷하면 I형', () => {
    expect(classifyBodyType(range(100), range(102))).toBe('I')
  })
  it('골격근이 지방보다 뚜렷하게 높으면 D형', () => {
    expect(classifyBodyType(range(120), range(95))).toBe('D')
  })
  it('표준범위가 없거나 측정값 위치를 못 읽으면 판정하지 않는다', () => {
    expect(classifyBodyType(null, null)).toBeNull()
    expect(classifyBodyType(range(100), null)).toBeNull()
    expect(classifyBodyType(range(null), range(100))).toBeNull()
  })
})

describe('체형 설명 문구', () => {
  it('유형마다 배지와 설명이 있다', () => {
    expect(BODY_TYPE_INFO.C.badge).toBe('C형')
    expect(BODY_TYPE_INFO.I.badge).toBe('I형')
    expect(BODY_TYPE_INFO.D.badge).toBe('D형')
    expect(BODY_TYPE_INFO.C.description).toContain('근력 운동')
  })
  it('판정을 생략한 이유를 상황별로 알려주고 항상 같은 말로 끝난다', () => {
    const msgs = [
      describeMissingReason(null),
      describeMissingReason({ weight: null, skeletalMuscleMass: range(100), bodyFatMass: null }),
      describeMissingReason({ weight: null, skeletalMuscleMass: range(null), bodyFatMass: range(100) }),
    ]
    expect(msgs[0]).toContain('표준범위 정보가 없어서')
    expect(msgs[1]).toContain('체지방량의 표준범위를 읽지 못해')
    expect(msgs[2]).toContain('측정값이 막대 어디에 있는지')
    for (const m of msgs) expect(m).toMatch(/체형 판정은 생략했어요\.$/)
  })
})
