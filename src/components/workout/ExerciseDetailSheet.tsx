import { useEffect } from 'react'
import { getExerciseGuide, MUSCLE_LABELS_KO } from '../../lib/exerciseGuides'
import { TYPED_ID_PREFIX } from '../../lib/routineEdit'
import MuscleMap from './MuscleMap'

interface Props {
  id: string
  name: string
  onClose: () => void
}

// 종목을 눌렀을 때 아래에서 올라오는 상세 창: 근육 맵(앞/뒤) · 자극 부위 · 수행 방법 · 주의사항.
// 배경을 누르거나 닫기 버튼(또는 Esc)으로 닫는다.
export default function ExerciseDetailSheet({ id, name, onClose }: Props) {
  const guide = getExerciseGuide(id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div data-testid="exercise-sheet-backdrop" onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        role="dialog"
        aria-label={`${name} 운동 안내`}
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 font-bold text-slate-900">{name}</h3>
          <button onClick={onClose} className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-slate-500">
            닫기
          </button>
        </div>

        {!guide ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {id.startsWith(TYPED_ID_PREFIX) ? '직접 추가한 종목이라 안내가 없어요' : '이 종목은 아직 안내가 없어요'}
          </p>
        ) : (
          <>
            <div className="flex justify-center gap-4">
              {(['anterior', 'posterior'] as const).map((view) => (
                <figure key={view} className="text-center">
                  <div className="mx-auto h-48 w-24 rounded-xl bg-slate-50 p-2">
                    <MuscleMap guide={guide} view={view} labelPrefix={view === 'anterior' ? '앞면 ' : '뒷면 '} />
                  </div>
                  <figcaption className="mt-1 text-xs text-slate-500">{view === 'anterior' ? '앞면' : '뒷면'}</figcaption>
                </figure>
              ))}
            </div>

            <section aria-label="자극 부위">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">자극 부위</h4>
              <ul className="flex flex-wrap gap-1.5">
                {guide.muscles.primary.map((m) => (
                  <li key={`p-${m}`} data-kind="primary" className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white">
                    {MUSCLE_LABELS_KO[m]}
                  </li>
                ))}
                {guide.muscles.secondary
                  .filter((m) => !guide.muscles.primary.includes(m))
                  .map((m) => (
                    <li key={`s-${m}`} data-kind="secondary" className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      {MUSCLE_LABELS_KO[m]}
                    </li>
                  ))}
              </ul>
            </section>

            <section aria-label="수행 방법">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">수행 방법</h4>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
                {guide.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </section>

            <section aria-label="이렇게 해보세요" className="rounded-2xl bg-amber-50 px-4 py-3">
              <h4 className="mb-1 text-sm font-semibold text-amber-800">이렇게 해보세요</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                {guide.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>

            <p className="text-center text-xs text-slate-400">참고용 안내예요. 통증이 있으면 멈추세요.</p>
          </>
        )}
      </div>
    </div>
  )
}
