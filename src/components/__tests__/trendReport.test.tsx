// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { DEMO_PROFILE, DEMO_WORKOUT_PROFILE } from '../../data/mockData'
import { buildSeedData, type SeedData } from '../../lib/demoSeed'
import { buildIntervalReport, type Feedback, type PatternId } from '../../lib/intervalReport'
import { intervalKey, TODO_CHECKS_KEY } from '../../lib/todoChecks'
import { buildFeedbackView, CHART_BY_PATTERN, headlineOf, noFeedbackReason, TITLE_MAX_LENGTH, type FeedbackChartKind } from '../../lib/trendView'
import DashboardScreen from '../calendar/DashboardScreen'
import TrendFeedbackCard from '../trend/TrendFeedbackCard'
import TrendReport from '../trend/TrendReport'

const TARGET = { calories: 1920, protein: 130, carbohydrates: 200, fat: 60, fiber: 28 }
const NOW = new Date(2026, 10, 27, 12).getTime()
const key = (k: string) => `ai-diet-app:${k}`
const put = (k: string, v: unknown) => localStorage.setItem(key(k), JSON.stringify(v))

function seed(change: (d: SeedData) => Partial<SeedData> = () => ({}), goal = 'fat_loss') {
  const base = buildSeedData(NOW, { targetKcal: TARGET.calories })
  const d = { ...base, ...change(base) }
  put('onboarded', true)
  put('profile', DEMO_PROFILE)
  put('nutritionTarget', TARGET)
  put('workoutProfile', { ...DEMO_WORKOUT_PROFILE, goal })
  put('inBodyHistory', d.inBodyHistory)
  put('meals', d.meals)
  put('workouts', d.workouts)
  put('workoutHistory', d.workoutHistory)
  put('dashboardPreviewSeen', true)
  return d
}
const reportOf = (d: SeedData) =>
  buildIntervalReport({ goal: 'fat_loss', inBodyHistory: d.inBodyHistory, meals: d.meals, target: TARGET, workoutHistory: d.workoutHistory, workouts: d.workouts })
const open = () => render(<AppProvider><TrendReport /></AppProvider>)
const cards = () => screen.queryAllByTestId('feedback-card')
const DIET_NOTICE = '식단 기록이 더 쌓이면 알려 드릴게요'
const EMPTY = '인바디를 2주 간격으로 두 번 재면 분석해 드려요'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('변화 추이 — 결과 카드', () => {
  it('기간·한 줄 평가·두 지표의 그래프와 변화량(오차 범위는 회색 글씨)', () => {
    seed()
    open()
    expect(screen.getByText('최근 결과 · 10.30 → 11.20 (3주)')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '체지방은 빠지는데, 근육 증가가 느려졌어요' })).toBeTruthy()
    const fat = within(screen.getByTestId('trend-fatMass'))
    expect(fat.getByText('-1.3kg').style.color).toBe('rgb(21, 128, 61)')
    for (const v of ['38.1', '36.2', '35.1', '33.8']) expect(fat.getByText(v)).toBeTruthy() // 점마다 값
    const muscle = screen.getByTestId('trend-muscleMass')
    expect(within(muscle).getByText('오차 범위').style.color).toBe('rgb(148, 163, 184)')
    // 전체 4번 중 이번 구간의 2점만 색
    expect(muscle.querySelectorAll('circle')).toHaveLength(4)
    expect(muscle.querySelectorAll('circle[data-current="true"]')).toHaveLength(2)
  })

  it('근육 목표는 골격근을 비교한 날짜를 적고, 비교할 측정이 없으면 "판단 보류"', () => {
    seed(undefined, 'muscle_gain')
    open()
    expect(within(screen.getByTestId('trend-muscleMass')).getByText(/10\.16부터/)).toBeTruthy()
    expect(within(screen.getByTestId('trend-muscleMass')).getByText('+0.5kg')).toBeTruthy()
    cleanup()
    seed((d) => ({ inBodyHistory: d.inBodyHistory.slice(0, 2) }), 'muscle_gain') // 21일 간격 2번뿐
    open()
    expect(within(screen.getByTestId('trend-muscleMass')).getByText('판단 보류')).toBeTruthy()
  })

  it('AI를 포함해 어떤 요청도 보내지 않는다', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    seed()
    open()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('변화 추이 — 피드백 0·1·2개', () => {
  it('2개: 식단·운동 배지, 결과가 좋으면 "더 빨라질 수 있어요", 음식 칩 3개', () => {
    seed()
    open()
    expect(cards()).toHaveLength(2)
    const [diet, workout] = cards().map((c) => within(c))
    expect(diet!.getByText('식단')).toBeTruthy()
    expect(diet!.getByRole('heading').textContent).toMatch(/^주말에 평일보다 \d+% 더 먹었어요$/)
    expect(diet!.getByTestId('feedback-chart').getAttribute('data-chart')).toBe('stackedMeals')
    expect(diet!.getByTestId('target-line')).toBeTruthy()
    const chips = within(diet!.getByRole('list', { name: '목표를 넘긴 날 저녁·간식에 자주 먹은 음식' })).getAllByRole('listitem')
    expect(chips.map((c) => c.textContent)).toEqual(['맥주 4회', '후라이드 치킨 3회', '라면 2회'])
    expect(workout!.getByText('운동')).toBeTruthy()
    expect(workout!.getByTestId('feedback-chart').getAttribute('data-chart')).toBe('bodyPartSets')
    expect(screen.getAllByText('더 빨라질 수 있어요')).toHaveLength(2)
    expect(screen.queryByText('보완할 점')).toBeNull()
    for (const c of cards()) {
      expect(within(c).getAllByRole('heading')).toHaveLength(1)
      expect(within(c).getAllByRole('img')).toHaveLength(1)
      expect(within(c).getByRole('heading').textContent!.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH)
    }
    expect(screen.queryByText(/기록이 더 쌓이면/)).toBeNull()
  })

  it('결과가 아쉬우면 "보완할 점"', () => {
    seed((d) => ({ inBodyHistory: d.inBodyHistory.map((e, i) => (i === 0 ? { ...e, bodyFatMass: 37 } : e)) }))
    open()
    expect(screen.getAllByText('보완할 점')).toHaveLength(2)
    expect(screen.queryByText('더 빨라질 수 있어요')).toBeNull()
  })

  it('1개: 식단 기록이 모자라면 운동 카드만 있고, 식단 자리에 안내 한 줄', () => {
    seed(() => ({ meals: [] }))
    open()
    expect(cards()).toHaveLength(1)
    expect(within(cards()[0]!).getByText('운동')).toBeTruthy()
    const notice = screen.getByText(DIET_NOTICE)
    expect(notice.compareDocumentPosition(cards()[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('1개: 운동 기록이 모자라면 식단 카드만 있고 운동 안내 한 줄', () => {
    seed(() => ({ workouts: [], workoutHistory: [] }))
    open()
    expect(cards()).toHaveLength(1)
    expect(screen.getByText('운동 기록이 더 쌓이면 알려 드릴게요')).toBeTruthy()
    expect(screen.queryByText(DIET_NOTICE)).toBeNull()
  })

  it('0개(빈 상태: 기록 부족): 안내는 한 줄만, 카드·할 일 없음', () => {
    seed(() => ({ meals: [], workouts: [], workoutHistory: [] }))
    open()
    expect(cards()).toHaveLength(0)
    expect(screen.getAllByText(/기록이 더 쌓이면/)).toHaveLength(1)
    expect(screen.getByText(DIET_NOTICE)).toBeTruthy()
    expect(screen.queryByText('다음 측정까지 이것만')).toBeNull()
    expect(screen.getByRole('button', { name: /근거 보기/ })).toBeTruthy()
  })
})

describe('변화 추이 — 빈 상태: 인바디', () => {
  it.each([
    ['0회', 0],
    ['1회', 1],
  ])('인바디 %s면 안내 문구만', (_, n) => {
    seed((d) => ({ inBodyHistory: d.inBodyHistory.slice(0, n) }))
    open()
    expect(screen.getByText(EMPTY)).toBeTruthy()
    expect(screen.queryByText(/최근 결과/)).toBeNull()
    expect(screen.queryByRole('button', { name: /근거 보기/ })).toBeNull()
  })

  it('2회여도 14일 이상 차이가 없으면 같은 안내', () => {
    seed((d) => ({ inBodyHistory: [d.inBodyHistory[0]!, { ...d.inBodyHistory[1]!, timestamp: d.inBodyHistory[0]!.timestamp - 13 * 86_400_000 }] }))
    open()
    expect(screen.getByText(EMPTY)).toBeTruthy()
  })
})

describe('변화 추이 — 할 일 체크', () => {
  it('최대 2개이고, 구간 끝 날짜를 키로 저장해 다시 열어도 남는다', () => {
    const d = seed()
    const end = intervalKey(reportOf(d).intervals[0]!.period.to)
    expect(end).toBe('2026-11-20')
    open()
    const boxes = () => screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes()).toHaveLength(2)
    expect(boxes().map((b) => b.checked)).toEqual([false, false])
    fireEvent.click(boxes()[1]!)
    expect(JSON.parse(localStorage.getItem(key(TODO_CHECKS_KEY))!)).toEqual({
      [end]: [
        { id: 'weekend_overeating', text: '주말 저녁 맥주는 한 번만', checked: false },
        { id: 'lower_body_imbalance', text: '스쿼트 2세트, 레그 프레스 1세트 더', checked: true },
      ],
    })
    cleanup()
    open()
    expect(boxes().map((b) => b.checked)).toEqual([false, true])
    fireEvent.click(boxes()[1]!)
    expect(JSON.parse(localStorage.getItem(key(TODO_CHECKS_KEY))!)[end][1].checked).toBe(false)
  })

  it('다른 구간의 저장 기록은 그대로 두고, 그 체크를 이번 구간에 가져오지 않는다', () => {
    seed()
    const old = [{ id: 'weekend_overeating', text: '예전 할 일', checked: true }]
    put(TODO_CHECKS_KEY, { '2026-10-30': old })
    open()
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes[0]!.checked).toBe(false)
    fireEvent.click(boxes[0]!)
    expect(JSON.parse(localStorage.getItem(key(TODO_CHECKS_KEY))!)['2026-10-30']).toEqual(old)
  })
})

describe('변화 추이 — 접힌 영역', () => {
  it('근거 보기·지난 결과 보기는 접힌 채로 시작하고 요청한 숫자를 담는다', () => {
    seed()
    open()
    for (const name of [/근거 보기/, /지난 결과 보기/]) expect(screen.getByRole('button', { name }).getAttribute('aria-expanded')).toBe('false')
    for (const label of ['운동 횟수', '식단 기록일', '단백질 하루 평균', '체중', '체지방률', '기대 체지방 변화', '실제 체지방 변화']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText(/^대략 -?\+?[\d.]+kg$/)).toBeTruthy()
    expect(screen.getByText('측정 시간대가 다르면 수분 때문에 1kg 안팎 달라질 수 있어요')).toBeTruthy()
    expect(screen.queryByText('부위를 몰라 뺀 세트')).toBeNull()
  })

  it('지난 결과 보기를 펼치면 지난 구간 2개의 기간·변화·피드백 제목(없으면 이유)이 보인다', () => {
    seed()
    open()
    const button = screen.getByRole('button', { name: /지난 결과 보기/ })
    const content = button.nextElementSibling as HTMLElement
    expect(content.className).toBe('hidden')
    fireEvent.click(button)
    expect(content.className).not.toContain('hidden')
    const past = within(content).getAllByTestId('past-interval').map((li) => [...li.querySelectorAll('p')].map((p) => p.textContent))
    expect(past).toEqual([
      ['10.16 → 10.30 (2주)', '체지방 -1.1kg · 골격근 +0.4kg', '운동 · 하체 세트가 상체의 54%예요'],
      ['10.02 → 10.16 (2주)', '체지방 -1.9kg · 골격근 +0.6kg', '운동 기록이 부족해 피드백이 없어요'],
    ])
  })

  it('피드백이 없는 지난 구간의 이유', () => {
    const [latest] = reportOf(buildSeedData(NOW, { targetKcal: TARGET.calories })).intervals
    const of = (o: { diet?: boolean; workout?: boolean; judged?: boolean }) =>
      noFeedbackReason({
        ...latest!,
        diet: { ...latest!.diet, sufficient: o.diet ?? true },
        workout: { ...latest!.workout, sufficient: o.workout ?? true },
        indicators: o.judged === false ? [{ id: 'muscle_gain', label: '', status: 'pending' }] : latest!.indicators,
      })
    expect(of({})).toBe('눈에 띄는 보완점이 없었어요')
    expect(of({ diet: false, workout: false })).toBe('식단·운동 기록이 부족해 피드백이 없어요')
    expect(of({ judged: false })).toBe('결과를 판단하기 일러 피드백이 없어요')
  })

  it('부위를 알 수 없는 세트가 있을 때만 뺀 세트 수를 보여준다', () => {
    seed((d) => ({
      workoutHistory: d.workoutHistory.map((r) => ({
        ...r,
        exercises: [...r.exercises, { exerciseId: 'custom-x', name: '나만의 동작', sets: [{ kg: 1, reps: 1 }], volume: 1 }],
      })),
    }))
    open()
    expect(screen.getByText('부위를 몰라 뺀 세트')).toBeTruthy()
  })
})

describe('변화 추이 — 패턴별 그래프', () => {
  const EXPECTED: Record<PatternId, FeedbackChartKind> = {
    weekend_overeating: 'stackedMeals',
    evening_skew: 'stackedMeals',
    protein_low: 'proteinByMeal',
    under_eating: 'weekdayCalories',
    lower_body_imbalance: 'bodyPartSets',
    exercise_stagnation: 'topSetByWeek',
    workout_shortage: 'weeklySessions',
    long_gap: 'weeklySessions',
  }
  const view = (id: PatternId) => {
    const latest = reportOf(buildSeedData(NOW, { targetKcal: TARGET.calories })).intervals[0]!
    const domain = ['weekend_overeating', 'evening_skew', 'protein_low', 'under_eating'].includes(id) ? ('diet' as const) : ('workout' as const)
    const feedback: Feedback = {
      domain,
      tone: 'fix',
      indicator: null,
      pattern: {
        id,
        domain,
        title: id,
        chart: 'restDays',
        headline: { label: '', value: 12, unit: '' },
        evidence: [],
        strength: 0,
        todo: { text: '', current: 60, target: 130, unit: '' },
        ...(id === 'exercise_stagnation' ? { exerciseId: 'L02' } : {}),
      },
    }
    return buildFeedbackView(latest, feedback, TARGET)
  }

  it.each(Object.entries(EXPECTED) as [PatternId, FeedbackChartKind][])('%s → %s (제목 30자 이내, 숫자 포함)', (id, kind) => {
    expect(CHART_BY_PATTERN[id]).toBe(kind)
    const v = view(id)
    render(<TrendFeedbackCard view={v} />)
    expect(screen.getByTestId('feedback-chart').getAttribute('data-chart')).toBe(kind)
    expect(v.title.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH)
    expect(v.title).toMatch(/\d/)
    expect(v.foods.length > 0).toBe(kind === 'stackedMeals')
  })

  it('그래프 내용: 끼니별 권장선, 부족 부위 강조, 정체 종목(와인)·늘어난 종목(회색), 목표선', () => {
    expect(view('protein_low').chart.target).toEqual({ value: 43, label: '끼니당 권장 43g' })
    const lower = view('lower_body_imbalance')
    expect(lower.chart.groups.map((g) => [g.label, g.bars[0]!.valueLabel, g.bars[0]!.segments[0]!.color])).toEqual([
      ['상체 합계', '42', '#94a3b8'],
      ['하체', '9', '#8e2433'], // 정수, 하체만 와인색
    ])
    expect(lower.description).toBe('상체 합계 주 42세트, 하체 주 9세트')
    const top = view('exercise_stagnation')
    expect(top.chart.legend.slice(0, 2)).toEqual([
      { label: '바벨 스쿼트', color: '#8e2433' },
      { label: '바벨 벤치 프레스', color: '#cbd5e1' },
    ])
    expect(top.chart.groups.map((g) => g.bars.map((b) => b.valueLabel))).toEqual([['60', '55'], ['60', '57.5'], ['60', '60']])
    expect(top.description).toBe('벤치 프레스는 55→60kg로 늘었어요')
    expect(view('under_eating').chart.target!.value).toBe(1920)
    expect(view('weekend_overeating').chart.groups[0]!.bars[0]!.segments).toHaveLength(3)
    expect(view('workout_shortage').chart.target).toEqual({ value: 2, label: '목표 주 2회' })
  })
})

describe('식단 막대', () => {
  const chartOf = (d: SeedData) => {
    const latest = reportOf(d).intervals[0]!
    const pattern = latest.patterns.find((p) => p.id === 'weekend_overeating')!
    return buildFeedbackView(latest, { domain: 'diet', tone: 'improve', indicator: null, pattern }, TARGET).chart
  }

  it('요일마다 실제 기록의 평균을 그리고, 숫자는 목표를 넘은 막대에만 쓴다', () => {
    const seedData = buildSeedData(NOW, { targetKcal: TARGET.calories })
    const { groups, target } = chartOf(seedData)
    const start = reportOf(seedData).intervals[0]!.period
    const expected = ['월', '화', '수', '목', '금', '토', '일'].map((_, i) => {
      const meals = seedData.meals.filter(
        (m) => m.timestamp >= new Date(start.from).setHours(0, 0, 0, 0) && m.timestamp < new Date(start.to).setHours(0, 0, 0, 0) && (new Date(m.timestamp).getDay() + 6) % 7 === i,
      )
      const days = new Set(meals.map((m) => new Date(m.timestamp).toDateString())).size
      return Math.round(meals.reduce((s, m) => s + m.calories, 0) / days)
    })
    const heights = groups.map((g) => g.bars[0]!.segments.reduce((s, x) => s + x.value, 0))
    heights.forEach((h, i) => expect(Math.abs(h - expected[i]!), groups[i]!.label).toBeLessThanOrEqual(2)) // 끼니별 반올림 차이
    expect(new Set(expected).size).toBe(7) // 요일마다 다르다
    expect(groups.map((g) => g.bars[0]!.valueLabel)).toEqual(expected.map((v) => (v > target!.value ? v.toLocaleString('ko-KR') : null)))
    expect(groups.map((g) => g.bars[0]!.valueLabel !== null)).toEqual([false, false, false, false, false, true, true])
  })
})

describe('한 줄 평가', () => {
  it('지난 구간에 늘던 근육이 느려진 경우만 "느려졌어요"', () => {
    const [latest, previous] = reportOf(buildSeedData(NOW, { targetKcal: TARGET.calories })).intervals
    expect(headlineOf(latest!, previous)).toBe('체지방은 빠지는데, 근육 증가가 느려졌어요')
    expect(headlineOf(latest!)).toBe('체지방은 빠지고, 근육은 지키고 있어요')
  })
})

describe('리포트 화면 연결', () => {
  it('새 분석이 위, 기존 인바디 추이·측정 기록은 아래 접힌 칸', () => {
    seed()
    render(<AppProvider><DashboardScreen /></AppProvider>)
    fireEvent.click(screen.getByRole('tab', { name: '변화 추이' }))
    const result = screen.getByText(/^최근 결과/)
    const old = screen.getByRole('button', { name: /인바디 상세 추이·측정 기록/ })
    expect(old.getAttribute('aria-expanded')).toBe('false')
    expect(result.compareDocumentPosition(old) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(old)
    expect(screen.getByRole('button', { name: /새 측정 추가/ })).toBeTruthy()
  })
})
