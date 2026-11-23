// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { buildDemoMeals, DEMO_NUTRITION_TARGET } from '../../data/mockData'
import { buildWorkoutCardData } from '../../lib/workoutCardData'
import { DEFAULT_WORKOUT_PROFILE, type InBodyHistoryEntry, type Workout } from '../../types'
import DietInBodyInsightCard from '../calendar/DietInBodyInsightCard'
import WeekGlanceCard from '../dashboard/WeekGlanceCard'
import DashboardWorkoutSection from '../workout/DashboardWorkoutSection'

afterEach(cleanup)

// 2026-11-13(금) 18시. 이번 주 = 11/9(월) ~ 11/15(일)
const at = (m: number, d: number, h = 10) => new Date(2026, m - 1, d, h).getTime()
const NOW = at(11, 13, 18)
const DAY = 86_400_000

const emptyData = buildWorkoutCardData({ history: [], workouts: [], profile: null }, NOW)

function entry(daysAgo: number, weight: number | null): InBodyHistoryEntry {
  return {
    id: `e${daysAgo}`,
    timestamp: NOW - daysAgo * DAY,
    source: 'manual',
    weight,
    skeletalMuscleMass: null,
    bodyFatMass: null,
    bodyFatPercentage: null,
    bodyWater: null,
    proteinMass: null,
    mineralMass: null,
    basalMetabolicRate: null,
    bodyType: null,
    standardRanges: null,
  }
}

function cellText(label: string, container: HTMLElement): string {
  return within(container).getByText(label).parentElement?.textContent ?? ''
}

describe('WeekGlanceCard (이번 주 한눈에)', () => {
  it('데이터가 전혀 없으면 식단·체중은 "-"이고 NaN/undefined가 나오지 않는다', () => {
    const { container } = render(<WeekGlanceCard meals={[]} target={null} history={[]} data={emptyData} now={NOW} />)
    expect(cellText('식단 목표', container)).toBe('식단 목표-')
    expect(cellText('체중', container)).toBe('체중-')
    expect(container.textContent).not.toMatch(/NaN|undefined|null/)
  })

  it('운동은 N / 목표회와 연속 운동일을 보여준다', () => {
    const workouts: Workout[] = [
      { id: 'a', type: '헬스', startTime: at(11, 12), endTime: at(11, 12) + 3_000_000, duration: 3000 },
      { id: 'b', type: '헬스', startTime: at(11, 13, 9), endTime: at(11, 13, 9) + 3_000_000, duration: 3000 },
    ]
    const data = buildWorkoutCardData(
      { history: [], workouts, profile: { ...DEFAULT_WORKOUT_PROFILE, weeklyFrequency: 3 } },
      NOW,
    )
    const { container } = render(<WeekGlanceCard meals={[]} target={null} history={[]} data={data} now={NOW} />)
    expect(cellText('이번 주 운동', container)).toContain('2 / 3회')
    expect(cellText('연속 운동', container)).toContain('2일')
  })

  it('체중: 비교할 이전 측정이 있으면 증감을, 없으면 값만 보여준다', () => {
    const withPrev = render(<WeekGlanceCard meals={[]} target={null} history={[entry(0, 71.2), entry(14, 72)]} data={emptyData} now={NOW} />)
    expect(cellText('체중', withPrev.container)).toContain('71.2kg')
    expect(cellText('체중', withPrev.container)).toContain('▼ 0.8kg')
    cleanup()

    const only = render(<WeekGlanceCard meals={[]} target={null} history={[entry(0, 71.2)]} data={emptyData} now={NOW} />)
    expect(cellText('체중', only.container)).toBe('체중71.2kg')
  })

  it('측정값에 체중이 비어 있으면 "-"', () => {
    const { container } = render(<WeekGlanceCard meals={[]} target={null} history={[entry(0, null)]} data={emptyData} now={NOW} />)
    expect(cellText('체중', container)).toBe('체중-')
  })

  it('이번 주 식사 기록이 있으면 "N / 7일"을 보여준다', () => {
    const now = Date.now()
    const { container } = render(<WeekGlanceCard meals={buildDemoMeals()} target={DEMO_NUTRITION_TARGET} history={[]} data={emptyData} now={now} />)
    expect(cellText('식단 목표', container)).toMatch(/\d+ \/ 7일/)
  })
})

describe('DietInBodyInsightCard: 측정 2회 미만', () => {
  it('예시 문장 없이 한 줄 안내와 다음 측정까지 남은 날만 보여준다', () => {
    const { container } = render(<DietInBodyInsightCard history={[entry(0, 70)]} meals={[]} target={DEMO_NUTRITION_TARGET} />)
    expect(container.textContent).toContain('측정이 2회 이상 쌓이면 식단·운동·인바디를 엮어서 보여드려요')
    expect(container.textContent).toMatch(/다음 측정까지 약 \d+일 남았어요|오늘 인바디를 측정해보세요/)
    expect(container.textContent).not.toContain('예시')
    expect(container.querySelector('h3')).toBeNull()
  })

  it('측정이 2회 이상이면 실제 데이터 문장을 보여준다', () => {
    const { container } = render(
      <DietInBodyInsightCard history={[entry(0, 71), entry(14, 72)]} meals={[]} target={DEMO_NUTRITION_TARGET} />,
    )
    expect(container.querySelector('h3')?.textContent).toBe('식단 × 인바디')
    expect(container.textContent).not.toContain('예시')
  })
})

describe('DashboardWorkoutSection: 다음 루틴 칩', () => {
  const rx = { setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 80, restMax: 100 }
  const ex = { order: 1, id: 'e1', name: '벤치프레스', group: 'CHEST' as const, reason: '', caution: null, prescription: rx }

  it('다음 루틴 정보가 있으면 제목 옆에 칩을 보여준다', () => {
    const data = buildWorkoutCardData(
      { history: [], workouts: [], profile: null, routine: { days: [{ day: 1, label: '상체', exercises: [ex] }] } },
      NOW,
    )
    render(<DashboardWorkoutSection data={data} />)
    expect(screen.getByText('운동')).toBeTruthy()
    expect(screen.getByText(/다음 루틴 · 1일차 상체/)).toBeTruthy()
  })

  it('다음 루틴 정보가 없으면 칩이 없다', () => {
    render(<DashboardWorkoutSection data={emptyData} />)
    expect(screen.queryByText(/다음 루틴/)).toBeNull()
  })
})

describe('인바디 기록 순서: 날짜 기준 최신', () => {
  it('한눈에 카드의 체중은 배열 맨 앞이 아니라 측정일이 가장 늦은 기록이다', () => {
    // 배열 맨 앞 = 방금 추가한 옛날(14일 전) 기록
    const { container } = render(
      <WeekGlanceCard meals={[]} target={null} history={[entry(14, 72), entry(0, 71.2)]} data={emptyData} now={NOW} />,
    )
    expect(cellText('체중', container)).toContain('71.2kg')
    expect(cellText('체중', container)).toContain('▼ 0.8kg')
  })

  it('식단 × 인바디 카드도 날짜 기준으로 최신·이전 측정을 잡아 실제 문장을 보여준다', () => {
    const { container } = render(
      <DietInBodyInsightCard history={[entry(14, 72), entry(0, 71)]} meals={[]} target={DEMO_NUTRITION_TARGET} />,
    )
    expect(container.querySelector('h3')?.textContent).toBe('식단 × 인바디')
    expect(container.textContent).toContain('체중이 1kg 줄었어요')
  })
})
