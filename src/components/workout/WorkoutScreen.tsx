import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import WorkoutComplete from './WorkoutComplete'
import RoutineSection from './RoutineSection'
import WorkoutHistory from './WorkoutHistory'
import WorkoutLogger from './WorkoutLogger'
import { clearWorkoutLog, createWorkoutLog, loadWorkoutLog, saveWorkoutLog, type SavedWorkoutLog } from './workoutLogStorage'
import WorkoutTimerView from './WorkoutTimerView'

// 운동 종류는 화면에서 고르지 않고 항상 '헬스'로 본다.
// (WorkoutType 타입과 기존 기록 데이터는 그대로 둔다. 종류 선택·스톱워치 시작 화면만 숨김)

interface Props {
  /** 기록 화면이 열리고 닫힐 때 알려준다(App이 하단 메뉴를 숨기는 데 쓴다) */
  onLoggingChange?: (logging: boolean) => void
}

export default function WorkoutScreen({ onLoggingChange }: Props) {
  const { activeWorkout, pendingWorkout, workoutProfile, dispatch } = useApp()
  // 저장된 기록이 있으면(새로고침 등) 그대로 이어서 연다.
  const [session, setSession] = useState<SavedWorkoutLog | null>(loadWorkoutLog)

  const logging = session !== null
  useEffect(() => {
    onLoggingChange?.(logging)
  }, [logging, onLoggingChange])

  if (session) {
    return (
      <WorkoutLogger
        key={session.startedAt}
        initial={session}
        onExit={() => {
          clearWorkoutLog()
          setSession(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-5 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">오늘의 운동</h1>

      <RoutineSection
        profile={workoutProfile}
        onStart={(day) => {
          const created = createWorkoutLog(day, Date.now())
          saveWorkoutLog(created)
          setSession(created)
        }}
      />

      {/* 예전 버전에서 시작해 둔 스톱워치 세션이 남아 있을 때만 마무리할 수 있게 보여준다 */}
      {pendingWorkout ? (
        <WorkoutComplete
          workout={pendingWorkout}
          onSave={() => dispatch({ type: 'SAVE_PENDING_WORKOUT' })}
          onDiscard={() => dispatch({ type: 'DISCARD_PENDING_WORKOUT' })}
        />
      ) : (
        activeWorkout && (
          <WorkoutTimerView
            session={activeWorkout}
            onPause={() => dispatch({ type: 'PAUSE_WORKOUT' })}
            onResume={() => dispatch({ type: 'RESUME_WORKOUT' })}
            onFinish={() => dispatch({ type: 'FINISH_WORKOUT' })}
          />
        )
      )}

      {!pendingWorkout && !activeWorkout && <WorkoutHistory />}
    </div>
  )
}
