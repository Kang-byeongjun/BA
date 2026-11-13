import { Check, ChevronLeft, Copy, Plus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { playRestAlarm, unlockRestAlarm } from '../../lib/restAlarm'
import {
  adjustRest,
  isRestDoneShowing,
  newSet,
  nextSetIdOf,
  restRemaining,
  setKg,
  settleRest,
  skipRest,
  startRest,
  toggleRest,
  totalVolumeOf,
  volumeOf,
  type ExerciseLog,
  type RestState,
  type SetRow,
} from '../../lib/workoutLog'
import WorkoutLoggerBar from './WorkoutLoggerBar'
import { saveWorkoutLog, type SavedWorkoutLog } from './workoutLogStorage'

/**
 * WorkoutLogger — 추천 루틴 하루치를 세트별로 기록하는 화면.
 * - 기록 내용은 바뀔 때마다 localStorage에 저장된다 → 새로고침해도 그대로 복원.
 * - 휴식 타이머·운동 시간은 Date.now() 기준 시각으로 계산한다 → 다른 탭에 갔다 와도 정확.
 * - 전역 상태(useApp)는 쓰지 않는다. 뒤로 가기(중단)는 onExit로 부모에게 알린다.
 */

interface Props {
  initial: SavedWorkoutLog
  onExit: () => void
}

// 타이머 화면 갱신 간격. 계산은 시각 기준이라 간격이 늦어져도 숫자는 정확하다.
const TICK_MS = 250
// 다른 탭에 오래 있다가 돌아온 경우(휴식이 끝난 지 오래됨)에는 알림음을 내지 않는다.
const ALARM_LATE_LIMIT_MS = 60_000

const formatKg = (v: number) => `${v.toLocaleString('ko-KR')}kg`

// 휴대폰 숫자 키패드용 입력 정리: kg는 숫자와 소수점 하나, 횟수는 숫자만
const cleanKg = (v: string) => {
  const only = v.replace(/[^\d.]/g, '')
  const dot = only.indexOf('.')
  return dot === -1 ? only : only.slice(0, dot + 1) + only.slice(dot + 1).replace(/\./g, '')
}
const cleanReps = (v: string) => v.replace(/\D/g, '')

interface CardProps {
  log: ExerciseLog
  onChange: (next: ExerciseLog) => void
  onSetCompleted: (log: ExerciseLog) => void
  newId: () => number
}

function ExerciseCard({ log, onChange, onSetCompleted, newId }: CardProps) {
  const memoId = useId()
  const setRows = (sets: SetRow[]) => onChange({ ...log, sets })
  const patch = (id: number, p: Partial<SetRow>) => setRows(log.sets.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const last = log.sets[log.sets.length - 1]

  const toggleDone = (s: SetRow) => {
    patch(s.id, { done: !s.done })
    if (!s.done) onSetCompleted(log)
  }

  return (
    <section aria-label={log.name} className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">{log.name}</h2>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          볼륨 {formatKg(volumeOf(log.sets))}
        </span>
      </div>

      <label htmlFor={memoId} className="sr-only">
        {log.name} 메모
      </label>
      <input
        id={memoId}
        value={log.memo}
        onChange={(e) => onChange({ ...log, memo: e.target.value })}
        placeholder="메모 (자세, 느낌 등)"
        className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none"
      />

      <table className="w-full table-fixed border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="w-10 font-medium">세트</th>
            <th className="font-medium">kg</th>
            <th className="font-medium">회</th>
            <th className="w-14 font-medium">완료</th>
            <th className="w-9">
              <span className="sr-only">삭제</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {log.sets.map((s, i) => {
            const n = i + 1
            const cell = s.done ? 'bg-emerald-50' : ''
            return (
              <tr key={s.id} data-done={s.done || undefined}>
                <td className={`rounded-l-xl py-1 text-center font-semibold text-slate-500 ${cell}`}>{n}</td>
                <td className={`px-1 py-1 ${cell}`}>
                  <input
                    aria-label={`${n}세트 kg`}
                    inputMode="decimal"
                    value={s.kg}
                    onChange={(e) => setRows(setKg(log.sets, s.id, cleanKg(e.target.value)))}
                    placeholder="-"
                    className="w-full rounded-lg bg-white/80 py-2 text-center tabular-nums text-slate-900 ring-1 ring-slate-100 focus:outline-emerald-400"
                  />
                </td>
                <td className={`px-1 py-1 ${cell}`}>
                  <input
                    aria-label={`${n}세트 회`}
                    inputMode="numeric"
                    value={s.reps}
                    onChange={(e) => patch(s.id, { reps: cleanReps(e.target.value) })}
                    placeholder="-"
                    className="w-full rounded-lg bg-white/80 py-2 text-center tabular-nums text-slate-900 ring-1 ring-slate-100 focus:outline-emerald-400"
                  />
                </td>
                <td className={`py-1 ${cell}`}>
                  <button
                    role="checkbox"
                    aria-checked={s.done}
                    aria-label={`${n}세트 완료`}
                    onClick={() => toggleDone(s)}
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl border-2 transition active:scale-95 ${
                      s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-200'
                    }`}
                  >
                    <Check size={22} strokeWidth={3} />
                  </button>
                </td>
                <td className={`rounded-r-xl py-1 text-center ${cell}`}>
                  <button
                    aria-label={`${n}세트 삭제`}
                    onClick={() => setRows(log.sets.filter((x) => x.id !== s.id))}
                    className="rounded-full p-1.5 text-slate-300 hover:text-rose-500"
                  >
                    <X size={16} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex gap-2">
        <button
          onClick={() => setRows([...log.sets, newSet(newId(), '', String(log.defaultReps))])}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-50 py-2 text-sm font-semibold text-emerald-700"
        >
          <Plus size={16} /> 세트 추가
        </button>
        <button
          onClick={() => last && setRows([...log.sets, newSet(newId(), last.kg, last.reps)])}
          disabled={!last}
          className="flex flex-1 items-center justify-center gap-1 rounded-full border border-slate-100 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"
        >
          <Copy size={15} /> 마지막 세트 복사
        </button>
      </div>
    </section>
  )
}

function ConfirmExitModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center"
      >
        <p id={titleId} className="text-lg font-bold text-slate-900">
          기록을 중단할까요?
        </p>
        <p className="text-sm text-slate-500">중단하면 지금까지 적은 기록이 지워져요.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-full bg-slate-100 py-3 font-semibold text-slate-600">
            계속 기록하기
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-full bg-rose-500 py-3 font-semibold text-white">
            중단하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutLogger({ initial, onExit }: Props) {
  const { day, startedAt } = initial
  const [logs, setLogs] = useState(initial.logs)
  // 복원했을 때 이미 끝난 휴식은 알림 없이 '끝남'으로 정리한다.
  const [rest, setRestState] = useState<RestState>(() => settleRest(initial.rest, Date.now()).rest)
  const [now, setNow] = useState(() => Date.now())
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // 타이머(setInterval) 안에서 최신 휴식 상태를 읽기 위해 ref에도 같이 둔다.
  const restRef = useRef(rest)
  const updateRest = (fn: (r: RestState) => RestState) => {
    const next = fn(restRef.current)
    restRef.current = next
    setRestState(next)
  }
  const nextId = useRef(0)
  const newId = () => {
    if (nextId.current === 0) nextId.current = nextSetIdOf(logs)
    return nextId.current++
  }

  // 시각 갱신 + 휴식 종료 감지. 다른 탭에서 돌아오면(visibilitychange) 바로 다시 계산한다.
  useEffect(() => {
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const { rest: next, finished } = settleRest(restRef.current, t)
      if (!finished) return
      restRef.current = next
      setRestState(next)
      setExpanded(false)
      if (next.endedAt !== null && t - next.endedAt < ALARM_LATE_LIMIT_MS) playRestAlarm()
    }
    const interval = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  // 바뀔 때마다 저장 → 새로고침해도 복원
  useEffect(() => {
    saveWorkoutLog({ ...initial, logs, rest })
  }, [initial, logs, rest])

  const onSetCompleted = (log: ExerciseLog) => {
    unlockRestAlarm() // 사용자 터치 순간에 소리 장치를 깨워 둔다
    const t = Date.now()
    setNow(t)
    updateRest((r) => startRest(r, log.restSeconds, t))
  }

  const remaining = rest.endsAt !== null ? restRemaining(rest, now) : null
  const total = totalVolumeOf(logs)

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-4 px-4 pb-4 pt-6">
        <div className="flex items-center gap-2">
          <button
            aria-label="뒤로 가기"
            onClick={() => setConfirming(true)}
            className="-ml-2 rounded-full p-2 text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">
            {day.day}일차 · {day.label}
          </h1>
        </div>

        <div className="rounded-3xl bg-emerald-500 px-5 py-4 text-white">
          <p className="text-sm text-emerald-50">전체 볼륨</p>
          <p aria-label="전체 볼륨" className="text-3xl font-bold tabular-nums">
            {formatKg(total)}
          </p>
          <p className="mt-1 text-xs text-emerald-50">완료 체크한 세트의 kg × 회를 더한 값이에요</p>
        </div>

        {logs.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">이 날은 기록할 근력 종목이 없어요.</p>
        ) : (
          logs.map((log) => (
            <ExerciseCard
              key={log.key}
              log={log}
              onChange={(next) => setLogs((ls) => ls.map((l) => (l.key === next.key ? next : l)))}
              onSetCompleted={onSetCompleted}
              newId={newId}
            />
          ))
        )}
      </div>

      <WorkoutLoggerBar
        restEnabled={rest.enabled}
        restRemaining={remaining}
        restDone={isRestDoneShowing(rest, now)}
        expanded={expanded}
        elapsedSeconds={Math.max(0, Math.floor((now - startedAt) / 1000))}
        onToggleRest={() => {
          updateRest(toggleRest)
          setExpanded(false)
        }}
        onToggleExpand={() => setExpanded((e) => !e)}
        onAdjustRest={(d) => {
          const t = Date.now()
          setNow(t)
          updateRest((r) => adjustRest(r, d, t))
        }}
        onSkipRest={() => {
          updateRest(skipRest)
          setExpanded(false)
        }}
      />

      {confirming && <ConfirmExitModal onCancel={() => setConfirming(false)} onConfirm={onExit} />}
    </div>
  )
}
