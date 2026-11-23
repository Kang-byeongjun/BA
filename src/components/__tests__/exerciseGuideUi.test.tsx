// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import { getExerciseGuide, MUSCLE_COLORS } from '../../lib/exerciseGuides'
import ExerciseDetailSheet from '../workout/ExerciseDetailSheet'
import ExerciseThumb from '../workout/ExerciseThumb'
import MuscleMap from '../workout/MuscleMap'
import RoutineExercisePicker from '../workout/RoutineExercisePicker'
import RoutineView from '../workout/RoutineView'

afterEach(cleanup)

// jsdom은 #ef4444를 rgb(239, 68, 68)로 바꿔 두므로, 색을 같은 형태로 바꿔서 비교한다
const toRgb = (hex: string) => 'rgb(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')'
const paintedCount = (root: Element, color: string) =>
  [...root.querySelectorAll('polygon')].filter((p) => (p as SVGElement).style.fill === toRgb(color)).length

describe('MuscleMap', () => {
  it('주 근육은 진한 빨강, 보조 근육은 연한 빨강으로 칠하고 aria-label에 한글 근육 이름을 넣는다', () => {
    const g = getExerciseGuide('L01')! // 레그 프레스: 대퇴사두근 / 둔근·햄스트링
    const { container } = render(<MuscleMap guide={g} view="anterior" />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('자극 부위: 대퇴사두근, 둔근, 햄스트링')
    expect(paintedCount(container, MUSCLE_COLORS.primary)).toBeGreaterThan(0)
    expect(paintedCount(container, MUSCLE_COLORS.secondary)).toBe(0) // 앞면에는 둔근·햄스트링 다각형이 없다
    cleanup()
    const back = render(<MuscleMap guide={g} view="posterior" labelPrefix="뒷면 " />)
    expect(paintedCount(back.container, MUSCLE_COLORS.secondary)).toBeGreaterThan(0)
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^뒷면 자극 부위:/)
  })
})

describe('ExerciseThumb', () => {
  it('안내가 있는 종목은 대표 면에 근육을 칠한다', () => {
    const { container } = render(<ExerciseThumb id="B15" />) // 백 익스텐션 → 뒷면
    const thumb = screen.getByTestId('exercise-thumb')
    expect(thumb.getAttribute('data-has-guide')).toBe('true')
    expect(thumb.getAttribute('data-view')).toBe('posterior')
    expect(paintedCount(container, MUSCLE_COLORS.primary)).toBeGreaterThan(0)
    expect(thumb.getAttribute('aria-hidden')).toBe('true')
  })

  it('하체 위주는 허리 아래, 상체 위주는 허리 위로 확대하고, 몸 전체 종목은 전체를 보여준다', () => {
    const focusOf = (id: string) => {
      const { unmount } = render(<ExerciseThumb id={id} />)
      const f = screen.getByTestId('exercise-thumb').getAttribute('data-focus')
      unmount()
      return f
    }
    expect(focusOf('L02')).toBe('lower')
    expect(focusOf('C03')).toBe('upper')
    expect(focusOf('L10')).toBe('full')
    expect(focusOf('custom-1')).toBe('full')
  })

  it('안내가 없는 종목(없는 id·직접 입력)은 칠하지 않은 회색 몸을 보여준다', () => {
    for (const id of ['ZZ99', 'custom-1700000000']) {
      const { container } = render(<ExerciseThumb id={id} />)
      expect(screen.getByTestId('exercise-thumb').getAttribute('data-has-guide')).toBe('false')
      expect(container.querySelectorAll('polygon').length).toBeGreaterThan(0)
      expect(paintedCount(container, MUSCLE_COLORS.primary)).toBe(0)
      expect(paintedCount(container, MUSCLE_COLORS.secondary)).toBe(0)
      cleanup()
    }
  })
})

describe('ExerciseDetailSheet', () => {
  it('열려 있으면 이름·앞뒤 근육 맵·자극 부위 칩·수행 방법·주의사항·안내 문구를 보여준다', () => {
    render(<ExerciseDetailSheet id="L02" name="바벨 스쿼트" onClose={() => {}} />)
    const sheet = screen.getByRole('dialog', { name: '바벨 스쿼트 운동 안내' })
    expect(within(sheet).getByRole('heading', { name: '바벨 스쿼트' })).toBeTruthy()
    expect(within(sheet).getByRole('img', { name: /^앞면 자극 부위:/ })).toBeTruthy()
    expect(within(sheet).getByRole('img', { name: /^뒷면 자극 부위:/ })).toBeTruthy()
    const chips = within(within(sheet).getByRole('region', { name: '자극 부위' })).getAllByRole('listitem')
    expect(chips[0]!.getAttribute('data-kind')).toBe('primary')
    expect(chips.some((c) => c.getAttribute('data-kind') === 'secondary')).toBe(true)
    const steps = within(within(sheet).getByRole('region', { name: '수행 방법' })).getAllByRole('listitem')
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(within(sheet).getByText('이렇게 해보세요')).toBeTruthy()
    expect(within(sheet).getByText('참고용 안내예요. 통증이 있으면 멈추세요.')).toBeTruthy()
  })

  it('닫기 버튼·배경 클릭·Esc로 닫히고, 창 안쪽을 눌러서는 닫히지 않는다', () => {
    const onClose = vi.fn()
    render(<ExerciseDetailSheet id="L02" name="바벨 스쿼트" onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('exercise-sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('직접 추가한 종목(custom-)은 안내가 없다는 말만 보여준다', () => {
    render(<ExerciseDetailSheet id="custom-1700000000" name="내 종목" onClose={() => {}} />)
    expect(screen.getByText('직접 추가한 종목이라 안내가 없어요')).toBeTruthy()
    expect(screen.queryByText('수행 방법')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

const rx = { setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 60, restMax: 90 }
const ex = (o: Partial<RoutineExercise> & Pick<RoutineExercise, 'order' | 'id' | 'name'>): RoutineExercise => ({
  group: 'LEGS',
  reason: '',
  caution: null,
  prescription: rx,
  ...o,
})
const result: WorkoutResult = {
  resolvedGoal: 'MUSCLE',
  goalReason: null,
  source: 'llm',
  attempts: 1,
  attemptErrors: [],
  summary: '요약',
  warnings: [],
  prescriptionNote: '',
  days: [
    {
      day: 1,
      label: '하체',
      exercises: [ex({ order: 1, id: 'L02', name: '바벨 스쿼트', caution: { text: '무릎 주의' } as RoutineExercise['caution'] }), ex({ order: 2, id: 'L01', name: '레그 프레스' })],
    },
  ],
}

describe('RoutineView: 종목 행 → 상세 창', () => {
  const edit = { context: { pain: [], experience: 'BEGINNER' } as never, onChange: vi.fn() }

  it('행에 썸네일이 있고, 행을 누르면 상세 창이 열린다 (기존 ⚠ 안내는 그대로)', () => {
    render(<RoutineView result={result} edit={edit} />)
    expect(screen.getAllByTestId('exercise-thumb')).toHaveLength(2)
    expect(screen.getByText('무릎 주의')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByText('바벨 스쿼트'))
    expect(screen.getByRole('dialog', { name: '바벨 스쿼트 운동 안내' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('이름 아래에 "× N세트"를 크게, 기존 칩은 그 아래에 작게 보여준다', () => {
    render(<RoutineView result={result} />)
    const row = screen.getByText('바벨 스쿼트').closest('li')!
    const big = within(row).getByText('× 3세트')
    const chip = within(row).getByText('3세트 × 8~12회')
    expect(big.className).toContain('text-lg')
    expect(chip.parentElement!.className).toContain('text-[11px]')
    expect(!!(big.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('바꾸기·삭제 버튼은 이름·칩·주의 문구보다 아래(행 맨 아래)에 있다', () => {
    render(<RoutineView result={result} edit={edit} />)
    const row = screen.getByText('바벨 스쿼트').closest('li')!
    const after = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    const replace = within(row).getByRole('button', { name: '바벨 스쿼트 바꾸기' })
    const remove = within(row).getByRole('button', { name: '바벨 스쿼트 삭제' })
    for (const above of [screen.getByText('바벨 스쿼트'), within(row).getByText('3세트 × 8~12회'), within(row).getByText('무릎 주의')]) {
      expect(after(above, replace)).toBe(true)
      expect(after(above, remove)).toBe(true)
    }
  })

  it('썸네일 버튼으로도 열 수 있다', () => {
    render(<RoutineView result={result} />)
    fireEvent.click(screen.getByRole('button', { name: '레그 프레스 운동 방법 보기' }))
    expect(screen.getByRole('dialog', { name: '레그 프레스 운동 안내' })).toBeTruthy()
  })

  it('삭제·바꾸기 버튼을 눌러도 상세 창은 열리지 않고 기존 동작만 한다', () => {
    const onChange = vi.fn()
    render(<RoutineView result={result} edit={{ ...edit, onChange }} />)
    fireEvent.click(screen.getByRole('button', { name: '바벨 스쿼트 삭제' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: /운동 안내/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '레그 프레스 바꾸기' }))
    expect(screen.getByRole('dialog', { name: '종목 바꾸기' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: /운동 안내/ })).toBeNull()
  })
})

describe('RoutineExercisePicker: 종목 옆 썸네일', () => {
  it('종목마다 작은 썸네일이 붙고, 종목을 고르는 동작은 그대로다', () => {
    const onPick = vi.fn()
    render(<RoutineExercisePicker mode="replace" group="CHEST" pain={[]} takenIds={new Set()} onPick={onPick} onClose={() => {}} />)
    const rows = within(screen.getByRole('dialog')).getAllByRole('listitem')
    expect(rows.length).toBeGreaterThan(3)
    for (const row of rows) expect(within(row).getByTestId('exercise-thumb').getAttribute('data-has-guide')).toBe('true')
    fireEvent.click(within(rows[0]!).getByRole('button'))
    expect(onPick).toHaveBeenCalledTimes(1)
  })
})
