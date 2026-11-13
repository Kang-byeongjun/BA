import { Flame } from 'lucide-react'
import { getPercentage } from '../../lib/nutrition'
import AnimatedBar from './AnimatedBar'

interface Props {
  consumed: number
  target: number
  streakDays: number
}

export default function CalorieSummary({ consumed, target, streakDays }: Props) {
  const percent = getPercentage(consumed, target)
  const barWidth = Math.min(100, percent)
  const remaining = Math.max(0, target - consumed)
  const isOver = consumed > target

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-emerald-50">오늘의 영양 밸런스</p>
        {streakDays > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">
            <Flame size={12} />
            {streakDays}일 연속
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-bold tabular-nums">{Math.round(consumed).toLocaleString()}</span>
        <span className="pb-1 text-lg text-emerald-100">/ {Math.round(target).toLocaleString()} kcal</span>
      </div>
      <div className="mt-4">
        <AnimatedBar id="calories" width={barWidth} trackClass="bg-white/25" fillClass="bg-white" heightClass="h-3" />
      </div>
      <p className="mt-2 text-xs text-emerald-50">
        {isOver
          ? `목표보다 ${Math.round(consumed - target).toLocaleString()}kcal 더 섭취했어요.`
          : `목표까지 ${Math.round(remaining).toLocaleString()}kcal 남았어요.`}
      </p>
    </div>
  )
}
