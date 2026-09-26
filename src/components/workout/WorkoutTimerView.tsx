import { Pause, Play, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatClock } from '../../lib/time'
import type { ActiveWorkoutSession } from '../../types'

interface Props {
  session: ActiveWorkoutSession
  onPause: () => void
  onResume: () => void
  onFinish: () => void
}

function computeElapsedMs(session: ActiveWorkoutSession): number {
  if (session.status === 'running') {
    return session.accumulatedMs + (Date.now() - session.segmentStart)
  }
  return session.accumulatedMs
}

export default function WorkoutTimerView({ session, onPause, onResume, onFinish }: Props) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (session.status !== 'running') return
    const interval = setInterval(() => forceTick((n) => n + 1), 500)
    return () => clearInterval(interval)
  }, [session.status])

  const elapsedSeconds = Math.floor(computeElapsedMs(session) / 1000)

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-600">
        {session.type} 진행 중{session.status === 'paused' ? ' (일시정지)' : ''}
      </div>

      <div className="flex flex-col items-center gap-8 rounded-3xl border border-slate-100 bg-white py-14">
        <span
          className={`font-mono text-5xl font-bold tabular-nums ${
            session.status === 'running' ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          {formatClock(elapsedSeconds)}
        </span>

        <div className="flex items-center gap-4">
          {session.status === 'running' ? (
            <button
              onClick={onPause}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              aria-label="일시정지"
            >
              <Pause size={26} />
            </button>
          ) : (
            <button
              onClick={onResume}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white"
              aria-label="재개"
            >
              <Play size={26} />
            </button>
          )}
          <button
            onClick={onFinish}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white"
            aria-label="운동 종료"
          >
            <Square size={24} />
          </button>
        </div>

        <div className="flex gap-6 text-sm font-medium text-slate-400">
          <span>{session.status === 'running' ? '일시정지' : '재개'}</span>
          <span>운동 종료</span>
        </div>
      </div>
    </div>
  )
}
