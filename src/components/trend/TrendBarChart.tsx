import type { BarChartModel } from '../../lib/trendView'

const WIDTH = 320
const HEIGHT = 136
const PAD_TOP = 16
const PAD_BOTTOM = 18
const BASELINE = HEIGHT - PAD_BOTTOM
const MAX_BAR = 24
/** 쌓은 조각·나란한 막대 사이의 흰 틈 */
const GAP = 2
const MIN_SLOT_FOR_ALL_LABELS = 56

/** 위쪽 모서리만 둥근 막대 */
const roundedTop = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

// 피드백 카드의 막대 그래프(그룹 막대·쌓은 막대·목표선)
export default function TrendBarChart({ model }: { model: BarChartModel }) {
  const { groups, target, legend } = model
  const totals = groups.flatMap((g) => g.bars.map((b) => b.segments.reduce((s, x) => s + x.value, 0)))
  const max = Math.max(1, target?.value ?? 0, ...totals)
  const heightOf = (v: number) => (v / max) * (BASELINE - PAD_TOP)
  const slot = WIDTH / Math.max(1, groups.length)
  const targetY = target ? BASELINE - heightOf(target.value) : null
  /** 막대 위 숫자의 글자 밑선. 목표선이 글자를 가로지르게 되면 선 위로 올린다 */
  const labelY = (barTop: number) => {
    const y = barTop - 4
    return targetY !== null && targetY > y - 10 && targetY < y + 3 ? targetY - 3 : y
  }

  return (
    <div data-testid="feedback-chart" data-chart={model.kind}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${model.ariaLabel}: ${groups.flatMap((g) => g.bars.map((b) => b.title)).join(', ')}${target ? `, ${target.label}` : ''}`}
      >
        <line x1={0} x2={WIDTH} y1={BASELINE} y2={BASELINE} stroke="#e2e8f0" />
        {groups.map((group, gi) => {
          const count = Math.max(1, group.bars.length)
          const width = Math.min(MAX_BAR, (slot * 0.76 - GAP * (count - 1)) / count)
          const left = slot * gi + (slot - width * count - GAP * (count - 1)) / 2
          return (
            <g key={group.label}>
              {group.bars.map((b, bi) => {
                const x = left + bi * (width + GAP)
                const parts = b.segments.filter((s) => s.value > 0)
                let bottom = BASELINE
                const shapes = parts.map((s, si) => {
                  const h = heightOf(s.value)
                  bottom -= h
                  const top = si === parts.length - 1
                  // 맨 아래가 아닌 조각은 아래에 틈을 둔다
                  const drawn = Math.max(0.5, h - (si > 0 ? GAP : 0))
                  return top ? (
                    <path key={si} d={roundedTop(x, bottom, width, drawn)} fill={s.color} />
                  ) : (
                    <rect key={si} x={x} y={bottom} width={width} height={drawn} fill={s.color} />
                  )
                })
                return (
                  <g key={bi}>
                    <title>{b.title}</title>
                    {shapes}
                    {/* 값이 0인 칸(예: 운동 0회)도 색이 보이게 얇은 줄을 긋는다 */}
                    {parts.length === 0 && b.segments[0] && <rect x={x} y={BASELINE - 2} width={width} height={2} fill={b.segments[0].color} />}
                    {/* 나란한 막대가 좁으면(주가 많으면) 숫자가 겹치므로 첫 번째(강조) 막대에만 쓴다 */}
                    {b.valueLabel !== null && (count === 1 || bi === 0 || slot >= MIN_SLOT_FOR_ALL_LABELS) && (
                      <text x={x + width / 2} y={labelY(bottom)} textAnchor="middle" fontSize={count > 1 ? 9 : 10} fill="#475569">
                        {b.valueLabel}
                      </text>
                    )}
                  </g>
                )
              })}
              <text x={slot * gi + slot / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={10} fill="#64748b">
                {group.label}
              </text>
            </g>
          )
        })}
        {targetY !== null && <line x1={0} x2={WIDTH} y1={targetY} y2={targetY} stroke="#475569" strokeDasharray="4 3" data-testid="target-line" />}
      </svg>
      <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {legend.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            {item.color !== 'transparent' && <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />}
            {item.label}
          </li>
        ))}
        {target && (
          <li className="flex items-center gap-1">
            <span className="w-4 shrink-0 border-t border-dashed border-slate-600" />
            {target.label}
          </li>
        )}
      </ul>
    </div>
  )
}
