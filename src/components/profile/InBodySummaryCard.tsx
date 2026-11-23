import { Sparkles } from 'lucide-react'
import { BODY_TYPE_BADGE_COLORS, BODY_TYPE_INFO, describeMissingReason } from '../../lib/inBodyBodyTypeInfo'
import type { InBodyHistoryEntry } from '../../types'

interface Props {
  /** 가장 최근 측정(측정일 기준). 기록이 없으면 null */
  latest: InBodyHistoryEntry | null
  /** 없으면(리포트 탭에서 보여줄 때) 업데이트 버튼과 안내 문구를 숨긴다 */
  onUpdate?: () => void
}

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

// 마이 탭 인바디 카드: 최근 측정일 · 체형 배지 + 한 줄 설명 · 결과지 사진으로 업데이트. 12개 지표 목록은 대시보드의 인바디 추이에서 본다.
export default function InBodySummaryCard({ latest, onUpdate }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">인바디</p>

      {latest === null ? (
        <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">아직 측정 기록이 없어요</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            최근 측정일 <span className="ml-1 font-semibold text-slate-800">{formatDate(latest.timestamp)}</span>
          </p>
          {latest.bodyType !== null ? (
            <div className={`rounded-lg px-3 py-2 ${BODY_TYPE_BADGE_COLORS[latest.bodyType]}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{BODY_TYPE_INFO[latest.bodyType].badge}</span>
                <span className="text-xs font-medium">{BODY_TYPE_INFO[latest.bodyType].title}</span>
              </div>
              <p className="mt-1 text-xs">{BODY_TYPE_INFO[latest.bodyType].description}</p>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{describeMissingReason(latest.standardRanges)}</p>
          )}
        </div>
      )}

      {onUpdate && (
        <>
          <button
            onClick={onUpdate}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-primary-soft py-2.5 text-sm font-semibold text-primary-dark"
          >
            <Sparkles size={14} />
            결과지 사진으로 업데이트
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            골격근량·체지방량 등 자세한 수치는 리포트의 인바디 추이에서 볼 수 있어요.
          </p>
        </>
      )}
    </div>
  )
}
