import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getInBodySummaryLine, getWeekNutritionSummaryLine } from '../../lib/dashboardSummaries'
import { loadFromStorage, saveToStorage } from '../../lib/storage'
import CollapsibleCard from '../dashboard/CollapsibleCard'
import WeekGlanceCard from '../dashboard/WeekGlanceCard'
import InBodyTrend from '../profile/InBodyTrend'
import DashboardWorkoutSection from '../workout/DashboardWorkoutSection'
import DashboardPreviewModal from './DashboardPreviewModal'
import DietInBodyInsightCard from './DietInBodyInsightCard'
import MealWeekTrend from './MealWeekTrend'

const PREVIEW_SEEN_KEY = 'dashboardPreviewSeen'

export default function DashboardScreen() {
  const { meals, nutritionTarget, inBodyHistory } = useApp()
  // 처음 이 탭에 왔을 때만 "이렇게 채워져요" 예시를 한 번 보여준다.
  const [previewOpen, setPreviewOpen] = useState(() => !loadFromStorage(PREVIEW_SEEN_KEY, false))

  const closePreview = () => {
    saveToStorage(PREVIEW_SEEN_KEY, true)
    setPreviewOpen(false)
  }

  const weekSummary = nutritionTarget ? getWeekNutritionSummaryLine(meals, nutritionTarget) : null
  const inBodySummary = getInBodySummaryLine(inBodyHistory)

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">대시보드</h1>

      <WeekGlanceCard meals={meals} target={nutritionTarget} history={inBodyHistory} />
      <DashboardWorkoutSection />
      {nutritionTarget && <DietInBodyInsightCard history={inBodyHistory} meals={meals} target={nutritionTarget} />}
      {nutritionTarget && weekSummary && (
        <CollapsibleCard title="주간 영양소" summary={weekSummary}>
          <MealWeekTrend meals={meals} nutritionTarget={nutritionTarget} />
        </CollapsibleCard>
      )}
      {inBodySummary ? (
        <CollapsibleCard title="인바디 추이" summary={inBodySummary}>
          <InBodyTrend history={inBodyHistory} />
        </CollapsibleCard>
      ) : (
        <InBodyTrend history={inBodyHistory} />
      )}

      {previewOpen && <DashboardPreviewModal onClose={closePreview} />}
    </div>
  )
}
