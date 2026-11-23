import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getMonthlyDayStatuses, type CalendarDay, type DayStatus } from '../../lib/calendar'
import { formatDurationKorean, formatTimeOfDay, isSameDay } from '../../lib/time'
import { buildMonthlyTrendSummary, getComparableDayCount } from '../../lib/trend'
import { loadWorkoutHistory } from '../../lib/workoutHistory'
import { mergeSessions } from '../../lib/workoutSummary'
import { NUTRITION_STATUS_LABELS } from '../../types'
import AnimatedBar from '../dashboard/AnimatedBar'

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']

// 기존 영양소 바(NutritionBar)의 상태 배지와 똑같은 색을 그대로 맞췄다 — 새 팔레트를 만들지 않는다.
const STATUS_CELL_CLASS: Record<DayStatus, string> = {
  none: 'bg-slate-50 text-slate-300',
  deficient: 'bg-amber-100 text-amber-700',
  adequate: 'bg-sky-100 text-sky-700',
  near_goal: 'bg-emerald-100 text-emerald-700',
  exceeded: 'bg-orange-100 text-orange-700',
}

const STATUS_DOT_CLASS: Record<DayStatus, string> = {
  none: 'bg-slate-200',
  deficient: 'bg-amber-400',
  adequate: 'bg-sky-400',
  near_goal: 'bg-emerald-400',
  exceeded: 'bg-orange-400',
}

function dayStatusLabel(status: DayStatus): string {
  return status === 'none' ? '기록 없음' : NUTRITION_STATUS_LABELS[status]
}

const LEGEND: { status: DayStatus; label: string }[] = [
  { status: 'near_goal', label: NUTRITION_STATUS_LABELS.near_goal },
  { status: 'adequate', label: NUTRITION_STATUS_LABELS.adequate },
  { status: 'deficient', label: NUTRITION_STATUS_LABELS.deficient },
  { status: 'exceeded', label: NUTRITION_STATUS_LABELS.exceeded },
  { status: 'none', label: '기록 없음' },
]

interface Props {
  // 선택한 날의 식단/운동 기록이 비어있을 때 "등록하기" 버튼에서 쓴다. 특정 날짜로 바로 기록하는
  // 기능은 없으므로(식단 촬영·운동 기록 모두 "지금" 기준), 탭만 옮겨준다.
  onNavigateTab: (tab: 'meals' | 'workout') => void
}

export default function NutritionCalendar({ onNavigateTab }: Props) {
  const { meals, nutritionTarget, workouts } = useApp()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState<CalendarDay | null>(null)

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth()

  // 운동 기록(팀원 기록 + 우리 세트 상세 기록을 합친 것) — 날짜 칸의 운동 배지와, 선택한 날의
  // 운동 목록에 같이 쓴다. WorkoutSummaryCard와 같은 방식으로 합친다.
  const sessions = useMemo(() => mergeSessions(workouts, loadWorkoutHistory()), [workouts])

  const days = useMemo(
    () => (nutritionTarget ? getMonthlyDayStatuses(meals, nutritionTarget, cursor.year, cursor.month) : []),
    [meals, nutritionTarget, cursor],
  )

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const loggedDays = days.filter((d) => d.status !== 'none')
  const metDays = loggedDays.filter((d) => d.status === 'adequate' || d.status === 'near_goal')
  const metPercent = loggedDays.length > 0 ? Math.round((metDays.length / loggedDays.length) * 100) : 0

  const previousDays = useMemo(() => {
    if (!nutritionTarget) return []
    const prev = new Date(cursor.year, cursor.month - 1, 1)
    return getMonthlyDayStatuses(meals, nutritionTarget, prev.getFullYear(), prev.getMonth())
  }, [meals, nutritionTarget, cursor])
  const trend = useMemo(() => {
    const dayCount = Math.min(getComparableDayCount(cursor.year, cursor.month), previousDays.length)
    if (dayCount === 0) return null
    return buildMonthlyTrendSummary(
      days.slice(0, dayCount).map((d) => d.status),
      previousDays.slice(0, dayCount).map((d) => d.status),
    )
  }, [days, previousDays, cursor])

  const changeMonth = (delta: number) => {
    setSelected(null)
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  if (!nutritionTarget) return null

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} aria-label="이전 달" className="p-1 text-slate-400">
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-semibold text-slate-800">
          {cursor.year}년 {cursor.month + 1}월
        </p>
        <button
          onClick={() => changeMonth(1)}
          disabled={isCurrentMonth}
          aria-label="다음 달"
          className="p-1 text-slate-400 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {loggedDays.length === 0
          ? '아직 이 달에 기록한 날이 없어요.'
          : `기록한 ${loggedDays.length}일 중 ${metDays.length}일 목표를 잘 지켰어요.`}
      </p>
      {loggedDays.length > 0 && (
        <div className="mt-2">
          <AnimatedBar
            id="calendar-month-score"
            width={metPercent}
            trackClass="bg-slate-100"
            fillClass="bg-emerald-500"
            heightClass="h-2"
          />
        </div>
      )}

      {trend && (
        <p
          className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            trend.direction === 'up' ? 'text-emerald-600' : trend.direction === 'down' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          {trend.direction === 'up' && <TrendingUp size={12} />}
          {trend.direction === 'down' && <TrendingDown size={12} />}
          {trend.message}
        </p>
      )}

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] text-slate-400">
        {WEEKDAY_HEADERS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const dayNum = new Date(d.date).getDate()
          const isToday = isSameDay(d.date, Date.now())
          const isSelected = selected?.date === d.date
          const hasWorkout = sessions.some((s) => isSameDay(s.startTime, d.date))
          return (
            <button
              key={d.date}
              onClick={() => setSelected((prev) => (prev?.date === d.date ? null : d))}
              aria-label={`${cursor.month + 1}월 ${dayNum}일 · ${dayStatusLabel(d.status)}${hasWorkout ? ' · 운동함' : ''}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-semibold transition-colors ${STATUS_CELL_CLASS[d.status]} ${
                isToday ? 'ring-2 ring-primary' : ''
              } ${isSelected ? 'ring-2 ring-slate-900' : ''}`}
            >
              {dayNum}
              {hasWorkout && <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        {LEGEND.map(({ status, label }) => (
          <span key={status} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_CLASS[status]}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          운동함
        </span>
      </div>

      {selected && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">
            {cursor.month + 1}월 {new Date(selected.date).getDate()}일
          </p>

          <div className="mt-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">식단</p>
              <button
                onClick={() => onNavigateTab('meals')}
                className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                + 추가 등록
              </button>
            </div>
            {selected.status === 'none' ? (
              <p className="mt-1 text-xs text-slate-400">기록된 식사가 없어요.</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-slate-600">
                  {Math.round(selected.calories).toLocaleString()}kcal 섭취 ·{' '}
                  <span className="font-medium text-slate-800">{NUTRITION_STATUS_LABELS[selected.status]}</span>
                </p>
                <div className="mt-2 space-y-1.5">
                  {meals
                    .filter((m) => isSameDay(m.timestamp, selected.date))
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((m) => (
                      <div key={m.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5">
                        {m.image ? (
                          <img src={m.image} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-softer text-xs">
                            🍽️
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-700">{m.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {formatTimeOfDay(m.timestamp)} · {m.slot}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">{m.calories}kcal</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">운동</p>
              <button
                onClick={() => onNavigateTab('workout')}
                className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                + 추가 등록
              </button>
            </div>
            {(() => {
              const daySessions = sessions.filter((s) => isSameDay(s.startTime, selected.date))
              return daySessions.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">운동 기록이 없어요.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {daySessions.map((s) => (
                    <div
                      key={`${s.startTime}-${s.endTime}`}
                      className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs"
                    >
                      <span className="font-medium text-slate-700">
                        {s.type}
                        {s.label ? ` · ${s.label}` : ''}
                      </span>
                      <span className="text-slate-500">
                        {formatDurationKorean(s.durationSeconds)}
                        {s.totalVolume !== null ? ` · ${Math.round(s.totalVolume * 10) / 10}kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
