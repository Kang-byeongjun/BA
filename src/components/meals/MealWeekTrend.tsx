import { useState } from 'react'
import { getSlotWeekSeries, weekdayLabel, type DayNutrition } from '../../lib/mealWeekTrend'
import { formatRelativeDate } from '../../lib/time'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, type Meal, type MealSlot, type NutrientKey } from '../../types'

interface Props {
  meals: Meal[]
}

const SLOTS: MealSlot[] = ['아침', '점심', '저녁', '간식']
const NUTRIENTS: NutrientKey[] = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber']
const BAR_AREA_H = 28

function SlotTabs({ slot, onSelect }: { slot: MealSlot; onSelect: (s: MealSlot) => void }) {
  return (
    <div className="flex gap-1">
      {SLOTS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
            slot === s ? 'bg-slate-200 text-slate-800' : 'text-slate-400'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

function NutrientBarsRow({
  nutrient,
  series,
  selectedIndex,
  onSelect,
}: {
  nutrient: NutrientKey
  series: DayNutrition[]
  selectedIndex: number
  onSelect: (i: number) => void
}) {
  const values = series.map((d) => d[nutrient])
  const max = Math.max(...values, 0)
  const shown = values[selectedIndex]

  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-slate-500">{NUTRIENT_LABELS[nutrient]}</span>
        <span className="text-xs font-semibold text-slate-700">
          {Math.round(shown)}{NUTRIENT_UNITS[nutrient]}
        </span>
      </div>
      <div className="flex items-end gap-1" style={{ height: BAR_AREA_H }}>
        {series.map((d, i) => {
          const isSelected = i === selectedIndex
          const value = d[nutrient]
          const heightPct = max > 0 ? (value / max) * 100 : 0
          return (
            <button
              key={d.date}
              onClick={() => onSelect(i)}
              className="flex h-full flex-1 items-end"
              aria-label={`${weekdayLabel(d.date)}요일 ${NUTRIENT_LABELS[nutrient]} ${Math.round(value)}${NUTRIENT_UNITS[nutrient]}`}
            >
              <div
                className={`w-full rounded-sm transition-colors ${isSelected ? 'bg-sky-500' : 'bg-slate-300'}`}
                style={{ height: `${value > 0 ? Math.max(heightPct, 6) : 0}%` }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 요일별로 끼니(아침/점심/저녁/간식)를 고르면, 그 끼니의 영양소 5개를 최근 7일 막대로 보여준다.
// 모든 끼니·영양소를 한 화면에 다 넣으면 너무 빽빽해서, 끼니 탭으로 먼저 좁힌다.
export default function MealWeekTrend({ meals }: Props) {
  const [slot, setSlot] = useState<MealSlot>('아침')
  const [selected, setSelected] = useState<number | null>(null)
  const series = getSlotWeekSeries(meals, slot)
  const hasAny = series.some((d) => NUTRIENTS.some((n) => d[n] > 0))
  const selectedIndex = selected ?? series.length - 1

  const selectSlot = (s: MealSlot) => {
    setSlot(s)
    setSelected(null)
  }
  const toggleDay = (i: number) => setSelected((cur) => (cur === i ? null : i))

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">최근 7일 식단 추이</h2>
        <SlotTabs slot={slot} onSelect={selectSlot} />
      </div>
      {!hasAny && <p className="mb-2.5 text-xs text-slate-400">최근 7일간 {slot} 기록이 없어요.</p>}
      {NUTRIENTS.map((n) => (
        <NutrientBarsRow key={n} nutrient={n} series={series} selectedIndex={selectedIndex} onSelect={toggleDay} />
      ))}
      <div className="mt-1 flex gap-1">
        {series.map((d, i) => (
          <button
            key={d.date}
            onClick={() => toggleDay(i)}
            className={`flex-1 text-center text-[10px] ${i === selectedIndex ? 'font-semibold text-slate-600' : 'text-slate-400'}`}
          >
            {weekdayLabel(d.date)}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-center text-xs text-slate-500">{formatRelativeDate(series[selectedIndex].date)}</p>
    </div>
  )
}
