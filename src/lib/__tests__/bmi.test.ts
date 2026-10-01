import { describe, expect, it } from 'vitest'
import { BMI_CATEGORY_LABELS, calculateBmi, classifyBmi } from '../bmi'

describe('calculateBmi', () => {
  it('키(cm)·체중(kg)으로 BMI를 계산한다', () => {
    // 175cm, 75kg → 75 / 1.75^2 = 24.489... → 24.5
    expect(calculateBmi(175, 75)).toBe(24.5)
  })
})

describe('classifyBmi', () => {
  it('아시아-태평양 기준 경계값으로 분류한다', () => {
    expect(classifyBmi(18.4)).toBe('underweight')
    expect(classifyBmi(18.5)).toBe('normal')
    expect(classifyBmi(22.9)).toBe('normal')
    expect(classifyBmi(23)).toBe('overweight')
    expect(classifyBmi(24.9)).toBe('overweight')
    expect(classifyBmi(25)).toBe('obese')
  })

  it('모든 분류에 한국어 라벨이 있다', () => {
    for (const category of ['underweight', 'normal', 'overweight', 'obese'] as const) {
      expect(BMI_CATEGORY_LABELS[category]).toBeTruthy()
    }
  })
})
