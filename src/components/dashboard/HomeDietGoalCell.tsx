import { useMemo } from 'react'
import type { Meal, NutritionTarget } from '../../types'
import { getMonthGoalSummary } from '../../lib/dashboardSummaries'

interface Props {
  meals: Meal[]
  target: NutritionTarget
}

// HomeWeekStats의 세 번째 칸(식단 목표). 캘린더의 "기록한 N일 중 N일 목표를 잘 지켰어요"와 같은 값.
export default function HomeDietGoalCell({ meals, target }: Props) {
  const { loggedDays, metDays } = useMemo(() => getMonthGoalSummary(meals, target), [meals, target])
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
      <p className="text-xs text-slate-500">식단 목표</p>
      <p className="mt-1 text-sm text-slate-500">
        {loggedDays === 0 ? (
          '기록 없음'
        ) : (
          <>
            <span className="text-lg font-bold text-slate-900">{metDays}</span>
            {` / ${loggedDays}일`}
          </>
        )}
      </p>
    </div>
  )
}
