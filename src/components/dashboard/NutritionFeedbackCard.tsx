import { ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useMealCoach } from '../../hooks/useMealCoach'
import type { MacroFeedback } from '../../lib/nutrition'
import {
  NUTRIENT_UNITS,
  type Goal,
  type MealComboIngredientDisplay,
  type NutrientKey,
  type RecommendedMeal,
} from '../../types'

interface Props {
  feedback: MacroFeedback[]
  recommendedMeals: RecommendedMeal[]
  goal: Goal
}

// 가장 우선순위 높은 추천의 코치 문구는 홈 화면 맨 위(HomeCoach)에 항상 자동으로 보이므로,
// 여기서는(카드 자체가 기본 접힘 상태라) 전부 눌러야 뜨도록 통일한다.
function MealCoach({ meal, goal }: { meal: RecommendedMeal; goal: Goal }) {
  const { state, request } = useMealCoach(meal, goal, false)

  if (state.status === 'idle') {
    return (
      <button onClick={() => void request()} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
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

// 위 재료들이 전부 집에 없을 때 쓸 대체 재료 목록 — 영양소 섹션당 한 번만 보여주고, 기본은
// 접혀 있다가 눌러야 펼쳐진다.
function AlternativesToggle({ alternatives }: { alternatives: MealComboIngredientDisplay[] }) {
  const [open, setOpen] = useState(false)
  if (alternatives.length === 0) return null

  return (
    <div className="mt-1">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-slate-500">
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        위 재료가 집에 없다면? 다른 재료 보기
      </button>
      {open && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {alternatives.map((alt) => (
            <li key={alt.name} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">
              {alt.name} <span className="text-slate-400">{alt.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RecommendedMealRow({ meal, goal }: { meal: RecommendedMeal; goal: Goal }) {
  // 재료 추천(1개 재료, 이름이 제목과 같음)은 이름만 중복이라 빼고, 양은 그대로 보여준다.
  const singleRedundantName = meal.ingredients.length === 1 && meal.ingredients[0]?.name === meal.title
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{meal.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">{meal.title}</p>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              +{meal.nutrients[meal.primaryNutrient]}
              {NUTRIENT_UNITS[meal.primaryNutrient]}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {singleRedundantName ? meal.ingredients[0].amount : meal.ingredients.map((i) => `${i.name} ${i.amount}`).join(' · ')}
          </p>
          <MealCoach meal={meal} goal={goal} />
        </div>
      </div>
    </div>
  )
}

function groupByNutrient(meals: RecommendedMeal[]): Map<NutrientKey, RecommendedMeal[]> {
  const map = new Map<NutrientKey, RecommendedMeal[]>()
  for (const meal of meals) {
    const list = map.get(meal.primaryNutrient)
    if (list) list.push(meal)
    else map.set(meal.primaryNutrient, [meal])
  }
  return map
}

export default function NutritionFeedbackCard({ feedback, recommendedMeals, goal }: Props) {
  const [open, setOpen] = useState(true)
  if (feedback.length === 0) return null

  const recommendationsByNutrient = groupByNutrient(recommendedMeals)

  return (
    <div className="rounded-2xl border border-primary-soft bg-primary-soft/60 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Sparkles size={14} />
          </span>
          <h3 className="text-sm font-semibold text-primary-dark">AI 영양 피드백</h3>
        </div>
        {open ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-primary" />}
      </button>
      {!open && (
        <p className="mt-1 text-xs text-primary-dark">오늘 영양소별 섭취 현황과 부족한 재료 추천을 알려드려요. 눌러서 펼쳐보세요.</p>
      )}
      {open && (
        <div className="mt-3 space-y-4">
          {recommendedMeals.length === 0 && (
            <p className="text-sm text-slate-600">오늘 목표를 모두 달성했어요! 훌륭해요 🎉</p>
          )}
          {feedback.map((f) => {
            const recommended = recommendationsByNutrient.get(f.nutrient) ?? []
            return (
              <div key={f.nutrient}>
                <div className="flex gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    {f.message}
                    {f.detail && <span className="ml-1 text-xs text-slate-400">({f.detail})</span>}
                  </span>
                </div>
                {recommended.length > 0 && (
                  <div className="mt-2 ml-3.5 space-y-2">
                    {recommended.map((meal) => (
                      <RecommendedMealRow key={meal.id} meal={meal} goal={goal} />
                    ))}
                    <AlternativesToggle alternatives={recommended[0]?.alternatives ?? []} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
