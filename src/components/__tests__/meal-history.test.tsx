// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppProvider, useApp } from '../../context/AppContext'
import { buildDemoMeals, DEMO_NUTRITION_TARGET, DEMO_PROFILE } from '../../data/mockData'
import { createRowsFromExtraction, buildMeal } from '../../services/mealService'
import MealHistory from '../meals/MealHistory'

beforeEach(() => {
  localStorage.clear()
  // 데모 사용자(아침·점심 기록, 단백질 68 / 130g)로 시작
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:profile', JSON.stringify(DEMO_PROFILE))
  localStorage.setItem('ai-diet-app:nutritionTarget', JSON.stringify(DEMO_NUTRITION_TARGET))
  localStorage.setItem('ai-diet-app:meals', JSON.stringify(buildDemoMeals()))
})
afterEach(() => cleanup())

function AddMealButton() {
  const { dispatch } = useApp()
  const rows = createRowsFromExtraction({
    isFood: true,
    mealName: '닭가슴살 현미밥',
    foods: [
      { name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.9 },
      { name: '현미밥', estimatedGrams: 180, cookingMethod: null, confidence: 0.9 },
    ],
    overallConfidence: 0.9,
    warnings: [],
  })
  return (
    <button onClick={() => dispatch({ type: 'ADD_MEAL', meal: buildMeal({ title: '닭가슴살 현미밥', slot: '저녁', rows, thumbnail: null }) })}>
      식사 저장
    </button>
  )
}

describe('식사 저장 → 식단 탭 영양 Progress Bar (Test B 마지막 단계)', () => {
  it('저장한 식사의 영양소가 개인 목표 대비 진행률에 반영된다', () => {
    render(
      <AppProvider>
        <MealHistory />
        <AddMealButton />
      </AppProvider>,
    )

    // 기록 전: 단백질 68 / 130g = 52%
    expect(screen.getByText('52%')).toBeTruthy()

    fireEvent.click(screen.getByText('식사 저장'))

    // 닭가슴살 120g(37.2g) + 현미밥 180g(5.8g) ≈ +43g → 68 + 43 = 111 / 130g = 85%
    expect(screen.getByText('85%')).toBeTruthy()
    expect(screen.queryByText('52%')).toBeNull()
  })
})
