import { useEffect, useState } from 'react'
import { requestCoachMessage } from '../services/coachService'
import { GOAL_LABELS, NUTRIENT_LABELS, NUTRIENT_UNITS, type Goal, type RecommendedMeal } from '../types'

export type CoachState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; message: string; isFallback: boolean }

// AI 호출이 안 되거나 실패해도(키 미설정, 레이트리밋 등) 추천 자체는 항상 보여야 하므로,
// 실패하면 이미 결정된 정보로 만든 기본 문구로 대체한다(숫자나 음식은 새로 만들지 않는다).
function fallbackMessage(meal: RecommendedMeal): string {
  const label = NUTRIENT_LABELS[meal.primaryNutrient]
  return `오늘 ${label}이 부족해서 추천했어요. ${meal.title}로 채워보세요.`
}

export function useMealCoach(meal: RecommendedMeal, goal: Goal, autoStart: boolean) {
  const [state, setState] = useState<CoachState>({ status: 'idle' })

  const request = async () => {
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

  useEffect(() => {
    if (autoStart) void request()
    // meal.id가 바뀌면(날짜가 바뀌어 추천이 갱신되면) 새로 요청한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal.id])

  return { state, request }
}
