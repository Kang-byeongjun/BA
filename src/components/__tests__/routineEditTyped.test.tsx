// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import { AppProvider } from '../../context/AppContext'
import { loadWorkoutHistory } from '../../lib/workoutHistory'
import { DEFAULT_WORKOUT_PROFILE, type WorkoutProfile } from '../../types'
import RoutineSection from '../workout/RoutineSection'
import RoutineView, { EDITED_NOTICE } from '../workout/RoutineView'
import WorkoutScreen from '../workout/WorkoutScreen'

// 진동·소리는 실제로 내지 않는다.
vi.mock('../../lib/restAlarm', () => ({ playRestAlarm: vi.fn(), unlockRestAlarm: vi.fn() }))

// 종목 직접 입력 / 편집본 요약 문구 / 운동 탭에 최근 기록이 없는 것. AI(/api/workout)는 가짜 fetch로 막는다.

const rx = { setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 }
const ex = (o: Partial<RoutineExercise> & Pick<RoutineExercise, 'order' | 'id' | 'name'>): RoutineExercise => ({
  group: 'CHEST',
  reason: 'AI가 쓴 이유',
  caution: null,
  prescription: rx,
  ...o,
})

const aiResult = (): WorkoutResult => ({
  resolvedGoal: 'MUSCLE',
  goalReason: null,
  source: 'llm',
  attempts: 1,
  attemptErrors: [],
  summary: 'AI가 쓴 요약이에요.',
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
  ],
})

const text = (el: Element | null | undefined) => el?.textContent ?? ''
const profile = (o: Partial<WorkoutProfile> = {}): WorkoutProfile => ({ ...DEFAULT_WORKOUT_PROFILE, ...o })
const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const dialog = () => screen.getByRole('dialog')
const items = () => within(screen.getByRole('tabpanel')).getAllByRole('listitem')

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

/** "종목 추가" → 부위 → 이름 입력 → "직접 추가" */
function addTyped(group: string, name: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ 종목 추가' }))
  fireEvent.click(within(dialog()).getByRole('button', { name: group }))
  fireEvent.change(within(dialog()).getByLabelText('종목 이름'), { target: { value: name } })
  fireEvent.click(within(dialog()).getByRole('button', { name: '직접 추가' }))
}

describe('편집본 요약 문구', () => {
  it('편집본이 없으면 AI 요약을, 바꾸면 안내 문구를 보여주고, 새로고침해도 유지된다', async () => {
    const first = await openRoutine()
    expect(screen.getByText('AI가 쓴 요약이에요.')).toBeTruthy()
    expect(screen.queryByText(EDITED_NOTICE)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '머신 체스트 프레스 삭제' }))
    expect(screen.getByText('직접 바꾼 루틴이에요. 다시 만들기를 누르면 AI 추천으로 돌아가요.')).toBeTruthy()
    expect(screen.queryByText('AI가 쓴 요약이에요.')).toBeNull()
    first.unmount()

    render(<RoutineSection profile={profile()} />)
    expect(screen.getByText(EDITED_NOTICE)).toBeTruthy()
  })

  it('다시 만들면 새 AI 요약으로 돌아온다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '머신 체스트 프레스 삭제' }))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: { ...aiResult(), summary: '새 AI 요약' } }))
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '네, 다시 만들기' }))
    expect(await screen.findByText('새 AI 요약')).toBeTruthy()
    expect(screen.queryByText(EDITED_NOTICE)).toBeNull()
  })

  it('RoutineView는 edited가 없으면 지금처럼 AI 요약을 그대로 보여준다', () => {
    render(<RoutineView result={aiResult()} />)
    expect(screen.getByText('AI가 쓴 요약이에요.')).toBeTruthy()
  })
})

describe('이름으로 직접 추가', () => {
  it('부위를 고르기 전에는 직접 입력 영역이 없고, 고르면 나타난다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '+ 종목 추가' }))
    expect(screen.queryByText('목록에 없나요? 직접 입력')).toBeNull()
    fireEvent.click(within(dialog()).getByRole('button', { name: '등' }))
    expect(within(dialog()).getByText('목록에 없나요? 직접 입력')).toBeTruthy()
  })

  it('이름을 입력해 추가하면 고른 부위로 처방과 "직접 입력" 표시가 붙고, ⚠ 없이 유산소 앞에 들어간다', async () => {
    await openRoutine(profile({ painAreas: ['knee', 'back'] }))
    addTyped('등', '  원암 덤벨 로우  ')

    expect(screen.queryByRole('dialog')).toBeNull()
    const list = items()
    expect(list).toHaveLength(3)
    expect(text(list[1])).toContain('원암 덤벨 로우')
    expect(text(list[1])).toContain('직접 입력')
    expect(text(list[1])).toContain('2~3세트 × 8~12회')
    expect(text(list[1])).toContain('휴식 60~90초')
    expect(list[1]!.querySelector('[role="note"]')).toBeNull()
    expect(text(list[2])).toContain('트레드밀 경사 걷기')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('유산소로 추가하면 처방 없이 들어간다', async () => {
    await openRoutine()
    addTyped('유산소', '줄넘기')
    const added = items().at(-1)!
    expect(text(added)).toContain('줄넘기')
    expect(text(added)).toContain('유산소')
    expect(text(added)).not.toContain('세트')
  })

  it('빈 이름은 추가 버튼이 막혀 있다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '+ 종목 추가' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: '팔' }))
    const add = within(dialog()).getByRole('button', { name: '직접 추가' }) as HTMLButtonElement
    expect(add.disabled).toBe(true)
    fireEvent.change(within(dialog()).getByLabelText('종목 이름'), { target: { value: '    ' } })
    expect(add.disabled).toBe(true)
    fireEvent.change(within(dialog()).getByLabelText('종목 이름'), { target: { value: '해머 컬' } })
    expect(add.disabled).toBe(false)
  })

  it('31자 이상이면 안내하고 막는다', async () => {
    await openRoutine()
    fireEvent.click(screen.getByRole('button', { name: '+ 종목 추가' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: '팔' }))
    fireEvent.change(within(dialog()).getByLabelText('종목 이름'), { target: { value: '가'.repeat(31) } })
    expect(text(within(dialog()).getByRole('alert'))).toContain('30자 이하')
    expect((within(dialog()).getByRole('button', { name: '직접 추가' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('같은 일차에 같은 이름(대소문자·공백 차이)이 있으면 안내하고 막는다', async () => {
    await openRoutine()
    addTyped('팔', 'Hammer Curl')
    expect(items()).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: '+ 종목 추가' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: '팔' }))
    fireEvent.change(within(dialog()).getByLabelText('종목 이름'), { target: { value: ' hammercurl ' } })
    expect(text(within(dialog()).getByRole('alert'))).toContain('같은 이름')
    expect((within(dialog()).getByRole('button', { name: '직접 추가' }) as HTMLButtonElement).disabled).toBe(true)
    // 이미 있는 목록 종목 이름도 막는다
    fireEvent.change(within(dialog()).getByLabelText('종목 이름'), { target: { value: '머신체스트프레스' } })
    expect((within(dialog()).getByRole('button', { name: '직접 추가' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('새로고침해도 유지되고, 바꾸기로 목록 종목과 교체하거나 삭제할 수 있다', async () => {
    const first = await openRoutine()
    addTyped('가슴', '내 가슴 운동')
    first.unmount()

    render(<RoutineSection profile={profile()} />)
    expect(screen.getByText('내 가슴 운동')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '내 가슴 운동 바꾸기' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: /펙덱 플라이/ }))
    expect(screen.queryByText('내 가슴 운동')).toBeNull()
    expect(screen.getByText('펙덱 플라이')).toBeTruthy()

    addTyped('어깨', '내 어깨 운동')
    fireEvent.click(screen.getByRole('button', { name: '내 어깨 운동 삭제' }))
    expect(screen.queryByText('내 어깨 운동')).toBeNull()
  })
})

describe('직접 입력 종목으로 운동하기', () => {
  it('시작하면 기록 화면에 나오고, 운동 완료하면 저장되며, 요약 화면까지 오류 없이 동작한다', async () => {
    localStorage.setItem('ai-diet-app:workoutProfile', JSON.stringify(profile()))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: aiResult() }))
    render(
      <AppProvider>
        <WorkoutScreen />
      </AppProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '루틴 만들기' }))
    await screen.findByText('머신 체스트 프레스')
    addTyped('등', '내 등 운동')
    fireEvent.click(screen.getByRole('button', { name: '이 루틴으로 운동 시작' }))

    // 기록 화면: 직접 입력 종목이 카드로 나온다
    const card = screen.getByRole('region', { name: '내 등 운동' })
    fireEvent.change(within(card).getByLabelText('1세트 kg'), { target: { value: '30' } })
    fireEvent.click(within(card).getByRole('checkbox', { name: '1세트 완료' }))

    // "지난 기록"은 목록에 없는 종목이어도 열린다
    fireEvent.click(within(card).getByRole('button', { name: /지난 기록/ }))
    expect(text(screen.getByRole('dialog', { name: '내 등 운동 지난 기록' }))).toContain('아직 기록이 없어요')
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    fireEvent.click(screen.getByRole('button', { name: '운동 완료' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '완료하기' }))

    expect(await screen.findByRole('heading', { name: '운동 완료!' })).toBeTruthy()
    const saved = loadWorkoutHistory()
    expect(saved).toHaveLength(1)
    expect(saved[0]!.exercises[0]).toMatchObject({ name: '내 등 운동', group: 'BACK' })
    expect(saved[0]!.exercises[0]!.exerciseId.startsWith('custom-')).toBe(true)
  })
})

describe('운동 탭 화면', () => {
  it('"최근 운동 기록" 영역이 없다(기록이 있어도)', () => {
    localStorage.setItem('ai-diet-app:workoutProfile', JSON.stringify(profile()))
    localStorage.setItem(
      'ai-diet-app:workouts',
      JSON.stringify([{ id: 'w1', type: '헬스', startTime: Date.now() - 7_200_000, endTime: Date.now() - 3_600_000, duration: 3600 }]),
    )
    render(
      <AppProvider>
        <WorkoutScreen />
      </AppProvider>,
    )
    expect(screen.getByRole('region', { name: '추천 루틴' })).toBeTruthy()
    expect(screen.queryByText('최근 운동 기록')).toBeNull()
    expect(screen.queryByText('아직 기록된 운동이 없어요.')).toBeNull()
  })
})
