// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoutineExercise } from '../../../server/engine/types'
import { playRestAlarm, unlockRestAlarm } from '../../lib/restAlarm'
import type { LoggerDay } from '../../lib/workoutLog'
import WorkoutLogger from '../workout/WorkoutLogger'
import { createWorkoutLog, loadWorkoutLog, WORKOUT_LOG_STORAGE_KEY } from '../workout/workoutLogStorage'

// 진동·소리는 실제로 내지 않고, 불렸는지만 확인한다.
vi.mock('../../lib/restAlarm', () => ({ playRestAlarm: vi.fn(), unlockRestAlarm: vi.fn() }))

const ex = (o: Partial<RoutineExercise> & Pick<RoutineExercise, 'order' | 'id' | 'name'>): RoutineExercise => ({
  group: 'CHEST',
  reason: '이유',
  caution: null,
  prescription: { setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 },
  ...o,
})

const day = (): LoggerDay => ({
  day: 1,
  label: '상체',
  exercises: [
    ex({ order: 1, id: 'bench', name: '벤치프레스' }),
    ex({
      order: 2,
      id: 'row',
      name: '바벨로우',
      prescription: { setsMin: 2, setsMax: 2, repsMin: 10, repsMax: 15, rirMin: 2, rirMax: 2, restMin: 90, restMax: 90 },
    }),
    ex({ order: 3, id: 'bike', name: '실내 자전거', group: 'CARDIO', prescription: null }),
  ],
})

const T0 = new Date('2026-11-13T10:00:00').getTime()

const text = (el: Element | null | undefined) => el?.textContent ?? ''
const card = (name: string) => screen.getByRole('region', { name })
const input = (scope: HTMLElement, label: string) => within(scope).getByLabelText(label) as HTMLInputElement
const doneBtn = (scope: HTMLElement, n: number) => within(scope).getByRole('checkbox', { name: `${n}세트 완료` })
const isDone = (el: HTMLElement) => el.getAttribute('aria-checked') === 'true'
const totalText = () => text(screen.getByLabelText('전체 볼륨'))
const restSwitch = () => screen.getByRole('switch', { name: '휴식 타이머' })
const restButton = () => screen.getByRole('button', { name: /휴식 남은 시간/ })
const elapsed = () => text(screen.getByLabelText('전체 운동 시간'))
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

function renderLogger(onExit = () => {}) {
  return render(<WorkoutLogger initial={createWorkoutLog(day(), Date.now())} onExit={onExit} />)
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  vi.mocked(playRestAlarm).mockClear()
  vi.mocked(unlockRestAlarm).mockClear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('WorkoutLogger — 세트 기록', () => {
  it('종목마다 카드를 만들고, 세트 수=최대 세트·횟수=최대 횟수로 채우고 kg는 비운다', () => {
    renderLogger()
    expect(screen.getByRole('heading', { name: '1일차 · 상체' })).toBeTruthy()

    const bench = card('벤치프레스')
    expect(within(bench).getAllByRole('checkbox')).toHaveLength(3)
    expect(input(bench, '1세트 kg').value).toBe('')
    expect(input(bench, '3세트 회').value).toBe('12')
    expect(within(bench).getByLabelText('벤치프레스 메모')).toBeTruthy()

    const row = card('바벨로우')
    expect(within(row).getAllByRole('checkbox')).toHaveLength(2)
    expect(input(row, '1세트 회').value).toBe('15')

    // 처방이 없는 유산소는 세트 기록 대상이 아니다
    expect(screen.queryByRole('region', { name: '실내 자전거' })).toBeNull()
    expect(totalText()).toBe('0kg')
  })

  it('숫자 입력칸은 휴대폰 숫자 키패드가 뜨도록 inputMode를 쓰고, 숫자가 아닌 글자는 걸러낸다', () => {
    renderLogger()
    const bench = card('벤치프레스')
    expect(input(bench, '1세트 kg').getAttribute('inputmode')).toBe('decimal')
    expect(input(bench, '1세트 회').getAttribute('inputmode')).toBe('numeric')
    fireEvent.change(input(bench, '1세트 kg'), { target: { value: '2a2.5.0' } })
    expect(input(bench, '1세트 kg').value).toBe('22.50')
    fireEvent.change(input(bench, '1세트 회'), { target: { value: '1-0' } })
    expect(input(bench, '1세트 회').value).toBe('10')
  })

  it('완료 체크는 40px 이상의 큰 버튼이고, 완료된 세트는 행 전체가 연한 초록이 된다', () => {
    renderLogger()
    const bench = card('벤치프레스')
    const btn = doneBtn(bench, 1)
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.className).toContain('h-10') // Tailwind h-10 = 40px
    expect(btn.className).toContain('w-10')

    const row = btn.closest('tr')!
    expect(row.querySelectorAll('td.bg-emerald-50')).toHaveLength(0)
    fireEvent.click(btn)
    expect(isDone(btn)).toBe(true)
    // 행의 모든 칸이 같은 연한 초록 배경
    expect(row.querySelectorAll('td.bg-emerald-50')).toHaveLength(row.querySelectorAll('td').length)
    fireEvent.click(btn)
    expect(isDone(btn)).toBe(false)
    expect(row.querySelectorAll('td.bg-emerald-50')).toHaveLength(0)
  })

  it('kg를 입력하면 아래의 빈 세트에 같은 값을 채우고, 이미 값이 있는 세트는 그대로 둔다', () => {
    renderLogger()
    const bench = card('벤치프레스')
    fireEvent.change(input(bench, '3세트 kg'), { target: { value: '50' } })
    // 한 글자씩 입력
    fireEvent.change(input(bench, '1세트 kg'), { target: { value: '6' } })
    fireEvent.change(input(bench, '1세트 kg'), { target: { value: '60' } })
    expect(input(bench, '2세트 kg').value).toBe('60')
    expect(input(bench, '3세트 kg').value).toBe('50')

    // 2세트를 고쳐도 위(1세트)는 그대로
    fireEvent.change(input(bench, '2세트 kg'), { target: { value: '55' } })
    expect(input(bench, '1세트 kg').value).toBe('60')
    expect(input(bench, '3세트 kg').value).toBe('50')

    // 다른 종목에는 영향 없음
    expect(input(card('바벨로우'), '1세트 kg').value).toBe('')
  })

  it('볼륨은 완료 체크한 세트의 kg×회만 더한다 (종목·전체)', () => {
    renderLogger()
    const bench = card('벤치프레스')
    fireEvent.change(input(bench, '1세트 kg'), { target: { value: '60' } }) // 2·3세트도 60으로 채워짐
    expect(totalText()).toBe('0kg')

    fireEvent.click(doneBtn(bench, 1))
    expect(text(bench)).toContain('볼륨 720kg')
    expect(totalText()).toBe('720kg')

    const row = card('바벨로우')
    fireEvent.change(input(row, '1세트 kg'), { target: { value: '22.5' } })
    fireEvent.click(doneBtn(row, 1))
    expect(text(row)).toContain('볼륨 337.5kg')
    expect(totalText()).toBe('1,057.5kg')

    fireEvent.click(doneBtn(bench, 1)) // 체크 해제
    expect(totalText()).toBe('337.5kg')
  })

  it('세트 추가·삭제, 마지막 세트 복사', () => {
    renderLogger()
    const bench = card('벤치프레스')
    fireEvent.change(input(bench, '3세트 kg'), { target: { value: '50' } })
    fireEvent.change(input(bench, '3세트 회'), { target: { value: '9' } })

    fireEvent.click(within(bench).getByRole('button', { name: /마지막 세트 복사/ }))
    expect(input(bench, '4세트 kg').value).toBe('50')
    expect(input(bench, '4세트 회').value).toBe('9')
    expect(isDone(doneBtn(bench, 4))).toBe(false)

    fireEvent.click(within(bench).getByRole('button', { name: /세트 추가/ }))
    expect(input(bench, '5세트 kg').value).toBe('')
    expect(input(bench, '5세트 회').value).toBe('12')

    fireEvent.click(within(bench).getByRole('button', { name: '1세트 삭제' }))
    expect(within(bench).getAllByRole('checkbox')).toHaveLength(4)

    for (let i = 0; i < 4; i++) fireEvent.click(within(bench).getByRole('button', { name: '1세트 삭제' }))
    expect((within(bench).getByRole('button', { name: /마지막 세트 복사/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('메모를 적을 수 있다', () => {
    renderLogger()
    const memo = within(card('벤치프레스')).getByLabelText('벤치프레스 메모') as HTMLInputElement
    fireEvent.change(memo, { target: { value: '팔꿈치 각도 신경' } })
    expect(memo.value).toBe('팔꿈치 각도 신경')
  })

  it('뒤로 가기는 화면 안의 확인 모달을 띄우고, 브라우저 confirm/alert은 쓰지 않는다', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onExit = vi.fn()
    renderLogger(onExit)
    fireEvent.change(input(card('벤치프레스'), '1세트 kg'), { target: { value: '60' } })

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    const dialog = screen.getByRole('dialog', { name: '기록을 중단할까요?' })
    fireEvent.click(within(dialog).getByRole('button', { name: '계속 기록하기' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onExit).not.toHaveBeenCalled()
    expect(input(card('벤치프레스'), '1세트 kg').value).toBe('60')

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '중단하기' }))
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it('근력 종목이 없는 날은 안내 문구를 보여준다', () => {
    render(
      <WorkoutLogger initial={createWorkoutLog({ day: 2, label: '유산소', exercises: [day().exercises[2]!] }, Date.now())} onExit={() => {}} />,
    )
    expect(screen.getByText('이 날은 기록할 근력 종목이 없어요.')).toBeTruthy()
  })
})

describe('WorkoutLogger — 하단 바', () => {
  it('왼쪽 휴식 타이머, 가운데 운동 시간, 오른쪽 "운동 완료" 버튼이 있다', () => {
    renderLogger()
    expect(restSwitch().getAttribute('aria-checked')).toBe('true')
    expect(elapsed()).toBe('00:00:00')
    expect(screen.getByRole('button', { name: '운동 완료' })).toBeTruthy()
  })

  it('전체 운동 시간은 기록 화면에 들어온 순간부터 흐른다', () => {
    renderLogger()
    advance(65_000)
    expect(elapsed()).toBe('00:01:05')
  })

  it('세트를 완료하면 그 종목의 휴식 시간으로 카운트다운을 시작한다', () => {
    renderLogger()
    fireEvent.click(doneBtn(card('벤치프레스'), 1))
    expect(unlockRestAlarm).toHaveBeenCalled()
    expect(text(restButton())).toContain('1:00')
    advance(15_000)
    expect(text(restButton())).toContain('0:45')

    // 다른 종목(휴식 90초) 세트를 완료하면 그 값으로 새로 시작
    fireEvent.click(doneBtn(card('바벨로우'), 1))
    expect(text(restButton())).toContain('1:30')

    // 체크 해제는 타이머에 영향 없음
    fireEvent.click(doneBtn(card('바벨로우'), 1))
    expect(text(restButton())).toContain('1:30')
  })

  it('타이머가 OFF면 세트를 완료해도 시작하지 않는다. 도는 중에 OFF 하면 멈춘다', () => {
    renderLogger()
    fireEvent.click(restSwitch())
    expect(restSwitch().getAttribute('aria-checked')).toBe('false')
    fireEvent.click(doneBtn(card('벤치프레스'), 1))
    expect(screen.queryByRole('button', { name: /휴식 남은 시간/ })).toBeNull()
    expect(screen.getByText('OFF')).toBeTruthy()

    fireEvent.click(restSwitch()) // ON
    fireEvent.click(doneBtn(card('벤치프레스'), 2))
    expect(text(restButton())).toContain('1:00')
    fireEvent.click(restSwitch()) // 도는 중에 OFF
    expect(screen.queryByRole('button', { name: /휴식 남은 시간/ })).toBeNull()
    advance(70_000)
    expect(playRestAlarm).not.toHaveBeenCalled()
  })

  it('도는 동안 바를 눌러 펼치면 −10초·+10초·건너뛰기를 쓸 수 있다', () => {
    renderLogger()
    expect(screen.queryByRole('group', { name: '휴식 조절' })).toBeNull()
    fireEvent.click(doneBtn(card('벤치프레스'), 1))

    fireEvent.click(restButton())
    expect(restButton().getAttribute('aria-expanded')).toBe('true')
    const panel = screen.getByRole('group', { name: '휴식 조절' })
    fireEvent.click(within(panel).getByRole('button', { name: '+10초' }))
    expect(text(restButton())).toContain('1:10')
    fireEvent.click(within(panel).getByRole('button', { name: '−10초' }))
    fireEvent.click(within(panel).getByRole('button', { name: '−10초' }))
    expect(text(restButton())).toContain('0:50')

    fireEvent.click(within(panel).getByRole('button', { name: /건너뛰기/ }))
    expect(screen.queryByRole('group', { name: '휴식 조절' })).toBeNull()
    expect(screen.queryByRole('button', { name: /휴식 남은 시간/ })).toBeNull()
    expect(screen.queryByText('휴식 끝!')).toBeNull()
    advance(60_000)
    expect(playRestAlarm).not.toHaveBeenCalled()
  })

  it('시간이 끝나면 "휴식 끝!"을 보여주고 진동·알림음을 한 번 낸다', () => {
    renderLogger()
    fireEvent.click(doneBtn(card('벤치프레스'), 1))
    fireEvent.click(restButton()) // 펼친 상태에서 끝나면 접힌다
    advance(59_000)
    expect(playRestAlarm).not.toHaveBeenCalled()
    advance(1_000)
    expect(text(screen.getByRole('status'))).toBe('휴식 끝!')
    expect(playRestAlarm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('group', { name: '휴식 조절' })).toBeNull()

    advance(10_000)
    expect(playRestAlarm).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('휴식 끝!')).toBeNull() // 잠시 보인 뒤 사라짐
  })

  it('다른 탭에 갔다 와도 Date.now() 기준으로 정확하다', () => {
    renderLogger()
    fireEvent.click(doneBtn(card('벤치프레스'), 1))
    // 다른 탭에 있으면 setInterval이 거의 안 돈다 → 시계만 30초 앞으로 보내고 탭 복귀 이벤트만 보낸다
    vi.setSystemTime(T0 + 30_000)
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(text(restButton())).toContain('0:30')
    expect(elapsed()).toBe('00:00:30')
  })
})

describe('WorkoutLogger — 새로고침 복원', () => {
  it('세트 값·완료 여부·메모·시작 시각·휴식 타이머 상태를 저장하고 그대로 복원한다', () => {
    const first = renderLogger()
    const bench = card('벤치프레스')
    fireEvent.change(input(bench, '1세트 kg'), { target: { value: '60' } })
    fireEvent.change(input(bench, '2세트 회'), { target: { value: '8' } })
    fireEvent.change(within(bench).getByLabelText('벤치프레스 메모'), { target: { value: '오늘 컨디션 좋음' } })
    fireEvent.click(doneBtn(bench, 1))
    advance(20_000) // 휴식 40초 남음, 운동 20초 경과

    expect(localStorage.getItem(`ai-diet-app:${WORKOUT_LOG_STORAGE_KEY}`)).toBeTruthy()
    first.unmount() // 새로고침

    vi.setSystemTime(T0 + 25_000)
    const saved = loadWorkoutLog()!
    expect(saved.startedAt).toBe(T0)
    render(<WorkoutLogger initial={saved} onExit={() => {}} />)

    const b = card('벤치프레스')
    expect(input(b, '1세트 kg').value).toBe('60')
    expect(input(b, '2세트 kg').value).toBe('60')
    expect(input(b, '2세트 회').value).toBe('8')
    expect((within(b).getByLabelText('벤치프레스 메모') as HTMLInputElement).value).toBe('오늘 컨디션 좋음')
    expect(isDone(doneBtn(b, 1))).toBe(true)
    expect(isDone(doneBtn(b, 2))).toBe(false)
    expect(totalText()).toBe('720kg')
    expect(elapsed()).toBe('00:00:25') // 시작 시각 기준으로 계속 흐름
    expect(text(restButton())).toContain('0:35') // 휴식도 이어서

    // 복원 후에도 자동 채우기가 이어진다(2세트는 1세트가 채운 값)
    fireEvent.change(input(b, '1세트 kg'), { target: { value: '62.5' } })
    expect(input(b, '2세트 kg').value).toBe('62.5')
    // 복원 후 추가한 세트 id가 기존과 겹치지 않는다
    fireEvent.click(within(b).getByRole('button', { name: /세트 추가/ }))
    expect(within(b).getAllByRole('checkbox')).toHaveLength(4)
  })

  it('휴식 타이머 OFF 상태도 복원한다', () => {
    const first = renderLogger()
    fireEvent.click(restSwitch())
    first.unmount()
    render(<WorkoutLogger initial={loadWorkoutLog()!} onExit={() => {}} />)
    expect(restSwitch().getAttribute('aria-checked')).toBe('false')
  })

  it('없는 사이에 끝난 휴식은 알림 없이 정리된다', () => {
    const first = renderLogger()
    fireEvent.click(doneBtn(card('벤치프레스'), 1))
    first.unmount()
    vi.setSystemTime(T0 + 10 * 60_000)
    render(<WorkoutLogger initial={loadWorkoutLog()!} onExit={() => {}} />)
    advance(1_000)
    expect(screen.queryByRole('button', { name: /휴식 남은 시간/ })).toBeNull()
    expect(playRestAlarm).not.toHaveBeenCalled()
  })

  it('망가진 저장값은 복원하지 않는다', () => {
    localStorage.setItem(`ai-diet-app:${WORKOUT_LOG_STORAGE_KEY}`, '{"version":1,"logs":"x"}')
    expect(loadWorkoutLog()).toBeNull()
    localStorage.setItem(`ai-diet-app:${WORKOUT_LOG_STORAGE_KEY}`, 'not json')
    expect(loadWorkoutLog()).toBeNull()
  })
})
