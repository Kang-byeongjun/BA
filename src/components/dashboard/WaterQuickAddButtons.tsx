import { Undo2 } from 'lucide-react'
import { QUICK_WATER_AMOUNTS } from '../../lib/water'

interface Props {
  onAdd: (amountMl: number) => void
  onUndo: () => void
  canUndo: boolean
}

// 홈 화면(가벼운 버전)과 식단 탭(상세 바 아래)에서 똑같이 쓰는 원탭 기록 버튼 행.
export default function WaterQuickAddButtons({ onAdd, onUndo, canUndo }: Props) {
  return (
    <div className="flex items-center gap-2">
      {QUICK_WATER_AMOUNTS.map(({ label, ml }) => (
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
  )
}
