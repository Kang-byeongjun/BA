import { computeShapePositions } from '../../lib/inBodyBodyType'
import { buildInBodyAdvice } from '../../lib/inBodyAdvice'
import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../../types'
import BodyTypeInfo from './BodyTypeInfo'

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

const ADVICE_TONE_STYLES: Record<'good' | 'caution', string> = {
  good: 'bg-emerald-50 text-emerald-700',
  caution: 'bg-amber-50 text-amber-800',
}

export default function BodyShapeChart({
  entry,
  meals,
  nutritionTarget,
  onRemeasure,
}: {
  entry: InBodyHistoryEntry
  meals: Meal[]
  nutritionTarget: NutritionTarget | null
  onRemeasure: (entryId: string) => void
}) {
  const ranges = entry.standardRanges
  // 결과지에서 표준범위를 일부만 읽어도(예: 체중만 읽고 골격근량·체지방량은 못 읽음) 읽은 것만큼은 보여준다.
  // 측정값 자체가 하나도 없을 때만 그래프를 아예 숨긴다.
  if (!SHAPE_ROWS.some((r) => entry[r.key] !== null)) return null

  const rows = SHAPE_ROWS.map((r) => ({ ...r, value: entry[r.key], range: ranges ? ranges[r.key] : null }))
  const chartHeight = ROW_H * rows.length
  // 세 항목을 "표준 대비 비율"이라는 공통 축 위에 함께 놓는다 — 그래야 표준을 크게 벗어난 항목도
  // 서로 다른 자리에 찍혀서, 점들을 이은 선의 기울기가 실제 체형 차이를 보여준다.
  const shapePositions = computeShapePositions(rows.map((r) => r.range))
  const points = shapePositions.map((p, i) => (p && p.valuePos !== null ? { x: p.valuePos * 100, y: i * ROW_H + BAR_CENTER_Y } : null))
  const linePoints = points
    .filter((p): p is { x: number; y: number } => p !== null)
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  return (
    <div className="mb-3 rounded-xl bg-slate-50 p-3">
      <div className="relative" style={{ height: chartHeight }}>
        {rows.map((r, i) => {
          const sp = shapePositions[i]
          return (
            <div key={r.key} className="absolute inset-x-0" style={{ top: i * ROW_H, height: ROW_H }}>
              <div className="flex items-baseline justify-between" style={{ height: LABEL_H }}>
                <span className="text-xs text-slate-500">{r.label}</span>
                <span className="text-xs font-semibold text-slate-700">{r.value !== null ? `${r.value}kg` : '측정 안 함'}</span>
              </div>
              <div className="relative rounded-full bg-slate-200" style={{ marginTop: LABEL_GAP, height: BAR_H }}>
                {sp && (
                  <div
                    className="absolute inset-y-0 rounded-full bg-emerald-200"
                    style={{ left: `${sp.zoneMinPos * 100}%`, right: `${100 - sp.zoneMaxPos * 100}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400" style={{ marginTop: BAR_GAP, height: ZONE_LABEL_H }}>
                <span>표준이하</span>
                <span>표준</span>
                <span>표준이상</span>
              </div>
            </div>
          )
        })}
        {linePoints && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 100 ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <polyline points={linePoints} fill="none" stroke="#334155" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {/* 점은 SVG 밖 일반 HTML로 그린다 — 위 SVG는 가로/세로 축척이 서로 달라서(preserveAspectRatio="none"),
            그 안에 <circle>을 그리면 타원으로 찌그러진다. */}
        {points.map(
          (p, i) =>
            p && (
              <div
                key={SHAPE_ROWS[i].key}
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-700"
                style={{ left: `${p.x}%`, top: p.y }}
              />
            ),
        )}
      </div>
      <BodyTypeInfo bodyType={entry.bodyType} standardRanges={entry.standardRanges} onRemeasure={() => onRemeasure(entry.id)} />
      <BodyTypeAdvice entry={entry} meals={meals} nutritionTarget={nutritionTarget} />
    </div>
  )
}

// 체형 판정("C자형")만으로는 좋은 건지 나쁜 건지, 어떻게 해야 할지 알기 어렵다. 최근 식단 기록(실측값)과
// 목표를 규칙으로 비교해 구체적인 방향을 제시한다 — AI 호출 없이 결정적으로 계산한다(체형 판정 자체가
// 간이 추정이라, 조언까지 AI에 맡기면 오차가 두 번 겹친다).
function BodyTypeAdvice({ entry, meals, nutritionTarget }: { entry: InBodyHistoryEntry; meals: Meal[]; nutritionTarget: NutritionTarget | null }) {
  const advice = buildInBodyAdvice(entry.bodyType, meals, nutritionTarget)
  if (!advice) return null

  return (
    <div className={`mt-2 rounded-lg px-2.5 py-2 text-xs ${ADVICE_TONE_STYLES[advice.tone]}`}>
      <p className="font-medium">{advice.headline}</p>
      {advice.tips.map((tip) => (
        <p key={tip} className="mt-1 font-normal opacity-90">
          {tip}
        </p>
      ))}
    </div>
  )
}
