import { ChevronLeft, Copy, Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { RoutineExercise } from '../../../server/engine/types'

/**
 * WorkoutLogger — 추천 루틴 하루치를 받아서 세트별로 kg·횟수를 적는 기록 화면.
 * 1단계: 화면 안에서만 기록한다(저장·휴식 타이머는 다음 단계).
 * 전역 상태(useApp)를 쓰지 않고, 뒤로 가기는 onExit로 부모에게 알린다.
 */

export interface LoggerDay {
  day: number
  label: string
  exercises: RoutineExercise[]
}

interface Props {
  day: LoggerDay
  onExit: () => void
}

interface SetRow {
  id: number
  kg: string // 입력 중인 글자 그대로 보관(빈칸·"22." 같은 중간 상태 허용)
  reps: string
  done: boolean
}

interface ExerciseLog {
  key: string
  name: string
  defaultReps: number
  memo: string
  sets: SetRow[]
}

let nextSetId = 1
const newSet = (kg: string, reps: string): SetRow => ({ id: nextSetId++, kg, reps, done: false })

/** 근력 종목(처방이 있는 것)만 기록 대상으로 만든다. 세트 수=최대 세트, 횟수=최대 횟수, kg는 빈칸. */
function buildLogs(exercises: RoutineExercise[]): ExerciseLog[] {
  return exercises
    .filter((e) => e.prescription)
    .map((e) => {
      const rx = e.prescription!
      return {
        key: `${e.order}-${e.id}`,
        name: e.name,
        defaultReps: rx.repsMax,
        memo: '',
        sets: Array.from({ length: rx.setsMax }, () => newSet('', String(rx.repsMax))),
      }
    })
}

const toNum = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** 완료 체크된 세트의 kg × 회 합계 (소수점 한 자리까지) */
function volumeOf(sets: SetRow[]): number {
  const v = sets.reduce((sum, s) => (s.done ? sum + toNum(s.kg) * toNum(s.reps) : sum), 0)
  return Math.round(v * 10) / 10
}

const formatKg = (v: number) => `${v.toLocaleString('ko-KR')}kg`

// 휴대폰 숫자 키패드용 입력 정리: kg는 숫자와 소수점 하나, 횟수는 숫자만
const cleanKg = (v: string) => {
  const only = v.replace(/[^\d.]/g, '')
  const dot = only.indexOf('.')
  return dot === -1 ? only : only.slice(0, dot + 1) + only.slice(dot + 1).replace(/\./g, '')
}
const cleanReps = (v: string) => v.replace(/\D/g, '')

function ExerciseCard({ log, onChange }: { log: ExerciseLog; onChange: (next: ExerciseLog) => void }) {
  const memoId = useId()
  const setRows = (sets: SetRow[]) => onChange({ ...log, sets })
  const patch = (id: number, p: Partial<SetRow>) => setRows(log.sets.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const last = log.sets[log.sets.length - 1]

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

      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="w-10 pb-1 font-medium">세트</th>
            <th className="pb-1 font-medium">kg</th>
            <th className="pb-1 font-medium">회</th>
            <th className="w-12 pb-1 font-medium">완료</th>
            <th className="w-8 pb-1">
              <span className="sr-only">삭제</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {log.sets.map((s, i) => {
            const n = i + 1
            return (
              <tr key={s.id} className={s.done ? 'bg-emerald-50/60' : ''}>
                <td className="py-1 text-center font-semibold text-slate-500">{n}</td>
                <td className="px-1 py-1">
                  <input
                    aria-label={`${n}세트 kg`}
                    inputMode="decimal"
                    value={s.kg}
                    onChange={(e) => patch(s.id, { kg: cleanKg(e.target.value) })}
                    placeholder="-"
                    className="w-full rounded-lg bg-slate-50 py-1.5 text-center tabular-nums text-slate-900 focus:outline-emerald-400"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    aria-label={`${n}세트 회`}
                    inputMode="numeric"
                    value={s.reps}
                    onChange={(e) => patch(s.id, { reps: cleanReps(e.target.value) })}
                    placeholder="-"
                    className="w-full rounded-lg bg-slate-50 py-1.5 text-center tabular-nums text-slate-900 focus:outline-emerald-400"
                  />
                </td>
                <td className="py-1 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${n}세트 완료`}
                    checked={s.done}
                    onChange={(e) => patch(s.id, { done: e.target.checked })}
                    className="h-5 w-5 accent-emerald-500"
                  />
                </td>
                <td className="py-1 text-center">
                  <button
                    aria-label={`${n}세트 삭제`}
                    onClick={() => setRows(log.sets.filter((x) => x.id !== s.id))}
                    className="rounded-full p-1 text-slate-300 hover:text-rose-500"
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
          onClick={() => setRows([...log.sets, newSet('', String(log.defaultReps))])}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-50 py-2 text-sm font-semibold text-emerald-700"
        >
          <Plus size={16} /> 세트 추가
        </button>
        <button
          onClick={() => last && setRows([...log.sets, newSet(last.kg, last.reps)])}
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
        <p className="text-sm text-slate-500">지금까지 적은 내용은 저장되지 않아요.</p>
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

export default function WorkoutLogger({ day, onExit }: Props) {
  const [logs, setLogs] = useState(() => buildLogs(day.exercises))
  const [confirming, setConfirming] = useState(false)
  const total = Math.round(logs.reduce((sum, l) => sum + volumeOf(l.sets), 0) * 10) / 10

  return (
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
          <ExerciseCard key={log.key} log={log} onChange={(next) => setLogs((ls) => ls.map((l) => (l.key === next.key ? next : l)))} />
        ))
      )}

      {confirming && <ConfirmExitModal onCancel={() => setConfirming(false)} onConfirm={onExit} />}
    </div>
  )
}
