import { useState } from 'react'
import { computeNiceAxis, getMetricSeries, IN_BODY_METRIC_FIELDS, type InBodyMetricKey, type MetricPoint } from '../../lib/inBodyChart'
import { formatRelativeDate } from '../../lib/time'
import type { InBodyHistoryEntry } from '../../types'

interface Props {
  history: InBodyHistoryEntry[]
}

const WIDTH = 300
const HEIGHT = 96
const PAD_LEFT = 32 // 왼쪽 눈금 숫자가 들어갈 자리
const PAD_RIGHT = 12
const PAD_Y = 16
const ACCENT = '#0284c7' // sky-600 — 선택된 항목의 강조색. de-emphasis 선과 대비되는 유일한 포인트.
const MUTED = '#cbd5e1' // slate-300 — sparkline 본선은 눈에 덜 띄는 색으로.
const GRID = '#e2e8f0' // slate-200 — 눈금선은 선보다 더 옅게.

function layout(series: MetricPoint[], axis: { min: number; max: number }) {
  const range = axis.max - axis.min || 1
  return series.map((p, i) => ({
    x: series.length === 1 ? (WIDTH + PAD_LEFT - PAD_RIGHT) / 2 : PAD_LEFT + (i / (series.length - 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT),
    y: PAD_Y + (1 - (p.value - axis.min) / range) * (HEIGHT - PAD_Y * 2),
    point: p,
  }))
}

function Sparkline({
  series,
  selected,
  onSelect,
  muted = false,
  decimals = 1,
  showAxis = true,
}: {
  series: MetricPoint[]
  selected: MetricPoint | null
  onSelect: (p: MetricPoint) => void
  muted?: boolean
  decimals?: number
  showAxis?: boolean
}) {
  const axis = computeNiceAxis(series.map((p) => p.value))
  const coords = layout(series, axis)
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const accent = muted ? '#94a3b8' : ACCENT
  const range = axis.max - axis.min || 1
  const tickY = (v: number) => PAD_Y + (1 - (v - axis.min) / range) * (HEIGHT - PAD_Y * 2)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
      {showAxis &&
        axis.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={tickY(t)} y2={tickY(t)} stroke={GRID} strokeWidth={1} />
            <text x={PAD_LEFT - 4} y={tickY(t)} dy="0.32em" textAnchor="end" fontSize={9} fill="#94a3b8">
              {t.toFixed(decimals)}
            </text>
          </g>
        ))}
      <path d={linePath} fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => {
        const isLast = i === coords.length - 1
        const isSelected = selected?.timestamp === c.point.timestamp
        return (
          <g key={c.point.timestamp}>
            <circle
              cx={c.x}
              cy={c.y}
              r={isLast || isSelected ? 5 : 4}
              fill={isLast || isSelected ? accent : '#ffffff'}
              stroke={isLast || isSelected ? '#ffffff' : MUTED}
              strokeWidth={isLast || isSelected ? 2 : 1.5}
            />
            {!muted && (
              <circle
                cx={c.x}
                cy={c.y}
                r={12}
                fill="transparent"
                onClick={() => onSelect(c.point)}
                className="cursor-pointer"
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

function MetricTabs({ metric, onSelect }: { metric: InBodyMetricKey; onSelect: (key: InBodyMetricKey) => void }) {
  return (
    <div className="flex gap-1">
      {IN_BODY_METRIC_FIELDS.map((f) => (
        <button
          key={f.key}
          onClick={() => onSelect(f.key)}
          className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
            metric === f.key ? 'bg-slate-200 text-slate-800' : 'text-slate-400'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// 예시로 보여줄, 완만히 내려가는 가짜 5점 — 실제 데이터와 헷갈리지 않게 항상 흐리게/예시 배지와 같이 쓴다.
const EXAMPLE_SERIES: MetricPoint[] = [71.2, 70.6, 70.1, 69.8, 69.4].map((value, i) => ({ timestamp: i, value }))

export default function InBodyMetricChart({ history }: Props) {
  const [metric, setMetric] = useState<InBodyMetricKey>('weight')
  const [selected, setSelected] = useState<MetricPoint | null>(null)
  const field = IN_BODY_METRIC_FIELDS.find((f) => f.key === metric) ?? IN_BODY_METRIC_FIELDS[0]
  const series = getMetricSeries(history, metric)

  const selectMetric = (key: InBodyMetricKey) => {
    setMetric(key)
    setSelected(null)
  }

  if (series.length < 2) {
    return (
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <MetricTabs metric={metric} onSelect={selectMetric} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">예시</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 pt-2 opacity-60">
          <Sparkline series={EXAMPLE_SERIES} selected={null} onSelect={() => {}} muted showAxis={false} />
        </div>
      </div>
    )
  }

  const latest = series[series.length - 1]
  const previous = series[series.length - 2]
  const factor = 10 ** field.decimals
  const delta = Math.round((latest.value - previous.value) * factor) / factor
  const shown = selected ?? latest

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between">
        <MetricTabs metric={metric} onSelect={selectMetric} />
        <p className="text-xs text-slate-400">{delta === 0 ? '변화 없음' : `${delta > 0 ? '+' : ''}${delta}${field.unit}`}</p>
      </div>
      <div className="rounded-xl bg-slate-50 px-2 pt-2">
        <Sparkline
          series={series}
          selected={selected}
          onSelect={(p) => setSelected((cur) => (cur?.timestamp === p.timestamp ? null : p))}
          decimals={field.decimals}
        />
      </div>
      <p className="mt-1.5 text-center text-xs text-slate-500">
        {formatRelativeDate(shown.timestamp)} · <span className="font-semibold text-slate-700">{shown.value}{field.unit}</span>
      </p>
    </div>
  )
}
