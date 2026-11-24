// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { DEMO_NUTRITION_TARGET, DEMO_PROFILE, DEMO_WORKOUT_PROFILE } from '../../data/mockData'
import Profile from '../profile/Profile'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:profile', JSON.stringify(DEMO_PROFILE))
  localStorage.setItem('ai-diet-app:nutritionTarget', JSON.stringify(DEMO_NUTRITION_TARGET))
  localStorage.setItem('ai-diet-app:workoutProfile', JSON.stringify(DEMO_WORKOUT_PROFILE))
})
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

const open = () => render(<AppProvider><Profile /></AppProvider>)

describe('시연 데이터 카드', () => {
  it('?dev=1이 없으면 카드가 보이지 않는다', () => {
    open()
    expect(screen.queryByText('시연 데이터')).toBeNull()
    expect(screen.queryByRole('button', { name: '시연 데이터 채우기' })).toBeNull()
  })

  it('?dev=1이면 보이고, 확인 창 → 채우기 → 안내, 되돌리기는 백업이 있을 때만 켜진다', () => {
    window.history.replaceState(null, '', '/?dev=1')
    open()
    const restore = screen.getByRole('button', { name: '이전 상태로 되돌리기' }) as HTMLButtonElement
    expect(restore.disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '시연 데이터 채우기' }))
    expect(screen.getByText('지금 저장된 인바디·운동·식단 기록을 시연용 기록으로 바꿔요. 이전 상태는 백업돼요.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(localStorage.getItem('ai-diet-app:demoBackup')).toBeNull() // 취소하면 아무것도 안 한다

    fireEvent.click(screen.getByRole('button', { name: '시연 데이터 채우기' }))
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(screen.getByText('시연 데이터를 채웠어요')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('ai-diet-app:inBodyHistory')!)).toHaveLength(4)
    expect(localStorage.getItem('ai-diet-app:demoBackup')).not.toBeNull()
    expect(screen.getByRole('heading', { name: '마이' })).toBeTruthy() // 홈으로 이동하지 않는다
    expect((screen.getByRole('button', { name: '이전 상태로 되돌리기' }) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '이전 상태로 되돌리기' }))
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(screen.getByText('이전 상태로 되돌렸어요')).toBeTruthy()
    expect(localStorage.getItem('ai-diet-app:demoBackup')).toBeNull()
    expect(localStorage.getItem('ai-diet-app:workoutHistory')).toBeNull()
  })
})
