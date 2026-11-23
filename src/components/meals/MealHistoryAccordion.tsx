import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { groupMealsByDay } from '../../lib/mealHistory'
import { formatRelativeDate, formatTimeOfDay } from '../../lib/time'
import type { Meal } from '../../types'

interface Props {
  meals: Meal[]
  onSelectMeal: (meal: Meal) => void
  onDeleteMeal: (id: string) => void
}

// 쌓일수록 한없이 길어지는 평평한 목록 대신, 날짜를 먼저 고르고(사진 미리보기 포함) 그 날의
// 식사만 펼쳐보는 2단 구조로 바꿨다.
export default function MealHistoryAccordion({ meals, onSelectMeal, onDeleteMeal }: Props) {
  const [open, setOpen] = useState(false)
  const [openDay, setOpenDay] = useState<number | null>(null)
  const groups = groupMealsByDay(meals)
  const activeGroup = groups.find((g) => g.date === openDay) ?? null

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v
      if (!next) setOpenDay(null)
      return next
    })
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <button onClick={toggleOpen} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <UtensilsCrossed size={14} />
          </span>
          <h2 className="text-sm font-semibold text-slate-800">식사 기록{meals.length > 0 && ` (${meals.length})`}</h2>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {!open && <p className="mt-1 text-xs text-slate-400">지금까지 기록한 식사를 모아봐요. 눌러서 펼쳐보세요.</p>}

      {open && groups.length === 0 && (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <UtensilsCrossed className="text-slate-300" size={32} />
          <p className="text-sm text-slate-400">아직 기록된 식사가 없어요.</p>
        </div>
      )}

      {open && groups.length > 0 && !activeGroup && (
        <div className="mt-3 space-y-2">
          {groups.map((group) => {
            const dayCalories = group.meals.reduce((s, m) => s + m.calories, 0)
            return (
              <button
                key={group.date}
                onClick={() => setOpenDay(group.date)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left"
              >
                <div className="flex -space-x-2">
                  {group.meals.slice(0, 3).map((m) =>
                    m.image ? (
                      <img
                        key={m.id}
                        src={m.image}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg border-2 border-white object-cover"
                      />
                    ) : (
                      <div
                        key={m.id}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-primary-softer text-sm"
                      >
                        🍽️
                      </div>
                    ),
                  )}
                  {group.meals.length > 3 && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-500">
                      +{group.meals.length - 3}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{formatRelativeDate(group.date)}</p>
                  <p className="text-xs text-slate-500">
                    식사 {group.meals.length}개 · {Math.round(dayCalories)}kcal
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </button>
            )
          })}
        </div>
      )}

      {open && activeGroup && (
        <div className="mt-3">
          <button onClick={() => setOpenDay(null)} className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-500">
            <ChevronLeft size={14} /> 전체 기록
          </button>
          <p className="mb-2 text-sm font-semibold text-slate-800">{formatRelativeDate(activeGroup.date)}</p>
          <div className="space-y-3">
            {activeGroup.meals.map((meal) => (
              <button
                key={meal.id}
                onClick={() => onSelectMeal(meal)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left"
              >
                {meal.image ? (
                  <img src={meal.image} alt={meal.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-softer text-xl">🍽️</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>{formatTimeOfDay(meal.timestamp)}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">{meal.slot}</span>
                  </div>
                  <p className="truncate font-semibold text-slate-800">{meal.title}</p>
                  <p className="text-sm text-slate-500">{meal.calories} kcal</p>
                </div>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteMeal(meal.id)
                  }}
                  className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={16} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
