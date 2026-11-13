// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { buildDemoMeals, DEMO_NUTRITION_TARGET, DEMO_PROFILE } from '../../data/mockData'
import { createRowsFromExtraction, buildMeal } from '../../services/mealService'
import Dashboard from '../dashboard/Dashboard'

beforeEach(() => {
  localStorage.clear()
  // 데모 사용자(아침·점심 기록, 단백질 68 / 130g)로 시작
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:profile', JSON.stringify(DEMO_PROFILE))
  localStorage.setItem('ai-diet-app:nutritionTarget', JSON.stringify(DEMO_NUTRITION_TARGET))
  localStorage.setItem('ai-diet-app:meals', JSON.stringify(buildDemoMeals()))
})
afterEach(() => cleanup())

describe('식사 저장 → 대시보드 (Test B 마지막 단계)', () => {
  it('방금 기록한 식사가 얼마나 더해졌는지 보여준다', () => {
    const rows = createRowsFromExtraction({
      isFood: true,
      mealName: '달걀',
      foods: [{ name: '달걀', estimatedGrams: 100, cookingMethod: null, confidence: 0.9 }],
      overallConfidence: 0.9,
      warnings: [],
    })
    const meal = buildMeal({ title: '달걀', slot: '간식', rows, thumbnail: null })
    render(
      <AppProvider>
        <Dashboard onOpenCamera={() => {}} recentMeal={meal} onDismissRecentMeal={() => {}} />
      </AppProvider>,
    )
    expect(screen.getByText(/방금 기록했어요 · 달걀/)).toBeTruthy()
    expect(screen.getByText(/\+155kcal · 단백질 \+13g/)).toBeTruthy()
  })
})
