// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoutineExercise } from '../../../server/engine/types'
import WorkoutLogger, { type LoggerDay } from '../workout/WorkoutLogger'

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
      prescription: { setsMin: 2, setsMax: 2, repsMin: 10, repsMax: 15, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 },
    }),
    ex({ order: 3, id: 'bike', name: '실내 자전거', group: 'CARDIO', prescription: null }),
  ],
})

const text = (el: Element | null | undefined) => el?.textContent ?? ''
const card = (name: string) => screen.getByRole('region', { name })
const input = (scope: HTMLElement, label: string) => within(scope).getByLabelText(label) as HTMLInputElement
const totalText = () => text(screen.getByLabelText('전체 볼륨'))

afterEach(cleanup)

describe('WorkoutLogger', () => {
  it('종목마다 카드를 만들고, 세트 수=최대 세트·횟수=최대 횟수로 채우고 kg는 비운다', () => {
    render(<WorkoutLogger day={day()} onExit={() => {}} />)
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

  it('숫자 입력칸은 휴대폰 숫자 키패드가 뜨도록 inputMode를 쓴다', () => {
    render(<WorkoutLogger day={day()} onExit={() => {}} />)
    const bench = card('벤치프레스')
    expect(input(bench, '1세트 kg').getAttribute('inputmode')).toBe('decimal')
    expect(input(bench, '1세트 회').getAttribute('inputmode')).toBe('numeric')
  })

  it('숫자가 아닌 글자는 걸러낸다', () => {
    render(<WorkoutLogger day={day()} onExit={() => {}} />)
    const bench = card('벤치프레스')
    fireEvent.change(input(bench, '1세트 kg'), { target: { value: '2a2.5.0' } })
    expect(input(bench, '1세트 kg').value).toBe('22.50')
    fireEvent.change(input(bench, '1세트 회'), { target: { value: '1-0' } })
    expect(input(bench, '1세트 회').value).toBe('10')
  })

  it('볼륨은 완료 체크한 세트의 kg×회만 더한다 (종목·전체)', () => {
    render(<WorkoutLogger day={day()} onExit={() => {}} />)
    const bench = card('벤치프레스')
    fireEvent.change(input(bench, '1세트 kg'), { target: { value: '60' } })
    fireEvent.change(input(bench, '2세트 kg'), { target: { value: '60' } })
    expect(totalText()).toBe('0kg') // 아직 체크 안 함

    fireEvent.click(input(bench, '1세트 완료'))
    expect(text(bench)).toContain('볼륨 720kg')
    expect(totalText()).toBe('720kg')

    const row = card('바벨로우')
    fireEvent.change(input(row, '1세트 kg'), { target: { value: '22.5' } })
    fireEvent.click(input(row, '1세트 완료'))
    expect(text(row)).toContain('볼륨 337.5kg')
    expect(totalText()).toBe('1,057.5kg')

    fireEvent.click(input(bench, '1세트 완료')) // 체크 해제
    expect(totalText()).toBe('337.5kg')
  })

  it('세트 추가·삭제, 마지막 세트 복사', () => {
    render(<WorkoutLogger day={day()} onExit={() => {}} />)
    const bench = card('벤치프레스')
    fireEvent.change(input(bench, '3세트 kg'), { target: { value: '50' } })
    fireEvent.change(input(bench, '3세트 회'), { target: { value: '9' } })

    fireEvent.click(within(bench).getByRole('button', { name: /마지막 세트 복사/ }))
    expect(input(bench, '4세트 kg').value).toBe('50')
    expect(input(bench, '4세트 회').value).toBe('9')
    expect(input(bench, '4세트 완료').checked).toBe(false)

    fireEvent.click(within(bench).getByRole('button', { name: /세트 추가/ }))
    expect(input(bench, '5세트 kg').value).toBe('')
    expect(input(bench, '5세트 회').value).toBe('12')

    // 1세트를 지우면 번호가 다시 매겨진다
    fireEvent.change(input(bench, '2세트 kg'), { target: { value: '40' } })
    fireEvent.click(within(bench).getByRole('button', { name: '1세트 삭제' }))
    expect(within(bench).getAllByRole('checkbox')).toHaveLength(4)
    expect(input(bench, '1세트 kg').value).toBe('40')

    // 모두 지우면 복사 버튼은 꺼진다
    for (let i = 0; i < 4; i++) fireEvent.click(within(bench).getByRole('button', { name: '1세트 삭제' }))
    expect((within(bench).getByRole('button', { name: /마지막 세트 복사/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('메모를 적을 수 있다', () => {
    render(<WorkoutLogger day={day()} onExit={() => {}} />)
    const memo = within(card('벤치프레스')).getByLabelText('벤치프레스 메모') as HTMLInputElement
    fireEvent.change(memo, { target: { value: '팔꿈치 각도 신경' } })
    expect(memo.value).toBe('팔꿈치 각도 신경')
  })

  it('뒤로 가기는 화면 안의 확인 모달을 띄우고, 브라우저 confirm/alert은 쓰지 않는다', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onExit = vi.fn()
    render(<WorkoutLogger day={day()} onExit={onExit} />)
    fireEvent.change(input(card('벤치프레스'), '1세트 kg'), { target: { value: '60' } })

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    const dialog = screen.getByRole('dialog', { name: '기록을 중단할까요?' })

    // "계속 기록하기"는 모달만 닫고 입력값은 그대로
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
    render(<WorkoutLogger day={{ day: 2, label: '유산소', exercises: [day().exercises[2]!] }} onExit={() => {}} />)
    expect(screen.getByText('이 날은 기록할 근력 종목이 없어요.')).toBeTruthy()
  })
})
