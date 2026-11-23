import { useState, type ReactNode } from 'react'
import { getWeekProteinSummary } from '../../lib/dashboardSummaries'
import { sortInBodyHistory } from '../../lib/inBodyHistoryOrder'
import { findComparisonEntry } from '../../lib/inBodyTrend'
import { getDayWeekSeries } from '../../lib/mealWeekTrend'
import type { WorkoutCardData } from '../../lib/workoutCardData'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../../types'
import { useWorkoutCardData } from '../workout/useWorkoutCardData'
import AnimatedBar from './AnimatedBar'

interface Props {
  meals: Meal[]
  target: NutritionTarget | null
  history: InBodyHistoryEntry[]
  /** 테스트·미리보기용. 없으면 앱 데이터로 만든다 */
  data?: WorkoutCardData
  /** 지금 시각(테스트용) */
  now?: number
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const CELL = 'rounded-xl bg-slate-50 px-3 py-3'
const DASH = <span className="text-lg font-bold text-slate-300">-</span>

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={CELL}>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-500">{children}</div>
    </div>
  )
}

// 대시보드 맨 위 "이번 주 한눈에": 운동 · 식단 목표 · 체중 · 연속 운동 (값이 없으면 "-")
export default function WeekGlanceCard(props: Props) {
  return props.data ? <View {...props} data={props.data} /> : <Connected {...props} />
}

function Connected(props: Props) {
  return <View {...props} data={useWorkoutCardData()} />
}

function View({ meals, target, history, data, now: nowProp }: Props & { data: WorkoutCardData }) {
  const [fallbackNow] = useState(() => Date.now())
  const now = nowProp ?? fallbackNow
  const { week } = data.summary
  const count = isNum(week.count) ? week.count : null
  const goal = isNum(week.goal) && week.goal > 0 ? week.goal : null
  const streak = isNum(data.summary.streakDays) ? data.summary.streakDays : null

  // 식단: 이번 주 식사 기록이 있을 때만 "목표 달성 N / 7일"
  const hasMeal = getDayWeekSeries(meals, now).some((d) => d.calories > 0 || d.protein > 0)
  const metDays = target && hasMeal ? getWeekProteinSummary(meals, target, now).metDays : null

  // 체중: 가장 최근 측정값 + (비교할 이전 측정이 있으면) 증감
  const sortedHistory = sortInBodyHistory(history)
  const latest = sortedHistory[0]
  const weight = latest && isNum(latest.weight) ? latest.weight : null
  const prev = latest ? findComparisonEntry(sortedHistory, latest) : null
  const diff = weight !== null && prev && isNum(prev.weight) ? Math.round((weight - prev.weight) * 10) / 10 : null

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">이번 주 한눈에</p>
      <div className="grid grid-cols-2 gap-2">
        <Cell label="이번 주 운동">
          {count === null ? (
            DASH
          ) : (
            <>
              <span className="text-lg font-bold text-slate-900">{count}</span>
              {goal !== null ? ` / ${goal}회` : '회'}
              {goal !== null && (
                <div className="mt-2">
                  <AnimatedBar
                    id="glance-workout"
                    width={Math.min(100, (count / goal) * 100)}
                    trackClass="bg-slate-200"
                    fillClass={count >= goal ? 'bg-emerald-500' : 'bg-sky-500'}
                    heightClass="h-1.5"
                  />
                </div>
              )}
            </>
          )}
        </Cell>

        <Cell label="식단 목표">
          {metDays === null ? (
            DASH
          ) : (
            <>
              <span className="text-lg font-bold text-slate-900">{metDays}</span>
              {' / 7일'}
              <div className="mt-2">
                <AnimatedBar
                  id="glance-diet"
                  width={Math.min(100, (metDays / 7) * 100)}
                  trackClass="bg-slate-200"
                  fillClass="bg-emerald-500"
                  heightClass="h-1.5"
                />
              </div>
            </>
          )}
        </Cell>

        <Cell label="체중">
          {weight === null ? (
            DASH
          ) : (
            <>
              <span className="text-lg font-bold text-slate-900">{weight}</span>kg
              {diff !== null && (
                <span className="ml-1.5 text-xs font-medium text-slate-500">
                  {diff === 0 ? '변화 없음' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}kg`}
                </span>
              )}
            </>
          )}
        </Cell>

        <Cell label="연속 운동">
          {streak === null ? (
            DASH
          ) : (
            <>
              <span className="text-lg font-bold text-slate-900">{streak}</span>일
            </>
          )}
        </Cell>
      </div>
    </div>
  )
}
