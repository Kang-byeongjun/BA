import { ArrowDown, ArrowUp, Minus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { BODY_TYPE_LABELS, standardZonePosition, type InBodyBodyType, type InBodyStandardRange } from '../../lib/inBodyBodyType'
import { daysBetween, findComparisonEntry } from '../../lib/inBodyTrend'
import { formatRelativeDate } from '../../lib/time'
import { IN_BODY_SOURCE_LABELS, type InBodyHistoryEntry, type InBodyMeasurements } from '../../types'
import ExampleInBodyGrid from '../calendar/ExampleInBodyGrid'
import WeightTrendChart from '../calendar/WeightTrendChart'
import InBodyScanFlow from '../onboarding/InBodyScanFlow'

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

function StandardZoneBar({
  label,
  value,
  unit,
  range,
}: {
  label: string
  value: number
  unit: string
  range: InBodyStandardRange
}) {
  const position = standardZonePosition(value, range) * 100
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-700">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-200">
        <div className="absolute inset-y-0 left-1/3 right-1/3 rounded-full bg-emerald-200" />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-700 shadow"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
        <span>표준이하</span>
        <span>표준</span>
        <span>표준이상</span>
      </div>
    </div>
  )
}

const BODY_TYPE_COLORS: Record<InBodyBodyType, string> = {
  D: 'bg-emerald-50 text-emerald-700',
  I: 'bg-sky-50 text-sky-700',
  C: 'bg-amber-50 text-amber-700',
}

function BodyTypeSection({ entry }: { entry: InBodyHistoryEntry }) {
  const ranges = entry.standardRanges
  if (entry.bodyType === null || !ranges) return null
  return (
    <div className="mb-3 rounded-xl bg-slate-50 p-3">
      <div className="space-y-2.5">
        {ranges.skeletalMuscleMass && entry.skeletalMuscleMass !== null && (
          <StandardZoneBar label="골격근량" value={entry.skeletalMuscleMass} unit="kg" range={ranges.skeletalMuscleMass} />
        )}
        {ranges.bodyFatMass && entry.bodyFatMass !== null && (
          <StandardZoneBar label="체지방량" value={entry.bodyFatMass} unit="kg" range={ranges.bodyFatMass} />
        )}
      </div>
      <p className={`mt-3 rounded-lg px-2.5 py-2 text-xs font-medium ${BODY_TYPE_COLORS[entry.bodyType]}`}>
        {BODY_TYPE_LABELS[entry.bodyType]}
        <span className="ml-1 font-normal opacity-70">
          · 골격근량·체지방량을 결과지의 표준범위와 비교한 간이 추정이에요
        </span>
      </p>
    </div>
  )
}

function AddMeasurementButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs font-medium text-emerald-600">
      <Sparkles size={14} />
      새 측정 추가
    </button>
  )
}

export default function InBodyTrend({ history }: Props) {
  const { aiMode, isDemo, dispatch } = useApp()
  const [scanOpen, setScanOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteEntry = (id: string) => {
    dispatch({ type: 'DELETE_INBODY_ENTRY', id })
    setConfirmDeleteId(null)
  }

  if (scanOpen) {
    return (
      <InBodyScanFlow
        mode={resolveAnalysisMode(isDemo, aiMode)}
        onApply={(measurements: InBodyMeasurements) => {
          dispatch({ type: 'UPDATE_INBODY', measurements, source: 'scan' })
          setScanOpen(false)
        }}
        onClose={() => setScanOpen(false)}
      />
    )
  }

  if (history.length === 0) return null

  const latest = history[0]

  if (history.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">인바디 추이</p>
          <div className="flex items-center gap-3">
            <AddMeasurementButton onClick={() => setScanOpen(true)} />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">예시</span>
          </div>
        </div>
        <BodyTypeSection entry={latest} />
        <WeightTrendChart history={history} />
        <div className="mb-3 rounded-xl bg-slate-50 p-3 opacity-60">
          <p className="mb-2 text-xs font-medium text-slate-500">14일 전 측정 대비</p>
          <ExampleInBodyGrid />
        </div>
        <p className="text-xs text-slate-400">
          측정을 2회 이상 하면 위처럼 변화를 비교해드려요. 2주마다 InBody 결과지를 사진으로 올려보세요.
        </p>
      </div>
    )
  }

  const comparison = findComparisonEntry(history, latest)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">인바디 추이</p>
        <AddMeasurementButton onClick={() => setScanOpen(true)} />
      </div>

      <BodyTypeSection entry={latest} />
      <WeightTrendChart history={history} />

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
        {history.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <div>
              <span className="font-medium text-slate-700">{formatRelativeDate(entry.timestamp)}</span>
              <span className="ml-2 text-slate-400">{IN_BODY_SOURCE_LABELS[entry.source]}</span>
            </div>
            {confirmDeleteId === entry.id ? (
              <div className="flex items-center gap-2">
                <button onClick={() => deleteEntry(entry.id)} className="font-semibold text-rose-500">
                  삭제
                </button>
                <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-slate-600">
                  {entry.weight !== null ? `${entry.weight}kg` : '—'}
                  {entry.bodyFatPercentage !== null ? ` · 체지방 ${entry.bodyFatPercentage}%` : ''}
                </span>
                <button onClick={() => setConfirmDeleteId(entry.id)} className="text-slate-300 hover:text-rose-400">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
