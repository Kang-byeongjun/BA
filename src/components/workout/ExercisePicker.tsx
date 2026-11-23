import { ChevronLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CATALOG_GROUP_ORDER, EXERCISE_CATALOG, searchExercises, type CatalogExercise } from '../../lib/exerciseCatalog'
import { MUSCLE_GROUP_LABEL } from '../../lib/workoutSummary'

/**
 * ExercisePicker — 루틴에 없는 종목을 직접 골라 추가하는 전체 화면.
 * 검색어와 부위 필터는 함께 적용된다(검색어가 있으면 부위 필터 칩은 숨긴다 — 결과가 이미 좁혀진 상태라
 * 부위별로 또 나눌 필요가 적고, 화면도 덜 복잡해진다).
 */

interface Props {
  onPick: (exercise: CatalogExercise) => void
  onClose: () => void
}

type GroupFilter = 'ALL' | (typeof CATALOG_GROUP_ORDER)[number]

export default function ExercisePicker({ onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupFilter>('ALL')

  const results = useMemo(() => {
    const byQuery = query.trim() ? searchExercises(query) : EXERCISE_CATALOG
    return group === 'ALL' ? byQuery : byQuery.filter((e) => e.group === group)
  }, [query, group])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-2 pb-3 pt-4">
        <button aria-label="닫기" onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">종목 추가</h1>
      </div>

      <div className="space-y-2.5 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목 이름으로 찾기"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {!query.trim() && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setGroup('ALL')}
              className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${
                group === 'ALL' ? 'border-primary bg-primary-softer text-primary-dark' : 'border-slate-100 bg-white text-slate-500'
              }`}
            >
              전체
            </button>
            {CATALOG_GROUP_ORDER.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${
                  group === g ? 'border-primary bg-primary-softer text-primary-dark' : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {MUSCLE_GROUP_LABEL[g]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {results.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">일치하는 종목이 없어요.</p>
        ) : (
          <ul className="space-y-1.5">
            {results.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => onPick(e)}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left"
                >
                  <span className="font-semibold text-slate-900">{e.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">{MUSCLE_GROUP_LABEL[e.group]}</span>
                    {e.equipment}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
