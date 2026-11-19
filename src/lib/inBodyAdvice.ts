import type { InBodyBodyType } from './inBodyBodyType'
import type { Meal, NutritionTarget } from '../types'

export type AdviceTone = 'good' | 'caution'

export interface InBodyAdvice {
  tone: AdviceTone
  headline: string
  tips: string[]
}

const RECENT_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
// 이 범위를 벗어나야 "충분히 차이 난다"고 보고 코멘트한다 — 자잘한 오차로 매번 다른 말이 나오지 않도록.
const CALORIE_OVER_RATIO = 1.05
const CALORIE_UNDER_RATIO = 0.85
const PROTEIN_UNDER_RATIO = 0.8

interface RecentIntake {
  avgCalories: number
  avgProtein: number
  loggedDays: number
}

// 최근 며칠간 "기록된 날"만 모아 하루 평균을 낸다(기록 안 한 날을 0으로 넣어 평균을 깎지 않는다).
function recentDailyAverage(meals: Meal[], now: number, days: number): RecentIntake | null {
  const since = now - days * DAY_MS
  const byDay = new Map<string, { calories: number; protein: number }>()
  for (const m of meals) {
    if (m.timestamp < since || m.timestamp > now) continue
    const key = new Date(m.timestamp).toDateString()
    const cur = byDay.get(key) ?? { calories: 0, protein: 0 }
    cur.calories += m.calories
    cur.protein += m.protein
    byDay.set(key, cur)
  }
  if (byDay.size === 0) return null
  const entries = [...byDay.values()]
  const avgCalories = entries.reduce((s, d) => s + d.calories, 0) / entries.length
  const avgProtein = entries.reduce((s, d) => s + d.protein, 0) / entries.length
  return { avgCalories, avgProtein, loggedDays: entries.length }
}

/**
 * 체형(C/D/I) 판정을 "그래서 뭘 하면 되는지"로 바꾼다. AI 호출 없이, 최근 식단 기록(실측값)과
 * 목표를 규칙으로 비교해서 만든다 — 체형 판정 자체가 간이 추정이라 조언까지 AI에 맡기면 오차가
 * 두 번 겹친다. bodyType이 없으면(표준범위를 못 읽었으면) 조언도 만들 수 없어 null.
 */
export function buildInBodyAdvice(
  bodyType: InBodyBodyType | null,
  meals: Meal[],
  target: NutritionTarget | null,
  now: number = Date.now(),
): InBodyAdvice | null {
  if (bodyType === null) return null

  if (bodyType === 'I') {
    return {
      tone: 'good',
      headline: '체중·골격근량·체지방량이 고르게 표준 범위 안에 있어요. 지금 패턴을 유지하면 좋아요.',
      tips: [],
    }
  }

  const recent = recentDailyAverage(meals, now, RECENT_DAYS)
  const tips: string[] = []

  if (bodyType === 'D') {
    if (recent && target && recent.avgCalories < target.calories * CALORIE_UNDER_RATIO) {
      tips.push(
        `최근 ${recent.loggedDays}일 평균 섭취 칼로리가 목표보다 낮아요(평균 ${Math.round(recent.avgCalories)}kcal · 목표 ${target.calories}kcal). 근육량을 유지하려면 너무 줄이지 않는 게 좋아요.`,
      )
    } else if (!recent) {
      tips.push('식단을 기록하면 지금 근육량에 맞는 섭취량인지 더 구체적으로 짚어드릴 수 있어요.')
    }
    return {
      tone: 'good',
      headline: '골격근량이 체지방보다 표준 대비 더 우세해요. 보통 좋은 신호예요.',
      tips,
    }
  }

  // C자형: 체지방이 더 우세 — 실제 섭취 기록을 바탕으로 구체적인 방향을 제시한다.
  if (recent && target) {
    const overCalories = recent.avgCalories > target.calories * CALORIE_OVER_RATIO
    const underProtein = recent.avgProtein < target.protein * PROTEIN_UNDER_RATIO
    if (overCalories) {
      tips.push(
        `최근 ${recent.loggedDays}일 평균 섭취 칼로리가 목표보다 높아요(평균 ${Math.round(recent.avgCalories)}kcal · 목표 ${target.calories}kcal). 섭취량을 줄이거나 활동량을 늘려보세요.`,
      )
    }
    if (underProtein) {
      tips.push(
        `최근 ${recent.loggedDays}일 평균 단백질 섭취가 목표에 못 미쳐요(평균 ${Math.round(recent.avgProtein)}g · 목표 ${target.protein}g). 체지방을 줄이는 동안 근육을 지키려면 단백질을 충분히 드세요.`,
      )
    }
    if (!overCalories && !underProtein) {
      tips.push('최근 식단 자체는 목표 범위 안에 있어요. 운동량(특히 유산소+근력 병행)을 늘리는 쪽이 더 도움이 될 수 있어요.')
    }
  } else {
    tips.push('식단을 기록하면 칼로리·단백질 섭취를 바탕으로 더 구체적인 제안을 드릴 수 있어요.')
  }

  return {
    tone: 'caution',
    headline: '체지방이 골격근량보다 표준 대비 더 많이 벗어나 있어요. 체지방을 줄이는 방향이 도움이 될 수 있어요.',
    tips,
  }
}
