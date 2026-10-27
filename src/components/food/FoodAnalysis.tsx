import { AlertTriangle, Loader2, Minus, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FoodExtraction } from '../../../shared/analysis'
import { AnalysisError } from '../../../shared/errors'
import type { FoodDbEntry } from '../../data/foodDatabase'
import { inferMealSlot } from '../../lib/time'
import {
  createEmptyRow,
  createRowsFromExtraction,
  isActiveRow,
  LOW_CONFIDENCE,
  rowNutrients,
  summarizeRows,
  type FoodRow,
} from '../../services/mealService'
import { localNutritionProvider, roundNutrients } from '../../services/nutritionService'
import { requestNutritionEstimate } from '../../services/nutritionEstimateService'
import type { AnalysisMode } from '../../services/foodVisionService'
import type { MealSlot } from '../../types'

interface Props {
  preview: string | null
  extraction: FoodExtraction
  mode: AnalysisMode
  // 특정 칸("아침" 등)의 "+추가"로 들어왔으면 그 값을 넘겨받아 기본 선택값으로 쓴다.
  // 없으면 지금 시각 기준으로 추정한다(inferMealSlot).
  initialSlot?: MealSlot
  onReanalyze: () => void
  onConfirm: (input: { title: string; slot: MealSlot; rows: FoodRow[] }) => void
  onCancel: () => void
}

const SLOTS: MealSlot[] = ['아침', '점심', '저녁', '간식']
const GRAM_STEP = 10

// 그램 수를 바로 입력하는 대신, 익숙한 크기 비교로 양을 조정할 수 있게 한다 — 사진 한 장으로
// 정확한 중량을 재는 건 어렵고, 사용자는 숫자보다 "이만큼"을 훨씬 잘 판단하기 때문이다.
// AI가 처음 추정한 양(originalGrams)을 기준으로 비율을 매긴다.
const SIZE_PRESETS: { label: string; multiplier: number }[] = [
  { label: '적게', multiplier: 0.7 },
  { label: '보통', multiplier: 1 },
  { label: '많이', multiplier: 1.3 },
  { label: '아주 많이', multiplier: 1.6 },
]

function presetGrams(baseGrams: number, multiplier: number): number {
  return Math.max(GRAM_STEP, Math.round((baseGrams * multiplier) / GRAM_STEP) * GRAM_STEP)
}

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

export default function FoodAnalysis({ preview, extraction, mode, initialSlot, onReanalyze, onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState(extraction.mealName)
  const [slot, setSlot] = useState<MealSlot>(() => initialSlot ?? inferMealSlot(Date.now()))
  const [rows, setRows] = useState<FoodRow[]>(() => createRowsFromExtraction(extraction))
  const [openSuggestKey, setOpenSuggestKey] = useState<string | null>(null)
  // DB에 없는 음식(예: 양념치킨)을 삭제하지 않고도 기록할 수 있게, 그 음식만 사용자가 직접
  // 영양정보를 입력하는 경로. AI가 숫자를 추정하는 게 아니라 사용자가 직접 넣는 값이라
  // "AI는 식별, 앱은 계산" 원칙은 그대로 유지된다.
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null)
  const [manualDraft, setManualDraft] = useState({ calories: '', protein: '', carbohydrates: '', fat: '', fiber: '' })
  // DB·검색으로 못 찾은 음식에 "AI로 추정하기"를 눌렀을 때의 진행/실패 상태. 여러 행에서 동시에 쓸 수 있다.
  const [estimatingKeys, setEstimatingKeys] = useState<Set<string>>(new Set())
  const [estimateErrors, setEstimateErrors] = useState<Record<string, string>>({})
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
    // 기본 한도(6개)보다 넉넉하게 — "치킨"처럼 흔한 검색어는 브랜드 메뉴까지 포함해 여러 개가 걸린다.
    return row ? localNutritionProvider.search(row.name, 8) : []
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

  const openManualEntry = (key: string) => {
    setManualEntryKey(key)
    setManualDraft({ calories: '', protein: '', carbohydrates: '', fat: '', fiber: '' })
    setOpenSuggestKey(null)
  }

  const applyManualEntry = (row: FoodRow) => {
    const grams = row.grams > 0 ? row.grams : 100
    // 입력값은 "지금 이 양(grams) 기준 총량"으로 받는다 — 사용자가 100g 기준으로 환산해서
    // 입력하게 하는 대신, 먹은 만큼 그대로 적게 하는 게 더 직관적이다. DB 저장 단위(100g당)에
    // 맞추기 위해 여기서만 역산한다.
    const per100 = (totalStr: string) => {
      const total = Number(totalStr)
      return Number.isFinite(total) && total >= 0 ? (total / grams) * 100 : 0
    }
    const entry: FoodDbEntry = {
      id: `custom-${row.key}`,
      name: row.name.trim() || '직접 입력한 음식',
      category: '한식',
      caloriesPer100g: per100(manualDraft.calories),
      proteinPer100g: per100(manualDraft.protein),
      carbsPer100g: per100(manualDraft.carbohydrates),
      fatPer100g: per100(manualDraft.fat),
      fiberPer100g: per100(manualDraft.fiber),
    }
    updateRow(row.key, { entry, matchType: 'exact' })
    setManualEntryKey(null)
  }

  // 영양 정보를 찾지 못한 음식의 100g당 영양소를 AI에게 추정해달라고 요청한다(실제 영양성분표 조회가
  // 아니라 추정치라서, entry 자체가 아니라 matchType으로 "AI 추정치"임을 표시해 DB 공식값과 구분한다).
  const handleAiEstimate = async (row: FoodRow) => {
    setEstimatingKeys((prev) => new Set(prev).add(row.key))
    setEstimateErrors((prev) => {
      if (!(row.key in prev)) return prev
      const next = { ...prev }
      delete next[row.key]
      return next
    })
    try {
      const result = await requestNutritionEstimate({ foodName: row.name, cookingMethod: row.cookingMethod })
      const entry: FoodDbEntry = {
        id: `ai-${row.key}`,
        name: row.name.trim() || 'AI 추정 음식',
        category: '한식',
        caloriesPer100g: result.caloriesPer100g,
        proteinPer100g: result.proteinPer100g,
        carbsPer100g: result.carbsPer100g,
        fatPer100g: result.fatPer100g,
        fiberPer100g: result.fiberPer100g,
      }
      updateRow(row.key, { entry, matchType: 'ai_estimate' })
    } catch (err) {
      const message = err instanceof AnalysisError ? err.message : '추정에 실패했어요. 잠시 후 다시 시도해주세요.'
      setEstimateErrors((prev) => ({ ...prev, [row.key]: message }))
    } finally {
      setEstimatingKeys((prev) => {
        const next = new Set(prev)
        next.delete(row.key)
        return next
      })
    }
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
            사진 분석을 기반으로 한 예상량입니다. 그램 수가 가늠되지 않으면 아래 크기 버튼으로, 알고 있으면 숫자로 직접 맞춰주세요.
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

                  {row.originalGrams !== null && (
                    <div className="mt-2 flex gap-1">
                      {SIZE_PRESETS.map((preset) => {
                        const presetValue = presetGrams(row.originalGrams!, preset.multiplier)
                        const active = row.grams === presetValue
                        return (
                          <button
                            key={preset.label}
                            onClick={() => setGrams(row.key, presetValue)}
                            className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition ${
                              active
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-500'
                            }`}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {rounded && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      🔥 {rounded.calories}kcal · 단백질 {rounded.protein}g · 탄수 {rounded.carbohydrates}g · 지방 {rounded.fat}g ·
                      식이섬유 {rounded.fiber}g
                      {row.entry && row.matchType === 'partial' && (
                        <span className="ml-1 text-amber-600">({row.entry.name} 기준으로 계산했어요)</span>
                      )}
                      {row.entry && row.matchType === 'ai_estimate' && (
                        <span className="ml-1 text-sky-600">(AI가 추정한 수치예요, 정확한 영양정보가 아닐 수 있어요)</span>
                      )}
                    </p>
                  )}
                  {unresolved && manualEntryKey !== row.key && (
                    <div className="mt-2">
                      <p className="text-[11px] font-medium text-amber-700">
                        영양 정보를 찾지 못했어요. AI로 추정하거나, 이름을 검색해 선택하거나, 직접 입력할 수 있어요.
                      </p>
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          onClick={() => void handleAiEstimate(row)}
                          disabled={estimatingKeys.has(row.key)}
                          className="flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700 disabled:cursor-not-allowed disabled:text-sky-300"
                        >
                          {estimatingKeys.has(row.key) ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              추정 중...
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              AI로 추정하기
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openManualEntry(row.key)}
                          className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                        >
                          영양정보 직접 입력
                        </button>
                      </div>
                      {estimateErrors[row.key] && <p className="mt-1 text-[11px] text-rose-600">{estimateErrors[row.key]}</p>}
                    </div>
                  )}

                  {manualEntryKey === row.key && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2.5">
                      <p className="mb-2 text-[11px] text-slate-500">
                        지금 중량({row.grams}g) 기준으로, 먹은 만큼의 영양소 총량을 입력해주세요.
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            ['calories', '칼로리(kcal)'],
                            ['protein', '단백질(g)'],
                            ['carbohydrates', '탄수화물(g)'],
                            ['fat', '지방(g)'],
                            ['fiber', '식이섬유(g)'],
                          ] as const
                        ).map(([field, label]) => (
                          <label key={field} className="text-[10px] text-slate-400">
                            {label}
                            <input
                              type="number"
                              inputMode="decimal"
                              value={manualDraft[field]}
                              onChange={(e) => setManualDraft((prev) => ({ ...prev, [field]: e.target.value }))}
                              className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-emerald-400"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => setManualEntryKey(null)}
                          className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-500"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => applyManualEntry(row)}
                          disabled={!manualDraft.calories}
                          className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          적용
                        </button>
                      </div>
                    </div>
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
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-700">{entry.name}</span>
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                {entry.category}
                              </span>
                            </span>
                            {entry.brand && <span className="mt-0.5 block text-[10px] text-emerald-600">{entry.brand}</span>}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">100g당 {entry.caloriesPer100g}kcal</span>
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
