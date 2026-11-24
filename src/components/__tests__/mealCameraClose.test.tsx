// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { buildDemoMeals, DEMO_NUTRITION_TARGET, DEMO_PROFILE } from '../../data/mockData'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:aiMode', '"mock"')
  localStorage.setItem('ai-diet-app:profile', JSON.stringify(DEMO_PROFILE))
  localStorage.setItem('ai-diet-app:nutritionTarget', JSON.stringify(DEMO_NUTRITION_TARGET))
  localStorage.setItem('ai-diet-app:meals', JSON.stringify(buildDemoMeals()))
})
afterEach(cleanup)

describe('음식 촬영 화면을 저장 없이 닫기', () => {
  it('식단 탭에서 열었으면 식단 탭으로 돌아오고, "방금 기록했어요" 배너는 안 뜨며, 식사도 저장되지 않는다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '식단' }))
    const before = localStorage.getItem('ai-diet-app:meals')
    fireEvent.click(screen.getByRole('button', { name: /음식 촬영하고 기록하기/ }))
    expect(screen.getByText('음식 촬영')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.queryByText('음식 촬영')).toBeNull()
    expect(screen.getByRole('button', { name: /음식 촬영하고 기록하기/ })).toBeTruthy() // 식단 탭
    fireEvent.click(screen.getByRole('button', { name: '홈' }))
    expect(screen.queryByText(/방금 기록했어요/)).toBeNull()
    expect(localStorage.getItem('ai-diet-app:meals')).toBe(before)
  })
})
