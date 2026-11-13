import { Loader2, Sparkles } from 'lucide-react'
import { useMealCoach } from '../../hooks/useMealCoach'
import type { Goal, RecommendedMeal } from '../../types'

interface Props {
  meal: RecommendedMeal
  goal: Goal
}

// 가장 부족한 영양소의 1순위 추천에 대한 코치 한마디를, 사용자가 카드를 펼치지 않아도
// 홈 화면 맨 위에서 항상 자동으로 보여준다("오늘 보충하면 좋은 재료" 카드 안에 숨어있던 걸 꺼냄).
export default function HomeCoach({ meal, goal }: Props) {
  const { state } = useMealCoach(meal, goal, true)

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Sparkles size={14} />
        </span>
        <p className="text-sm font-semibold text-emerald-900">오늘의 AI 코치</p>
      </div>

      {state.status !== 'done' ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
          <Loader2 size={12} className="animate-spin" />
          코치가 생각 중이에요...
        </p>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-emerald-900">💬 {state.message}</p>
          {state.isFallback && (
            <p className="mt-0.5 text-[10px] text-emerald-500">AI 연결이 원활하지 않아 기본 문구로 보여드려요.</p>
          )}
        </div>
      )}
    </div>
  )
}
