import { useCallback, useState } from 'react'
import BottomNav, { type Tab } from './components/layout/BottomNav'
import MobileShell from './components/layout/MobileShell'
import Dashboard from './components/dashboard/Dashboard'
import FoodCaptureFlow from './components/food/FoodCaptureFlow'
import MealHistory from './components/meals/MealHistory'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import Profile from './components/profile/Profile'
import WorkoutScreen from './components/workout/WorkoutScreen'
import { AppProvider, useApp } from './context/AppContext'
import type { Meal, MealSlot } from './types'

function MainApp() {
  const [tab, setTab] = useState<Tab>('home')
  // null = 카메라 닫힘. 그 외에는 열려 있고, undefined는 "어느 칸인지 모름"(시간 기준 추정)을 뜻한다.
  const [cameraSlot, setCameraSlot] = useState<MealSlot | undefined | null>(null)
  const [recentMeal, setRecentMeal] = useState<Meal | null>(null)
  const dismissRecentMeal = useCallback(() => setRecentMeal(null), [])

  if (cameraSlot !== null) {
    return (
      <MobileShell>
        <FoodCaptureFlow
          initialSlot={cameraSlot}
          onDone={(saved) => {
            setCameraSlot(null)
            // 기록을 저장했다면 홈으로 이동해 갱신된 Progress Bar/피드백/다음 식사 추천을 바로 보여준다.
            if (saved) {
              setRecentMeal(saved)
              setTab('home')
            }
          }}
        />
      </MobileShell>
    )
  }

  return (
    <MobileShell
      footer={<BottomNav active={tab} onChange={setTab} onCamera={() => setCameraSlot(undefined)} />}
    >
      {tab === 'home' && (
        <Dashboard onOpenCamera={(slot) => setCameraSlot(slot)} recentMeal={recentMeal} onDismissRecentMeal={dismissRecentMeal} />
      )}
      {tab === 'meals' && <MealHistory />}
      {tab === 'workout' && <WorkoutScreen />}
      {tab === 'profile' && <Profile />}
    </MobileShell>
  )
}

function Root() {
  const { onboarded } = useApp()

  if (!onboarded) {
    return (
      <MobileShell>
        <OnboardingFlow />
      </MobileShell>
    )
  }

  return <MainApp />
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  )
}
