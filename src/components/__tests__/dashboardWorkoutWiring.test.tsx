// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { buildDemoMeals, DEMO_NUTRITION_TARGET, DEMO_PROFILE } from '../../data/mockData'
import DashboardScreen from '../calendar/DashboardScreen'
import CollapsibleCard from '../dashboard/CollapsibleCard'
import Dashboard from '../dashboard/Dashboard'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:profile', JSON.stringify(DEMO_PROFILE))
  localStorage.setItem('ai-diet-app:nutritionTarget', JSON.stringify(DEMO_NUTRITION_TARGET))
  localStorage.setItem('ai-diet-app:meals', JSON.stringify(buildDemoMeals()))
  localStorage.setItem('ai-diet-app:dashboardPreviewSeen', 'true')
})
afterEach(cleanup)

describe('홈: 운동 카드 연결', () => {
  it('운동 카드·이번 주 요약(식단 목표 칸 포함)이 캘린더 위에 있고, 버튼이 운동 탭으로 보낸다', () => {
    const onNavigateTab = vi.fn()
    render(
      <AppProvider>
        <Dashboard onOpenCamera={() => {}} recentMeal={null} onDismissRecentMeal={() => {}} onNavigateTab={onNavigateTab} />
      </AppProvider>,
    )
    const card = screen.getByText('오늘의 운동')
    const stats = screen.getByText('이번 주 운동')
    const diet = screen.getByText('식단 목표')
    const calendar = screen.getByLabelText('이전 달')
    const before = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(before(card, stats)).toBe(true)
    expect(before(stats, diet)).toBe(true)
    expect(before(diet, calendar)).toBe(true)

    // 루틴이 저장돼 있지 않으니 "운동 탭으로 가기" 안내가 보인다
    fireEvent.click(screen.getByRole('button', { name: '운동 탭으로 가기' }))
    expect(onNavigateTab).toHaveBeenCalledWith('workout')
  })
})

describe('대시보드: 운동 섹션과 접이식 카드', () => {
  it('운동 섹션이 맨 위, 주간 영양소는 접힌 채 한 줄 요약을 보여주고, 누르면 펼쳐진다', () => {
    render(
      <AppProvider>
        <DashboardScreen />
      </AppProvider>,
    )
    expect(screen.queryByText('운동 요약')).toBeNull() // 예전 WorkoutSummaryCard 제목
    const section = screen.getByText('운동')
    const weekly = screen.getByRole('button', { name: /주간 영양소/ })
    expect(!!(section.compareDocumentPosition(weekly) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect(weekly.textContent).toMatch(/이번 주 단백질 평균 .* · 목표 달성 \d\/7일/)
    expect(weekly.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(weekly)
    expect(weekly.getAttribute('aria-expanded')).toBe('true')
  })

  it('이번 주 식사 기록이 없으면 주간 영양소 접힌 줄은 안내 문구만 보여준다', () => {
    localStorage.setItem('ai-diet-app:meals', JSON.stringify([]))
    render(
      <AppProvider>
        <DashboardScreen />
      </AppProvider>,
    )
    const weekly = screen.getByRole('button', { name: /주간 영양소/ })
    expect(weekly.textContent).toContain('이번 주 식사 기록이 아직 없어요')
    expect(weekly.textContent).not.toContain('목표 달성')
  })

  it('CollapsibleCard: 접으면 안쪽은 숨기되 계속 살아 있고, 펼치면 보인다', () => {
    const { container } = render(
      <CollapsibleCard title="제목" summary="요약 한 줄">
        <p>안쪽 내용</p>
      </CollapsibleCard>,
    )
    expect(screen.getByText('요약 한 줄')).toBeTruthy()
    expect(container.querySelector('.hidden')?.textContent).toBe('안쪽 내용')
    fireEvent.click(screen.getByRole('button', { name: /제목/ }))
    expect(container.querySelector('.hidden')).toBeNull()
  })
})
