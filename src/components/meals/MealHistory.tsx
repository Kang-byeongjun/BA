import { Camera } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateFeedback, getRecommendedMeals, getStreakDays, sumMeals } from '../../lib/nutrition'
import { isSameDay } from '../../lib/time'
import { getTodayWaterTotal } from '../../lib/water'
import { DEFAULT_WATER_TARGET_ML, type Meal, type MealSlot } from '../../types'
import CalorieSummary from '../dashboard/CalorieSummary'
import NutritionBar from '../dashboard/NutritionBar'
import NutritionFeedbackCard from '../dashboard/NutritionFeedbackCard'
import TodayMealsSection from '../dashboard/TodayMealsSection'
import WaterBar from '../dashboard/WaterBar'
import MealDetailModal from './MealDetailModal'
import MealHistoryAccordion from './MealHistoryAccordion'

interface Props {
  // slot을 넘기면 그 칸으로 바로 기록된다. 하단 촬영 버튼처럼 어느 칸인지 모를 때는 생략한다.
  onOpenCamera: (slot?: MealSlot) => void
}

export default function MealHistory({ onOpenCamera }: Props) {
  const { meals, waterLogs, nutritionTarget, profile, dispatch } = useApp()
  const [selected, setSelected] = useState<Meal | null>(null)

  const todayMeals = useMemo(() => meals.filter((m) => isSameDay(m.timestamp, Date.now())), [meals])
  const consumed = useMemo(() => sumMeals(todayMeals), [todayMeals])
  const streakDays = useMemo(() => getStreakDays(meals), [meals])
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

      <CalorieSummary consumed={consumed.calories} target={nutritionTarget.calories} streakDays={streakDays} />

      <button
        onClick={() => onOpenCamera()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-white shadow-lg shadow-primary/25 active:scale-[0.98]"
      >
        <Camera size={20} />
        음식 촬영하고 기록하기
      </button>

      <TodayMealsSection meals={todayMeals} onSelect={setSelected} onAdd={onOpenCamera} />

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
      <NutritionFeedbackCard feedback={feedback} recommendedMeals={recommendations} goal={recommendationProfile.goal} />

      <MealHistoryAccordion meals={meals} onSelectMeal={setSelected} onDeleteMeal={handleDelete} />

      {selected && (
        <MealDetailModal meal={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
      )}
    </div>
  )
}
