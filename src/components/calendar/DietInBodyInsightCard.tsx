import { CalendarClock, Sparkles } from 'lucide-react'
import { buildDietInBodyInsight, daysUntilNextMeasurement } from '../../lib/inBodyInsight'
import { findComparisonEntry } from '../../lib/inBodyTrend'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../../types'

interface Props {
  history: InBodyHistoryEntry[]
  meals: Meal[]
  target: NutritionTarget
}

// 식단 준수(목표를 지킨 날 수)와 인바디 체중 변화를 한 문장으로 엮어서, 식단 노력이 실제 결과로
// 이어지고 있는지 보여준다. 측정이 2회 이상 쌓여야 비교할 수 있다.
export default function DietInBodyInsightCard({ history, meals, target }: Props) {
  if (history.length === 0) return null

  const latest = history[0]
  const comparison = findComparisonEntry(history, latest)
  const insight = comparison ? buildDietInBodyInsight(meals, target, latest, comparison) : null
  const daysLeft = daysUntilNextMeasurement(latest.timestamp)

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles size={14} />
          </span>
          <h3 className="text-sm font-semibold text-emerald-900">식단 × 인바디</h3>
        </div>
        {!insight && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-500">예시</span>}
      </div>

      {insight ? (
        <p className="mt-2 text-sm text-emerald-900">{insight.message}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-emerald-900/50">예시: 이 기간 목표를 지킨 날이 10/14일이었고, 체중이 0.8kg 줄었어요.</p>
          <p className="mt-1 text-xs text-emerald-700">측정이 2회 이상 쌓이면 실제 데이터로 보여드려요.</p>
        </>
      )}

      <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
        <CalendarClock size={12} />
        {daysLeft === 0 ? '오늘 인바디를 측정해보세요' : `다음 측정까지 약 ${daysLeft}일 남았어요`}
      </p>
    </div>
  )
}
