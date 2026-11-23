import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { InBodyBodyType } from '../../lib/inBodyBodyType'
import {
  BODY_TYPE_DISCLAIMER,
  BODY_TYPE_GUIDE,
  BODY_TYPE_INFO,
  describeMissingReason,
} from '../../lib/inBodyBodyTypeInfo'
import type { InBodyStandardRanges } from '../../types'

interface Props {
  bodyType: InBodyBodyType | null
  standardRanges: InBodyStandardRanges | null
  onRemeasure: () => void
}

const BADGE_COLORS: Record<InBodyBodyType, string> = {
  D: 'bg-emerald-50 text-emerald-700',
  I: 'bg-sky-50 text-sky-700',
  C: 'bg-amber-50 text-amber-700',
}

// 체형 막대 아래: 유형 배지 + 한두 줄 설명 + 접이식 안내. 판정이 없으면 이유와 재측정 버튼.
export default function BodyTypeInfo({ bodyType, standardRanges, onRemeasure }: Props) {
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="mt-3">
      {bodyType !== null ? (
        <div className={`rounded-lg px-2.5 py-2 ${BADGE_COLORS[bodyType]}`}>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{BODY_TYPE_INFO[bodyType].badge}</span>
            <span className="text-xs font-medium">{BODY_TYPE_INFO[bodyType].title}</span>
          </div>
          <p className="mt-1 text-xs font-normal">{BODY_TYPE_INFO[bodyType].description}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-2.5 py-2">
          <p className="text-xs text-slate-500">{describeMissingReason(standardRanges)}</p>
          <button onClick={onRemeasure} className="shrink-0 text-xs font-semibold text-emerald-600">
            재측정
          </button>
        </div>
      )}

      <button
        onClick={() => setGuideOpen((v) => !v)}
        aria-expanded={guideOpen}
        className="mt-2 flex items-center gap-0.5 text-xs font-medium text-slate-500"
      >
        C·I·D형이란?
        {guideOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {guideOpen && (
        <ul className="mt-1 space-y-1">
          {BODY_TYPE_GUIDE.map((g) => (
            <li key={g.badge} className="text-xs text-slate-500">
              <span className="mr-1 font-bold text-slate-700">{g.badge}</span>
              {g.text}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-slate-400">{BODY_TYPE_DISCLAIMER}</p>
    </div>
  )
}
