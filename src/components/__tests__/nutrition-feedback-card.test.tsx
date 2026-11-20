// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import NutritionFeedbackCard from '../dashboard/NutritionFeedbackCard'
import type { MacroFeedback } from '../../lib/nutrition'
import type { RecommendedMeal } from '../../types'

afterEach(() => cleanup())

function buildMeal(overrides: Partial<RecommendedMeal> = {}): RecommendedMeal {
  return {
    id: 'meal-1',
    title: '닭가슴살',
    emoji: '🍗',
    ingredients: [{ name: '닭가슴살', amount: '120g' }],
    nutrients: { calories: 0, protein: 26, carbohydrates: 0, fat: 2, fiber: 0 },
    primaryNutrient: 'protein',
    deficiencyPercent: 52,
    alternatives: [{ name: '두부', amount: '150g' }],
    ...overrides,
  }
}

const FEEDBACK_ALL_FOUR: MacroFeedback[] = [
  { nutrient: 'protein', message: '단백질이 목표의 52%밖에 채워지지 않았어요.', detail: '약 30g 더 필요해요' },
  { nutrient: 'carbohydrates', message: '탄수화물은 목표량에 거의 도달했어요.', detail: null },
  { nutrient: 'fat', message: '지방이 목표보다 많이 초과했어요.', detail: '약 10g 더 섭취했어요' },
  { nutrient: 'fiber', message: '식이섬유이(가) 아직 목표에 조금 못 미쳤어요.', detail: '약 5g 더 필요해요' },
]

describe('NutritionFeedbackCard — AI 영양 피드백과 추천 재료를 한 카드로 합친다', () => {
  it('영양소 4개 전부의 피드백 문장을 보여준다', () => {
    render(<NutritionFeedbackCard feedback={FEEDBACK_ALL_FOUR} recommendedMeals={[buildMeal()]} goal="fat_loss" />)
    expect(screen.getByText(/단백질이 목표의 52%밖에 채워지지 않았어요/)).toBeTruthy()
    expect(screen.getByText(/탄수화물은 목표량에 거의 도달했어요/)).toBeTruthy()
    expect(screen.getByText(/지방이 목표보다 많이 초과했어요/)).toBeTruthy()
    expect(screen.getByText(/식이섬유이\(가\) 아직 목표에 조금 못 미쳤어요/)).toBeTruthy()
  })

  it('부족한 영양소(단백질) 바로 아래에 그 영양소를 채울 추천 재료가 붙는다', () => {
    render(<NutritionFeedbackCard feedback={FEEDBACK_ALL_FOUR} recommendedMeals={[buildMeal()]} goal="fat_loss" />)
    expect(screen.getByText('닭가슴살', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText('120g')).toBeTruthy()
  })

  it('추천이 없는 영양소(탄수화물·지방·식이섬유)는 진단 문장만 있고 재료 추천은 없다', () => {
    render(<NutritionFeedbackCard feedback={FEEDBACK_ALL_FOUR} recommendedMeals={[buildMeal()]} goal="fat_loss" />)
    // 추천 재료 카드는 하나(단백질용 닭가슴살)만 있어야 한다
    expect(screen.getAllByText('AI 코치 한마디 듣기')).toHaveLength(1)
  })

  it('추천할 재료가 하나도 없으면(모든 목표 달성) 축하 메시지를 보여준다', () => {
    render(<NutritionFeedbackCard feedback={FEEDBACK_ALL_FOUR} recommendedMeals={[]} goal="fat_loss" />)
    expect(screen.getByText(/오늘 목표를 모두 달성했어요/)).toBeTruthy()
    expect(screen.queryByText('AI 코치 한마디 듣기')).toBeNull()
  })

  it('접으면 요약 문구만 보이고 피드백/추천 내용은 숨는다', () => {
    render(<NutritionFeedbackCard feedback={FEEDBACK_ALL_FOUR} recommendedMeals={[buildMeal()]} goal="fat_loss" />)
    fireEvent.click(screen.getByText('AI 영양 피드백'))
    expect(screen.queryByText(/단백질이 목표의 52%밖에 채워지지 않았어요/)).toBeNull()
    expect(screen.getByText(/눌러서 펼쳐보세요/)).toBeTruthy()
  })

  it('피드백이 없으면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<NutritionFeedbackCard feedback={[]} recommendedMeals={[]} goal="fat_loss" />)
    expect(container.firstChild).toBeNull()
  })
})
