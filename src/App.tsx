import { useState } from 'react'
import BottomNav, { type Tab } from './components/layout/BottomNav'
import MobileShell from './components/layout/MobileShell'
import Dashboard from './components/dashboard/Dashboard'
import FoodCaptureFlow from './components/food/FoodCaptureFlow'
import MealHistory from './components/meals/MealHistory'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import Profile from './components/profile/Profile'
import WorkoutScreen from './components/workout/WorkoutScreen'
import { AppProvider, useApp } from './context/AppContext'

function MainApp() {
  const [tab, setTab] = useState<Tab>('home')
  const [cameraOpen, setCameraOpen] = useState(false)

  if (cameraOpen) {
    return (
      <MobileShell>
        <FoodCaptureFlow
          onDone={(saved) => {
            setCameraOpen(false)
            // 기록을 저장했다면 홈으로 이동해 갱신된 Progress Bar/피드백/다음 식사 추천을 바로 보여준다.
            if (saved) setTab('home')
          }}
        />
      </MobileShell>
    )
  }

  return (
    <MobileShell
      footer={<BottomNav active={tab} onChange={setTab} onCamera={() => setCameraOpen(true)} />}
    >
      {tab === 'home' && <Dashboard onOpenCamera={() => setCameraOpen(true)} />}
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
