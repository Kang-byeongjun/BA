import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Minus, Sparkles, Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { buildInBodyAdvice } from '../../lib/inBodyAdvice'
import { IN_BODY_METRIC_FIELDS } from '../../lib/inBodyChart'
import { BODY_TYPE_LABELS, computeShapePositions, type InBodyBodyType } from '../../lib/inBodyBodyType'
import { daysBetween, findComparisonEntry } from '../../lib/inBodyTrend'
import { formatRelativeDate } from '../../lib/time'
import { IN_BODY_SOURCE_LABELS, type InBodyHistoryEntry, type InBodyMeasurements, type Meal, type NutritionTarget } from '../../types'
import ExampleInBodyGrid from '../calendar/ExampleInBodyGrid'
import InBodyMetricChart from '../calendar/InBodyMetricChart'
import InBodyScanFlow from '../onboarding/InBodyScanFlow'

interface Props {
  history: InBodyHistoryEntry[]
}

const TREND_FIELDS = IN_BODY_METRIC_FIELDS

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

const ADVICE_TONE_STYLES: Record<'good' | 'caution', string> = {
  good: 'bg-emerald-50 text-emerald-700',
  caution: 'bg-amber-50 text-amber-800',
}

function BodyShapeChart({
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
      {entry.bodyType !== null ? (
        <p className={`mt-3 rounded-lg px-2.5 py-2 text-xs font-medium ${BODY_TYPE_COLORS[entry.bodyType]}`}>
          {BODY_TYPE_LABELS[entry.bodyType]}
          <span className="ml-1 font-normal opacity-70">
            · 체중·골격근량·체지방량을 결과지의 표준범위와 비교한 간이 추정이에요
          </span>
        </p>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-2.5 py-2">
          <p className="text-xs text-slate-400">
            결과지에서 골격근량·체지방량의 표준범위를 일부 읽지 못해 체형 판정은 생략했어요.
          </p>
          <button
            onClick={() => onRemeasure(entry.id)}
            className="shrink-0 text-xs font-semibold text-emerald-600"
          >
            재측정
          </button>
        </div>
      )}
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

// 클릭해서 열고 닫는 섹션. "체형 분석"/"전체 측정 기록"처럼 항상 보여줄 필요는 없지만
// 완전히 없애기엔 아까운 내용에 쓴다.
function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between py-0.5">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="mt-2">{children}</div>}
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
  const { aiMode, isDemo, dispatch, meals, nutritionTarget } = useApp()
  const [scanOpen, setScanOpen] = useState(false)
  // 체형 판정에 실패한 기록을 "재측정"으로 열었다면 그 기록의 id. null이면 "새 측정 추가"로 연 것.
  const [remeasureId, setRemeasureId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // 마이 탭(Profile.tsx)의 InBody 직접 수정과 같은 안내 — 여기서 측정해도 개인 영양 목표가
  // 똑같이 자동 재계산되는데(UPDATE_INBODY/REPLACE_INBODY_ENTRY 리듀서), 눈에 보이는 변화가
  // 없어서 안 바뀐 줄 아는 사용자가 있어 명시적으로 알려준다.
  const [notice, setNotice] = useState<string | null>(null)

  const deleteEntry = (id: string) => {
    dispatch({ type: 'DELETE_INBODY_ENTRY', id })
    setConfirmDeleteId(null)
  }

  const closeScan = () => {
    setScanOpen(false)
    setRemeasureId(null)
  }

  if (scanOpen) {
    return (
      <InBodyScanFlow
        mode={resolveAnalysisMode(isDemo, aiMode)}
        onApply={(measurements: InBodyMeasurements) => {
          if (remeasureId) {
            dispatch({ type: 'REPLACE_INBODY_ENTRY', id: remeasureId, measurements, source: 'scan' })
          } else {
            dispatch({ type: 'UPDATE_INBODY', measurements, source: 'scan' })
          }
          setNotice('InBody 정보가 바뀌어 마이 탭의 개인 영양 목표도 자동으로 다시 계산했어요.')
          closeScan()
        }}
        onClose={closeScan}
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
        {notice && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
        <CollapsibleSection title="체형 분석" defaultOpen>
          <BodyShapeChart
            entry={latest}
            meals={meals}
            nutritionTarget={nutritionTarget}
            onRemeasure={(id) => {
              setRemeasureId(id)
              setScanOpen(true)
            }}
          />
        </CollapsibleSection>
        <InBodyMetricChart history={history} />
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

      {notice && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
      <CollapsibleSection title="체형 분석" defaultOpen>
        <BodyShapeChart
          entry={latest}
          meals={meals}
          nutritionTarget={nutritionTarget}
          onRemeasure={(id) => {
            setRemeasureId(id)
            setScanOpen(true)
          }}
        />
      </CollapsibleSection>
      <InBodyMetricChart history={history} />

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

      <CollapsibleSection title={`전체 측정 기록 (${history.length})`} defaultOpen={false}>
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
      </CollapsibleSection>
    </div>
  )
}
