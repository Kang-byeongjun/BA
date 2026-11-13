import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../lib/id'
import { appendWorkoutHistory, type WorkoutSessionRecord } from '../../lib/workoutHistory'
import WorkoutComplete from './WorkoutComplete'
import RoutineSection from './RoutineSection'
import WorkoutHistory from './WorkoutHistory'
import WorkoutLogger from './WorkoutLogger'
import WorkoutSummary from './WorkoutSummary'
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

  const closeSession = () => {
    clearWorkoutLog()
    setSession(null)
  }

  // "운동 완료" → ① 세트 상세를 우리 전용 기록에 ② 팀원 앱 "최근 운동 기록"에 '헬스'로 ③ 요약 화면
  const finishSession = (record: WorkoutSessionRecord) => {
    if (!session) return
    appendWorkoutHistory(record)
    dispatch({
      type: 'ADD_WORKOUT',
      workout: {
        id: generateId('workout'),
        type: '헬스',
        startTime: record.startedAt,
        endTime: record.date,
        duration: record.durationSeconds, // 기록 화면의 운동 시간
      },
    })
    // 요약 화면에서 새로고침해도 다시 저장되지 않도록 "저장 완료" 표시를 남긴다("확인"을 누르면 지움)
    const done: SavedWorkoutLog = { ...session, completed: record }
    saveWorkoutLog(done)
    setSession(done)
  }

  if (session?.completed) {
    return <WorkoutSummary record={session.completed} onConfirm={closeSession} />
  }

  if (session) {
    return <WorkoutLogger key={session.startedAt} initial={session} onExit={closeSession} onFinish={finishSession} />
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
