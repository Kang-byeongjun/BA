import { CalendarClock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { buildDiagnosis, isEmptyDiagnosis, resolveLines, VERDICT_LABELS } from '../../lib/coachingInsight'
import { sortInBodyHistory } from '../../lib/inBodyHistoryOrder'
import { daysUntilNextMeasurement } from '../../lib/inBodyInsight'
import { loadWorkoutHistory } from '../../lib/workoutHistory'
import { readCoachingCache, requestInsightLines, requestKeyOf } from '../../services/coachingService'

const signed = (v: number | null, unit: string) => (v === null ? '-' : `${v > 0 ? '+' : ''}${v}${unit}`)

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-white/70">{label}</span>
      <span className="whitespace-nowrap text-sm font-bold tabular-nums">{value}</span>
    </div>
  )
}

// 리포트 "이번 주" 맨 위 진단 카드. 판정·숫자·보완할 점 선택은 코드가 하고, AI는 보완할 점 문장만 쓴다.
export default function AiCoachingCard() {
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

  const latest = sortInBodyHistory(inBodyHistory)[0]
  const daysLeft = latest ? daysUntilNextMeasurement(latest.timestamp) : null
  const hasDelta = !!result && result.measurements >= 2

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
          <div className="mt-3 grid grid-cols-2 divide-x divide-white/25 rounded-xl bg-white/10 py-3">
            <div className="space-y-1.5 px-3">
              <p className="text-xs font-semibold">결과 (인바디)</p>
              <Stat label="체중" value={signed(hasDelta ? result.weightDelta : null, 'kg')} />
              <Stat label="골격근" value={signed(hasDelta ? result.muscleDelta : null, 'kg')} />
              <Stat label="체지방" value={signed(hasDelta ? result.fatDelta : null, 'kg')} />
            </div>
            <div className="space-y-1.5 px-3">
              <p className="text-xs font-semibold">과정</p>
              <Stat label="식단 달성" value={`${process.dietOnTrackDays}/7일`} />
              <Stat label="단백질" value={process.proteinPercent === null ? '-' : `${process.proteinPercent}%`} />
              <Stat label="운동(3주)" value={`${process.workoutSessions}회`} />
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
        </>
      )}

      {daysLeft !== null && (
        <p className="mt-3 flex items-center gap-1 text-[10px] text-white/70">
          <CalendarClock size={10} />
          {daysLeft === 0 ? '오늘 인바디를 측정해보세요' : `다음 측정까지 약 ${daysLeft}일 남았어요`}
        </p>
      )}
    </div>
  )
}
