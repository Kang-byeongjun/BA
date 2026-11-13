import { Bell, Camera, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import MealDetailModal from '../meals/MealDetailModal'
import { getDayStatus } from '../../lib/calendar'
import { buildHomeGreeting } from '../../lib/greeting'
import { getRecommendedMeals, getStreakDays, sumMeals } from '../../lib/nutrition'
import { getHomeNudge } from '../../lib/nudge'
import { isSameDay } from '../../lib/time'
import { getTodayWaterTotal } from '../../lib/water'
import { DEFAULT_WATER_TARGET_ML, type Meal, type MealSlot } from '../../types'
import CalorieSummary from './CalorieSummary'
import HomeCoach from './HomeCoach'
import TodayMealsSection from './TodayMealsSection'
import UpdatesPanel from './UpdatesPanel'
import WaterTracker from './WaterTracker'

interface Props {
  // slot을 넘기면 그 칸으로 바로 기록된다(아침 칸의 "+추가"를 눌렀는데 지금 시간이 밤이라
  // 간식으로 저장되는 걸 막기 위함). 하단 촬영 버튼처럼 어느 칸인지 모를 때는 생략한다.
  onOpenCamera: (slot?: MealSlot) => void
  // 방금 기록한 식사 (기록 직후 얼마나 더해졌는지 보여준다)
  recentMeal: Meal | null
  onDismissRecentMeal: () => void
}

export default function Dashboard({ onOpenCamera, recentMeal, onDismissRecentMeal }: Props) {
  const { meals, waterLogs, nutritionTarget, profile, dispatch } = useApp()
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [updatesPanelOpen, setUpdatesPanelOpen] = useState(false)

  useEffect(() => {
    if (!recentMeal) return
    const timer = setTimeout(onDismissRecentMeal, 12000)
    return () => clearTimeout(timer)
  }, [recentMeal, onDismissRecentMeal])

  const todayMeals = useMemo(() => meals.filter((m) => isSameDay(m.timestamp, Date.now())), [meals])
  const consumed = useMemo(() => sumMeals(todayMeals), [todayMeals])
  const streakDays = useMemo(() => getStreakDays(meals), [meals])
  const eatenTodayFoodNames = useMemo(() => todayMeals.flatMap((m) => m.foods.map((f) => f.name)), [todayMeals])

  const todayWaterLogs = useMemo(() => waterLogs.filter((w) => isSameDay(w.timestamp, Date.now())), [waterLogs])
  const todayWaterTotal = useMemo(() => getTodayWaterTotal(waterLogs), [waterLogs])

  if (!nutritionTarget) return null

  // 체지방률 기반 추천 우선순위 보정에 쓰는 최소 정보. profile이 없을 상황은 실질적으로 없지만
  // (데모/온보딩 완료 후에만 대시보드가 보임) 타입 안전을 위해 중립값으로 대체한다.
  const recommendationProfile = profile
    ? { goal: profile.goal, gender: profile.gender, bodyFatPercentage: profile.bodyFatPercentage }
    : { goal: 'health_care' as const, gender: 'male' as const, bodyFatPercentage: null }
  // 추천 상세(RecommendationCard)는 식단 탭으로 옮겼지만, 1순위 추천의 코치 문구(HomeCoach)는
  // 홈에서 계속 보여주므로 recommendations 계산 자체는 여기 남아있어야 한다.
  const recommendations = getRecommendedMeals(consumed, nutritionTarget, recommendationProfile, eatenTodayFoodNames)
  const greeting = buildHomeGreeting({
    streakDays,
    hasLoggedToday: todayMeals.length > 0,
    yesterdayStatus: getDayStatus(meals, nutritionTarget, Date.now() - 86_400_000),
    hour: new Date().getHours(),
  })
  const nudge = getHomeNudge({
    hour: new Date().getHours(),
    loggedSlots: new Set(todayMeals.map((m) => m.slot)),
    waterMl: todayWaterTotal,
    waterTargetMl: DEFAULT_WATER_TARGET_ML,
  })

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-400">
          안녕하세요{profile ? ',' : ''} {greeting}
        </p>
        <button
          onClick={() => setUpdatesPanelOpen(true)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          <Sparkles size={12} />
          업데이트 노트
        </button>
      </div>

      {recentMeal && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-sm">
            <p className="font-semibold text-emerald-800">방금 기록했어요 · {recentMeal.title}</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              +{recentMeal.calories}kcal · 단백질 +{recentMeal.protein}g · 탄수화물 +{recentMeal.carbohydrates}g · 지방 +
              {recentMeal.fat}g · 식이섬유 +{recentMeal.fiber}g
            </p>
          </div>
          <button onClick={onDismissRecentMeal} aria-label="닫기" className="shrink-0 text-emerald-600">
            <X size={16} />
          </button>
        </div>
      )}

      {nudge && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Bell size={16} className="mt-0.5 shrink-0 text-sky-600" />
            <p className="text-sm text-sky-800">{nudge.message}</p>
          </div>
          <button
            onClick={() => (nudge.action === 'log-dinner' ? onOpenCamera('저녁') : dispatch({ type: 'ADD_WATER', amount: 200 }))}
            className="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {nudge.action === 'log-dinner' ? '기록하기' : '한 잔 추가'}
          </button>
        </div>
      )}

      {recommendations[0] && <HomeCoach meal={recommendations[0]} goal={recommendationProfile.goal} />}

      <CalorieSummary consumed={consumed.calories} target={nutritionTarget.calories} streakDays={streakDays} />

      <WaterTracker
        consumedMl={todayWaterTotal}
        targetMl={DEFAULT_WATER_TARGET_ML}
        onAdd={(amount) => dispatch({ type: 'ADD_WATER', amount })}
        onUndo={() => {
          const last = todayWaterLogs[0]
          if (last) dispatch({ type: 'DELETE_WATER', id: last.id })
        }}
        canUndo={todayWaterLogs.length > 0}
      />

      <button
        onClick={() => onOpenCamera()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-semibold text-white shadow-lg shadow-slate-300 active:scale-[0.98]"
      >
        <Camera size={20} />
        음식 촬영하고 기록하기
      </button>

      <TodayMealsSection meals={todayMeals} onSelect={setSelectedMeal} onAdd={onOpenCamera} />

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onDelete={(id) => {
            dispatch({ type: 'DELETE_MEAL', id })
            setSelectedMeal(null)
          }}
        />
      )}

      {updatesPanelOpen && <UpdatesPanel onClose={() => setUpdatesPanelOpen(false)} />}
    </div>
  )
}
