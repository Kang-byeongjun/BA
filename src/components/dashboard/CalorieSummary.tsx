import { getPercentage } from '../../lib/nutrition'

interface Props {
  consumed: number
  target: number
}

export default function CalorieSummary({ consumed, target }: Props) {
  const percent = getPercentage(consumed, target)
  const barWidth = Math.min(100, percent)
  const remaining = Math.max(0, target - consumed)
  const isOver = consumed > target

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-200">
      <p className="text-sm font-medium text-emerald-50">오늘의 영양 밸런스</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-bold tabular-nums">{Math.round(consumed).toLocaleString()}</span>
        <span className="pb-1 text-lg text-emerald-100">/ {Math.round(target).toLocaleString()} kcal</span>
      </div>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-white transition-all duration-700 ease-out"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-emerald-50">
        {isOver
          ? `목표보다 ${Math.round(consumed - target).toLocaleString()}kcal 더 섭취했어요.`
          : `목표까지 ${Math.round(remaining).toLocaleString()}kcal 남았어요.`}
      </p>
    </div>
  )
}
