import { Dumbbell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDurationKorean, formatRelativeDate } from '../../lib/time'

export default function WorkoutHistory() {
  const { workouts } = useApp()
  const sorted = [...workouts].sort((a, b) => b.startTime - a.startTime)

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-500">최근 운동 기록</p>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <Dumbbell className="text-slate-300" size={26} />
          <p className="text-sm text-slate-400">아직 기록된 운동이 없어요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
              <div>
                <p className="text-xs text-slate-400">{formatRelativeDate(w.startTime)}</p>
                <p className="font-semibold text-slate-800">{w.type}</p>
              </div>
              <p className="text-sm font-medium text-emerald-600">{formatDurationKorean(w.duration)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
