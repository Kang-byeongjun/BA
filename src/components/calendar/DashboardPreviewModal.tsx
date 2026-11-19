import { Sparkles, X } from 'lucide-react'
import ExampleInBodyGrid from './ExampleInBodyGrid'

interface Props {
  onClose: () => void
}

// 대시보드 탭에 처음 들어왔을 때, 측정이 쌓이기 전이라 텅 비어 보이지 않도록 "이렇게 채워져요"를
// 한 번만 보여준다(localStorage 플래그로 재방문 시에는 안 띄움).
export default function DashboardPreviewModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Sparkles size={14} />
            </span>
            <p className="text-sm font-bold text-slate-900">대시보드는 이렇게 채워져요</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="text-slate-400">
            <X size={18} />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          2주마다 InBody를 측정하면, 그 사이 식단 습관과 체성분 변화를 아래처럼 비교해드려요. 지금 보이는 숫자는 예시예요.
        </p>

        <div className="mb-3 rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-500">14일 전 측정 대비</p>
          <ExampleInBodyGrid />
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="text-xs font-semibold text-emerald-900">식단 × 인바디</p>
          <p className="mt-1 text-sm text-emerald-800">이 기간 적정 섭취일이 10/14일이었고, 체중이 0.8kg 줄었어요.</p>
        </div>

        <button onClick={onClose} className="mt-4 w-full rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white">
          확인했어요
        </button>
      </div>
    </div>
  )
}
