import { Sparkles } from 'lucide-react'
import type { MacroFeedback } from '../../lib/nutrition'

interface Props {
  feedback: MacroFeedback[]
}

export default function FeedbackPanel({ feedback }: Props) {
  if (feedback.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Sparkles size={16} className="text-emerald-500" />
        <h3 className="text-sm font-semibold text-slate-800">AI 영양 피드백</h3>
      </div>
      <ul className="space-y-2">
        {feedback.map((f) => (
          <li key={f.nutrient} className="flex gap-2 text-sm text-slate-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>{f.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
