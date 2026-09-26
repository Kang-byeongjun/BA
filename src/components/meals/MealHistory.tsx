import { Trash2, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { formatRelativeDate, formatTimeOfDay } from '../../lib/time'
import type { Meal } from '../../types'
import MealDetailModal from './MealDetailModal'

export default function MealHistory() {
  const { meals, dispatch } = useApp()
  const [selected, setSelected] = useState<Meal | null>(null)

  const sorted = [...meals].sort((a, b) => b.timestamp - a.timestamp)

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_MEAL', id })
    setSelected((prev) => (prev?.id === id ? null : prev))
  }

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">식사 기록</h1>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <UtensilsCrossed className="text-slate-300" size={32} />
          <p className="text-sm text-slate-400">아직 기록된 식사가 없어요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((meal) => (
            <button
              key={meal.id}
              onClick={() => setSelected(meal)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left"
            >
              {meal.image ? (
                <img src={meal.image} alt={meal.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                  🍽️
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>{formatRelativeDate(meal.timestamp)}</span>
                  <span>·</span>
                  <span>{formatTimeOfDay(meal.timestamp)}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
                    {meal.slot}
                  </span>
                </div>
                <p className="truncate font-semibold text-slate-800">{meal.title}</p>
                <p className="text-sm text-slate-500">{meal.calories} kcal</p>
              </div>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(meal.id)
                }}
                className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
              >
                <Trash2 size={16} />
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <MealDetailModal meal={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
      )}
    </div>
  )
}
