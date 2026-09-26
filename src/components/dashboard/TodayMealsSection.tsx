import { Plus } from 'lucide-react'
import { formatTimeOfDay } from '../../lib/time'
import type { Meal, MealSlot } from '../../types'

interface Props {
  meals: Meal[] // 오늘 기록된 식사만 전달
  onSelect: (meal: Meal) => void
  onAdd: () => void
}

const SLOTS: MealSlot[] = ['아침', '점심', '저녁', '간식']

const SLOT_EMOJI: Record<MealSlot, string> = {
  아침: '🌅',
  점심: '🍚',
  저녁: '🌙',
  간식: '🍪',
}

export default function TodayMealsSection({ meals, onSelect, onAdd }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">오늘의 식단</h3>
        <span className="text-xs text-slate-400">{meals.length}개 기록됨</span>
      </div>

      <div className="space-y-3">
        {SLOTS.map((slot) => {
          const slotMeals = meals
            .filter((m) => m.slot === slot)
            .sort((a, b) => a.timestamp - b.timestamp)

          return (
            <div key={slot}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <span>{SLOT_EMOJI[slot]}</span>
                <span>{slot}</span>
              </div>

              {slotMeals.length === 0 ? (
                <button
                  onClick={onAdd}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-400"
                >
                  <span>아직 기록이 없어요</span>
                  <span className="flex items-center gap-1 font-medium text-emerald-500">
                    <Plus size={14} />
                    추가
                  </span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  {slotMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => onSelect(meal)}
                      className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left"
                    >
                      {meal.image ? (
                        <img src={meal.image} alt={meal.title} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-base">
                          🍽️
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{meal.title}</p>
                        <p className="text-xs text-slate-400">
                          {formatTimeOfDay(meal.timestamp)} · {meal.calories}kcal
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
