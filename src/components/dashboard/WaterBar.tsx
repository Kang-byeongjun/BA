import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import AnimatedBar from './AnimatedBar'
import WaterQuickAddButtons from './WaterQuickAddButtons'

interface Props {
  consumedMl: number
  targetMl: number
  onAdd: (amountMl: number) => void
  onUndo: () => void
  canUndo: boolean
}

function WhyItMatters() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3 border-t border-slate-100 pt-2.5">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-slate-500">
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        수분 섭취가 왜 중요할까요?
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
          <li>· 영양소를 소화·흡수하고 세포 곳곳으로 옮기는 매개체 역할을 해요.</li>
          <li>· 체온 조절, 혈액순환, 노폐물 배출(신장 기능)에 기본이 돼요.</li>
          <li>· 몸이 살짝 목마른 걸 배고픔으로 오해해서 과식하는 경우가 많아요.</li>
          <li>· 운동 중 체내 수분이 부족하면 근력·집중력이 먼저 떨어져요.</li>
        </ul>
      )}
    </div>
  )
}

// 영양소 바(NutritionBar)와 같은 자리에 보여주지만, 물은 "많이 마시면 안 좋다"는 개념이
// 아니라서 초과/부족 상태 배지는 쓰지 않고 수치와 진행률만 보여준다.
export default function WaterBar({ consumedMl, targetMl, onAdd, onUndo, canUndo }: Props) {
  const percent = Math.round((consumedMl / targetMl) * 100)
  const barWidth = Math.min(100, percent)

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-700">수분</span>
        <span className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{consumedMl.toLocaleString()}</span>
          {` / ${targetMl.toLocaleString()}ml`}
        </span>
      </div>
      <AnimatedBar id="water-bar" width={barWidth} trackClass="bg-slate-100" fillClass="bg-sky-500" heightClass="h-2.5" />
      <div className="mt-1 text-[11px] text-slate-400">{percent}%</div>
      <div className="mt-2.5">
        <WaterQuickAddButtons onAdd={onAdd} onUndo={onUndo} canUndo={canUndo} />
      </div>
      <WhyItMatters />
    </div>
  )
}
