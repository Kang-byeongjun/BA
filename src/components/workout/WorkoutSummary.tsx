import { CircleCheck } from 'lucide-react'
import type { WorkoutSessionRecord } from '../../lib/workoutHistory'
import { formatClock } from '../../lib/time'

/**
 * WorkoutSummary — "운동 완료"로 저장한 뒤 보여주는 요약 화면.
 * 총 볼륨·운동 시간·완료한 세트 수·종목별 볼륨. "확인"을 누르면 onConfirm.
 */

interface Props {
  record: WorkoutSessionRecord
  onConfirm: () => void
}

const formatKg = (v: number) => `${v.toLocaleString('ko-KR')}kg`

export default function WorkoutSummary({ record, onConfirm }: Props) {
  return (
    <div className="space-y-4 px-4 pb-6 pt-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <CircleCheck size={44} className="text-emerald-500" />
        <h1 className="text-xl font-bold text-slate-900">운동 완료!</h1>
        <p className="text-sm text-slate-500">
          {record.day}일차 · {record.label} 기록을 저장했어요
        </p>
      </div>

      <div className="rounded-3xl bg-emerald-500 px-5 py-4 text-white">
        <p className="text-sm text-emerald-50">총 볼륨</p>
        <p aria-label="총 볼륨" className="text-3xl font-bold tabular-nums">
          {formatKg(record.totalVolume)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">운동 시간</p>
          <p aria-label="운동 시간" className="font-mono text-lg font-bold tabular-nums text-slate-900">
            {formatClock(record.durationSeconds)}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">완료한 세트</p>
          <p aria-label="완료한 세트" className="text-lg font-bold tabular-nums text-slate-900">
            {record.completedSets}세트
          </p>
        </div>
      </div>

      <section aria-label="종목별 볼륨" className="space-y-2 rounded-3xl border border-slate-100 bg-white p-4">
        <h2 className="font-bold text-slate-900">종목별 볼륨</h2>
        <ul className="divide-y divide-slate-100">
          {record.exercises.map((e) => (
            <li key={e.exerciseId} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0 truncate font-medium text-slate-700">
                {e.name} <span className="text-xs text-slate-400">· {e.sets.length}세트</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-emerald-700">{formatKg(e.volume)}</span>
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={onConfirm}
        className="w-full rounded-full bg-emerald-500 py-3.5 font-semibold text-white shadow-lg shadow-emerald-200"
      >
        확인
      </button>
    </div>
  )
}
