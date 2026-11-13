import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getMonthlyDayStatuses, type CalendarDay, type DayStatus } from '../../lib/calendar'
import { isSameDay } from '../../lib/time'
import { NUTRITION_STATUS_LABELS } from '../../types'
import AnimatedBar from '../dashboard/AnimatedBar'

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']

// 기존 영양소 바(NutritionBar)의 상태 배지와 똑같은 색을 그대로 맞췄다 — 새 팔레트를 만들지 않는다.
const STATUS_CELL_CLASS: Record<DayStatus, string> = {
  none: 'bg-slate-50 text-slate-300',
  deficient: 'bg-amber-100 text-amber-700',
  adequate: 'bg-sky-100 text-sky-700',
  near_goal: 'bg-emerald-100 text-emerald-700',
  exceeded: 'bg-rose-100 text-rose-700',
}

const STATUS_DOT_CLASS: Record<DayStatus, string> = {
  none: 'bg-slate-200',
  deficient: 'bg-amber-400',
  adequate: 'bg-sky-400',
  near_goal: 'bg-emerald-400',
  exceeded: 'bg-rose-400',
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

export default function NutritionCalendar() {
  const { meals, nutritionTarget } = useApp()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState<CalendarDay | null>(null)

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth()

  const days = useMemo(
    () => (nutritionTarget ? getMonthlyDayStatuses(meals, nutritionTarget, cursor.year, cursor.month) : []),
    [meals, nutritionTarget, cursor],
  )

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const loggedDays = days.filter((d) => d.status !== 'none')
  const metDays = loggedDays.filter((d) => d.status === 'adequate' || d.status === 'near_goal')
  const metPercent = loggedDays.length > 0 ? Math.round((metDays.length / loggedDays.length) * 100) : 0

  const changeMonth = (delta: number) => {
    setSelected(null)
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  if (!nutritionTarget) return null

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">캘린더</h1>

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
            return (
              <button
                key={d.date}
                onClick={() => setSelected((prev) => (prev?.date === d.date ? null : d))}
                aria-label={`${cursor.month + 1}월 ${dayNum}일 · ${dayStatusLabel(d.status)}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-semibold transition-colors ${STATUS_CELL_CLASS[d.status]} ${
                  isToday ? 'ring-2 ring-emerald-500' : ''
                } ${isSelected ? 'ring-2 ring-slate-900' : ''}`}
              >
                {dayNum}
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
        </div>

        {selected && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-800">
              {cursor.month + 1}월 {new Date(selected.date).getDate()}일
            </p>
            {selected.status === 'none' ? (
              <p className="mt-1 text-slate-400">기록된 식사가 없어요.</p>
            ) : (
              <p className="mt-1 text-slate-600">
                {Math.round(selected.calories).toLocaleString()}kcal 섭취 ·{' '}
                <span className="font-medium text-slate-800">{NUTRITION_STATUS_LABELS[selected.status]}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
