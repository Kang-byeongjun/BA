import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { buildWorkoutCardData, type WorkoutCardData } from '../../lib/workoutCardData'
import { loadWorkoutHistory } from '../../lib/workoutHistory'
import { getCachedWorkoutRoutine } from '../../services/workoutService'

/** WorkoutSummaryCard와 같은 방식으로 요약 데이터를 만든다 */
export function useWorkoutCardData(): WorkoutCardData {
  const { workouts, workoutProfile } = useApp()
  const [now] = useState(() => Date.now())
  return useMemo(
    () =>
      buildWorkoutCardData(
        {
          history: loadWorkoutHistory(),
          workouts,
          profile: workoutProfile,
          routine: workoutProfile ? getCachedWorkoutRoutine(workoutProfile)?.result : null,
        },
        now,
      ),
    [workouts, workoutProfile, now],
  )
}
