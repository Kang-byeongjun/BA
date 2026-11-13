import { ChevronDown, ChevronUp, Droplet, Undo2 } from 'lucide-react'
import { useState } from 'react'
import AnimatedBar from './AnimatedBar'

interface Props {
  consumedMl: number
  targetMl: number
  onAdd: (amountMl: number) => void
  onUndo: () => void
  canUndo: boolean
}

const QUICK_AMOUNTS = [
  { label: '한 컵', ml: 200 },
  { label: '생수 한 병', ml: 500 },
]

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

export default function WaterTracker({ consumedMl, targetMl, onAdd, onUndo, canUndo }: Props) {
  const percent = Math.min(100, Math.round((consumedMl / targetMl) * 100))

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Droplet size={16} className="text-sky-500" />
          <h3 className="text-sm font-semibold text-slate-800">수분 섭취</h3>
        </div>
        <span className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{consumedMl.toLocaleString()}</span>
          {` / ${targetMl.toLocaleString()}ml`}
        </span>
      </div>

      <AnimatedBar id="water" width={percent} trackClass="bg-slate-100" fillClass="bg-sky-500" heightClass="h-2.5" />

      <div className="mt-3 flex items-center gap-2">
        {QUICK_AMOUNTS.map(({ label, ml }) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            className="flex-1 rounded-xl bg-sky-50 py-2 text-xs font-semibold text-sky-700 active:scale-[0.98]"
          >
            +{ml}ml · {label}
          </button>
        ))}
        {canUndo && (
          <button
            onClick={onUndo}
            aria-label="마지막 수분 기록 취소"
            className="shrink-0 rounded-xl bg-slate-50 p-2.5 text-slate-400 active:scale-[0.98]"
          >
            <Undo2 size={16} />
          </button>
        )}
      </div>

      <WhyItMatters />
    </div>
  )
}
