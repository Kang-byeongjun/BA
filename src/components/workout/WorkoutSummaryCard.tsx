import { ArrowDown, ArrowUp, CalendarClock, Dumbbell, Flame, Minus } from 'lucide-react'
import { useMemo, useState } from 'react'
import AnimatedBar from '../dashboard/AnimatedBar'
import { useApp } from '../../context/AppContext'
import { formatDurationKorean, formatRelativeDate } from '../../lib/time'
import { loadWorkoutHistory } from '../../lib/workoutHistory'
import { getWorkoutSummary } from '../../lib/workoutSummary'
import { getCachedWorkoutRoutine } from '../../services/workoutService'

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function ChangeBadge({ changeRate }: { changeRate: number | null }) {
  if (changeRate === null) return <span className="text-xs text-slate-300">지난주 기록 없음</span>
  const percent = Math.round(changeRate * 100)
  if (percent === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-slate-400">
        <Minus size={12} />
        변화 없음
      </span>
    )
  }
  const isUp = percent > 0
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-600">
      {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {isUp ? '+' : ''}
      {percent}%
    </span>
  )
}

// 운동 요약 — 마이 탭과 대시보드 탭 양쪽에서 똑같이 쓸 수 있도록 데이터/표시를 한곳에 모은다.
export default function WorkoutSummaryCard() {
  const { workouts, workoutProfile } = useApp()
  const [now] = useState(() => Date.now())
  const summary = useMemo(
    () =>
      getWorkoutSummary(
        {
          history: loadWorkoutHistory(),
          workouts,
          profile: workoutProfile,
          routine: workoutProfile ? getCachedWorkoutRoutine(workoutProfile)?.result : null,
        },
        now,
      ),
    [workouts, workoutProfile, now],
  )

  const hasAnyRecord = summary.recent.length > 0
  const maxMuscleVolume = summary.muscleVolumes[0]?.volume ?? 0

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">운동 요약</p>

      {!hasAnyRecord ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-6 text-center">
          <Dumbbell size={24} className="text-slate-300" />
          <p className="text-xs text-slate-400">아직 운동 기록이 없어요. 운동 탭에서 시작해보세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-700">이번 주 운동</span>
              <span className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{summary.week.count}</span>
                {summary.week.goal !== null ? ` / ${summary.week.goal}회` : '회'}
              </span>
            </div>
            {summary.week.goal !== null && (
              <AnimatedBar
                id="workout-week-progress"
                width={Math.min(100, (summary.week.progress ?? 0) * 100)}
                trackClass="bg-slate-100"
                fillClass={summary.week.achieved ? 'bg-emerald-500' : 'bg-sky-500'}
                heightClass="h-2.5"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Flame size={12} />
                연속 운동일
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{summary.streakDays}일</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">주간 볼륨(헬스)</p>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-800">{summary.volume.thisWeek}kg</span>
                <ChangeBadge changeRate={summary.volume.changeRate} />
              </div>
            </div>
          </div>

          {summary.muscleVolumes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">이번 주 부위별 볼륨</p>
              <div className="space-y-2">
                {summary.muscleVolumes.map((m) => (
                  <div key={m.group}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="text-slate-600">{m.label}</span>
                      <span className="text-slate-400">{m.volume}kg</span>
                    </div>
                    <AnimatedBar
                      id={`muscle-${m.group}`}
                      width={maxMuscleVolume > 0 ? (m.volume / maxMuscleVolume) * 100 : 0}
                      trackClass="bg-slate-100"
                      fillClass="bg-slate-400"
                      heightClass="h-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">최근 운동</p>
            <div className="space-y-1.5">
              {summary.recent.map((s) => (
                <div
                  key={`${s.startTime}-${s.endTime}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-medium text-slate-700">{formatRelativeDate(s.startTime)}</span>
                    <span className="ml-2 text-slate-400">
                      {s.type}
                      {s.label ? ` · ${s.label}` : ''}
                    </span>
                  </div>
                  <span className="text-slate-500">
                    {formatDurationKorean(s.durationSeconds)}
                    {s.totalVolume !== null ? ` · ${round1(s.totalVolume)}kg` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {summary.nextRoutine && (
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <CalendarClock size={12} />
              다음 루틴 · {summary.nextRoutine.day}일차 {summary.nextRoutine.label}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
