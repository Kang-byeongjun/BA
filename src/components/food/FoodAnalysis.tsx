import { AlertTriangle, Minus, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FoodExtraction } from '../../../shared/analysis'
import type { FoodDbEntry } from '../../data/foodDatabase'
import { inferMealSlot } from '../../lib/time'
import {
  createEmptyRow,
  createRowsFromExtraction,
  isActiveRow,
  rowNutrients,
  summarizeRows,
  type FoodRow,
} from '../../services/mealService'
import { localNutritionProvider, roundNutrients } from '../../services/nutritionService'
import type { AnalysisMode } from '../../services/foodVisionService'
import type { MealSlot } from '../../types'

interface Props {
  preview: string | null
  extraction: FoodExtraction
  mode: AnalysisMode
  onReanalyze: () => void
  onConfirm: (input: { title: string; slot: MealSlot; rows: FoodRow[] }) => void
  onCancel: () => void
}

const SLOTS: MealSlot[] = ['아침', '점심', '저녁', '간식']
const GRAM_STEP = 10
const LOW_CONFIDENCE = 0.6

const COOKING_LABELS: Record<string, string> = {
  grilled: '구이',
  steamed: '찜',
  boiled: '삶음',
  fried: '튀김',
  'stir-fried': '볶음',
  baked: '오븐',
  braised: '조림',
  raw: '생것',
  soup: '국물',
}

export default function FoodAnalysis({ preview, extraction, mode, onReanalyze, onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState(extraction.mealName)
  const [slot, setSlot] = useState<MealSlot>(() => inferMealSlot(Date.now()))
  const [rows, setRows] = useState<FoodRow[]>(() => createRowsFromExtraction(extraction))
  const [openSuggestKey, setOpenSuggestKey] = useState<string | null>(null)
  const nameInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const pendingFocusKey = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingFocusKey.current) return
    nameInputRefs.current.get(pendingFocusKey.current)?.focus()
    pendingFocusKey.current = null
  }, [rows])

  const summary = useMemo(() => summarizeRows(rows), [rows])
  const hasBadGrams = rows.some((r) => isActiveRow(r) && !(r.grams > 0))
  const canSave = summary.activeCount > 0 && summary.unresolvedCount === 0 && !hasBadGrams

  const suggestions = useMemo(() => {
    const row = rows.find((r) => r.key === openSuggestKey)
    return row ? localNutritionProvider.search(row.name) : []
  }, [rows, openSuggestKey])

  const updateRow = (key: string, patch: Partial<FoodRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const handleNameChange = (key: string, value: string) => {
    // 이름을 고치면 영양 DB 연결을 다시 확인한다. 정확히 일치할 때만 자동으로 연결한다.
    const match = localNutritionProvider.match(value)
    const exact = match.matchType === 'exact' ? match.entry : null
    updateRow(key, { name: value, entry: exact, matchType: exact ? 'exact' : 'none' })
    setOpenSuggestKey(value.trim() ? key : null)
  }

  const handleSelectSuggestion = (key: string, entry: FoodDbEntry) => {
    updateRow(key, { name: entry.name, entry, matchType: 'exact' })
    setOpenSuggestKey(null)
  }

  const setGrams = (key: string, grams: number) => {
    updateRow(key, { grams: Number.isFinite(grams) ? Math.min(5000, Math.max(0, grams)) : 0 })
  }

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key))
    if (openSuggestKey === key) setOpenSuggestKey(null)
  }

  const addRow = () => {
    const row = createEmptyRow()
    setRows((prev) => [...prev, row])
    pendingFocusKey.current = row.key
  }

  const lowOverall = extraction.overallConfidence < LOW_CONFIDENCE
  const blockedReason = !canSave
    ? summary.activeCount === 0
      ? '기록할 음식을 추가해주세요.'
      : summary.unresolvedCount > 0
        ? '영양 정보를 찾지 못한 음식이 있어요. 이름을 검색해 선택하거나 삭제해주세요.'
        : '중량이 0g인 음식이 있어요.'
    : null

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
        <button onClick={onCancel} className="rounded-full p-1 text-slate-400" aria-label="닫기">
          <X size={22} />
        </button>
        <p className="font-semibold text-slate-800">AI 음식 분석</p>
        <button onClick={onReanalyze} className="text-sm font-medium text-slate-400">
          다시 분석
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {mode === 'mock' && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">데모 모드: 실제 AI가 아닌 예시 결과예요.</p>
        )}

        {preview && (
          <div className="h-40 w-full overflow-hidden rounded-2xl">
            <img src={preview} alt="촬영한 음식" className="h-full w-full object-cover" />
          </div>
        )}

        {(lowOverall || extraction.warnings.length > 0) && (
          <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {lowOverall && (
              <div className="flex gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>음식을 정확히 구분하기 어려웠어요. 이름과 양을 꼭 확인해주세요.</p>
              </div>
            )}
            {extraction.warnings.map((w) => (
              <p key={w} className="text-xs">
                · {w}
              </p>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="meal-title" className="mb-1.5 block text-xs font-medium text-slate-500">
            식사 이름
          </label>
          <input
            id="meal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">식사 시간대</p>
          <div className="grid grid-cols-4 gap-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`rounded-xl border-2 py-2 text-sm font-semibold ${
                  slot === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-1 text-xs font-medium text-slate-500">인식된 음식</p>
          <p className="mb-3 text-[11px] text-slate-400">
            사진 분석을 기반으로 한 예상량입니다. 실제 섭취량에 맞게 수정해주세요.
          </p>

          <div className="space-y-3">
            {rows.map((row) => {
              const nutrients = rowNutrients(row)
              const rounded = nutrients ? roundNutrients(nutrients) : null
              const active = isActiveRow(row)
              const unresolved = active && !row.entry
              const cooking = row.cookingMethod ? COOKING_LABELS[row.cookingMethod] : undefined
              const lowConfidence = row.confidence !== null && row.confidence < LOW_CONFIDENCE

              return (
                <div
                  key={row.key}
                  className={`relative rounded-xl border p-3 ${unresolved ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100 bg-slate-50/60'}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        if (el) nameInputRefs.current.set(row.key, el)
                        else nameInputRefs.current.delete(row.key)
                      }}
                      value={row.name}
                      onChange={(e) => handleNameChange(row.key, e.target.value)}
                      onFocus={() => row.name.trim() && setOpenSuggestKey(row.key)}
                      onBlur={() => setTimeout(() => setOpenSuggestKey((k) => (k === row.key ? null : k)), 150)}
                      placeholder="음식 이름 검색"
                      aria-label="음식 이름"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={() => removeRow(row.key)}
                      aria-label="음식 삭제"
                      className="shrink-0 rounded-lg p-2 text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                      <button
                        onClick={() => setGrams(row.key, Math.max(GRAM_STEP, row.grams - GRAM_STEP))}
                        aria-label={`${GRAM_STEP}g 줄이기`}
                        className="px-3 py-2 text-slate-500"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={row.grams}
                        onChange={(e) => setGrams(row.key, Number(e.target.value))}
                        aria-label="중량(g)"
                        className="w-14 py-2 text-center text-sm font-semibold outline-none"
                      />
                      <span className="pr-1 text-xs text-slate-400">g</span>
                      <button
                        onClick={() => setGrams(row.key, row.grams + GRAM_STEP)}
                        aria-label={`${GRAM_STEP}g 늘리기`}
                        className="px-3 py-2 text-slate-500"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {cooking && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{cooking}</span>
                      )}
                      {lowConfidence && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          인식 확신 낮음
                        </span>
                      )}
                    </div>
                  </div>

                  {rounded && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      🔥 {rounded.calories}kcal · 단백질 {rounded.protein}g · 탄수 {rounded.carbohydrates}g · 지방 {rounded.fat}g ·
                      식이섬유 {rounded.fiber}g
                      {row.entry && row.matchType === 'partial' && (
                        <span className="ml-1 text-amber-600">({row.entry.name} 기준으로 계산했어요)</span>
                      )}
                    </p>
                  )}
                  {unresolved && (
                    <p className="mt-2 text-[11px] font-medium text-amber-700">
                      영양 정보를 찾지 못했어요. 이름을 검색해 목록에서 선택하거나 삭제해주세요.
                    </p>
                  )}

                  {openSuggestKey === row.key && suggestions.length > 0 && (
                    <div className="absolute left-3 right-12 top-[3.25rem] z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      {suggestions.map((entry) => (
                        <button
                          key={entry.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectSuggestion(row.key, entry)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-emerald-50"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-700">{entry.name}</span>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                              {entry.category}
                            </span>
                          </span>
                          <span className="text-xs text-slate-400">100g당 {entry.caloriesPer100g}kcal</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {rows.length === 0 && <p className="text-sm text-slate-400">등록된 음식이 없어요.</p>}
          </div>

          <button
            onClick={addRow}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-200 py-2.5 text-sm font-semibold text-emerald-600"
          >
            <Plus size={16} />
            음식 추가하기
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">예상 영양소</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            총 {summary.totals.calories.toLocaleString()} <span className="text-lg font-semibold text-slate-400">kcal</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: '단백질', value: summary.totals.protein },
              { label: '탄수화물', value: summary.totals.carbohydrates },
              { label: '지방', value: summary.totals.fat },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-400">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800">{item.value}g</p>
              </div>
            ))}
            <div className="col-span-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-400">식이섬유</p>
              <p className="text-sm font-semibold text-slate-800">{summary.totals.fiber}g</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            음식 종류와 양은 AI가 사진에서 추정했고, 영양소는 앱에 내장된 영양 데이터(추정값)로 계산했어요.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        {blockedReason && <p className="mb-2 text-center text-xs text-amber-700">{blockedReason}</p>}
        <button
          onClick={() => onConfirm({ title, slot, rows })}
          disabled={!canSave}
          className="w-full rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          식사 기록하기
        </button>
      </div>
    </div>
  )
}
