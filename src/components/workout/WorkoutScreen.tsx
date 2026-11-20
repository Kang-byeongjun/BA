import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../lib/id'
import { appendWorkoutHistory, type WorkoutSessionRecord } from '../../lib/workoutHistory'
import type { WorkoutType } from '../../types'
import WorkoutComplete from './WorkoutComplete'
import RoutineSection from './RoutineSection'
import WorkoutLogger from './WorkoutLogger'
import WorkoutSummary from './WorkoutSummary'
import WorkoutTypeSelect from './WorkoutTypeSelect'
import { clearWorkoutLog, createWorkoutLog, loadWorkoutLog, saveWorkoutLog, type SavedWorkoutLog } from './workoutLogStorage'
import WorkoutTimerView from './WorkoutTimerView'

// '헬스'는 세트 단위로 기록하는 WorkoutLogger(추천 루틴/직접 종목 추가)를 쓰고, 러닝·걷기·
// 자전거 같은 유산소·기타 활동은 시간만 재는 WorkoutTypeSelect+스톱워치를 쓴다.

interface Props {
  /** 기록 화면이 열리고 닫힐 때 알려준다(App이 하단 메뉴를 숨기는 데 쓴다) */
  onLoggingChange?: (logging: boolean) => void
}

export default function WorkoutScreen({ onLoggingChange }: Props) {
  const { activeWorkout, pendingWorkout, workoutProfile, dispatch } = useApp()
  // 저장된 기록이 있으면(새로고침 등) 그대로 이어서 연다.
  const [session, setSession] = useState<SavedWorkoutLog | null>(loadWorkoutLog)
  const [startingCardio, setStartingCardio] = useState(false)
  const [cardioType, setCardioType] = useState<WorkoutType>('러닝')

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

      {/* "추천 루틴 없이 직접 종목 골라서 운동 시작" 버튼은 화면에서 숨김(나중에 복구 가능):
          createWorkoutLog({ day: 0, label: '자유 운동', exercises: [] }, Date.now()) → saveWorkoutLog → setSession */}

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
      ) : startingCardio ? (
        <div className="space-y-3">
          <button
            onClick={() => setStartingCardio(false)}
            className="-ml-2 flex items-center gap-1 rounded-full p-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft size={18} /> 뒤로
          </button>
          <WorkoutTypeSelect
            value={cardioType}
            onChange={setCardioType}
            onStart={() => {
              dispatch({ type: 'START_WORKOUT', workoutType: cardioType })
              setStartingCardio(false)
            }}
          />
        </div>
      ) : null /* "유산소 운동 시작" 버튼은 숨김: 복구하려면 여기서 setStartingCardio(true) 버튼을 다시 렌더 */}
    </div>
  )
}
