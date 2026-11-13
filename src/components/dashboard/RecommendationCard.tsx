import { ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useMealCoach } from '../../hooks/useMealCoach'
import {
  NUTRIENT_LABELS,
  NUTRIENT_UNITS,
  type Goal,
  type MealComboIngredientDisplay,
  type NutrientKey,
  type RecommendedMeal,
} from '../../types'

interface Props {
  meals: RecommendedMeal[]
  goal: Goal
}

interface NutrientGroup {
  nutrient: Exclude<NutrientKey, 'calories'>
  percent: number
  items: RecommendedMeal[]
}

// 추천 배열은 이미 영양소 우선순위대로 묶여서 들어온다(getRecommendedMeals) — 화면에서는
// 같은 영양소 칩을 카드마다 반복하지 않고, 영양소 1개당 섹션 1개로 묶어서 보여준다.
function groupByNutrient(meals: RecommendedMeal[]): NutrientGroup[] {
  const groups: NutrientGroup[] = []
  for (const meal of meals) {
    const last = groups[groups.length - 1]
    if (last && last.nutrient === meal.primaryNutrient) last.items.push(meal)
    else groups.push({ nutrient: meal.primaryNutrient, percent: meal.deficiencyPercent, items: [meal] })
  }
  return groups
}

// 가장 우선순위 높은 추천의 코치 문구는 홈 화면 맨 위(HomeCoach)에 항상 자동으로 보이므로,
// 여기서는(카드 자체가 기본 접힘 상태라) 전부 눌러야 뜨도록 통일한다.
function MealCoach({ meal, goal }: { meal: RecommendedMeal; goal: Goal }) {
  const { state, request } = useMealCoach(meal, goal, false)

  if (state.status === 'idle') {
    return (
      <button onClick={() => void request()} className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
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

export default function RecommendationCard({ meals, goal }: Props) {
  const title = '오늘 보충하면 좋은 재료'
  // 보조 정보라 기본은 접어두고, 눌렀을 때만 펼친다(홈 화면 스크롤 길이를 줄이기 위함).
  const [open, setOpen] = useState(false)

  if (meals.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles size={14} />
          </span>
          <h3 className="text-sm font-semibold text-emerald-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-600">오늘 목표를 모두 달성했어요! 훌륭해요 🎉</p>
      </div>
    )
  }

  const groups = groupByNutrient(meals)

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles size={14} />
          </span>
          <h3 className="text-sm font-semibold text-emerald-900">{title}</h3>
        </div>
        {open ? <ChevronUp size={18} className="text-emerald-400" /> : <ChevronDown size={18} className="text-emerald-400" />}
      </button>
      {!open && <p className="mt-1 text-xs text-emerald-700">부족한 영양소를 채울 재료를 추천해드려요. 눌러서 펼쳐보세요.</p>}
      {open && (
      <div className="mt-3 space-y-4">
        {groups.map((group) => (
          <div key={group.nutrient}>
            <p className="mb-2 text-xs font-semibold text-emerald-700">
              {NUTRIENT_LABELS[group.nutrient]}이 부족해요 · 목표의 {group.percent}%
            </p>
            <div className="space-y-2">
              {group.items.map((meal) => {
                // 재료 추천(1개 재료, 이름이 제목과 같음)은 이름만 중복이라 빼고, 양은 그대로 보여준다.
                const singleRedundantName = meal.ingredients.length === 1 && meal.ingredients[0]?.name === meal.title
                return (
                  <div key={meal.id} className="rounded-xl bg-slate-50 p-3">
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
                          {singleRedundantName
                            ? meal.ingredients[0].amount
                            : meal.ingredients.map((i) => `${i.name} ${i.amount}`).join(' · ')}
                        </p>
                        <MealCoach meal={meal} goal={goal} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <AlternativesToggle alternatives={group.items[0]?.alternatives ?? []} />
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
