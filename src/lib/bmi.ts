// BMI는 키·체중으로 바로 계산되는 값이라 서버에 저장하지 않고, 표시가 필요할 때 그 자리에서 계산한다.

export function calculateBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese'

// 아시아-태평양 기준(대한비만학회 기준과 동일, WHO 일반 기준보다 과체중/비만 경계가 낮다)
export function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 23) return 'normal'
  if (bmi < 25) return 'overweight'
  return 'obese'
}

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: '저체중',
  normal: '정상',
  overweight: '과체중',
  obese: '비만',
}
