import { ChevronDown, ChevronUp } from 'lucide-react'
import { type ReactNode, useState } from 'react'

interface Props {
  title: string
  /** 접힌 상태(와 펼친 상태 머리글)에 보여줄 한 줄 요약 */
  summary: string
  defaultOpen?: boolean
  children: ReactNode
}

// 대시보드 카드를 접고 펴는 바깥 틀. 안의 카드는 그대로 두고 hidden으로만 숨기므로
// (화면에서만 사라지고 계속 살아 있다) 주 이동·인바디 측정 같은 안쪽 상태가 접었다 펴도 유지된다.
export default function CollapsibleCard({ title, summary, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{summary}</p>
        </div>
        {open ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
      </button>
      <div className={open ? 'mt-2' : 'hidden'}>{children}</div>
    </div>
  )
}
