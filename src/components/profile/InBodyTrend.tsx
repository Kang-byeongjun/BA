import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { daysBetween, findComparisonEntry } from '../../lib/inBodyTrend'
import { formatRelativeDate } from '../../lib/time'
import { IN_BODY_SOURCE_LABELS, type InBodyHistoryEntry } from '../../types'

interface Props {
  history: InBodyHistoryEntry[]
}

type TrendKey = 'weight' | 'skeletalMuscleMass' | 'bodyFatMass' | 'bodyFatPercentage'

const TREND_FIELDS: { key: TrendKey; label: string; unit: string; decimals: number }[] = [
  { key: 'weight', label: '체중', unit: 'kg', decimals: 1 },
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg', decimals: 1 },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg', decimals: 1 },
  { key: 'bodyFatPercentage', label: '체지방률', unit: '%', decimals: 1 },
]

function DeltaBadge({ delta, decimals }: { delta: number; decimals: number }) {
  const factor = 10 ** decimals
  const rounded = Math.round(delta * factor) / factor

  if (rounded === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-slate-400">
        <Minus size={12} />
      </span>
    )
  }
  const isUp = rounded > 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-rose-500' : 'text-sky-600'}`}>
      {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {isUp ? '+' : ''}
      {rounded}
    </span>
  )
}

export default function InBodyTrend({ history }: Props) {
  if (history.length === 0) return null

  const latest = history[0]

  if (history.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-800">인바디 추이</p>
        <p className="text-xs text-slate-400">
          측정을 2회 이상 하면 변화를 비교해드려요. 2주마다 InBody 결과지를 사진으로 올려보세요.
        </p>
      </div>
    )
  }

  const comparison = findComparisonEntry(history, latest)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">인바디 추이</p>

      {comparison ? (
        <div className="mb-4 rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-500">
            {daysBetween(latest.timestamp, comparison.timestamp)}일 전 측정 대비
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TREND_FIELDS.map((f) => {
              const current = latest[f.key]
              const previous = comparison[f.key]
              return (
                <div key={f.key} className="rounded-lg bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">{f.label}</p>
                  {current === null ? (
                    <p className="text-sm font-semibold text-slate-400">측정 안 함</p>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        {current}
                        {f.unit}
                      </p>
                      {previous !== null ? (
                        <DeltaBadge delta={current - previous} decimals={f.decimals} />
                      ) : (
                        <span className="text-xs text-slate-300">비교 불가</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="mb-4 text-xs text-slate-400">비교할 이전 측정이 아직 없어요.</p>
      )}

      <p className="mb-2 text-xs font-medium text-slate-500">전체 측정 기록</p>
      <div className="max-h-44 space-y-1.5 overflow-y-auto">
        {history.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
          >
            <div>
              <span className="font-medium text-slate-700">{formatRelativeDate(entry.timestamp)}</span>
              <span className="ml-2 text-slate-400">{IN_BODY_SOURCE_LABELS[entry.source]}</span>
            </div>
            <span className="text-slate-600">
              {entry.weight !== null ? `${entry.weight}kg` : '—'}
              {entry.bodyFatPercentage !== null ? ` · 체지방 ${entry.bodyFatPercentage}%` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
