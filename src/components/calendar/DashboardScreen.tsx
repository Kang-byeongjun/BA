import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { loadFromStorage, saveToStorage } from '../../lib/storage'
import InBodyTrend from '../profile/InBodyTrend'
import DashboardPreviewModal from './DashboardPreviewModal'
import DietInBodyInsightCard from './DietInBodyInsightCard'
import NutritionCalendar from './NutritionCalendar'

const PREVIEW_SEEN_KEY = 'dashboardPreviewSeen'

export default function DashboardScreen() {
  const { meals, nutritionTarget, inBodyHistory } = useApp()
  // 처음 이 탭에 왔을 때만 "이렇게 채워져요" 예시를 한 번 보여준다.
  const [previewOpen, setPreviewOpen] = useState(() => !loadFromStorage(PREVIEW_SEEN_KEY, false))

  const closePreview = () => {
    saveToStorage(PREVIEW_SEEN_KEY, true)
    setPreviewOpen(false)
  }

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">대시보드</h1>

      <InBodyTrend history={inBodyHistory} />
      {nutritionTarget && <DietInBodyInsightCard history={inBodyHistory} meals={meals} target={nutritionTarget} />}

      <NutritionCalendar />

      {previewOpen && <DashboardPreviewModal onClose={closePreview} />}
    </div>
  )
}
