import { buildCheatDayCheck, type CheatDayTone } from '../../lib/cheatDayCheck'
import { getDayWeekSeries, weekdayLabel, type DayNutrition } from '../../lib/mealWeekTrend'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, type Meal, type NutrientKey, type NutritionTarget } from '../../types'

interface Props {
  meals: Meal[]
  nutritionTarget: NutritionTarget
}

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
// 월 -> 일 순서로, 같은 색조를 진하게.
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
// 막대 안의 각 구간은 요일(월 -> 일, 점점 진해짐)이고, 목표(점선)를 넘기면 그 초과분만 빨간 구간으로 이어
// 붙인다. 맨 위 배너는 "오늘 치팅해도 되는지"를 지금까지 쌓인 칼로리 여유/부족으로 바로 알려준다.
export default function MealWeekTrend({ meals, nutritionTarget }: Props) {
  const series = getDayWeekSeries(meals)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">이번 주 영양소 합계</h2>
      <CheatDayBanner meals={meals} nutritionTarget={nutritionTarget} />
      <WeekdayLegend series={series} />
      {NUTRIENTS.map((n) => (
        <WeeklyBudgetBar key={n} nutrient={n} series={series} target={nutritionTarget[n]} />
      ))}
    </div>
  )
}
