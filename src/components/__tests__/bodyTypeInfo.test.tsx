// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BodyTypeInfo from '../profile/BodyTypeInfo'

afterEach(cleanup)

describe('BodyTypeInfo', () => {
  it.each([
    ['C', 'C형', '근력 운동을 늘려보세요'],
    ['I', 'I형', '지금 균형을 유지'],
    ['D', 'D형', '운동 습관'],
  ] as const)('%s형이면 배지와 설명을 보여준다', (type, badge, text) => {
    render(<BodyTypeInfo bodyType={type} standardRanges={null} onRemeasure={() => {}} />)
    expect(screen.getByText(badge)).toBeTruthy()
    expect(screen.getByText(new RegExp(text))).toBeTruthy()
    expect(screen.queryByText('재측정')).toBeNull()
    expect(screen.getByText(/의료 진단이 아닌 참고용/)).toBeTruthy()
  })

  it('표준범위가 없으면 이유와 재측정 버튼을 보여주고 배지는 없다', () => {
    const onRemeasure = vi.fn()
    render(<BodyTypeInfo bodyType={null} standardRanges={null} onRemeasure={onRemeasure} />)
    expect(screen.getByText(/표준범위 정보가 없어서.*체형 판정은 생략했어요/)).toBeTruthy()
    expect(screen.queryByText('C형')).toBeNull()
    fireEvent.click(screen.getByText('재측정'))
    expect(onRemeasure).toHaveBeenCalledTimes(1)
  })

  it('"C·I·D형이란?"은 접혀 있다가 누르면 펼쳐진다', () => {
    render(<BodyTypeInfo bodyType="I" standardRanges={null} onRemeasure={() => {}} />)
    const btn = screen.getByRole('button', { name: /C·I·D형이란/ })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(/알파벳 C처럼/)).toBeNull()
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/알파벳 C처럼/)).toBeTruthy()
  })
})
