import { X } from 'lucide-react'
import { useId } from 'react'
import { formatRelativeDate } from '../../lib/time'
import type { LastRecord } from '../../lib/workoutHistory'

/**
 * LastRecordSheet — 종목 카드의 "지난 기록"을 누르면 아래에서 올라오는 작은 시트.
 * 같은 종목의 가장 최근 기록(날짜와 세트별 kg×회)을 보여준다.
 */

interface Props {
  name: string
  last: LastRecord | null
  onClose: () => void
}

function dateText(ms: number): string {
  const d = new Date(ms)
  const full = `${d.getMonth() + 1}월 ${d.getDate()}일`
  const rel = formatRelativeDate(ms)
  return rel === full ? full : `${full} (${rel})`
}

export default function LastRecordSheet({ name, last, onClose }: Props) {
  const titleId = useId()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-t-3xl bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="font-bold text-slate-900">
            {name} 지난 기록
          </h2>
          <button aria-label="닫기" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {last ? (
          <>
            <p className="text-sm text-slate-500">
              {dateText(last.date)} · {last.day}일차 {last.label}
            </p>
            <ol className="space-y-1.5">
              {last.exercise.sets.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm">
                  <span className="font-semibold text-emerald-700">{i + 1}세트</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {s.kg.toLocaleString('ko-KR')}kg × {s.reps}회
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">아직 기록이 없어요</p>
        )}
      </div>
    </div>
  )
}
