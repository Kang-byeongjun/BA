import { useState } from 'react'
import type { RoutineExercise, WorkoutResult } from '../../../server/engine/types'
import { addExercise, addTypedExercise, isTypedExercise, removeExercise, replaceExercise, takenIdsOf, type EditContext } from '../../lib/routineEdit'
import ExerciseDetailSheet from './ExerciseDetailSheet'
import ExerciseThumb from './ExerciseThumb'
import RoutineExercisePicker from './RoutineExercisePicker'

/**
 * RoutineView — 운동 추천 엔진 결과(WorkoutResult)를 그리기만 하는 화면 조각.
 * 전역 상태(useApp)나 서버 호출에 의존하지 않는다. 데이터는 모두 props로 받는다.
 */

export type RoutineDay = WorkoutResult['days'][number]

interface Props {
  result: WorkoutResult
  /** 있으면 일차 탭 아래에 "이 루틴으로 운동 시작" 버튼을 보여준다 */
  onStart?: (day: RoutineDay) => void
  /** 있으면 종목 "바꾸기 / 삭제 / 추가" 버튼을 보여준다. 바뀐 결과를 onChange로 알려준다(AI는 부르지 않음) */
  edit?: { context: EditContext; onChange: (next: WorkoutResult) => void }
  /** true면 사용자가 종목을 직접 바꾼 루틴 → AI가 쓴 요약 대신 안내 문구를 보여준다 */
  edited?: boolean
}

export const EDITED_NOTICE = '직접 바꾼 루틴이에요. 다시 만들기를 누르면 AI 추천으로 돌아가요.'
export const FALLBACK_NOTICE = 'AI가 연결되지 않아 규칙 기반 기본 루틴으로 구성했어요'

const range = (min: number, max: number) => (min === max ? `${min}` : `${min}~${max}`)

function prescriptionText(rx: NonNullable<RoutineExercise['prescription']>): { main: string; rest: string } {
  return {
    main: `${range(rx.setsMin, rx.setsMax)}세트 × ${range(rx.repsMin, rx.repsMax)}회`,
    rest: `휴식 ${range(rx.restMin, rx.restMax)}초`,
  }
}

interface ItemActions {
  onReplace: () => void
  onRemove: () => void
}

function ExerciseItem({ exercise, showReason, actions, onOpen }: { exercise: RoutineExercise; showReason: boolean; actions?: ItemActions; onOpen: () => void }) {
  const rx = exercise.prescription ? prescriptionText(exercise.prescription) : null

  return (
    // 행을 누르면 종목 상세(근육 맵·수행 방법)가 열린다. 바꾸기·삭제 버튼은 아래에서 전파를 막아 열리지 않게 한다.
    <li onClick={onOpen} className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">
          {exercise.order}
        </span>
        <button type="button" aria-label={`${exercise.name} 운동 방법 보기`} className="shrink-0">
          <ExerciseThumb id={exercise.id} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words font-semibold text-slate-900">
            {exercise.name}
            {exercise.custom && (
              <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                {isTypedExercise(exercise) ? '직접 입력' : '직접 고름'}
              </span>
            )}
          </p>
          {showReason && <p className="mt-1 text-sm text-slate-500">{exercise.reason}</p>}
          {exercise.prescription && (
            <p className="mt-1 text-lg font-bold text-primary-dark">× {range(exercise.prescription.setsMin, exercise.prescription.setsMax)}세트</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-medium">
            {rx ? (
              <>
                <span className="rounded-full bg-primary-softer px-2 py-0.5 text-primary-dark">{rx.main}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{rx.rest}</span>
              </>
            ) : (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">유산소 · 남은 시간 동안 편한 강도로</span>
            )}
          </div>
        </div>
      </div>

      {exercise.caution && (
        <div role="note" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {exercise.caution.text}
        </div>
      )}

      {actions && (
        // 바꾸기·삭제는 행 맨 아래에 둔다(좁은 칸에서 글자가 접히지 않게). 누르면 상세 창이 열리지 않도록 전파를 막는다.
        <div className="mt-3 flex gap-2 text-sm font-semibold" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={actions.onReplace}
            aria-label={`${exercise.name} 바꾸기`}
            className="min-h-10 flex-1 rounded-full border border-slate-200 px-3 py-2 text-slate-600"
          >
            바꾸기
          </button>
          <button
            onClick={actions.onRemove}
            aria-label={`${exercise.name} 삭제`}
            className="min-h-10 flex-1 rounded-full border border-rose-200 px-3 py-2 text-rose-600"
          >
            삭제
          </button>
        </div>
      )}
    </li>
  )
}

type PickerState = { mode: 'replace'; order: number } | { mode: 'add' } | null

export default function RoutineView({ result, onStart, edit, edited = false }: Props) {
  const [dayIndex, setDayIndex] = useState(0)
  const [picker, setPicker] = useState<PickerState>(null)
  // 상세 창(근육 맵·수행 방법)을 열어 둔 종목
  const [detail, setDetail] = useState<{ id: string; name: string } | null>(null)
  // 일차의 마지막 종목을 지우려 할 때 한 번 확인받는다
  const [confirmRemoveOrder, setConfirmRemoveOrder] = useState<number | null>(null)
  const days = result.days
  // 결과가 바뀌어 일차 수가 줄어도 범위를 벗어나지 않게 한다.
  const current = days[Math.min(dayIndex, days.length - 1)]
  // 기본(규칙) 루틴의 종목별 이유는 AI가 쓴 설명이 아니라서 숨긴다.
  const isFallback = result.source === 'fallback'

  return (
    <div className="space-y-3">
      {result.goalReason && (
        <p className="rounded-2xl bg-primary-softer px-4 py-3 text-sm text-primary-dark">{result.goalReason}</p>
      )}

      <p className="text-sm text-slate-600">{edited ? EDITED_NOTICE : isFallback ? FALLBACK_NOTICE : result.summary}</p>

      {days.length > 1 && (
        <div role="tablist" aria-label="운동 일차" className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d, i) => {
            const selected = d === current
            return (
              <button
                key={d.day}
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setDayIndex(i)
                  setConfirmRemoveOrder(null)
                }}
                className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${
                  selected ? 'border-primary bg-primary-softer text-primary-dark' : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {d.day}일차 · {d.label}
              </button>
            )
          })}
        </div>
      )}

      {current && onStart && (
        <button
          onClick={() => onStart(current)}
          className="w-full rounded-full bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/25"
        >
          이 루틴으로 운동 시작
        </button>
      )}

      {current && (
        <ol role="tabpanel" aria-label={`${current.day}일차 ${current.label}`} className="space-y-2">
          {current.exercises.map((e) => (
            <ExerciseItem
              key={`${current.day}-${e.order}-${e.id}`}
              exercise={e}
              showReason={!isFallback}
              onOpen={() => setDetail({ id: e.id, name: e.name })}
              actions={
                edit
                  ? {
                      onReplace: () => setPicker({ mode: 'replace', order: e.order }),
                      onRemove: () =>
                        current.exercises.length <= 1
                          ? setConfirmRemoveOrder(e.order)
                          : edit.onChange(removeExercise(result, current.day, e.order)),
                    }
                  : undefined
              }
            />
          ))}
        </ol>
      )}

      {current && edit && confirmRemoveOrder !== null && (
        <div role="alertdialog" aria-label="마지막 종목 삭제 확인" className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <p>이 일차의 마지막 종목이에요. 지우면 운동할 종목이 없어요. 그래도 지울까요?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmRemoveOrder(null)} className="flex-1 rounded-full border border-rose-200 bg-white py-1.5 font-semibold">
              취소
            </button>
            <button
              onClick={() => {
                edit.onChange(removeExercise(result, current.day, confirmRemoveOrder))
                setConfirmRemoveOrder(null)
              }}
              className="flex-1 rounded-full border border-rose-600 bg-white py-1.5 font-semibold text-rose-600"
            >
              지우기
            </button>
          </div>
        </div>
      )}

      {current && edit && (
        <button
          onClick={() => setPicker({ mode: 'add' })}
          className="w-full rounded-full border-2 border-dashed border-primary-soft py-2.5 text-sm font-semibold text-primary-dark"
        >
          + 종목 추가
        </button>
      )}

      {current && edit && picker && (
        <RoutineExercisePicker
          mode={picker.mode}
          group={picker.mode === 'replace' ? current.exercises.find((e) => e.order === picker.order)?.group : undefined}
          currentId={picker.mode === 'replace' ? current.exercises.find((e) => e.order === picker.order)?.id : undefined}
          pain={edit.context.pain}
          takenIds={takenIdsOf(current)}
          existingNames={current.exercises.map((e) => e.name)}
          onPick={(id) => {
            edit.onChange(
              picker.mode === 'replace'
                ? replaceExercise(result, current.day, picker.order, id, edit.context)
                : addExercise(result, current.day, id, edit.context),
            )
            setPicker(null)
          }}
          onPickTyped={
            picker.mode === 'add'
              ? (group, name) => {
                  edit.onChange(addTypedExercise(result, current.day, group, name, edit.context))
                  setPicker(null)
                }
              : undefined
          }
          onClose={() => setPicker(null)}
        />
      )}

      {detail && <ExerciseDetailSheet id={detail.id} name={detail.name} onClose={() => setDetail(null)} />}

      {result.prescriptionNote && <p className="text-xs text-slate-400">참고: {result.prescriptionNote}</p>}
    </div>
  )
}
