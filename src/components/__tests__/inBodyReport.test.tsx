// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { buildDemoMeals, DEMO_NUTRITION_TARGET, DEMO_PROFILE } from '../../data/mockData'
import type { InBodyHistoryEntry } from '../../types'
import DashboardScreen from '../calendar/DashboardScreen'
import InBodyResult from '../profile/InBodyResult'
import { bmiRange, bodyFatPercentRange, BMI_STANDARD, BODY_FAT_PERCENT_STANDARD } from '../../lib/inBodyFixedRanges'
import { classifyBmi } from '../../lib/bmi'
import InBodyTrend from '../profile/InBodyTrend'

const entry = (i: number, o: Partial<InBodyHistoryEntry> = {}): InBodyHistoryEntry => ({
  id: `e${i}`,
  timestamp: new Date(2026, i, 10).getTime(), // i=0 → 1월, 클수록 최근
  source: 'scan',
  weight: 70 + i,
  skeletalMuscleMass: 30 + i,
  bodyFatMass: 15,
  bodyFatPercentage: 20,
  bodyWater: 40,
  proteinMass: 10,
  mineralMass: 3,
  basalMetabolicRate: 1500,
  bodyType: 'C',
  standardRanges: null,
  ...o,
})

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('ai-diet-app:onboarded', 'true')
  localStorage.setItem('ai-diet-app:profile', JSON.stringify(DEMO_PROFILE))
  localStorage.setItem('ai-diet-app:nutritionTarget', JSON.stringify(DEMO_NUTRITION_TARGET))
  localStorage.setItem('ai-diet-app:meals', JSON.stringify(buildDemoMeals()))
  localStorage.setItem('ai-diet-app:dashboardPreviewSeen', 'true')
})
afterEach(cleanup)

const wrap = (node: ReactNode) => render(<AppProvider>{node}</AppProvider>)

describe('인바디 결과: 날짜 막대', () => {
  it('가장 최근 측정이 먼저 보이고 ◀▶로 이동하며, 처음·끝에서는 해당 화살표가 비활성이다', () => {
    wrap(<InBodyResult history={[entry(0), entry(2), entry(1)]} />) // 섞어 넣어도 날짜순으로 정렬
    const prev = screen.getByRole('button', { name: '이전 측정' }) as HTMLButtonElement
    const next = screen.getByRole('button', { name: '다음 측정' }) as HTMLButtonElement
    expect(screen.getByText('2026년 03월 10일 측정')).toBeTruthy()
    expect(next.disabled).toBe(true) // 가장 최근
    expect(prev.disabled).toBe(false)

    fireEvent.click(prev)
    expect(screen.getByText('2026년 02월 10일 측정')).toBeTruthy()
    expect(next.disabled).toBe(false)
    fireEvent.click(prev)
    expect(screen.getByText('2026년 01월 10일 측정')).toBeTruthy()
    expect(prev.disabled).toBe(true) // 가장 오래된 측정
    fireEvent.click(next)
    expect(screen.getByText('2026년 02월 10일 측정')).toBeTruthy()
  })

  it('기록이 하나뿐이어도 정상으로 보이고 두 화살표가 모두 비활성이다', () => {
    wrap(<InBodyResult history={[entry(0)]} />)
    expect((screen.getByRole('button', { name: '이전 측정' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '다음 측정' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('2026년 01월 10일 측정')).toBeTruthy()
    for (const l of ['체중', '골격근량', '체지방량', '체지방률', 'BMI']) expect(screen.getAllByText(l).length).toBeGreaterThan(0)
    expect(screen.getByText('C형')).toBeTruthy() // 체형 분석이 이어서 보인다
  })
})

describe('인바디 결과: 지표 행과 표준 범위', () => {
  it('표준 범위가 있는 지표만 막대를 그리고, 없는 지표는 숫자 + "표준 범위 정보가 없어요"를 보여준다', () => {
    const e = entry(0, { standardRanges: { weight: { min: 90, max: 110, value: 100 }, skeletalMuscleMass: null, bodyFatMass: null } })
    wrap(<InBodyResult history={[e]} />)
    const bar = screen.getByTestId('bar-weight')
    expect(bar.children).toHaveLength(2) // 표준 구간 + 값 채움
    expect(screen.queryByTestId('bar-skeletalMuscleMass')).toBeNull()
    expect(screen.getAllByText('표준 범위 정보가 없어요')).toHaveLength(2) // 골격근량·체지방량(체지방률·BMI는 고정 기준 막대)
  })
})

describe('인바디 결과: 막대 층 순서와 고정 기준 막대', () => {
  const withRanges = entry(0, { standardRanges: { weight: { min: 90, max: 110, value: 100 }, skeletalMuscleMass: null, bodyFatMass: null } })

  it('표준 구간은 값 채움보다 뒤(DOM 순서)·위(z-index)에 반투명으로 그려져 채움 위에서도 보인다', () => {
    wrap(<InBodyResult history={[withRanges]} />)
    const fill = screen.getByTestId('bar-fill-weight')
    const zone = screen.getByTestId('bar-zone-weight')
    expect(!!(fill.compareDocumentPosition(zone) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect(zone.className).toContain('z-10')
    expect(Number(zone.style.opacity)).toBeCloseTo(0.85)
  })

  it('체지방률·BMI도 막대를 그리고 "기준: 일반 성인"을 작게 표시한다(결과지 값이 아님)', () => {
    wrap(<InBodyResult history={[entry(0)]} />)
    expect(screen.getByTestId('bar-bodyFatPercentage')).toBeTruthy()
    expect(screen.getByTestId('bar-bmi')).toBeTruthy()
    expect(screen.getAllByText('기준: 일반 성인')).toHaveLength(2)
  })

  it('성별 정보가 없으면 체지방률 막대는 그리지 않고 "표준 범위 정보가 없어요"를 보여준다(BMI는 그대로)', () => {
    const { gender: _gender, ...noGender } = DEMO_PROFILE
    localStorage.setItem('ai-diet-app:profile', JSON.stringify(noGender))
    wrap(<InBodyResult history={[entry(0)]} />)
    expect(screen.queryByTestId('bar-bodyFatPercentage')).toBeNull()
    expect(screen.getByTestId('bar-bmi')).toBeTruthy()
    expect(screen.getAllByText('표준 범위 정보가 없어요').length).toBeGreaterThan(0)
    expect(screen.getAllByText('기준: 일반 성인')).toHaveLength(1)
  })
})

describe('고정 기준 값(inBodyFixedRanges)', () => {
  it('BMI 표준은 classifyBmi의 정상 구간과 같고, 체지방률은 성별별 기준이며 값이 눈금 밖이면 끝에 붙는다', () => {
    expect(classifyBmi(BMI_STANDARD.min)).toBe('normal')
    expect(classifyBmi(BMI_STANDARD.min - 0.1)).toBe('underweight')
    expect(classifyBmi(BMI_STANDARD.max)).toBe('overweight') // 23 미만이 정상, 23부터 표준이상
    expect(BODY_FAT_PERCENT_STANDARD.male).toEqual({ min: 10, max: 20 })
    expect(BODY_FAT_PERCENT_STANDARD.female).toEqual({ min: 18, max: 28 })
    expect(bodyFatPercentRange('male', 15)).toEqual({ min: 10, max: 20, value: 15 })
    expect(bodyFatPercentRange(undefined, 15)).toBeNull()
    expect(bodyFatPercentRange('male', null)).toBeNull()
    expect(bmiRange(null)).toBeNull()
  })
})

describe('변화 추이: 최근 5회 / 전체', () => {
  const labelOf = (title: string) =>
    screen.getByText(title).closest('div')!.querySelector('svg')!.getAttribute('aria-label')!.split('변화: ')[1]!.split(', ')

  it('기본은 최근 5회이고, 전체를 누르면 모든 기록을 그린다(선택된 쪽 aria-pressed)', () => {
    const history = Array.from({ length: 7 }, (_, i) => entry(i))
    wrap(<InBodyTrend history={history} />)
    const recent = screen.getByRole('button', { name: '최근 5회' })
    const all = screen.getByRole('button', { name: '전체' })
    expect(recent.getAttribute('aria-pressed')).toBe('true')
    expect(all.getAttribute('aria-pressed')).toBe('false')
    for (const t of ['체중 (kg)', '골격근량 (kg)', '체지방량 (kg)', '체지방률 (%)']) expect(screen.getByText(t)).toBeTruthy()

    expect(labelOf('체중 (kg)')).toHaveLength(5)
    expect(labelOf('체중 (kg)')[4]).toBe('07.10 76') // 마지막 = 가장 최근
    fireEvent.click(all)
    expect(all.getAttribute('aria-pressed')).toBe('true')
    expect(labelOf('체중 (kg)')).toHaveLength(7)
  })

  it('기록이 1개면 점 하나와 "비교할 이전 측정이 아직 없어요"를 보여준다', () => {
    const { container } = wrap(<InBodyTrend history={[entry(0)]} />)
    expect(screen.getByText('비교할 이전 측정이 아직 없어요')).toBeTruthy()
    expect(container.querySelectorAll('svg[role="img"]').length).toBe(4)
    expect(container.querySelectorAll('svg[role="img"] circle').length).toBe(4) // 카드마다 점 하나
  })

  it('"새 측정 추가"와 "전체 측정 기록"이 맨 아래에 그대로 있고 삭제 버튼도 있다', () => {
    wrap(<InBodyTrend history={[entry(0), entry(1)]} />)
    const cards = screen.getByText('체지방률 (%)')
    const add = screen.getByRole('button', { name: /새 측정 추가/ })
    const list = screen.getByText('전체 측정 기록 (2)')
    const after = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(after(cards, add)).toBe(true)
    expect(after(add, list)).toBe(true)
    fireEvent.click(list)
    expect(screen.getAllByLabelText('이 측정 기록 삭제')).toHaveLength(2)
  })

  it('기록이 0개면 리포트에서 지금의 안내 문구를 보여준다', () => {
    wrap(<DashboardScreen />)
    fireEvent.click(screen.getByRole('tab', { name: '변화 추이' }))
    expect(within(screen.getByRole('tabpanel')).getByText('아직 측정 기록이 없어요. 마이 탭에서 결과지를 올려주세요.')).toBeTruthy()
  })
})
