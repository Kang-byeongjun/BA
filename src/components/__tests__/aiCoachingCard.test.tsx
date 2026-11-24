// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../../context/AppContext'
import { DEMO_NUTRITION_TARGET, DEMO_PROFILE, DEMO_WORKOUT_PROFILE } from '../../data/mockData'
import { buildDiagnosis, exampleLine } from '../../lib/coachingInsight'
import { buildSeedData } from '../../lib/demoSeed'
import { COACHING_CACHE_KEY, COACHING_CACHE_VERSION, requestKeyOf } from '../../services/coachingService'
import AiCoachingCard from '../calendar/AiCoachingCard'

const key = (k: string) => `ai-diet-app:${k}`
const GOAL = 'fat_loss' as const

function seed(mode: { isDemo: boolean; aiMode: 'real' | 'mock' }, proteinTarget = 150) {
  const target = { ...DEMO_NUTRITION_TARGET, protein: proteinTarget } // 단백질이 부족하게 나오도록 목표를 높인다
  const d = buildSeedData(Date.now(), { targetKcal: target.calories })
  localStorage.setItem(key('onboarded'), 'true')
  localStorage.setItem(key('profile'), JSON.stringify(DEMO_PROFILE))
  localStorage.setItem(key('nutritionTarget'), JSON.stringify(target))
  localStorage.setItem(key('workoutProfile'), JSON.stringify({ ...DEMO_WORKOUT_PROFILE, goal: GOAL }))
  localStorage.setItem(key('inBodyHistory'), JSON.stringify(d.inBodyHistory))
  localStorage.setItem(key('meals'), JSON.stringify(d.meals))
  localStorage.setItem(key('workoutHistory'), JSON.stringify(d.workoutHistory))
  localStorage.setItem(key('isDemo'), JSON.stringify(mode.isDemo))
  localStorage.setItem(key('aiMode'), JSON.stringify(mode.aiMode))
  return { d, target, diagnosis: buildDiagnosis({ goal: GOAL, history: d.inBodyHistory, meals: d.meals, target, workouts: d.workoutHistory }) }
}
const open = () => render(<AppProvider><AiCoachingCard /></AppProvider>)
const fetchMock = vi.fn()
const reply = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true, data }) })

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('진단 카드 — 구성', () => {
  it('와인색 카드·흰 글씨, 제목과 판정 배지 1개', () => {
    seed({ isDemo: true, aiMode: 'mock' })
    const { container } = open()
    expect(screen.getByRole('heading', { name: '내 운동, 잘하고 있을까요?' })).toBeTruthy()
    expect(screen.queryByText('AI 종합 코칭')).toBeNull()
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-primary')
    expect(card.className).toContain('text-white')
    expect(screen.getAllByText('순조로워요')).toHaveLength(1)
  })

  it('왼쪽 결과(인바디)·오른쪽 과정을 숫자와 라벨로만 보여준다', () => {
    seed({ isDemo: true, aiMode: 'mock' })
    open()
    const result = screen.getByText('결과 (인바디)').parentElement!
    expect(within(result).getByText('-5.3kg')).toBeTruthy()
    expect(within(result).getByText('+1.1kg')).toBeTruthy()
    expect(within(result).getByText('-4.8kg')).toBeTruthy()
    const process = screen.getByText('과정').parentElement!
    expect(within(process).getByText('5/7일')).toBeTruthy()
    expect(within(process).getByText('9회')).toBeTruthy()
    expect(within(process).getByText(/^\d+%$/)).toBeTruthy()
    expect(screen.queryByText(/이 기간|목표를 지켰고/)).toBeNull() // 설명 문장 없음
  })

  it('다음 측정 안내는 작은 글씨로 맨 아래', () => {
    seed({ isDemo: true, aiMode: 'mock' })
    const { container } = open()
    const note = screen.getByText(/다음 측정까지|오늘 인바디를 측정/)
    expect(note.className).toContain('text-[10px]')
    expect(container.firstElementChild!.lastElementChild).toBe(note)
  })

  it('기록이 하나도 없으면 안내 문구만 보여주고 배지·AI 호출은 없다', () => {
    localStorage.setItem(key('onboarded'), 'true')
    localStorage.setItem(key('profile'), JSON.stringify(DEMO_PROFILE))
    localStorage.setItem(key('nutritionTarget'), JSON.stringify(DEMO_NUTRITION_TARGET))
    open()
    expect(screen.getByText('인바디·식단·운동 기록이 쌓이면 지금 잘하고 있는지 알려드려요.')).toBeTruthy()
    expect(screen.queryByText('기록이 더 필요해요')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('진단 카드 — 보완할 점(데모 모드)', () => {
  it('AI를 호출하지 않고 코드가 만든 예시 문장을 최대 2개 보여준다', () => {
    const { diagnosis } = seed({ isDemo: true, aiMode: 'mock' })
    expect(diagnosis.gaps.length).toBeGreaterThan(0)
    open()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('보완할 점')).toBeTruthy()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(Math.min(2, diagnosis.gaps.length))
    items.forEach((li, i) => {
      expect(li.textContent).toContain(exampleLine(diagnosis.gaps[i]!, diagnosis.process))
      expect(li.textContent).toMatch(/\d/)
    })
  })
})

describe('진단 카드 — 실제 AI 모드', () => {
  it('보내는 본문은 판정과 보완할 점 숫자뿐이고, 통과한 AI 문장을 쓰고 저장한다', async () => {
    const { diagnosis } = seed({ isDemo: false, aiMode: 'real' })
    const ai = diagnosis.gaps.map((g, i) => `AI 문장 ${i + 1}번 ${g.current}${g.unit}이에요`)
    fetchMock.mockResolvedValue(reply({ lines: ai }))
    open()
    expect(await screen.findByText(ai[0]!)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(url).toBe('/api/insight')
    expect(Object.keys(JSON.parse(init.body)).sort()).toEqual(['gaps', 'goalLabel', 'verdict'])
    expect(JSON.parse(localStorage.getItem(key(COACHING_CACHE_KEY))!)).toMatchObject({ v: COACHING_CACHE_VERSION, lines: ai })
  })

  it('불러오는 동안 스켈레톤을 보여주고, 끝나면 사라진다', async () => {
    seed({ isDemo: false, aiMode: 'real' })
    let done!: (v: unknown) => void
    fetchMock.mockReturnValue(new Promise((r) => (done = r)))
    open()
    expect(screen.getAllByTestId('gap-skeleton').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: '내 운동, 잘하고 있을까요?' })).toBeTruthy() // 판정·숫자는 바로 보인다
    done(reply({ lines: [] }))
    await waitFor(() => expect(screen.queryAllByTestId('gap-skeleton')).toHaveLength(0))
  })

  it('길이 초과·숫자 없음·칭찬 문장은 그 항목만 예시 문장으로 대체한다', async () => {
    const { diagnosis } = seed({ isDemo: false, aiMode: 'real' })
    fetchMock.mockResolvedValue(reply({ lines: ['단백질이 부족하니까 오늘 저녁에는 닭가슴살이나 두부를 충분히 더 먹어서 채워 주세요 62%', '운동을 잘하고 있어요 9회'] }))
    open()
    await waitFor(() => expect(screen.queryAllByTestId('gap-skeleton')).toHaveLength(0))
    const items = screen.getAllByRole('listitem')
    items.forEach((li, i) => expect(li.textContent).toContain(exampleLine(diagnosis.gaps[i]!, diagnosis.process)))
  })

  it('실패하면 예시 문장으로 대체하고 실패 결과는 저장하지 않는다', async () => {
    const { diagnosis } = seed({ isDemo: false, aiMode: 'real' })
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => JSON.stringify({ ok: false, error: { code: 'MISSING_API_KEY' } }) })
    open()
    await waitFor(() => expect(screen.queryAllByTestId('gap-skeleton')).toHaveLength(0))
    expect(screen.getAllByRole('listitem')[0]!.textContent).toContain(exampleLine(diagnosis.gaps[0]!, diagnosis.process))
    expect(localStorage.getItem(key(COACHING_CACHE_KEY))).toBeNull()
  })

  it('같은 숫자면 저장된 문장을 쓰고 AI를 다시 부르지 않는다', () => {
    const { diagnosis } = seed({ isDemo: false, aiMode: 'real' })
    const lines = diagnosis.gaps.map((_, i) => `저장해 둔 ${i + 1}번 문장이에요`)
    localStorage.setItem(key(COACHING_CACHE_KEY), JSON.stringify({ v: COACHING_CACHE_VERSION, requestKey: requestKeyOf(diagnosis.request), lines, savedAt: 'x' }))
    open()
    expect(screen.getByText(lines[0]!)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('이전 버전(v1)으로 저장된 캐시는 무시하고 새로 요청한다', async () => {
    const { diagnosis } = seed({ isDemo: false, aiMode: 'real' })
    localStorage.setItem(key(COACHING_CACHE_KEY), JSON.stringify({ v: 1, requestKey: requestKeyOf(diagnosis.request), lines: ['옛날 문장 1'], message: '옛날 문장', savedAt: 'x' }))
    fetchMock.mockResolvedValue(reply({ lines: diagnosis.gaps.map((_, i) => `새 문장 ${i + 1}번이에요`) }))
    open()
    expect(await screen.findByText('새 문장 1번이에요')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/옛날/)).toBeNull()
  })

  it('입력 숫자가 바뀌면(요청 키가 다르면) 저장된 문장을 쓰지 않는다', async () => {
    const { diagnosis } = seed({ isDemo: false, aiMode: 'real' })
    localStorage.setItem(key(COACHING_CACHE_KEY), JSON.stringify({ v: COACHING_CACHE_VERSION, requestKey: '{"다른":"숫자"}', lines: ['다른 숫자의 문장 1'], savedAt: 'x' }))
    fetchMock.mockResolvedValue(reply({ lines: diagnosis.gaps.map((_, i) => `새 문장 ${i + 1}번이에요`) }))
    open()
    expect(await screen.findByText('새 문장 1번이에요')).toBeTruthy()
    expect(screen.queryByText(/다른 숫자의 문장/)).toBeNull()
  })
})
