import { Trash2, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateFeedback, getRecommendedMeals, sumMeals } from '../../lib/nutrition'
import { formatRelativeDate, formatTimeOfDay, isSameDay } from '../../lib/time'
import { getTodayWaterTotal } from '../../lib/water'
import { DEFAULT_WATER_TARGET_ML, type Meal } from '../../types'
import FeedbackPanel from '../dashboard/FeedbackPanel'
import NutritionBar from '../dashboard/NutritionBar'
import RecommendationCard from '../dashboard/RecommendationCard'
import WaterBar from '../dashboard/WaterBar'
import MealDetailModal from './MealDetailModal'

export default function MealHistory() {
  const { meals, waterLogs, nutritionTarget, profile, dispatch } = useApp()
  const [selected, setSelected] = useState<Meal | null>(null)

  const sorted = [...meals].sort((a, b) => b.timestamp - a.timestamp)

  const todayMeals = useMemo(() => meals.filter((m) => isSameDay(m.timestamp, Date.now())), [meals])
  const consumed = useMemo(() => sumMeals(todayMeals), [todayMeals])
  const eatenTodayFoodNames = useMemo(() => todayMeals.flatMap((m) => m.foods.map((f) => f.name)), [todayMeals])
  const hasUncertainPortionsToday = todayMeals.some((m) => m.hasLowConfidencePortions)
  const todayWaterLogs = useMemo(() => waterLogs.filter((w) => isSameDay(w.timestamp, Date.now())), [waterLogs])
  const todayWaterTotal = useMemo(() => getTodayWaterTotal(waterLogs), [waterLogs])

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_MEAL', id })
    setSelected((prev) => (prev?.id === id ? null : prev))
  }

  if (!nutritionTarget) return null

  // 체지방률 기반 추천 우선순위 보정에 쓰는 최소 정보. profile이 없을 상황은 실질적으로 없지만
  // (온보딩 완료 후에만 이 탭이 보임) 타입 안전을 위해 중립값으로 대체한다.
  const recommendationProfile = profile
    ? { goal: profile.goal, gender: profile.gender, bodyFatPercentage: profile.bodyFatPercentage }
    : { goal: 'health_care' as const, gender: 'male' as const, bodyFatPercentage: null }
  const feedback = generateFeedback(consumed, nutritionTarget)
  const recommendations = getRecommendedMeals(consumed, nutritionTarget, recommendationProfile, eatenTodayFoodNames)

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">식단</h1>

      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4">
        <NutritionBar
          label="단백질"
          consumed={consumed.protein}
          target={nutritionTarget.protein}
          unit="g"
          colorClass="bg-sky-500"
        />
        <NutritionBar
          label="탄수화물"
          consumed={consumed.carbohydrates}
          target={nutritionTarget.carbohydrates}
          unit="g"
          colorClass="bg-amber-500"
        />
        <NutritionBar
          label="지방"
          consumed={consumed.fat}
          target={nutritionTarget.fat}
          unit="g"
          colorClass="bg-violet-500"
        />
        <NutritionBar
          label="식이섬유"
          consumed={consumed.fiber}
          target={nutritionTarget.fiber}
          unit="g"
          colorClass="bg-emerald-500"
        />
        <WaterBar
          consumedMl={todayWaterTotal}
          targetMl={DEFAULT_WATER_TARGET_ML}
          onAdd={(amount) => dispatch({ type: 'ADD_WATER', amount })}
          onUndo={() => {
            const last = todayWaterLogs[0]
            if (last) dispatch({ type: 'DELETE_WATER', id: last.id })
          }}
          canUndo={todayWaterLogs.length > 0}
        />
      </div>

      {hasUncertainPortionsToday && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          오늘 기록 중 AI가 자신 없어했던 양이 그대로 포함돼 있어요. 아래 % 숫자는 참고용으로 봐주세요.
        </p>
      )}
      <FeedbackPanel feedback={feedback} />
      <RecommendationCard meals={recommendations} goal={recommendationProfile.goal} />

      <h2 className="text-sm font-semibold text-slate-500">식사 기록</h2>

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
