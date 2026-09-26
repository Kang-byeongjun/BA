import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { WorkoutType } from '../../types'
import WorkoutComplete from './WorkoutComplete'
import WorkoutHistory from './WorkoutHistory'
import WorkoutTimerView from './WorkoutTimerView'
import WorkoutTypeSelect from './WorkoutTypeSelect'

export default function WorkoutScreen() {
  const { activeWorkout, pendingWorkout, dispatch } = useApp()
  const [selectedType, setSelectedType] = useState<WorkoutType>('헬스')

  return (
    <div className="space-y-5 px-4 pb-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">오늘의 운동</h1>

      {pendingWorkout ? (
        <WorkoutComplete
          workout={pendingWorkout}
          onSave={() => dispatch({ type: 'SAVE_PENDING_WORKOUT' })}
          onDiscard={() => dispatch({ type: 'DISCARD_PENDING_WORKOUT' })}
        />
      ) : activeWorkout ? (
        <WorkoutTimerView
          session={activeWorkout}
          onPause={() => dispatch({ type: 'PAUSE_WORKOUT' })}
          onResume={() => dispatch({ type: 'RESUME_WORKOUT' })}
          onFinish={() => dispatch({ type: 'FINISH_WORKOUT' })}
        />
      ) : (
        <WorkoutTypeSelect
          value={selectedType}
          onChange={setSelectedType}
          onStart={() => dispatch({ type: 'START_WORKOUT', workoutType: selectedType })}
        />
      )}

      {!pendingWorkout && !activeWorkout && <WorkoutHistory />}
    </div>
  )
}
