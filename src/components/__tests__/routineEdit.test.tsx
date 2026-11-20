// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXERCISES } from '../../../server/engine/data'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import { AppProvider } from '../../context/AppContext'
import { DEFAULT_WORKOUT_PROFILE, type WorkoutProfile } from '../../types'
import RoutineSection from '../workout/RoutineSection'
import RoutineView from '../workout/RoutineView'
import WorkoutScreen from '../workout/WorkoutScreen'

// 종목 바꾸기 / 추가 / 삭제. 실제 종목 데이터(exercises.json)를 쓰고, AI(/api/workout)는 가짜 fetch로 막는다.

const rx = { setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 }
const ex = (o: Partial<RoutineExercise> & Pick<RoutineExercise, 'order' | 'id' | 'name'>): RoutineExercise => ({
  group: 'CHEST',
  reason: 'AI가 쓴 이유',
  caution: null,
  prescription: rx,
  ...o,
})

const aiResult = (o: Partial<WorkoutResult> = {}): WorkoutResult => ({
  resolvedGoal: 'MUSCLE',
  goalReason: null,
  source: 'llm',
  attempts: 1,
  attemptErrors: [],
  summary: '상체와 하체를 나눠 운동해요.',
  warnings: [],
  prescriptionNote: '',
  days: [
    {
      day: 1,
      label: '상체',
      exercises: [
        ex({ order: 1, id: 'C01', name: '머신 체스트 프레스' }),
        ex({ order: 2, id: 'CA01', name: '트레드밀 경사 걷기', group: 'CARDIO', prescription: null }),
      ],
    },
    { day: 2, label: '하체', exercises: [ex({ order: 1, id: 'L01', name: '레그 프레스', group: 'LEGS' })] },
  ],
  ...o,
})

const text = (el: Element | null | undefined) => el?.textContent ?? ''
const profile = (o: Partial<WorkoutProfile> = {}): WorkoutProfile => ({ ...DEFAULT_WORKOUT_PROFILE, ...o })
const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const dialog = () => screen.getByRole('dialog')

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

async function openRoutine(p: WorkoutProfile = profile()) {
  fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: aiResult() }))
  const view = render(<RoutineSection profile={p} />)
  fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
  await screen.findByText('머신 체스트 프레스')
  return view
}

describe('RoutineView 편집 버튼', () => {
  it('edit이 없으면 바꾸기·삭제·추가 버튼이 없다', () => {
    render(<RoutineView result={aiResult()} />)
    expect(screen.queryByRole('button', { name: /바꾸기|삭제|종목 추가/ })).toBeNull()
  })
})

describe('종목 바꾸기 / 추가 / 삭제', () => {
  it('바꾸기: 같은 부위 종목만 나오고, 고르면 그 자리가 바뀌며, 서버는 더 부르지 않는다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '머신 체스트 프레스 바꾸기' }))
    const names = within(dialog()).getAllByRole('button').map((b) => text(b))
    expect(names.some((n) => n.includes('펙덱 플라이'))).toBe(true)
    expect(names.some((n) => n.includes('스쿼트'))).toBe(false) // 하체 종목은 없다
    expect(names.some((n) => n.includes('머신 체스트 프레스'))).toBe(false) // 지금 종목은 뺀다

    fireEvent.click(within(dialog()).getByRole('button', { name: /펙덱 플라이/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const items = within(screen.getByRole('tabpanel')).getAllByRole('listitem')
    expect(text(items[0])).toContain('펙덱 플라이')
    expect(text(items[0])).toContain('직접 고름')
    expect(text(items[0])).toContain('2~3세트 × 8~12회') // 그 일차의 처방이 붙는다
    expect(screen.queryByText('머신 체스트 프레스')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('새로고침(다시 열기)해도 바꾼 루틴이 유지된다', async () => {
    const first = await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '머신 체스트 프레스 바꾸기' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: /펙덱 플라이/ }))
    first.unmount()

    render(<RoutineSection profile={profile()} />)
    expect(screen.getByText('펙덱 플라이')).toBeTruthy()
    expect(screen.queryByText('머신 체스트 프레스')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('종목 추가: 부위를 먼저 고르고 종목을 고르면 유산소 앞에 처방과 함께 붙는다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '+ 종목 추가' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: '복근' }))
    const abs = EXERCISES.find((e) => e.group === 'ABS')!
    fireEvent.click(within(dialog()).getAllByRole('button').find((b) => b.querySelector('span span')?.textContent === abs.name)!)

    const items = within(screen.getByRole('tabpanel')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(text(items[0])).toContain('머신 체스트 프레스')
    expect(text(items[1])).toContain(abs.name)
    expect(text(items[1])).toContain('2~3세트 × 8~12회')
    expect(text(items[2])).toContain('트레드밀 경사 걷기')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('삭제: 지우면 번호가 다시 매겨진다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '머신 체스트 프레스 삭제' }))
    const items = within(screen.getByRole('tabpanel')).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(text(items[0])).toContain('트레드밀 경사 걷기')
    expect(text(items[0]).startsWith('1')).toBe(true)
  })

  it('일차의 마지막 종목을 지우려면 한 번 확인한다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('tab', { name: '2일차 · 하체' }))
    fireEvent.click(screen.getByRole('button', { name: '레그 프레스 삭제' }))
    expect(screen.getByText('레그 프레스')).toBeTruthy() // 아직 안 지워짐
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))
    expect(screen.getByText('레그 프레스')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '레그 프레스 삭제' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '지우기' }))
    expect(screen.queryByText('레그 프레스')).toBeNull()
  })

  it('통증 부위에 부담이 큰 종목은 배지로 알리고, 확인을 거쳐야 담기며, 카드에 ⚠가 붙는다', async () => {
    await openRoutine(profile({ painAreas: ['knee'] }))
    fireEvent.click(screen.getByRole('tab', { name: '2일차 · 하체' }))
    fireEvent.click(screen.getByRole('button', { name: '레그 프레스 바꾸기' }))
    const squat = within(dialog()).getByRole('button', { name: /바벨 스쿼트/ })
    expect(text(squat)).toContain('무릎 부담 큼')

    fireEvent.click(squat)
    const confirm = screen.getByRole('alertdialog', { name: '부담이 큰 종목 확인' })
    fireEvent.click(within(confirm).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy() // 목록으로 돌아옴

    fireEvent.click(within(dialog()).getByRole('button', { name: /바벨 스쿼트/ }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '그래도 담기' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(text(screen.getByRole('note'))).toContain('무릎에 부담이 큰 종목')
  })

  it('바꾼 뒤 "이 루틴으로 운동 시작"을 누르면 기록 화면에 바뀐 종목이 나온다', async () => {
    localStorage.setItem('ai-diet-app:workoutProfile', JSON.stringify(profile()))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: aiResult() }))
    render(
      <AppProvider>
        <WorkoutScreen />
      </AppProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    await screen.findByText('머신 체스트 프레스')
    fireEvent.click(screen.getByRole('button', { name: '머신 체스트 프레스 바꾸기' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: /펙덱 플라이/ }))
    fireEvent.click(screen.getByRole('button', { name: '이 루틴으로 운동 시작' }))

    expect(screen.getByRole('heading', { name: '1일차 · 상체' })).toBeTruthy()
    expect(screen.getAllByText(/펙덱 플라이/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/머신 체스트 프레스/)).toBeNull()
  })
})

describe('"다시 만들기" 확인', () => {
  const edit = async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '머신 체스트 프레스 바꾸기' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: /펙덱 플라이/ }))
  }

  it('바꾼 게 없으면 확인 없이 바로 다시 만든다', async () => {
    await openRoutine()
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: aiResult({ summary: '새로 만든 루틴' }) }))
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(await screen.findByText('새로 만든 루틴')).toBeTruthy()
  })

  it('바꾼 게 있으면 먼저 물어보고, 취소하면 그대로 두며 서버를 부르지 않는다', async () => {
    await edit()
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    expect(text(screen.getByRole('alertdialog'))).toContain('직접 바꾼 내용이 사라')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByText('펙덱 플라이')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('확인하면 AI 추천으로 되돌아가고 바꾼 내용은 사라진다(새로고침해도)', async () => {
    await edit()
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: aiResult({ summary: '새로 만든 루틴' }) }))
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '네, 다시 만들기' }))
    expect(await screen.findByText('새로 만든 루틴')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('펙덱 플라이')).toBeNull()

    cleanup()
    render(<RoutineSection profile={profile()} />)
    expect(screen.getByText('새로 만든 루틴')).toBeTruthy()
  })

  it('확인했는데 AI 호출이 실패하면 바꾼 내용은 남는다', async () => {
    await edit()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '네, 다시 만들기' }))
    expect(text(await screen.findByRole('alert'))).toContain('네트워크')

    cleanup()
    render(<RoutineSection profile={profile()} />)
    expect(screen.getByText('펙덱 플라이')).toBeTruthy()
  })
})
