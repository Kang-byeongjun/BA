// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import { AppProvider } from '../../context/AppContext'
import { DEFAULT_WORKOUT_PROFILE, type WorkoutProfile } from '../../types'
import RoutineSection from '../workout/RoutineSection'
import RoutineView from '../workout/RoutineView'
import WorkoutScreen from '../workout/WorkoutScreen'

// 실제 /api/workout(=AI)은 부르지 않는다. fetch를 가짜로 바꿔서 검증한다.

const rx = { setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 }
const ex = (o: Partial<RoutineExercise> & Pick<RoutineExercise, 'order' | 'id' | 'name'>): RoutineExercise => ({
  group: 'CHEST',
  reason: '기본 이유',
  caution: null,
  prescription: rx,
  ...o,
})

const result = (o: Partial<WorkoutResult> = {}): WorkoutResult => ({
  resolvedGoal: 'MUSCLE',
  goalReason: null,
  source: 'llm',
  attempts: 1,
  attemptErrors: [],
  summary: '상체와 하체를 나눠 운동해요.',
  warnings: [],
  prescriptionNote: '첫 2주는 강도↓',
  days: [
    {
      day: 1,
      label: '상체',
      exercises: [
        ex({ order: 1, id: 'bench', name: '벤치프레스', reason: '가슴 대근육부터' }),
        ex({
          order: 2,
          id: 'ohp',
          name: '오버헤드프레스',
          caution: { parts: ['SHOULDER'], text: '⚠ 어깨에 부담이 있을 수 있어요. 랫풀다운(으)로 바꿔주세요.', alternativeId: 'latpull' },
        }),
      ],
    },
    {
      day: 2,
      label: '하체',
      exercises: [ex({ order: 1, id: 'squat', name: '스쿼트', group: 'LEGS' }), ex({ order: 2, id: 'bike', name: '실내 자전거', group: 'CARDIO', prescription: null })],
    },
  ],
  ...o,
})

// jest-dom이 없어서 글자 비교는 textContent로 한다.
const text = (el: Element | null | undefined) => el?.textContent ?? ''

const profile = (o: Partial<WorkoutProfile> = {}): WorkoutProfile => ({ ...DEFAULT_WORKOUT_PROFILE, ...o })

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RoutineView', () => {
  it('종목마다 순서·이름·이유·세트×횟수·휴식을 보여준다', () => {
    render(<RoutineView result={result()} />)
    const panel = screen.getByRole('tabpanel')
    const items = within(panel).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(text(items[0])).toContain('1')
    expect(text(items[0])).toContain('벤치프레스')
    expect(text(items[0])).toContain('가슴 대근육부터')
    expect(text(items[0])).toContain('2~3세트 × 8~12회')
    expect(text(items[0])).toContain('휴식 60~90초')
  })

  it('일차 탭을 누르면 그 날의 종목으로 바뀐다', () => {
    render(<RoutineView result={result()} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['1일차 · 상체', '2일차 · 하체'])
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')

    fireEvent.click(tabs[1]!)
    expect(screen.getByRole('tab', { name: '2일차 · 하체' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('스쿼트')).toBeTruthy()
    expect(screen.queryByText('벤치프레스')).toBeNull()
    // 유산소는 세트·횟수 대신 안내 문구
    expect(screen.getByText(/유산소/)).toBeTruthy()
  })

  it('caution이 있으면 경고 박스로 문구와 대체 종목을 보여준다', () => {
    render(<RoutineView result={result()} />)
    const notes = screen.getAllByRole('note')
    expect(notes).toHaveLength(1)
    expect(text(notes[0])).toContain('어깨에 부담')
    expect(text(notes[0])).toContain('랫풀다운')
  })

  it('goalReason이 있으면 맨 위에 안내로 보여준다', () => {
    const { container } = render(<RoutineView result={result({ goalReason: '인바디 결과로 근육 증가를 목표로 정했어요.' })} />)
    expect(text(container.firstElementChild?.firstElementChild)).toContain('인바디 결과로 근육 증가')
  })

  it('source가 fallback일 때만 "기본 루틴이에요"를 표시한다', () => {
    const { rerender } = render(<RoutineView result={result()} />)
    expect(screen.queryByText('기본 루틴이에요')).toBeNull()
    rerender(<RoutineView result={result({ source: 'fallback' })} />)
    expect(screen.getByText('기본 루틴이에요')).toBeTruthy()
  })

  it('하루짜리 루틴이면 탭 없이 바로 보여준다', () => {
    const r = result()
    render(<RoutineView result={{ ...r, days: [r.days[0]!] }} />)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByText('벤치프레스')).toBeTruthy()
  })
})

describe('RoutineSection', () => {
  it('프로필이 없으면 입력 안내를 보여주고 서버를 부르지 않는다', () => {
    render(<RoutineSection profile={null} />)
    expect(screen.getByText('운동 프로필을 먼저 입력해주세요')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('저장된 결과가 없으면 처음 열 때 서버를 부르지 않고, 버튼을 누르면 만든다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: result() }))
    render(<RoutineSection profile={profile()} />)
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    expect(text(screen.getByRole('status'))).toContain('만들고 있어요')
    expect((screen.getByRole('button', { name: '만드는 중…' }) as HTMLButtonElement).disabled).toBe(true)

    expect(await screen.findByText('벤치프레스')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: '다시 만들기' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('저장된 결과가 있으면 다시 열어도 서버를 부르지 않고 그대로 보여준다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: result() }))
    const first = render(<RoutineSection profile={profile()} />)
    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    await screen.findByText('벤치프레스')
    first.unmount()

    render(<RoutineSection profile={profile()} />)
    expect(screen.getByText('벤치프레스')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('"다시 만들기"를 누르면 새로 부른다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: result() }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: result({ summary: '새로 만든 루틴' }) }))
    render(<RoutineSection profile={profile()} />)
    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    await screen.findByText('벤치프레스')

    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    expect(await screen.findByText('새로 만든 루틴')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('실패하면 한국어 오류 문구를 보여주고, 다시 누를 수 있다', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<RoutineSection profile={profile()} />)
    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    expect(text(await screen.findByRole('alert'))).toContain('네트워크')
    expect((screen.getByRole('button', { name: '루틴 만들기' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('손목·발목 통증이 있으면 반영되지 않는다고 안내한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: result() }))
    render(<RoutineSection profile={profile({ painAreas: ['knee', 'wrist'] })} />)
    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    expect(await screen.findByText(/손목 통증은 아직 추천에 반영되지 않아요/)).toBeTruthy()
  })
})

describe('WorkoutScreen', () => {
  it('맨 위에 추천 루틴이 있고, 기존 운동 시작 화면도 그대로 있다', async () => {
    localStorage.setItem('ai-diet-app:workoutProfile', JSON.stringify(profile()))
    render(
      <AppProvider>
        <WorkoutScreen />
      </AppProvider>,
    )
    const section = screen.getByRole('region', { name: '추천 루틴' })
    expect(within(section).getByRole('button', { name: '루틴 만들기' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '운동 시작' })).toBeTruthy()
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })

  it('저장된 운동 프로필이 없으면 입력 안내를 보여준다', () => {
    render(
      <AppProvider>
        <WorkoutScreen />
      </AppProvider>,
    )
    expect(screen.getByText('운동 프로필을 먼저 입력해주세요')).toBeTruthy()
  })
})
