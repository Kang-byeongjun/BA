import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { MacroFeedback } from '../../lib/nutrition'

interface Props {
  feedback: MacroFeedback[]
}

export default function FeedbackPanel({ feedback }: Props) {
  const [open, setOpen] = useState(true)
  if (feedback.length === 0) return null

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles size={14} />
          </span>
          <h3 className="text-sm font-semibold text-emerald-900">AI 영양 피드백</h3>
        </div>
        {open ? <ChevronUp size={18} className="text-emerald-400" /> : <ChevronDown size={18} className="text-emerald-400" />}
      </button>
      {!open && <p className="mt-1 text-xs text-emerald-700">오늘 영양소별 섭취 현황을 알려드려요. 눌러서 펼쳐보세요.</p>}
      {open && (
        <ul className="mt-3 space-y-2">
          {feedback.map((f) => (
            <li key={f.nutrient} className="flex gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                {f.message}
                {f.detail && <span className="ml-1 text-xs text-slate-400">({f.detail})</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
