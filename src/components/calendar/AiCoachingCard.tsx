import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { buildDiagnosis, isEmptyDiagnosis, resolveLines, ringRates, VERDICT_LABELS } from '../../lib/coachingInsight'
import { calendarDays } from '../../lib/inbodyCompare'
import { loadWorkoutHistory } from '../../lib/workoutHistory'
import { readCoachingCache, requestInsightLines, requestKeyOf } from '../../services/coachingService'

const SIZE = 132
const STROKE = 9
const RING_RADII = [60, 48, 36] as const
/** 가운데 글자(SVG 좌표). 값 17px, "종합" 9px — 안쪽 링 안쪽 원에 완전히 들어간다 */
const CENTER_TEXT = { valueSize: 17, valueY: 65, labelSize: 9, labelY: 77 } as const
const COLORS ={ diet: '#ffffff', protein: '#ffd98a', workout: '#f6a8b4' } as const

const signed = (v: number | null, unit: string) => (v === null ? '-' : `${v > 0 ? '+' : ''}${v}${unit}`)
const md = (ts: number) => `${new Date(ts).getMonth() + 1}/${new Date(ts).getDate()}`

function Ring({ r, rate, color }: { r: number; rate: number; color: string }) {
  const c = 2 * Math.PI * r
  const common = { cx: SIZE / 2, cy: SIZE / 2, r, fill: 'none', strokeWidth: STROKE, strokeLinecap: 'round' as const }
  return (
    <>
      <circle {...common} stroke="#ffffff" strokeOpacity={0.2} />
      {rate > 0 && (
        <circle
          {...common}
          stroke={color}
          strokeDasharray={`${(c * rate) / 100} ${c}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          data-testid="ring-arc"
        />
      )}
    </>
  )
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-white/80">{label}</span>
      <span className="ml-auto whitespace-nowrap text-sm font-bold tabular-nums">{value}</span>
    </div>
  )
}

// 리포트 "이번 주" 맨 위 진단 카드. 판정·숫자·보완할 점 선택은 코드가 하고, AI는 보완할 점 문장만 쓴다.
export default function AiCoachingCard({ onShowTrend }: { onShowTrend?: () => void }) {
  const { meals, nutritionTarget, inBodyHistory, workoutProfile, isDemo, aiMode } = useApp()
  const useAi = resolveAnalysisMode(isDemo, aiMode) === 'real'

  const diagnosis = useMemo(
    () =>
      buildDiagnosis({
        goal: workoutProfile?.goal,
        history: inBodyHistory,
        meals,
        target: nutritionTarget,
        workouts: loadWorkoutHistory(),
      }),
    [workoutProfile?.goal, inBodyHistory, meals, nutritionTarget],
  )
  const { verdict, result, process, gaps, request } = diagnosis
  const requestKey = requestKeyOf(request)
  const empty = isEmptyDiagnosis(diagnosis)
  const needsAi = useAi && !empty && gaps.length > 0

  // 같은 숫자로 받아 둔 문장이 있으면 그걸 쓴다(렌더 중 읽기만 하므로 별도 상태가 필요 없다)
  const cached = needsAi ? readCoachingCache(requestKey) : null
  const [fetched, setFetched] = useState<{ key: string; lines: string[] | null } | null>(null)

  useEffect(() => {
    if (!needsAi || cached) return
    const controller = new AbortController()
    requestInsightLines(JSON.parse(requestKey), controller.signal)
      .then((lines) => setFetched({ key: requestKey, lines }))
      .catch(() => {
        if (!controller.signal.aborted) setFetched({ key: requestKey, lines: null }) // 실패 → 예시 문장
      })
    return () => controller.abort()
  }, [needsAi, cached, requestKey])

  const answered = fetched?.key === requestKey ? fetched : null
  const loading = needsAi && !cached && !answered
  // 데모 모드·실패·검사 탈락은 resolveLines가 코드가 만든 예시 문장으로 채운다
  const lines = resolveLines(gaps, process, cached ?? answered?.lines ?? null)

  const rates = ringRates(process)
  const compared = !!result && result.measurements >= 2 && result.fromTimestamp !== undefined && result.toTimestamp !== undefined
  // 근육 목표는 골격근을 더 앞선 측정과 비교한다. 구간 시작일과 다르면 언제부터인지 적는다
  const muscleSince =
    compared && result.muscleDelta !== null && result.muscleFromTimestamp !== undefined && calendarDays(result.muscleFromTimestamp, result.fromTimestamp!) !== 0
      ? md(result.muscleFromTimestamp)
      : null

  return (
    <div className="rounded-2xl bg-primary p-4 text-white shadow-lg shadow-primary/25">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold leading-snug">내 운동, 잘하고 있을까요?</h3>
        {!empty && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary-dark">{VERDICT_LABELS[verdict]}</span>
        )}
      </div>

      {empty ? (
        <p className="mt-3 text-sm text-white/90">인바디·식단·운동 기록이 쌓이면 지금 잘하고 있는지 알려드려요.</p>
      ) : (
        <>
          <div className="mt-3 rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold text-white/80">과정 · 목표 대비 달성률 (최근 7일 · 운동 3주)</p>
            <div className="mt-2 flex items-center gap-3">
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="img"
                aria-label={`식단 ${rates.diet}%, 단백질 ${rates.protein}%, 운동 ${rates.workout}%, 종합 ${rates.overall}%`}
                className="shrink-0"
              >
                <Ring r={RING_RADII[0]} rate={rates.diet} color={COLORS.diet} />
                <Ring r={RING_RADII[1]} rate={rates.protein} color={COLORS.protein} />
                <Ring r={RING_RADII[2]} rate={rates.workout} color={COLORS.workout} />
                {/* 안쪽 링 안쪽 원(반지름 36-9/2=31.5)에 두 줄이 모두 들어가도록 작게 쓴다 */}
                <text x="50%" y={CENTER_TEXT.valueY} textAnchor="middle" fill="#ffffff" fontSize={CENTER_TEXT.valueSize} fontWeight="700" data-testid="ring-value">
                  {rates.overall}%
                </text>
                <text x="50%" y={CENTER_TEXT.labelY} textAnchor="middle" fill="#ffffff" fillOpacity={0.75} fontSize={CENTER_TEXT.labelSize} data-testid="ring-label">
                  종합
                </text>
              </svg>
              <div className="min-w-0 flex-1 space-y-2.5">
                <LegendRow color={COLORS.diet} label="식단 달성" value={`${process.dietOnTrackDays}/7일`} />
                <LegendRow color={COLORS.protein} label="단백질" value={process.proteinPercent === null ? '-' : `${process.proteinPercent}%`} />
                <LegendRow color={COLORS.workout} label="운동" value={`주 ${rates.sessionsPerWeek}회`} />
              </div>
            </div>
            <div className="mt-3 border-t border-white/20 pt-2 text-[11px]">
              {compared ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/80">
                    최근 구간 {md(result.fromTimestamp!)}→{md(result.toTimestamp!)}
                  </span>
                  <span className="text-right text-white/80">
                    체지방 <b className="text-[#ffd98a]">{signed(result.fatDelta, 'kg')}</b> · 골격근{' '}
                    <b className="text-[#ffd98a]">{signed(result.muscleDelta, 'kg')}</b>
                  </span>
                </div>
              ) : (
                <p className="text-white/80">비교할 이전 측정이 없어요(14일 이상 간격 필요)</p>
              )}
              {muscleSince && <p className="mt-0.5 text-right text-[10px] text-white/70">골격근은 {muscleSince}부터</p>}
            </div>
          </div>

          {gaps.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold">보완할 점</p>
              <ul className="mt-1.5 space-y-1.5" aria-busy={loading}>
                {gaps.map((g, i) =>
                  loading ? (
                    <li key={g.id} data-testid="gap-skeleton" className="h-5 animate-pulse rounded bg-white/20" />
                  ) : (
                    <li key={g.id} className="flex gap-1.5 text-sm">
                      <span className="shrink-0 font-bold">{i + 1}</span>
                      <span>{lines[i]}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={onShowTrend}
            className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-primary-dark"
          >
            변화 추이 보기 ›
          </button>
        </>
      )}
    </div>
  )
}
