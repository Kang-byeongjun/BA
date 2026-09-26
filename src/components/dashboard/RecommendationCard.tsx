import { NUTRIENT_LABELS, NUTRIENT_UNITS, type RecommendedFood } from '../../types'

interface Props {
  foods: RecommendedFood[]
}

export default function RecommendationCard({ foods }: Props) {
  if (foods.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">다음 식사 추천</h3>
        <p className="text-sm text-slate-500">오늘 목표를 모두 달성했어요! 훌륭해요 🎉</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">오늘 추천 음식</h3>
      <div className="grid grid-cols-2 gap-3">
        {foods.map((food) => (
          <div key={food.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="text-2xl">{food.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{food.name}</p>
              <p className="text-xs text-emerald-600">
                {NUTRIENT_LABELS[food.nutrient]} +{food.amount}
                {NUTRIENT_UNITS[food.nutrient]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
