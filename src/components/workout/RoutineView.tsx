import { useState } from 'react'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'

/**
 * RoutineView — 운동 추천 엔진 결과(WorkoutResult)를 그리기만 하는 화면 조각.
 * 전역 상태(useApp)나 서버 호출에 의존하지 않는다. 데이터는 모두 props로 받는다.
 */

interface Props {
  result: WorkoutResult
}

const range = (min: number, max: number) => (min === max ? `${min}` : `${min}~${max}`)

function prescriptionText(rx: NonNullable<RoutineExercise['prescription']>): { main: string; rest: string } {
  return {
    main: `${range(rx.setsMin, rx.setsMax)}세트 × ${range(rx.repsMin, rx.repsMax)}회`,
    rest: `휴식 ${range(rx.restMin, rx.restMax)}초`,
  }
}

function ExerciseItem({ exercise }: { exercise: RoutineExercise }) {
  const rx = exercise.prescription ? prescriptionText(exercise.prescription) : null

  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
          {exercise.order}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{exercise.name}</p>
          <p className="mt-1 text-sm text-slate-500">{exercise.reason}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
            {rx ? (
              <>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{rx.main}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{rx.rest}</span>
              </>
            ) : (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">유산소 · 남은 시간 동안 편한 강도로</span>
            )}
          </div>
        </div>
      </div>

      {exercise.caution && (
        <div role="note" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {exercise.caution.text}
        </div>
      )}
    </li>
  )
}

export default function RoutineView({ result }: Props) {
  const [dayIndex, setDayIndex] = useState(0)
  const days = result.days
  // 결과가 바뀌어 일차 수가 줄어도 범위를 벗어나지 않게 한다.
  const current = days[Math.min(dayIndex, days.length - 1)]

  return (
    <div className="space-y-3">
      {result.goalReason && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{result.goalReason}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{result.summary}</p>
        {result.source === 'fallback' && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">기본 루틴이에요</span>
        )}
      </div>

      {days.length > 1 && (
        <div role="tablist" aria-label="운동 일차" className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d, i) => {
            const selected = d === current
            return (
              <button
                key={d.day}
                role="tab"
                aria-selected={selected}
                onClick={() => setDayIndex(i)}
                className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${
                  selected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {d.day}일차 · {d.label}
              </button>
            )
          })}
        </div>
      )}

      {current && (
        <ol role="tabpanel" aria-label={`${current.day}일차 ${current.label}`} className="space-y-2">
          {current.exercises.map((e) => (
            <ExerciseItem key={`${current.day}-${e.order}-${e.id}`} exercise={e} />
          ))}
        </ol>
      )}

      {result.prescriptionNote && <p className="text-xs text-slate-400">참고: {result.prescriptionNote}</p>}
    </div>
  )
}
