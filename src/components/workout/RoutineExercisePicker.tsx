import { useState } from 'react'
import type { MuscleGroup, PainPart } from '../../../server/engine/types'
import { checkTypedName, EDIT_GROUPS, GROUP_LABELS, optionsForGroup, TYPED_NAME_MAX, type PickOption } from '../../lib/routineEdit'

/**
 * RoutineExercisePicker — "바꾸기 / 종목 추가"에서 종목을 고르는 창.
 * - replace: 부위가 정해져 있다(바꾸려는 종목과 같은 부위만 보여준다).
 * - add: 부위를 먼저 고른 뒤 그 부위의 종목을 보여준다.
 * 통증 부위에 부담이 큰 종목은 목록 아래쪽에 경고 배지와 함께 두고, 고르면 한 번 더 확인한다.
 * AI도, 서버도 부르지 않는다(종목 목록은 앱에 들어 있는 데이터).
 */

const PAIN_KO: Record<PainPart, string> = { LOWBACK: '허리', KNEE: '무릎', SHOULDER: '어깨' }

interface Props {
  mode: 'replace' | 'add'
  /** replace일 때 고정할 부위 */
  group?: MuscleGroup
  pain: PainPart[]
  /** 그 일차에 이미 있는 종목 id (고를 수 없게 표시) */
  takenIds: ReadonlySet<string>
  /** replace일 때 지금 그 자리의 종목 id (목록에서 뺀다) */
  currentId?: string
  /** 그 일차에 있는 종목 이름들. 직접 입력한 이름이 겹치는지 확인하는 데 쓴다 */
  existingNames?: readonly string[]
  onPick: (exerciseId: string) => void
  /** 있으면(종목 추가일 때) "목록에 없나요? 직접 입력" 영역을 보여준다. 고른 부위와 이름을 넘긴다 */
  onPickTyped?: (group: MuscleGroup, name: string) => void
  onClose: () => void
}

const DIFFICULTY = { 1: '쉬움', 2: '보통', 3: '어려움' } as const

function OptionRow({ option, onSelect }: { option: PickOption; onSelect: () => void }) {
  const { exercise, burden, taken } = option
  const parts = [...burden.highParts, ...burden.midParts].map((p) => PAIN_KO[p]).join('·')
  return (
    <li>
      <button
        onClick={onSelect}
        disabled={taken}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left disabled:opacity-40"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-slate-900">{exercise.name}</span>
          <span className="block text-xs text-slate-500">
            {exercise.equipment} · {DIFFICULTY[exercise.difficulty]}
          </span>
        </span>
        {taken ? (
          <span className="shrink-0 text-xs text-slate-400">이미 있음</span>
        ) : burden.level === 'HIGH' ? (
          <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">⚠ {parts} 부담 큼</span>
        ) : burden.level === 'MID' ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">⚠ {parts} 주의</span>
        ) : null}
      </button>
    </li>
  )
}

const NAME_ERRORS = {
  tooLong: `이름은 ${TYPED_NAME_MAX}자 이하로 입력해주세요`,
  duplicate: '이 일차에 같은 이름의 종목이 이미 있어요',
} as const

/** 목록에 없는 종목을 이름으로 직접 추가하는 입력칸. 부위는 이미 골라 둔 상태에서만 보인다. */
function TypedForm({ group, existingNames, onSubmit }: { group: MuscleGroup; existingNames: readonly string[]; onSubmit: (name: string) => void }) {
  const [raw, setRaw] = useState('')
  const check = checkTypedName(existingNames, raw)
  const error = !check.ok && check.reason !== 'empty' ? NAME_ERRORS[check.reason] : null
  return (
    <form
      aria-label="직접 입력"
      onSubmit={(e) => {
        e.preventDefault()
        if (check.ok) onSubmit(check.name)
      }}
      className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3"
    >
      <p className="text-sm font-semibold text-slate-700">목록에 없나요? 직접 입력</p>
      <p className="text-xs text-slate-500">{GROUP_LABELS[group]} 종목으로 들어가요. 부담 부위 경고는 붙지 않아요.</p>
      <div className="flex gap-2">
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-label="종목 이름"
          placeholder="종목 이름"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!check.ok}
          className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          직접 추가
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      )}
    </form>
  )
}

export default function RoutineExercisePicker({ mode, group: fixedGroup, pain, takenIds, currentId, existingNames = [], onPick, onPickTyped, onClose }: Props) {
  const [group, setGroup] = useState<MuscleGroup | null>(mode === 'replace' ? (fixedGroup ?? null) : null)
  // 부담이 큰 종목을 골랐을 때 "그래도 담을까요?"를 물어볼 대상
  const [confirming, setConfirming] = useState<PickOption | null>(null)

  const options = group ? optionsForGroup(group, pain, takenIds).filter((o) => o.exercise.id !== currentId) : []
  const title = mode === 'replace' ? '종목 바꾸기' : '종목 추가'

  const select = (o: PickOption) => {
    if (o.burden.level === 'HIGH') setConfirming(o)
    else onPick(o.exercise.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div role="dialog" aria-label={title} className="max-h-[80vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">
            {title}
            {group && <span className="ml-2 text-sm font-medium text-slate-500">{GROUP_LABELS[group]}</span>}
          </h3>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500">
            닫기
          </button>
        </div>

        {confirming ? (
          <div role="alertdialog" aria-label="부담이 큰 종목 확인" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>
              <b>{confirming.exercise.name}</b>은(는) {confirming.burden.highParts.map((p) => PAIN_KO[p]).join('·')}에 부담이 큰 종목이에요. 그래도 담을까요?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(null)} className="flex-1 rounded-full border border-rose-200 bg-white py-2 font-semibold">
                취소
              </button>
              <button onClick={() => onPick(confirming.exercise.id)} className="flex-1 rounded-full bg-rose-500 py-2 font-semibold text-white">
                그래도 담기
              </button>
            </div>
          </div>
        ) : group === null ? (
          <div className="grid grid-cols-3 gap-2">
            {EDIT_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className="rounded-2xl border-2 border-slate-100 bg-white py-3 text-sm font-semibold text-slate-700"
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        ) : (
          <>
            {mode === 'add' && (
              <button onClick={() => setGroup(null)} className="text-sm font-semibold text-emerald-700">
                ← 부위 다시 고르기
              </button>
            )}
            {mode === 'add' && onPickTyped && <TypedForm group={group} existingNames={existingNames} onSubmit={(name) => onPickTyped(group, name)} />}
            {options.length === 0 ? (
              <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500">고를 수 있는 다른 종목이 없어요</p>
            ) : (
              <ul className="space-y-2">
                {options.map((o) => (
                  <OptionRow key={o.exercise.id} option={o} onSelect={() => select(o)} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
