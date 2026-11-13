import { Droplet } from 'lucide-react'
import WaterQuickAddButtons from './WaterQuickAddButtons'

interface Props {
  onAdd: (amountMl: number) => void
  onUndo: () => void
  canUndo: boolean
}

// 홈 화면용 가벼운 버전 — 소비량/목표 진행 바와 "왜 중요한지" 설명은 식단 탭의 수분 바로
// 옮겨서, 홈에서는 원탭 기록 버튼만 남긴다.
export default function WaterQuickAdd({ onAdd, onUndo, canUndo }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Droplet size={16} className="text-sky-500" />
        <h3 className="text-sm font-semibold text-slate-800">수분 섭취</h3>
      </div>
      <WaterQuickAddButtons onAdd={onAdd} onUndo={onUndo} canUndo={canUndo} />
    </div>
  )
}
