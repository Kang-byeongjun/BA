import { Trash2, X } from 'lucide-react'
import { formatRelativeDate, formatTimeOfDay } from '../../lib/time'
import type { Meal } from '../../types'

interface Props {
  meal: Meal
  onClose: () => void
  onDelete: (id: string) => void
}

const NUTRIENT_ROWS: { key: 'calories' | 'protein' | 'carbohydrates' | 'fat' | 'fiber'; label: string; unit: string }[] = [
  { key: 'calories', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbohydrates', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
]

export default function MealDetailModal({ meal, onClose, onDelete }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">
              {formatRelativeDate(meal.timestamp)} · {formatTimeOfDay(meal.timestamp)} · {meal.slot}
            </p>
            <h2 className="text-lg font-bold text-slate-900">{meal.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {meal.image && (
          <img src={meal.image} alt={meal.title} className="mb-4 h-48 w-full rounded-2xl object-cover" />
        )}

        <div className="mb-4 rounded-2xl border border-slate-100 p-4">
          <p className="mb-2 text-xs font-medium text-slate-500">영양 정보</p>
          <div className="grid grid-cols-2 gap-2">
            {NUTRIENT_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-sm font-semibold text-slate-800">
                  {meal[row.key]}
                  {row.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-100 p-4">
          <p className="mb-2 text-xs font-medium text-slate-500">구성 음식</p>
          <ul className="space-y-1.5">
            {meal.foods.map((food, i) => (
              <li key={i} className="flex justify-between text-sm text-slate-700">
                <span>{food.name}</span>
                <span className="text-slate-400">{food.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => onDelete(meal.id)}
          className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-rose-100 py-3.5 font-semibold text-rose-500"
        >
          <Trash2 size={16} />
          이 식사 기록 삭제하기
        </button>
      </div>
    </div>
  )
}
