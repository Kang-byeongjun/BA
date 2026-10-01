import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { requestCoachMessage } from '../../services/coachService'
import { GOAL_LABELS, NUTRIENT_LABELS, NUTRIENT_UNITS, type Goal, type RecommendedMeal } from '../../types'

interface Props {
  meals: RecommendedMeal[]
  goal: Goal
}

type CoachState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; message: string; isFallback: boolean }

// AI 호출이 안 되거나 실패해도(키 미설정, 레이트리밋 등) 추천 카드 자체는 항상 보여야 하므로,
// 실패하면 이미 결정된 정보로 만든 기본 문구로 대체한다(숫자나 음식은 새로 만들지 않는다).
function fallbackMessage(meal: RecommendedMeal): string {
  const label = NUTRIENT_LABELS[meal.primaryNutrient]
  return `오늘 ${label}이 부족해서 추천했어요. ${meal.title}로 채워보세요.`
}

function MealCoach({ meal, goal }: { meal: RecommendedMeal; goal: Goal }) {
  const [state, setState] = useState<CoachState>({ status: 'idle' })

  const handleRequest = async () => {
    setState({ status: 'loading' })
    try {
      const message = await requestCoachMessage({
        mealTitle: meal.title,
        ingredients: meal.ingredients.map((i) => `${i.name} ${i.amount}`),
        nutrientLabel: NUTRIENT_LABELS[meal.primaryNutrient],
        nutrientAmount: meal.nutrients[meal.primaryNutrient],
        nutrientUnit: NUTRIENT_UNITS[meal.primaryNutrient],
        deficiencyPercent: meal.deficiencyPercent,
        goalLabel: GOAL_LABELS[goal],
      })
      setState({ status: 'done', message, isFallback: false })
    } catch {
      setState({ status: 'done', message: fallbackMessage(meal), isFallback: true })
    }
  }

  if (state.status === 'idle') {
    return (
      <button
        onClick={() => void handleRequest()}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600"
      >
        <Sparkles size={12} />
        AI 코치 한마디 듣기
      </button>
    )
  }

  if (state.status === 'loading') {
    return (
      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        코치가 생각 중이에요...
      </p>
    )
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-slate-600">💬 {state.message}</p>
      {state.isFallback && <p className="mt-0.5 text-[10px] text-slate-300">AI 연결이 원활하지 않아 기본 문구로 보여드려요.</p>}
    </div>
  )
}

export default function RecommendationCard({ meals, goal }: Props) {
  if (meals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">다음 식사 추천</h3>
        <p className="text-sm text-slate-500">오늘 목표를 모두 달성했어요! 훌륭해요 🎉</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">다음 식사 추천</h3>
      <div className="space-y-3">
        {meals.map((meal) => (
          <div key={meal.id} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{meal.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{meal.title}</p>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {NUTRIENT_LABELS[meal.primaryNutrient]} +{meal.nutrients[meal.primaryNutrient]}
                    {NUTRIENT_UNITS[meal.primaryNutrient]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {meal.ingredients.map((i) => `${i.name} ${i.amount}`).join(' · ')}
                </p>
                <MealCoach meal={meal} goal={goal} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
