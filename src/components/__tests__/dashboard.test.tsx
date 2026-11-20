// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
        <Dashboard onOpenCamera={() => {}} recentMeal={meal} onDismissRecentMeal={() => {}} onNavigateTab={() => {}} />
      </AppProvider>,
    )
    expect(screen.getByText(/방금 기록했어요 · 달걀/)).toBeTruthy()
    expect(screen.getByText(/\+155kcal · 단백질 \+13g/)).toBeTruthy()
  })
})

describe('홈 탭 구성 (캘린더는 홈으로, 영양 밸런스·촬영·오늘의 식단은 식단 탭으로)', () => {
  it('캘린더를 보여주고, 영양 밸런스·촬영 버튼·오늘의 식단은 더 이상 보여주지 않는다', () => {
    render(
      <AppProvider>
        <Dashboard onOpenCamera={() => {}} recentMeal={null} onDismissRecentMeal={() => {}} onNavigateTab={() => {}} />
      </AppProvider>,
    )
    expect(screen.getByLabelText('이전 달')).toBeTruthy()
    expect(screen.queryByText('오늘의 영양 밸런스')).toBeNull()
    expect(screen.queryByText('음식 촬영하고 기록하기')).toBeNull()
    expect(screen.queryByText('오늘의 식단')).toBeNull()
  })
})

describe('캘린더에서 선택한 날의 "+ 추가 등록" 버튼으로 식단/운동 탭으로 이동할 수 있다 (비어있든 아니든 항상 보임)', () => {
  it('식단 기록이 없는 날을 선택하면 식단 쪽 "+ 추가 등록" 버튼이 식단 탭으로 보낸다', () => {
    const onNavigateTab = vi.fn()
    render(
      <AppProvider>
        <Dashboard onOpenCamera={() => {}} recentMeal={null} onDismissRecentMeal={() => {}} onNavigateTab={onNavigateTab} />
      </AppProvider>,
    )
    // 데모 데이터는 오늘(아침·점심 기록)만 채워져 있으니, 기록 없는 다른 날을 고른다.
    const emptyDayButtons = screen.getAllByLabelText(/기록 없음/)
    fireEvent.click(emptyDayButtons[0])
    const addButtons = screen.getAllByText('+ 추가 등록') // [0] = 식단, [1] = 운동
    fireEvent.click(addButtons[0])
    expect(onNavigateTab).toHaveBeenCalledWith('meals')
  })

  it('운동 기록이 없는 날을 선택하면 운동 쪽 "+ 추가 등록" 버튼이 운동 탭으로 보낸다', () => {
    const onNavigateTab = vi.fn()
    render(
      <AppProvider>
        <Dashboard onOpenCamera={() => {}} recentMeal={null} onDismissRecentMeal={() => {}} onNavigateTab={onNavigateTab} />
      </AppProvider>,
    )
    const emptyDayButtons = screen.getAllByLabelText(/기록 없음/)
    fireEvent.click(emptyDayButtons[0])
    const addButtons = screen.getAllByText('+ 추가 등록')
    fireEvent.click(addButtons[1])
    expect(onNavigateTab).toHaveBeenCalledWith('workout')
  })

  it('이미 식단 기록이 있는 날(오늘)을 선택해도 "+ 추가 등록" 버튼이 그대로 보인다', () => {
    const onNavigateTab = vi.fn()
    render(
      <AppProvider>
        <Dashboard onOpenCamera={() => {}} recentMeal={null} onDismissRecentMeal={() => {}} onNavigateTab={onNavigateTab} />
      </AppProvider>,
    )
    // 데모 데이터로 식사가 기록된 날(기록 없음이 아닌 날)을 고른다 — 데모는 오늘만 채워져 있다.
    const loggedDayButton = screen.getAllByLabelText(/일 ·/).find((el) => !el.getAttribute('aria-label')?.includes('기록 없음'))
    expect(loggedDayButton).toBeTruthy()
    fireEvent.click(loggedDayButton!)
    const addButtons = screen.getAllByText('+ 추가 등록')
    expect(addButtons).toHaveLength(2)
    fireEvent.click(addButtons[0])
    expect(onNavigateTab).toHaveBeenCalledWith('meals')
  })
})
