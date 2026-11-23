// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import { buildWorkoutCardData } from '../../lib/workoutCardData'
import type { RecordedExercise, WorkoutSessionRecord } from '../../lib/workoutHistory'
import type { WorkoutSummaryInput } from '../../lib/workoutSummary'
import { DEFAULT_WORKOUT_PROFILE, type Workout } from '../../types'
import { AppProvider } from '../../context/AppContext'
import DashboardWorkoutSection from '../workout/DashboardWorkoutSection'
import HomeWeekStats from '../workout/HomeWeekStats'
import HomeWorkoutCard from '../workout/HomeWorkoutCard'

afterEach(cleanup)

// 2026-11-13(금) 18시. 이번 주 = 11/9(월) ~ 11/15(일)
const at = (m: number, d: number, h = 10) => new Date(2026, m - 1, d, h).getTime()
const NOW = at(11, 13, 18)

const rx = { setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 80, restMax: 100 }
const rex = (order: number, name: string): RoutineExercise => ({
  order,
  id: `e${order}`,
  name,
  group: 'CHEST',
  reason: '',
  caution: null,
  prescription: rx,
})
const routine: Pick<WorkoutResult, 'days'> = {
  days: [
    { day: 1, label: '상체', exercises: [rex(1, '벤치프레스'), rex(2, '오버헤드프레스'), rex(3, '랫풀다운'), rex(4, '바벨 컬'), rex(5, '플랭크')] },
    { day: 2, label: '하체', exercises: [rex(1, '스쿼트')] },
  ],
}

const exr = (group: RecordedExercise['group'], volume: number): RecordedExercise => ({
  exerciseId: `x-${group}`,
  name: '종목',
  group,
  sets: [{ kg: volume / 10, reps: 10 }],
  volume,
})
let seq = 0
function rec(start: number, exercises: RecordedExercise[], o: Partial<WorkoutSessionRecord> = {}): WorkoutSessionRecord {
  const durationSeconds = o.durationSeconds ?? 3000
  return {
    id: `r${++seq}`,
    startedAt: start,
    date: start + durationSeconds * 1000,
    day: 1,
    label: '상체',
    exercises,
    totalVolume: exercises.reduce((s, e) => s + e.volume, 0),
    durationSeconds,
    completedSets: 3,
    ...o,
  }
}
const teamOf = (r: WorkoutSessionRecord): Workout => ({
  id: `w${r.id}`,
  type: '헬스',
  startTime: r.startedAt,
  endTime: r.date,
  duration: r.durationSeconds,
})
const make = (history: WorkoutSessionRecord[], withRoutine = true) => {
  const input: WorkoutSummaryInput = {
    history,
    workouts: history.map(teamOf),
    profile: DEFAULT_WORKOUT_PROFILE, // 주 3회
    routine: withRoutine ? routine : null,
  }
  return buildWorkoutCardData(input, NOW)
}

const BAD = /NaN|undefined|null/

describe('HomeWorkoutCard', () => {
  it('운동 전: 일차·종목 수·예상 시간·종목 이름 3개 + 외 N, 시작 버튼이 운동 탭으로 보낸다', () => {
    const onOpen = vi.fn()
    // 지난번이 2일차(어제)라 오늘은 1일차
    const data = make([rec(at(11, 12), [exr('LEGS', 500)], { day: 2, label: '하체' })])
    const { container } = render(<HomeWorkoutCard data={data} onOpenWorkout={onOpen} />)
    expect(screen.getByText('오늘의 운동')).toBeTruthy()
    expect(screen.getByText('1일차 · 상체')).toBeTruthy()
    expect(screen.getByText(/5종목 · 약 \d+분/)).toBeTruthy()
    expect(screen.getByText('벤치프레스 · 오버헤드프레스 · 랫풀다운 외 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '운동 시작하기' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toMatch(BAD)
  })

  it('오늘 운동 완료 후: 완료 문구, 분·볼륨·지난주 대비, 다음 루틴 미리 보기', () => {
    const onOpen = vi.fn()
    const data = make([
      rec(at(11, 3), [exr('CHEST', 1000)]), // 지난주
      rec(at(11, 13, 9), [exr('CHEST', 1500)], { durationSeconds: 2700 }), // 오늘(금)
    ])
    const { container } = render(<HomeWorkoutCard data={data} onOpenWorkout={onOpen} />)
    expect(screen.getByText('오늘 운동 완료 ✓')).toBeTruthy()
    expect(screen.getByText('45분 · 총 볼륨 1500kg · 지난주보다 +50%')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '운동 시작하기' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '다음 루틴 미리 보기' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toMatch(BAD)
  })

  it('완료 후 지난주 기록이 없으면 지난주 대비 항목을 숨긴다', () => {
    const data = make([rec(at(11, 13, 9), [exr('CHEST', 1500)], { durationSeconds: 2700 })])
    const { container } = render(<HomeWorkoutCard data={data} />)
    expect(screen.getByText('45분 · 총 볼륨 1500kg')).toBeTruthy()
    expect(container.textContent).not.toMatch(/지난주보다/)
  })

  it('루틴이 없으면 운동 탭 안내와 이동 버튼을 보여준다', () => {
    const onOpen = vi.fn()
    const { container } = render(<HomeWorkoutCard data={make([], false)} onOpenWorkout={onOpen} />)
    expect(screen.getByText('운동 탭에서 루틴을 만들어보세요')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '운동 탭으로 가기' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toMatch(BAD)
  })

  it('루틴은 있고 기록이 없으면 1일차를 보여준다', () => {
    render(<HomeWorkoutCard data={make([])} />)
    expect(screen.getByText('1일차 · 상체')).toBeTruthy()
  })
})

describe('HomeWeekStats', () => {
  it('운동 전(이번 주 0회): 0 / 3회, 연속 0일', () => {
    const { container } = render(<HomeWeekStats data={make([])} />)
    expect(screen.getByText('이번 주 운동')).toBeTruthy()
    expect(container.textContent).toContain('0 / 3회')
    expect(container.textContent).toContain('연속 운동')
    expect(container.textContent).not.toMatch(BAD)
  })

  it('운동 후: 2 / 3회, 연속 2일, 식단 칸은 slot으로 받는다', () => {
    const data = make([rec(at(11, 12), [exr('CHEST', 800)]), rec(at(11, 13, 9), [exr('CHEST', 800)])])
    const { container } = render(<HomeWeekStats data={data} dietSlot={<div>식단 목표 자리</div>} />)
    expect(container.textContent).toContain('2 / 3회')
    expect(screen.getByText('식단 목표 자리')).toBeTruthy()
    expect(container.textContent).toMatch(/2일/)
  })

  it('프로필(목표)이 없으면 횟수만 보여준다', () => {
    const data = buildWorkoutCardData({ history: [], workouts: [], profile: null, routine: null }, NOW)
    const { container } = render(<HomeWeekStats data={data} />)
    expect(container.textContent).toContain('0회')
    expect(container.textContent).not.toContain('/')
  })
})

describe('DashboardWorkoutSection', () => {
  it('기록이 없으면 빈 상태 안내만 보여준다', () => {
    const { container } = render(<DashboardWorkoutSection data={make([])} />)
    expect(screen.getByText(/아직 운동 기록이 없어요/)).toBeTruthy()
    expect(screen.queryByText('이번 주 운동한 요일')).toBeNull()
    expect(container.textContent).not.toMatch(BAD)
  })

  it('이번 주 기록이 있으면 요일 점·볼륨·부위별 막대·균형 안내·최근 기록을 보여준다', () => {
    const data = make([
      rec(at(11, 3), [exr('CHEST', 1000)]), // 지난주 화
      rec(at(11, 10), [exr('CHEST', 900), exr('BACK', 900), exr('LEGS', 100)]), // 이번 주 화
      rec(at(11, 12), [exr('CHEST', 600)]), // 이번 주 목
    ])
    const { container } = render(<DashboardWorkoutSection data={data} />)
    expect(screen.getByTestId('week-dot-1').dataset.done).toBe('true') // 화
    expect(screen.getByTestId('week-dot-3').dataset.done).toBe('true') // 목
    expect(screen.getByTestId('week-dot-0').dataset.done).toBe('false') // 월
    expect(container.textContent).toContain('2500kg')
    expect(screen.getByText('하체가 적어요. 다음 루틴에서 늘려보세요')).toBeTruthy()
    expect(screen.getAllByText('가슴').length).toBeGreaterThan(0)
    expect(screen.getByText('최근 기록')).toBeTruthy()
    expect(container.textContent).not.toMatch(BAD)
  })

  it('균형이 잡혀 있으면 안내를 보여주지 않는다', () => {
    const data = make([rec(at(11, 10), [exr('CHEST', 800), exr('LEGS', 700)])])
    render(<DashboardWorkoutSection data={data} />)
    expect(screen.queryByText(/적어요/)).toBeNull()
  })

  it('이번 주 운동이 아직 없으면 빨간 -100% 대신 첫 운동 안내를 보여준다', () => {
    const data = make([rec(at(11, 4), [exr('CHEST', 1000)])]) // 지난주에만 기록
    const { container } = render(<DashboardWorkoutSection data={data} />)
    expect(screen.getByText('이번 주 첫 운동을 시작해보세요')).toBeTruthy()
    expect(container.textContent).not.toContain('-100%')
    expect(container.textContent).not.toMatch(BAD)
  })
})

describe('앱 데이터 연결(data를 안 넘길 때)', () => {
  it('저장된 기록·루틴이 없으면 세 컴포넌트 모두 빈 상태로 안전하게 뜬다', () => {
    localStorage.clear()
    const { container } = render(
      <AppProvider>
        <HomeWorkoutCard />
        <HomeWeekStats />
        <DashboardWorkoutSection />
      </AppProvider>,
    )
    expect(screen.getByText('운동 탭에서 루틴을 만들어보세요')).toBeTruthy()
    expect(screen.getByText(/아직 운동 기록이 없어요/)).toBeTruthy()
    expect(container.textContent).not.toMatch(BAD)
  })
})

describe('DashboardWorkoutSection 주간 볼륨 변화율 표시', () => {
  const volumeBox = () => screen.getByText('주간 볼륨(헬스)').parentElement!

  it('이번 주 볼륨이 0이면(유산소만 한 경우) -100% 대신 "-"를 보여준다', () => {
    const lastWeek = rec(at(11, 4), [exr('CHEST', 1000)]) // 지난주 헬스 기록
    const thisWeekCardio: Workout = { id: 'run', type: '러닝', startTime: at(11, 10), endTime: at(11, 10) + 1_800_000, duration: 1800 }
    const input: WorkoutSummaryInput = {
      history: [lastWeek],
      workouts: [teamOf(lastWeek), thisWeekCardio],
      profile: DEFAULT_WORKOUT_PROFILE,
      routine,
    }
    const { container } = render(<DashboardWorkoutSection data={buildWorkoutCardData(input, NOW)} />)
    const box = volumeBox()
    expect(box.textContent).toContain('0kg')
    expect(box.textContent).toContain('-')
    expect(container.textContent).not.toContain('-100%')
    expect(container.textContent).not.toContain('이번 주 첫 운동을 시작해보세요') // 운동은 했으니
  })

  it('지난주 볼륨이 0이면 퍼센트 대신 "-"를 보여준다', () => {
    const { container } = render(<DashboardWorkoutSection data={make([rec(at(11, 10), [exr('CHEST', 900)])])} />)
    const box = volumeBox()
    expect(box.textContent).toContain('900kg')
    expect(box.textContent).toMatch(/-$/)
    expect(container.textContent).not.toMatch(/\+\d+%|Infinity|NaN/)
  })

  it('둘 다 있으면 퍼센트를 보여준다', () => {
    const data = make([rec(at(11, 4), [exr('CHEST', 1000)]), rec(at(11, 10), [exr('CHEST', 1500)])])
    render(<DashboardWorkoutSection data={data} />)
    expect(volumeBox().textContent).toContain('+50%')
  })
})
