import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import WorkoutComplete from './WorkoutComplete'
import RoutineSection from './RoutineSection'
import WorkoutHistory from './WorkoutHistory'
import WorkoutLogger, { type LoggerDay } from './WorkoutLogger'
import WorkoutTimerView from './WorkoutTimerView'

// 운동 종류는 화면에서 고르지 않고 항상 '헬스'로 본다.
// (WorkoutType 타입과 기존 기록 데이터는 그대로 둔다. 종류 선택·스톱워치 시작 화면만 숨김)

export default function WorkoutScreen() {
  const { activeWorkout, pendingWorkout, workoutProfile, dispatch } = useApp()
  const [logging, setLogging] = useState<LoggerDay | null>(null)

  if (logging) {
    return <WorkoutLogger day={logging} onExit={() => setLogging(null)} />
  }

  return (
    <div className="space-y-5 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">오늘의 운동</h1>

      <RoutineSection profile={workoutProfile} onStart={setLogging} />

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
