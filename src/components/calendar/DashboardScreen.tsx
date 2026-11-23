import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getWeekNutritionSummaryLine } from '../../lib/dashboardSummaries'
import { loadFromStorage, saveToStorage } from '../../lib/storage'
import CollapsibleCard from '../dashboard/CollapsibleCard'
import WeekGlanceCard from '../dashboard/WeekGlanceCard'
import InBodyTrend from '../profile/InBodyTrend'
import DashboardWorkoutSection from '../workout/DashboardWorkoutSection'
import InBodyResult from '../profile/InBodyResult'
import DashboardPreviewModal from './DashboardPreviewModal'
import DietInBodyInsightCard from './DietInBodyInsightCard'
import MealWeekTrend from './MealWeekTrend'
import ReportTabs, { type ReportTab } from './ReportTabs'

const PREVIEW_SEEN_KEY = 'dashboardPreviewSeen'

function NoInBodyRecord() {
  return (
    <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-sm text-slate-500">
      아직 측정 기록이 없어요. 마이 탭에서 결과지를 올려주세요.
    </p>
  )
}

export default function DashboardScreen() {
  const { meals, nutritionTarget, inBodyHistory } = useApp()
  // 처음 이 탭에 왔을 때만 "이렇게 채워져요" 예시를 한 번 보여준다.
  const [previewOpen, setPreviewOpen] = useState(() => !loadFromStorage(PREVIEW_SEEN_KEY, false))

  const closePreview = () => {
    saveToStorage(PREVIEW_SEEN_KEY, true)
    setPreviewOpen(false)
  }

  // 선택된 칸은 화면 안 상태로만 둔다(저장 안 함). 처음엔 "이번 주".
  const [tab, setTab] = useState<ReportTab>('week')

  const weekSummary = nutritionTarget ? getWeekNutritionSummaryLine(meals, nutritionTarget) : null
  const hasInBody = inBodyHistory.length > 0

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">리포트</h1>
      <ReportTabs value={tab} onChange={setTab} />

      {/* key가 바뀌면 칸이 새로 그려지면서 0.2초 동안 부드럽게 나타난다 */}
      <div key={tab} role="tabpanel" id={`report-panel-${tab}`} aria-labelledby={`report-tab-${tab}`} className="tab-fade space-y-4">
        {tab === 'week' && (
          <>
            <WeekGlanceCard meals={meals} target={nutritionTarget} history={inBodyHistory} />
            <DashboardWorkoutSection />
            {nutritionTarget && <DietInBodyInsightCard history={inBodyHistory} meals={meals} target={nutritionTarget} />}
            {nutritionTarget && weekSummary && (
              <CollapsibleCard title="주간 영양소" summary={weekSummary}>
                <MealWeekTrend meals={meals} nutritionTarget={nutritionTarget} />
              </CollapsibleCard>
            )}
          </>
        )}
        {tab === 'inbody' &&
          (hasInBody ? <InBodyResult history={inBodyHistory} /> : <NoInBodyRecord />)}
        {tab === 'trend' && (hasInBody ? <InBodyTrend history={inBodyHistory} /> : <NoInBodyRecord />)}
      </div>

      {previewOpen && <DashboardPreviewModal onClose={closePreview} />}
    </div>
  )
}
