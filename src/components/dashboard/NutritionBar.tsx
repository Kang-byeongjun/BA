import { getNutritionStatus, getPercentage } from '../../lib/nutrition'
import AnimatedBar from './AnimatedBar'
import { NUTRITION_STATUS_LABELS, type NutritionStatus } from '../../types'

interface Props {
  label: string
  consumed: number
  target: number
  unit: string
  colorClass: string // 예: 'bg-sky-500'
  trackClass?: string
}

const STATUS_BADGE_CLASSES: Record<NutritionStatus, string> = {
  deficient: 'bg-amber-100 text-amber-700',
  adequate: 'bg-sky-100 text-sky-700',
  near_goal: 'bg-emerald-100 text-emerald-700',
  exceeded: 'bg-rose-100 text-rose-700',
}

export default function NutritionBar({ label, consumed, target, unit, colorClass }: Props) {
  const percent = getPercentage(consumed, target)
  const status = getNutritionStatus(percent)
  const barWidth = Math.min(100, percent)
  const overAmount = consumed > target ? Math.round(consumed - target) : 0

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{Math.round(consumed)}</span>
            {` / ${Math.round(target)}${unit}`}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[status]}`}>
            {NUTRITION_STATUS_LABELS[status]}
          </span>
        </div>
      </div>
      <AnimatedBar id={label} width={barWidth} trackClass="bg-slate-100" fillClass={colorClass} heightClass="h-2.5" />
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{percent}%</span>
        {overAmount > 0 && <span className="font-medium text-rose-500">목표보다 +{overAmount}{unit} 초과</span>}
      </div>
    </div>
  )
}
