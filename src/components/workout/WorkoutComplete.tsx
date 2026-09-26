import { formatClock, formatTimeOfDay } from '../../lib/time'
import type { Workout } from '../../types'

interface Props {
  workout: Workout
  onSave: () => void
  onDiscard: () => void
}

export default function WorkoutComplete({ workout, onSave, onDiscard }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-slate-100 bg-white px-6 py-14 text-center">
      <div>
        <p className="text-2xl font-bold text-slate-900">운동 완료 🎉</p>
        <p className="mt-1 text-sm font-medium text-emerald-600">{workout.type}</p>
      </div>

      <div>
        <p className="text-xs text-slate-400">운동 시간</p>
        <p className="font-mono text-4xl font-bold tabular-nums text-slate-900">
          {formatClock(workout.duration)}
        </p>
      </div>

      <div className="flex w-full justify-center gap-10">
        <div>
          <p className="text-xs text-slate-400">시작</p>
          <p className="font-semibold text-slate-700">{formatTimeOfDay(workout.startTime)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">종료</p>
          <p className="font-semibold text-slate-700">{formatTimeOfDay(workout.endTime)}</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <button
          onClick={onSave}
          className="w-full rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200"
        >
          운동 기록 저장
        </button>
        <button onClick={onDiscard} className="w-full py-2 text-sm font-medium text-slate-400">
          저장하지 않고 닫기
        </button>
      </div>
    </div>
  )
}
