import { Camera } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import MealDetailModal from '../meals/MealDetailModal'
import { generateFeedback, getRecommendedFoods, sumMeals } from '../../lib/nutrition'
import { isSameDay } from '../../lib/time'
import type { Meal } from '../../types'
import CalorieSummary from './CalorieSummary'
import FeedbackPanel from './FeedbackPanel'
import NutritionBar from './NutritionBar'
import RecommendationCard from './RecommendationCard'
import TodayMealsSection from './TodayMealsSection'

interface Props {
  onOpenCamera: () => void
}

export default function Dashboard({ onOpenCamera }: Props) {
  const { meals, nutritionTarget, profile, dispatch } = useApp()
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)

  const todayMeals = useMemo(() => meals.filter((m) => isSameDay(m.timestamp, Date.now())), [meals])
  const consumed = useMemo(() => sumMeals(todayMeals), [todayMeals])

  if (!nutritionTarget) return null

  const feedback = generateFeedback(consumed, nutritionTarget)
  const recommendations = getRecommendedFoods(consumed, nutritionTarget)

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <div>
        <p className="text-sm text-slate-400">
          안녕하세요{profile ? ',' : ''} 오늘도 목표를 향해 달려볼까요?
        </p>
      </div>

      <CalorieSummary consumed={consumed.calories} target={nutritionTarget.calories} />

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
      </div>

      <TodayMealsSection meals={todayMeals} onSelect={setSelectedMeal} onAdd={onOpenCamera} />

      <button
        onClick={onOpenCamera}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-semibold text-white shadow-lg shadow-slate-300 active:scale-[0.98]"
      >
        <Camera size={20} />
        음식 촬영하고 기록하기
      </button>

      <FeedbackPanel feedback={feedback} />
      <RecommendationCard foods={recommendations} />

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onDelete={(id) => {
            dispatch({ type: 'DELETE_MEAL', id })
            setSelectedMeal(null)
          }}
        />
      )}
    </div>
  )
}
