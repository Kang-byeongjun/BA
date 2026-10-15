import { Camera, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useDevMode, useSecretTapCounter } from '../../lib/devMode'
import MealDetailModal from '../meals/MealDetailModal'
import { generateFeedback, getRecommendedMeals, sumMeals } from '../../lib/nutrition'
import { isSameDay } from '../../lib/time'
import type { Meal } from '../../types'
import CalorieSummary from './CalorieSummary'
import FeedbackPanel from './FeedbackPanel'
import NutritionBar from './NutritionBar'
import RecommendationCard from './RecommendationCard'
import TodayMealsSection from './TodayMealsSection'
import UpdatesPanel from './UpdatesPanel'

interface Props {
  onOpenCamera: () => void
  // 방금 기록한 식사 (기록 직후 얼마나 더해졌는지 보여준다)
  recentMeal: Meal | null
  onDismissRecentMeal: () => void
}

export default function Dashboard({ onOpenCamera, recentMeal, onDismissRecentMeal }: Props) {
  const { meals, nutritionTarget, profile, dispatch } = useApp()
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [devMode, unlockDevMode] = useDevMode()
  const [updatesPanelOpen, setUpdatesPanelOpen] = useState(false)
  const registerSecretTap = useSecretTapCounter(unlockDevMode)

  useEffect(() => {
    if (!recentMeal) return
    const timer = setTimeout(onDismissRecentMeal, 12000)
    return () => clearTimeout(timer)
  }, [recentMeal, onDismissRecentMeal])

  const todayMeals = useMemo(() => meals.filter((m) => isSameDay(m.timestamp, Date.now())), [meals])
  const consumed = useMemo(() => sumMeals(todayMeals), [todayMeals])
  const eatenTodayFoodNames = useMemo(() => todayMeals.flatMap((m) => m.foods.map((f) => f.name)), [todayMeals])
  const hasUncertainPortionsToday = todayMeals.some((m) => m.hasLowConfidencePortions)

  if (!nutritionTarget) return null

  // 체지방률 기반 추천 우선순위 보정 + 재료/조합 추천 방식 선택에 쓰는 최소 정보. profile이 없을
  // 상황은 실질적으로 없지만(데모/온보딩 완료 후에만 대시보드가 보임) 타입 안전을 위해 중립값으로 대체한다.
  const recommendationProfile = profile
    ? {
        goal: profile.goal,
        gender: profile.gender,
        bodyFatPercentage: profile.bodyFatPercentage,
        mealFlexibility: profile.mealFlexibility,
      }
    : { goal: 'health_care' as const, gender: 'male' as const, bodyFatPercentage: null, mealFlexibility: 'flexible' as const }
  const feedback = generateFeedback(consumed, nutritionTarget)
  const recommendations = getRecommendedMeals(consumed, nutritionTarget, recommendationProfile, eatenTodayFoodNames)

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-400 select-none" onClick={registerSecretTap}>
          안녕하세요{profile ? ',' : ''} 오늘도 목표를 향해 달려볼까요?
        </p>
        {devMode && (
          <button
            onClick={() => setUpdatesPanelOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            <Sparkles size={12} />
            업데이트 노트
          </button>
        )}
      </div>

      {recentMeal && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-sm">
            <p className="font-semibold text-emerald-800">방금 기록했어요 · {recentMeal.title}</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              +{recentMeal.calories}kcal · 단백질 +{recentMeal.protein}g · 탄수화물 +{recentMeal.carbohydrates}g · 지방 +
              {recentMeal.fat}g · 식이섬유 +{recentMeal.fiber}g
            </p>
          </div>
          <button onClick={onDismissRecentMeal} aria-label="닫기" className="shrink-0 text-emerald-600">
            <X size={16} />
          </button>
        </div>
      )}

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

      {hasUncertainPortionsToday && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          오늘 기록 중 AI가 자신 없어했던 양이 그대로 포함돼 있어요. 아래 % 숫자는 참고용으로 봐주세요.
        </p>
      )}
      <FeedbackPanel feedback={feedback} />
      <RecommendationCard meals={recommendations} goal={recommendationProfile.goal} mealFlexibility={recommendationProfile.mealFlexibility} />

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

      {updatesPanelOpen && <UpdatesPanel onClose={() => setUpdatesPanelOpen(false)} />}
    </div>
  )
}
