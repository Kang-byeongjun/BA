import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { getDayWeekSeries, getSlotWeekSeries, weekdayLabel, type DayNutrition } from '../../lib/mealWeekTrend'
import { formatRelativeDate } from '../../lib/time'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, type Meal, type MealSlot, type NutrientKey, type NutritionTarget } from '../../types'

interface Props {
  meals: Meal[]
  nutritionTarget: NutritionTarget
}

type ViewMode = 'daily' | 'weekly'

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
function DailyTrendView({ meals }: { meals: Meal[] }) {
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
    <>
      <div className="mb-3">
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
    </>
  )
}

// 주간 목표 길이의 TARGET_POS%까지를 "목표 안"으로 쓰고, 나머지는 초과분을 보여줄 여유 공간으로 비워둔다.
const TARGET_POS = 78
// 오래된 날 -> 오늘 순서로, 같은 색조를 진하게 — 오늘이 가장 진하다.
const WEEKDAY_SHADES = ['bg-sky-100', 'bg-sky-200', 'bg-sky-300', 'bg-sky-400', 'bg-sky-500', 'bg-sky-600', 'bg-sky-700']

function WeekdayLegend({ series }: { series: DayNutrition[] }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {series.map((d, i) => (
        <div key={d.date} className="flex items-center gap-0.5">
          <span className={`inline-block h-2 w-2 rounded-sm ${WEEKDAY_SHADES[i]}`} />
          <span className="text-[10px] text-slate-400">{weekdayLabel(d.date)}</span>
        </div>
      ))}
    </div>
  )
}

function WeeklyBudgetBar({ nutrient, series, target }: { nutrient: NutrientKey; series: DayNutrition[]; target: number }) {
  const weeklyTarget = target * 7
  const values = series.map((d) => d[nutrient])
  const weeklySum = values.reduce((s, v) => s + v, 0)
  const scale = weeklyTarget > 0 ? TARGET_POS / weeklyTarget : 0
  const excess = Math.max(0, weeklySum - weeklyTarget)
  const totalWidthPct = Math.min(100, weeklySum * scale)
  const overlayLeft = Math.min(TARGET_POS, totalWidthPct)
  const overlayWidth = Math.max(0, totalWidthPct - overlayLeft)
  const showInlineLabel = overlayWidth >= 12

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-slate-500">{NUTRIENT_LABELS[nutrient]}</span>
        <span className="text-xs text-slate-400">
          <span className="font-semibold text-slate-700">{Math.round(weeklySum)}</span>
          {` / ${Math.round(weeklyTarget)}${NUTRIENT_UNITS[nutrient]}`}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-full bg-slate-100" style={{ height: 18 }}>
        <div className="flex h-full">
          {series.map((d, i) => (
            <div
              key={d.date}
              className={`h-full shrink-0 ${WEEKDAY_SHADES[i]}`}
              style={{ width: `${Math.max(0, d[nutrient] * scale)}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-y-0 border-l border-dashed border-slate-400" style={{ left: `${TARGET_POS}%` }} />
        {excess > 0 && (
          <div
            className="absolute inset-y-0 flex items-center justify-center bg-rose-600"
            style={{ left: `${overlayLeft}%`, width: `${overlayWidth}%` }}
          >
            {showInlineLabel && (
              <span className="px-1 text-[9px] font-semibold whitespace-nowrap text-white">
                +{Math.round(excess)}{NUTRIENT_UNITS[nutrient]}
              </span>
            )}
          </div>
        )}
      </div>
      {excess > 0 && !showInlineLabel && (
        <p className="mt-1 text-right text-[10px] font-medium text-rose-500">
          목표보다 +{Math.round(excess)}{NUTRIENT_UNITS[nutrient]} 초과
        </p>
      )}
    </div>
  )
}

// 끼니 구분 없이 하루 전체를 더해서, 영양소별로 "이번 주 목표 중 얼마나 채웠는지"를 가로 막대 하나로 보여준다.
// 막대 안의 각 구간은 요일(오래된 날 -> 오늘, 점점 진해짐)이고, 목표(점선)를 넘기면 그 초과분만 빨간 구간으로 이어 붙인다.
function WeeklyBudgetView({ meals, nutritionTarget }: { meals: Meal[]; nutritionTarget: NutritionTarget }) {
  const series = getDayWeekSeries(meals)
  return (
    <>
      <WeekdayLegend series={series} />
      {NUTRIENTS.map((n) => (
        <WeeklyBudgetBar key={n} nutrient={n} series={series} target={nutritionTarget[n]} />
      ))}
    </>
  )
}

export default function MealWeekTrend({ meals, nutritionTarget }: Props) {
  const [mode, setMode] = useState<ViewMode>('daily')
  const toggleMode = () => setMode((m) => (m === 'daily' ? 'weekly' : 'daily'))

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">
          {mode === 'daily' ? '최근 7일 식단 추이' : '이번 주 영양소 합계'}
        </h2>
        <button
          onClick={toggleMode}
          className="rounded-full bg-slate-100 p-1.5 text-slate-500"
          aria-label={mode === 'daily' ? '주간 합계 보기로 전환' : '요일별 추이 보기로 전환'}
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>
      {mode === 'daily' ? (
        <DailyTrendView meals={meals} />
      ) : (
        <WeeklyBudgetView meals={meals} nutritionTarget={nutritionTarget} />
      )}
    </div>
  )
}
