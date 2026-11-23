import { NUTRIENT_LABELS, type NutritionTarget } from '../../types'
import AnimatedBar from '../dashboard/AnimatedBar'

interface Props {
  target: NutritionTarget
}

const finite = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

// 탄수화물·단백질은 g당 4kcal, 지방은 9kcal — 각 영양소가 목표 열량에서 차지하는 비율(%)을 막대로 보여준다.
const MACROS = [
  { key: 'protein', kcalPerG: 4, fill: 'bg-sky-500' },
  { key: 'carbohydrates', kcalPerG: 4, fill: 'bg-amber-400' },
  { key: 'fat', kcalPerG: 9, fill: 'bg-violet-500' },
] as const

// 하루 영양 목표 요약: 큰 kcal 숫자 + 단백질·탄수화물·지방 비율 막대(g 표시) + 식이섬유 한 줄
export default function NutritionSummary({ target }: Props) {
  const kcals = MACROS.map((m) => finite(target[m.key]) * m.kcalPerG)
  const total = kcals.reduce((a, b) => a + b, 0)

  return (
    <div>
      <p className="text-3xl font-bold text-slate-900">
        {finite(target.calories)}
        <span className="ml-1 text-sm font-normal text-slate-400">kcal</span>
      </p>
      <div className="mt-3 space-y-2.5">
        {MACROS.map((m, i) => {
          const percent = total > 0 ? Math.round((kcals[i]! / total) * 100) : 0
          return (
            <div key={m.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="shrink-0 text-slate-600">{NUTRIENT_LABELS[m.key]}</span>
                <span className="text-right text-slate-500">
                  <span className="font-semibold text-slate-800">{finite(target[m.key])}g</span>
                  <span className="ml-1 text-slate-400">· {percent}%</span>
                </span>
              </div>
              <AnimatedBar id={`profile-macro-${m.key}`} width={percent} trackClass="bg-slate-100" fillClass={m.fill} heightClass="h-2" />
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {NUTRIENT_LABELS.fiber} <span className="font-semibold text-slate-700">{finite(target.fiber)}g</span>
      </p>
    </div>
  )
}
