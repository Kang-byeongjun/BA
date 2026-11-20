import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { buildCheatDayCheck, type CheatDayTone } from '../../lib/cheatDayCheck'
import { formatWeekRange, getDayWeekSeries, weekdayLabel, type DayNutrition } from '../../lib/mealWeekTrend'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, type Meal, type NutrientKey, type NutritionTarget } from '../../types'

interface Props {
  meals: Meal[]
  nutritionTarget: NutritionTarget
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const NUTRIENTS: NutrientKey[] = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber']

const CHEAT_TONE_STYLES: Record<CheatDayTone, string> = {
  good: 'bg-emerald-50 text-emerald-700',
  caution: 'bg-amber-50 text-amber-800',
  neutral: 'bg-slate-50 text-slate-500',
}

function CheatDayBanner({ meals, nutritionTarget }: { meals: Meal[]; nutritionTarget: NutritionTarget }) {
  const check = buildCheatDayCheck(meals, nutritionTarget)
  return <p className={`mb-3 rounded-lg px-2.5 py-2 text-xs font-medium ${CHEAT_TONE_STYLES[check.tone]}`}>{check.headline}</p>
}

// 주간 목표 길이의 TARGET_POS%까지를 "목표 안"으로 쓰고, 나머지는 초과분을 보여줄 여유 공간으로 비워둔다.
const TARGET_POS = 78
// 월 -> 일 순서로 색조 자체를 다르게(같은 색조의 명암 단계로는 요일이 잘 구분되지 않는다는 피드백으로
// 바꿈) — 검증된 8색 카테고리 팔레트의 앞 7개(빨강만 제외)를, 인접 쌍 CVD 대비를 지키는 고정 순서
// 그대로 쓴다. 요일마다 같은 색이 고정되므로(주가 바뀌어도 월=파랑) 매번 다시 익힐 필요가 없다.
const WEEKDAY_COLORS = [
  '#2a78d6', // 월 · blue
  '#eb6834', // 화 · orange
  '#1baf7a', // 수 · aqua
  '#eda100', // 목 · yellow
  '#e87ba4', // 금 · magenta
  '#008300', // 토 · green
  '#6250d6', // 일 · violet
]

function WeekdayLegend({ series }: { series: DayNutrition[] }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {series.map((d, i) => (
        <div key={d.date} className="flex items-center gap-0.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: WEEKDAY_COLORS[i] }} />
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
        <div className="flex h-full gap-x-[2px]">
          {series.map((d, i) => (
            <div
              key={d.date}
              className="h-full shrink-0"
              style={{ width: `${Math.max(0, d[nutrient] * scale)}%`, backgroundColor: WEEKDAY_COLORS[i] }}
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

// 끼니 구분 없이 하루 전체를 더해서, 영양소별로 "그 주 목표 중 얼마나 채웠는지"를 가로 막대 하나로
// 보여준다. 막대 안의 각 구간은 요일(월 -> 일, WEEKDAY_COLORS 순서)이고, 목표(점선)를 넘기면 그
// 초과분만 빨간 구간으로 이어 붙인다. 화살표로 지난 주들을 돌아볼 수 있고, "오늘 치팅해도 되는지"
// 배너는 이번 주를 볼 때만 뜬다(지난 주는 이미 끝난 주라 "오늘" 개념이 없다).
export default function MealWeekTrend({ meals, nutritionTarget }: Props) {
  const [weekOffset, setWeekOffset] = useState(0) // 0 = 이번 주, 1 = 지난 주, ...
  const isCurrentWeek = weekOffset === 0
  const refNow = Date.now() - weekOffset * WEEK_MS
  const series = getDayWeekSeries(meals, refNow)
  const changeWeek = (delta: number) => setWeekOffset((w) => Math.max(0, w - delta))

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => changeWeek(-1)} aria-label="이전 주" className="p-1 text-slate-400">
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-semibold text-slate-800">{formatWeekRange(series[0].date, series[6].date)}</p>
        <button
          onClick={() => changeWeek(1)}
          disabled={isCurrentWeek}
          aria-label="다음 주"
          className="p-1 text-slate-400 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      {isCurrentWeek && <CheatDayBanner meals={meals} nutritionTarget={nutritionTarget} />}
      <WeekdayLegend series={series} />
      {NUTRIENTS.map((n) => (
        <WeeklyBudgetBar key={n} nutrient={n} series={series} target={nutritionTarget[n]} />
      ))}
    </div>
  )
}
