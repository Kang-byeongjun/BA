import { estimateLabelWidth, formatPointDates } from '../../lib/inBodyTrendChart'
import type { IntervalAnalysis, MetricResult, SeriesPoint } from '../../lib/intervalReport'
import { changeLabel, headlineOf, periodLabel, TREND_COLORS } from '../../lib/trendView'

const WIDTH = 320
const HEIGHT = 62
const PAD_X = 18
const PAD_TOP = 18
const PAD_BOTTOM = 8
const FONT = 10
/** 세로 눈금의 최소 폭(kg). 0.1kg 같은 작은 변화가 크게 보이지 않게 한다 */
const MIN_SPAN_KG = 2

const xOf = (i: number, count: number) => (count === 1 ? WIDTH / 2 : PAD_X + (i / (count - 1)) * (WIDTH - PAD_X * 2))

/** 겹치지 않게 라벨을 붙일 점들. 앞쪽 순서(priority)가 먼저 자리를 차지한다 */
function pickLabels(priority: number[], xs: Map<number, number>, width: number): Set<number> {
  const picked = new Set<number>()
  for (const i of priority) {
    if ([...picked].every((j) => Math.abs(xs.get(i)! - xs.get(j)!) >= width)) picked.add(i)
  }
  return picked
}

/** 이번 구간의 끝·시작 점, 구간 안의 점, 나머지 순 */
function labelPriority(indexes: number[], inRange: (i: number) => boolean): number[] {
  const range = indexes.filter(inRange)
  const first = [range.at(-1), range[0]].filter((i): i is number => i !== undefined)
  return [...new Set([...first, ...range, ...[...indexes].reverse()])]
}

interface RowProps {
  label: string
  color: string
  series: SeriesPoint[]
  metric: 'fatMass' | 'muscleMass'
  result: MetricResult
  period: IntervalAnalysis['period']
}

// 지표 한 줄: 전체 측정은 회색 선, 이번에 비교한 구간만 색
function MetricRow({ label, color, series, metric, result, period }: RowProps) {
  const points = series.flatMap((p, i) => (p[metric] === null ? [] : [{ i, date: p.date, value: p[metric] }]))
  const change = changeLabel(result)
  // 근육 목표의 골격근은 구간보다 앞선 측정과 비교한다
  const since = result.from !== period.from ? `${formatPointDates([result.from, period.to])[0]}부터` : null
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, MIN_SPAN_KG)
  const low = (min + max) / 2 - span / 2
  const yOf = (v: number) => PAD_TOP + (1 - (v - low) / span) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
  const coords = points.map((p) => ({
    ...p,
    x: xOf(p.i, series.length),
    y: yOf(p.value),
    current: p.date >= result.from && p.date <= period.to,
  }))
  const path = (list: typeof coords) => list.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const current = coords.filter((c) => c.current)
  const xs = new Map(coords.map((c) => [c.i, c.x]))
  const labelWidth = Math.max(0, ...values.map((v) => estimateLabelWidth(String(v), FONT)))
  const labelled = pickLabels(
    labelPriority(coords.map((c) => c.i), (i) => coords.some((c) => c.i === i && c.current)),
    xs,
    labelWidth,
  )

  return (
    <div data-testid={`trend-${metric}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          {label}
          <span className="ml-1 font-normal text-slate-400">kg{since && ` · ${since}`}</span>
        </p>
        <p className="text-sm font-bold tabular-nums" style={{ color: change.muted ? '#94a3b8' : color }}>
          {change.text}
        </p>
      </div>
      {coords.length === 0 ? (
        <p className="py-3 text-xs text-slate-400">측정한 값이 없어요</p>
      ) : (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`${label} 변화: ${formatPointDates(coords.map((c) => c.date))
            .map((d, i) => `${d} ${coords[i]!.value}kg`)
            .join(', ')}`}
        >
          <path d={path(coords)} fill="none" stroke={TREND_COLORS.graySoft} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {current.length > 1 && <path d={path(current)} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
          {coords.map((c) => (
            <g key={c.i}>
              <circle cx={c.x} cy={c.y} r={4} fill={c.current ? color : TREND_COLORS.graySoft} stroke="#ffffff" strokeWidth={1.5} data-current={c.current}>
                <title>{`${formatPointDates([c.date])[0]} ${c.value}kg`}</title>
              </circle>
              {labelled.has(c.i) && (
                <text x={c.x} y={c.y - 8} textAnchor="middle" fontSize={FONT} fontWeight={c.current ? 700 : 400} fill={c.current ? '#0f172a' : '#94a3b8'}>
                  {c.value}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

function DateAxis({ series }: { series: SeriesPoint[] }) {
  const dates = formatPointDates(series.map((p) => p.date))
  const xs = new Map(series.map((_, i) => [i, xOf(i, series.length)]))
  const width = Math.max(...dates.map((d) => estimateLabelWidth(d, 9)))
  const last = series.length - 1
  const shown = pickLabels([...new Set([last, 0, ...series.map((_, i) => last - i)])], xs, width)
  return (
    <svg viewBox={`0 0 ${WIDTH} 14`} className="w-full" aria-hidden="true">
      {dates.map((d, i) =>
        shown.has(i) ? (
          <text key={series[i]!.date} x={xs.get(i)} y={10} textAnchor="middle" fontSize={9} fill="#94a3b8">
            {d}
          </text>
        ) : null,
      )}
    </svg>
  )
}

interface Props {
  series: SeriesPoint[]
  latest: IntervalAnalysis
  previous?: IntervalAnalysis
}

// 맨 위 결과 카드: 한 줄 평가 + 체지방·골격근 두 줄 그래프
export default function TrendResultCard({ series, latest, previous }: Props) {
  const { period, results } = latest
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">최근 결과 · {periodLabel(period)}</p>
      <h2 className="mt-1 text-base font-bold leading-snug text-slate-900">{headlineOf(latest, previous)}</h2>
      <div className="mt-3 space-y-2">
        <MetricRow label="체지방량" color={TREND_COLORS.fat} series={series} metric="fatMass" result={results.fat} period={period} />
        <MetricRow label="골격근량" color={TREND_COLORS.muscle} series={series} metric="muscleMass" result={results.muscle} period={period} />
        <DateAxis series={series} />
      </div>
    </section>
  )
}
