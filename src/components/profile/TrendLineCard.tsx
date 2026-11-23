import { useId } from 'react'
import {
  estimateLabelWidth,
  formatPointDates,
  labelsFit,
  layoutTrend,
  visibleLabelIndexes,
  type TrendBox,
  type TrendInput,
} from '../../lib/inBodyTrendChart'

interface Props {
  label: string
  unit: string
  points: TrendInput[]
}

const BOX: TrendBox = { width: 300, height: 120, padX: 24, padTop: 28, padBottom: 30 }
const LINE = '#2b2b2b'
const ACCENT = '#8e2433' // 포인트(primary)와 같은 색 — 마지막 점 테두리
const VALUE_FONT = 11
const DATE_FONT = 9

// 지표 하나의 꺾은선 카드: 점마다 값, 아래에 측정 날짜, 마지막 점은 흰 속 + 포인트 테두리 + 굵은 값
export default function TrendLineCard({ label, unit, points }: Props) {
  const gradientId = useId()
  const title = `${label} (${unit})`

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-2 text-xs text-slate-400">측정한 기록이 아직 없어요</p>
      </div>
    )
  }

  const coords = layoutTrend(points, BOX)
  const innerWidth = BOX.width - BOX.padX * 2
  const baseline = BOX.height - BOX.padBottom
  const valueTexts = coords.map((c) => String(c.value))
  const dateTexts = formatPointDates(coords.map((c) => c.timestamp))
  const showValue = visibleLabelIndexes(
    coords.length,
    labelsFit(coords.length, innerWidth, Math.max(...valueTexts.map((t) => estimateLabelWidth(t, VALUE_FONT)))),
  )
  const showDate = visibleLabelIndexes(
    coords.length,
    labelsFit(coords.length, innerWidth, Math.max(...dateTexts.map((t) => estimateLabelWidth(t, DATE_FONT)))),
  )

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaPath = `${linePath} L${coords[coords.length - 1]!.x},${baseline} L${coords[0]!.x},${baseline} Z`
  const last = coords.length - 1

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <svg
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        className="mt-1 w-full"
        role="img"
        aria-label={`${title} 변화: ${coords.map((c, i) => `${dateTexts[i]} ${c.value}`).join(', ')}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.14} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
          </linearGradient>
        </defs>
        {coords.length > 1 && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {coords.length > 1 && (
          <path d={linePath} fill="none" stroke={LINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {coords.map((c, i) => (
          <g key={c.timestamp}>
            {i === last ? (
              <circle cx={c.x} cy={c.y} r={5} fill="#ffffff" stroke={ACCENT} strokeWidth={2.5} />
            ) : (
              <circle cx={c.x} cy={c.y} r={3} fill={LINE} />
            )}
            {showValue.has(i) && (
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                fontSize={VALUE_FONT}
                fontWeight={i === last ? 700 : 400}
                fill={i === last ? '#111111' : '#475569'}
              >
                {valueTexts[i]}
              </text>
            )}
            {showDate.has(i) && (
              <text x={c.x} y={BOX.height - 8} textAnchor="middle" fontSize={DATE_FONT} fill="#94a3b8">
                {dateTexts[i]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
