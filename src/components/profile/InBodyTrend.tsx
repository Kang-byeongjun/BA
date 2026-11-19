import { ArrowDown, ArrowUp, Minus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { BODY_TYPE_LABELS, standardZonePosition, type InBodyBodyType } from '../../lib/inBodyBodyType'
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

const BODY_TYPE_COLORS: Record<InBodyBodyType, string> = {
  D: 'bg-emerald-50 text-emerald-700',
  I: 'bg-sky-50 text-sky-700',
  C: 'bg-amber-50 text-amber-700',
}

type ShapeRowKey = 'weight' | 'skeletalMuscleMass' | 'bodyFatMass'

const SHAPE_ROWS: { key: ShapeRowKey; label: string }[] = [
  { key: 'weight', label: '체중' },
  { key: 'skeletalMuscleMass', label: '골격근량' },
  { key: 'bodyFatMass', label: '체지방량' },
]

// 행 레이아웃(px). 점의 세로 위치를 막대 중심과 픽셀 단위로 맞추기 위해 SVG 좌표를 이 상수들로 직접 계산한다.
const LABEL_H = 16
const LABEL_GAP = 4
const BAR_H = 10
const BAR_GAP = 4
const ZONE_LABEL_H = 14
const ROW_H = LABEL_H + LABEL_GAP + BAR_H + BAR_GAP + ZONE_LABEL_H
const BAR_CENTER_Y = LABEL_H + LABEL_GAP + BAR_H / 2

function BodyShapeChart({ entry }: { entry: InBodyHistoryEntry }) {
  const ranges = entry.standardRanges
  // 결과지에서 표준범위를 일부만 읽어도(예: 체중만 읽고 골격근량·체지방량은 못 읽음) 읽은 것만큼은 보여준다.
  // 측정값 자체가 하나도 없을 때만 그래프를 아예 숨긴다.
  if (!SHAPE_ROWS.some((r) => entry[r.key] !== null)) return null

  const rows = SHAPE_ROWS.map((r) => ({ ...r, value: entry[r.key], range: ranges ? ranges[r.key] : null }))
  const chartHeight = ROW_H * rows.length
  const points = rows.map((r, i) =>
    r.value !== null && r.range ? { x: standardZonePosition(r.value, r.range) * 100, y: i * ROW_H + BAR_CENTER_Y } : null,
  )
  const linePoints = points
    .filter((p): p is { x: number; y: number } => p !== null)
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  return (
    <div className="mb-3 rounded-xl bg-slate-50 p-3">
      <div className="relative" style={{ height: chartHeight }}>
        {rows.map((r, i) => (
          <div key={r.key} className="absolute inset-x-0" style={{ top: i * ROW_H, height: ROW_H }}>
            <div className="flex items-baseline justify-between" style={{ height: LABEL_H }}>
              <span className="text-xs text-slate-500">{r.label}</span>
              <span className="text-xs font-semibold text-slate-700">{r.value !== null ? `${r.value}kg` : '측정 안 함'}</span>
            </div>
            <div className="relative rounded-full bg-slate-200" style={{ marginTop: LABEL_GAP, height: BAR_H }}>
              <div className="absolute inset-y-0 left-1/3 right-1/3 rounded-full bg-emerald-200" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400" style={{ marginTop: BAR_GAP, height: ZONE_LABEL_H }}>
              <span>표준이하</span>
              <span>표준</span>
              <span>표준이상</span>
            </div>
          </div>
        ))}
        {linePoints && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 100 ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <polyline points={linePoints} fill="none" stroke="#334155" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {points.map(
              (p, i) =>
                p && (
                  <circle
                    key={SHAPE_ROWS[i].key}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill="#334155"
                    stroke="white"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ),
            )}
          </svg>
        )}
      </div>
      {entry.bodyType !== null ? (
        <p className={`mt-3 rounded-lg px-2.5 py-2 text-xs font-medium ${BODY_TYPE_COLORS[entry.bodyType]}`}>
          {BODY_TYPE_LABELS[entry.bodyType]}
          <span className="ml-1 font-normal opacity-70">
            · 체중·골격근량·체지방량을 결과지의 표준범위와 비교한 간이 추정이에요
          </span>
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-100 px-2.5 py-2 text-xs text-slate-400">
          결과지에서 골격근량·체지방량의 표준범위를 일부 읽지 못해 체형 판정은 생략했어요. 다시 스캔하면 나아질 수 있어요.
        </p>
      )}
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
        <BodyShapeChart entry={latest} />
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

      <BodyShapeChart entry={latest} />
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
