import { useState } from 'react'
import { getWeightSeries, type WeightPoint } from '../../lib/inBodyChart'
import { formatRelativeDate } from '../../lib/time'
import type { InBodyHistoryEntry } from '../../types'

interface Props {
  history: InBodyHistoryEntry[]
}

const WIDTH = 300
const HEIGHT = 96
const PAD_X = 12
const PAD_Y = 16
const ACCENT = '#0284c7' // sky-600 — "체중"의 강조색. de-emphasis 선과 대비되는 유일한 포인트.
const MUTED = '#cbd5e1' // slate-300 — sparkline 본선은 눈에 덜 띄는 색으로.

function layout(series: WeightPoint[]) {
  const weights = series.map((p) => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  return series.map((p, i) => ({
    x: series.length === 1 ? WIDTH / 2 : PAD_X + (i / (series.length - 1)) * (WIDTH - PAD_X * 2),
    y: PAD_Y + (1 - (p.weight - min) / range) * (HEIGHT - PAD_Y * 2),
    point: p,
  }))
}

function Sparkline({
  series,
  selected,
  onSelect,
  muted = false,
}: {
  series: WeightPoint[]
  selected: WeightPoint | null
  onSelect: (p: WeightPoint) => void
  muted?: boolean
}) {
  const coords = layout(series)
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${HEIGHT - PAD_Y / 2} L${coords[0].x},${HEIGHT - PAD_Y / 2} Z`
  const accent = muted ? '#94a3b8' : ACCENT

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
      <path d={areaPath} fill={accent} fillOpacity={0.08} stroke="none" />
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

// 예시로 보여줄, 완만히 내려가는 가짜 5점 — 실제 데이터와 헷갈리지 않게 항상 흐리게/예시 배지와 같이 쓴다.
const EXAMPLE_SERIES: WeightPoint[] = [71.2, 70.6, 70.1, 69.8, 69.4].map((weight, i) => ({
  timestamp: i,
  weight,
}))

export default function WeightTrendChart({ history }: Props) {
  const series = getWeightSeries(history)
  const [selected, setSelected] = useState<WeightPoint | null>(null)

  if (series.length < 2) {
    return (
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">체중 추이</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">예시</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 pt-2 opacity-60">
          <Sparkline series={EXAMPLE_SERIES} selected={null} onSelect={() => {}} muted />
        </div>
      </div>
    )
  }

  const latest = series[series.length - 1]
  const previous = series[series.length - 2]
  const delta = Math.round((latest.weight - previous.weight) * 10) / 10
  const shown = selected ?? latest

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs font-medium text-slate-500">체중 추이</p>
        <p className="text-xs text-slate-400">
          {delta === 0 ? '변화 없음' : `${delta > 0 ? '+' : ''}${delta}kg`}
        </p>
      </div>
      <div className="rounded-xl bg-slate-50 px-2 pt-2">
        <Sparkline series={series} selected={selected} onSelect={(p) => setSelected((cur) => (cur?.timestamp === p.timestamp ? null : p))} />
      </div>
      <p className="mt-1.5 text-center text-xs text-slate-500">
        {formatRelativeDate(shown.timestamp)} · <span className="font-semibold text-slate-700">{shown.weight}kg</span>
      </p>
    </div>
  )
}
