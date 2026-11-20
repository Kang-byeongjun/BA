import { describe, expect, it } from 'vitest'
import { classifyBodyType, computeShapePositions, toStandardRange } from '../inBodyBodyType'

describe('toStandardRange', () => {
  it('"min-max" 형식을 파싱한다(측정값 위치 없음)', () => {
    expect(toStandardRange('90-110')).toEqual({ min: 90, max: 110, value: null })
  })

  it('"min-max@value" 형식을 파싱한다', () => {
    expect(toStandardRange('90-110@103')).toEqual({ min: 90, max: 110, value: 103 })
  })

  it('null은 그대로 null', () => {
    expect(toStandardRange(null)).toBeNull()
  })

  it('형식이 안 맞으면 null', () => {
    expect(toStandardRange('이상함')).toBeNull()
  })
})

describe('classifyBodyType', () => {
  it('골격근량·체지방량 측정값 위치가 표준에 똑같이 가까우면 균형형(I)', () => {
    const muscle = toStandardRange('90-110@100')
    const fat = toStandardRange('80-120@100')
    expect(classifyBodyType(muscle, fat)).toBe('I')
  })

  it('골격근량이 체지방량보다 표준 대비 더 높으면 근육 우세(D)', () => {
    const muscle = toStandardRange('90-110@115')
    const fat = toStandardRange('80-120@90')
    expect(classifyBodyType(muscle, fat)).toBe('D')
  })

  it('체지방량이 골격근량보다 표준 대비 더 높으면 지방 우세(C)', () => {
    const muscle = toStandardRange('90-110@95')
    const fat = toStandardRange('80-120@140')
    expect(classifyBodyType(muscle, fat)).toBe('C')
  })

  it('측정값 위치를 모르면(구간만 읽었으면) 판정하지 않는다', () => {
    const muscle = toStandardRange('90-110')
    const fat = toStandardRange('80-120@100')
    expect(classifyBodyType(muscle, fat)).toBeNull()
  })

  it('둘 중 하나라도 구간 자체가 없으면 판정하지 않는다', () => {
    expect(classifyBodyType(null, toStandardRange('80-120@100'))).toBeNull()
  })
})

describe('computeShapePositions', () => {
  it('구간이 없으면(null) 그 행은 null', () => {
    expect(computeShapePositions([null])).toEqual([null])
  })

  it('측정값 위치가 표준 구간 한가운데면 valuePos도 구간 중앙(표준 칸의 중점)에 온다', () => {
    const [pos] = computeShapePositions([toStandardRange('90-110@100')])
    expect(pos).not.toBeNull()
    // ZONE_BELOW_END(0.3)과 ZONE_STANDARD_END(0.45) 사이, 표준 구간 정중앙
    expect(pos!.valuePos).toBeCloseTo((0.3 + 0.45) / 2, 5)
  })

  it('측정값 위치를 모르면 valuePos는 null(구간 밴드는 여전히 그릴 수 있음)', () => {
    const [pos] = computeShapePositions([toStandardRange('90-110')])
    expect(pos).not.toBeNull()
    expect(pos!.valuePos).toBeNull()
  })

  it('측정값이 표준보다 한참 높으면 표준이상 칸 쪽(0.45 이상)에 찍힌다', () => {
    const [pos] = computeShapePositions([toStandardRange('90-110@200')])
    expect(pos!.valuePos).toBeGreaterThan(0.45)
  })

  it('측정값이 표준보다 한참 낮으면 표준이하 칸 쪽(0.3 이하)에 찍힌다', () => {
    const [pos] = computeShapePositions([toStandardRange('90-110@50')])
    expect(pos!.valuePos).toBeLessThan(0.3)
  })
})
