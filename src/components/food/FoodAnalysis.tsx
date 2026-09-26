import { Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { searchFoodDatabase, type FoodDbEntry } from '../../data/foodDatabase'
import { generateId } from '../../lib/id'
import { inferMealSlot } from '../../lib/time'
import type { AnalyzedFoodItem, FoodAnalysisResult, MealSlot } from '../../types'

interface Props {
  image: string | null
  result: FoodAnalysisResult
  onConfirm: (data: {
    title: string
    slot: MealSlot
    foods: AnalyzedFoodItem[]
    calories: number
    protein: number
    carbohydrates: number
    fat: number
    fiber: number
  }) => void
  onCancel: () => void
}

const SLOTS: MealSlot[] = ['아침', '점심', '저녁', '간식']

interface NutrientDensity {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

interface FoodRow {
  key: string
  name: string
  grams: number
  dbId?: string
  // 1g당 영양소 밀도. grams와 곱해서 실제 섭취량을 계산한다.
  perGram: NutrientDensity
}

function parseGrams(amount: string): number {
  const match = amount.match(/[\d.]+/)
  const n = match ? Number(match[0]) : 0
  return n > 0 ? n : 100
}

function densityFromMock(food: AnalyzedFoodItem, grams: number): NutrientDensity {
  return {
    calories: food.calories / grams,
    protein: food.protein / grams,
    carbohydrates: food.carbohydrates / grams,
    fat: food.fat / grams,
    fiber: food.fiber / grams,
  }
}

function densityFromDb(entry: FoodDbEntry): NutrientDensity {
  return {
    calories: entry.caloriesPer100g / 100,
    protein: entry.proteinPer100g / 100,
    carbohydrates: entry.carbsPer100g / 100,
    fat: entry.fatPer100g / 100,
    fiber: entry.fiberPer100g / 100,
  }
}

function computeNutrients(row: FoodRow) {
  return {
    calories: Math.round(row.perGram.calories * row.grams),
    protein: Math.round(row.perGram.protein * row.grams),
    carbohydrates: Math.round(row.perGram.carbohydrates * row.grams),
    fat: Math.round(row.perGram.fat * row.grams),
    fiber: Math.round(row.perGram.fiber * row.grams),
  }
}

function initRows(foods: AnalyzedFoodItem[]): FoodRow[] {
  return foods.map((food) => {
    const grams = parseGrams(food.amount)
    return {
      key: generateId('row'),
      name: food.name,
      grams,
      perGram: densityFromMock(food, grams),
    }
  })
}

export default function FoodAnalysis({ image, result, onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState(result.title)
  const [slot, setSlot] = useState<MealSlot>(inferMealSlot(Date.now()))
  const [foods, setFoods] = useState<FoodRow[]>(() => initRows(result.foods))
  const [openSuggestKey, setOpenSuggestKey] = useState<string | null>(null)
  const nameInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const pendingFocusKey = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingFocusKey.current) return
    nameInputRefs.current.get(pendingFocusKey.current)?.focus()
    pendingFocusKey.current = null
  }, [foods])

  const suggestions = useMemo(() => {
    const row = foods.find((f) => f.key === openSuggestKey)
    if (!row) return []
    return searchFoodDatabase(row.name)
  }, [foods, openSuggestKey])

  const computedFoods = useMemo(() => foods.map((row) => ({ row, nutrients: computeNutrients(row) })), [foods])

  const totals = useMemo(
    () =>
      computedFoods.reduce(
        (acc, { nutrients }) => ({
          calories: acc.calories + nutrients.calories,
          protein: acc.protein + nutrients.protein,
          carbohydrates: acc.carbohydrates + nutrients.carbohydrates,
          fat: acc.fat + nutrients.fat,
          fiber: acc.fiber + nutrients.fiber,
        }),
        { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 },
      ),
    [computedFoods],
  )

  const handleNameChange = (key: string, value: string) => {
    setFoods((prev) => prev.map((f) => (f.key === key ? { ...f, name: value, dbId: undefined } : f)))
    setOpenSuggestKey(value.trim() ? key : null)
  }

  const handleSelectSuggestion = (key: string, entry: FoodDbEntry) => {
    setFoods((prev) =>
      prev.map((f) => (f.key === key ? { ...f, name: entry.name, dbId: entry.id, perGram: densityFromDb(entry) } : f)),
    )
    setOpenSuggestKey(null)
  }

  const handleGramsChange = (key: string, value: string) => {
    const grams = Number(value)
    setFoods((prev) => prev.map((f) => (f.key === key ? { ...f, grams: Number.isFinite(grams) && grams >= 0 ? grams : 0 } : f)))
  }

  const removeFood = (key: string) => {
    setFoods((prev) => prev.filter((f) => f.key !== key))
    if (openSuggestKey === key) setOpenSuggestKey(null)
  }

  const addFood = () => {
    const key = generateId('row')
    setFoods((prev) => [
      ...prev,
      { key, name: '', grams: 100, perGram: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 } },
    ])
    pendingFocusKey.current = key
  }

  const handleConfirm = () => {
    const finalFoods: AnalyzedFoodItem[] = computedFoods
      .filter(({ row }) => row.name.trim() !== '')
      .map(({ row, nutrients }) => ({
        name: row.name,
        amount: `${row.grams}g`,
        ...nutrients,
      }))
    onConfirm({
      title: title.trim() || '식사 기록',
      slot,
      foods: finalFoods,
      ...totals,
    })
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
        <button onClick={onCancel} className="rounded-full p-1 text-slate-400">
          <X size={22} />
        </button>
        <p className="font-semibold text-slate-800">분석 결과</p>
        <div className="w-6" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {image && (
          <div className="h-44 w-full overflow-hidden rounded-2xl">
            <img src={image} alt="촬영한 음식" className="h-full w-full object-cover" />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">식사 이름</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">식사 시간대</label>
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
          <p className="mb-1 text-xs font-medium text-slate-500">AI가 인식한 음식</p>
          <p className="mb-3 text-[11px] text-slate-400">
            음식명을 잘못 인식했다면 이름을 다시 입력해 목록에서 정확한 음식을 선택하세요. 칼로리가 자동으로
            반영돼요.
          </p>
          <div className="space-y-3">
            {computedFoods.map(({ row, nutrients }) => (
              <div key={row.key} className="relative">
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
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                  <div className="flex w-24 shrink-0 items-center rounded-lg border border-slate-200 px-2">
                    <input
                      type="number"
                      value={row.grams}
                      onChange={(e) => handleGramsChange(row.key, e.target.value)}
                      className="w-full py-2 text-right text-sm outline-none"
                    />
                    <span className="pl-1 text-xs text-slate-400">g</span>
                  </div>
                  <button
                    onClick={() => removeFood(row.key)}
                    className="shrink-0 rounded-lg p-2 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="mt-1 pl-0.5 text-[11px] text-slate-400">
                  🔥 {nutrients.calories}kcal · 단백질 {nutrients.protein}g · 탄수 {nutrients.carbohydrates}g · 지방{' '}
                  {nutrients.fat}g · 식이섬유 {nutrients.fiber}g
                  {row.dbId && <span className="ml-1 text-emerald-500">(DB 매칭됨)</span>}
                </p>

                {openSuggestKey === row.key && suggestions.length > 0 && (
                  <div className="absolute left-0 right-24 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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
            ))}
            {foods.length === 0 && <p className="text-sm text-slate-400">등록된 음식이 없어요.</p>}
          </div>

          <button
            onClick={addFood}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-200 py-2.5 text-sm font-semibold text-emerald-600"
          >
            <Plus size={16} />
            음식 추가하기
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-1 text-xs font-medium text-slate-500">예상 영양소 (자동 계산됨)</p>
          <p className="mb-3 text-[11px] text-slate-400">위 음식 구성을 수정하면 아래 값이 자동으로 반영돼요.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '칼로리', value: totals.calories, unit: 'kcal' },
              { label: '단백질', value: totals.protein, unit: 'g' },
              { label: '탄수화물', value: totals.carbohydrates, unit: 'g' },
              { label: '지방', value: totals.fat, unit: 'g' },
              { label: '식이섬유', value: totals.fiber, unit: 'g' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-sm font-semibold text-slate-800">
                  {item.value}
                  {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <button
          onClick={handleConfirm}
          className="w-full rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200"
        >
          이대로 기록하기
        </button>
      </div>
    </div>
  )
}
