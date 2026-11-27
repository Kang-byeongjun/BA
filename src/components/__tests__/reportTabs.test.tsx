// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { buildDemoMeals, DEMO_NUTRITION_TARGET, DEMO_PROFILE } from '../../data/mockData'
import type { InBodyHistoryEntry } from '../../types'
import DashboardScreen from '../calendar/DashboardScreen'
import BottomNav from '../layout/BottomNav'

const entry: InBodyHistoryEntry = {
  id: 'h1',
  timestamp: new Date(2026, 5, 10).getTime(),
  source: 'scan',
  weight: 70,
  skeletalMuscleMass: 30,
  bodyFatMass: 15,
  bodyFatPercentage: 20,
  bodyWater: 40,
  proteinMass: 10,
  mineralMass: 3,
  basalMetabolicRate: 1500,
  bodyType: 'C',
  standardRanges: null,
}
const EMPTY = '아직 측정 기록이 없어요. 마이 탭에서 결과지를 올려주세요.'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:profile', JSON.stringify(DEMO_PROFILE))
  localStorage.setItem('ai-diet-app:nutritionTarget', JSON.stringify(DEMO_NUTRITION_TARGET))
  localStorage.setItem('ai-diet-app:meals', JSON.stringify(buildDemoMeals()))
  localStorage.setItem('ai-diet-app:dashboardPreviewSeen', 'true')
})
afterEach(cleanup)

const open = () => render(<AppProvider><DashboardScreen /></AppProvider>)

describe('리포트 이름', () => {
  it('하단 탭과 화면 제목이 "리포트"이고 "대시보드"는 보이지 않는다', () => {
    render(<BottomNav active="dashboard" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '리포트' })).toBeTruthy()
    cleanup()
    open()
    expect(screen.getByRole('heading', { name: '리포트' })).toBeTruthy()
    expect(screen.queryByText(/대시보드/)).toBeNull()
  })
})

describe('리포트 세 칸 탭', () => {
  it('tablist/tab/aria-selected, 기본 선택은 "이번 주"이고 이번 주 카드들이 보인다', () => {
    open()
    expect(screen.getByRole('tablist')).toBeTruthy()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['이번 주', '인바디 결과', '변화 추이'])
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(screen.getByRole('button', { name: /주간 영양소/ })).toBeTruthy()
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[0]!.id)
  })

  it('칸을 누르면 선택과 내용이 바뀌고, 저장하지 않으니 다시 열면 "이번 주"다', () => {
    localStorage.setItem('ai-diet-app:inBodyHistory', JSON.stringify([entry]))
    open()
    fireEvent.click(screen.getByRole('tab', { name: '인바디 결과' }))
    expect(screen.getByRole('tab', { name: '인바디 결과' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('button', { name: /주간 영양소/ })).toBeNull()
    expect(screen.getByText('C형')).toBeTruthy()
    expect(screen.getByText('2026년 06월 10일 측정')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: '변화 추이' }))
    expect(screen.getByRole('button', { name: /인바디 상세 추이·측정 기록/ })).toBeTruthy() // 기존 추이는 아래 접힌 칸
    expect(screen.getByText('체중 (kg)')).toBeTruthy()
    cleanup()
    open()
    expect(screen.getByRole('tab', { name: '이번 주' }).getAttribute('aria-selected')).toBe('true')
  })

  it('인바디 기록이 0개면 "인바디 결과"·"변화 추이" 칸에 안내 문구를 보여준다', () => {
    open()
    fireEvent.click(screen.getByRole('tab', { name: '인바디 결과' }))
    expect(screen.getByText(EMPTY)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '변화 추이' }))
    expect(screen.getByText('인바디를 2주 간격으로 두 번 재면 분석해 드려요')).toBeTruthy()
  })
})
