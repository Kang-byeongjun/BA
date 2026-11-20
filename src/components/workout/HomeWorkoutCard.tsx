import { Dumbbell } from 'lucide-react'
import { estimateDayMinutes } from '../../lib/workoutEstimate'
import type { WorkoutCardData } from '../../lib/workoutCardData'
import { useWorkoutCardData } from './useWorkoutCardData'

interface Props {
  /** 테스트·미리보기용. 없으면 앱 데이터(운동 기록·프로필·저장된 루틴)로 만든다 */
  data?: WorkoutCardData
  /** 버튼을 누르면 운동 탭으로 보낸다 */
  onOpenWorkout?: () => void
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const CARD = 'rounded-2xl border border-slate-100 bg-white p-4'
const DARK_BTN = 'mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white'
const LIGHT_BTN = 'mt-4 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700'

// 홈 "오늘의 운동" 카드: 운동 전 / 오늘 완료 / 루틴 없음 세 가지 모습
export default function HomeWorkoutCard(props: Props) {
  return props.data ? <HomeWorkoutCardView data={props.data} onOpenWorkout={props.onOpenWorkout} /> : <HomeWorkoutCardConnected onOpenWorkout={props.onOpenWorkout} />
}

// 앱 데이터(AppProvider 안)를 쓰는 경우
function HomeWorkoutCardConnected({ onOpenWorkout }: Pick<Props, 'onOpenWorkout'>) {
  return <HomeWorkoutCardView data={useWorkoutCardData()} onOpenWorkout={onOpenWorkout} />
}

function HomeWorkoutCardView({ data, onOpenWorkout }: { data: WorkoutCardData } & Pick<Props, 'onOpenWorkout'>) {
  const { summary, routine } = data

  const next = summary.nextRoutine
  const nextDay = next ? routine?.days.find((d) => d.day === next.day) : undefined
  const doneToday = summary.lastWorkout?.daysAgo === 0

  // 루틴이 없으면 운동 탭으로 안내
  if (!next || !nextDay) {
    return (
      <div className={CARD}>
        <p className="text-sm font-semibold text-slate-800">오늘의 운동</p>
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-5 text-center">
          <Dumbbell size={24} className="text-slate-300" />
          <p className="text-xs text-slate-500">운동 탭에서 루틴을 만들어보세요</p>
        </div>
        <button onClick={onOpenWorkout} className={DARK_BTN}>
          운동 탭으로 가기
        </button>
      </div>
    )
  }

  if (doneToday && summary.lastWorkout) {
    const last = summary.lastWorkout
    const minutes = isNum(last.durationSeconds) ? Math.max(1, Math.round(last.durationSeconds / 60)) : null
    const volume = isNum(last.totalVolume) && last.totalVolume > 0 ? Math.round(last.totalVolume * 10) / 10 : null
    const rate = summary.volume.changeRate
    const percent = isNum(rate) ? Math.round(rate * 100) : null
    const parts = [
      minutes !== null ? `${minutes}분` : null,
      volume !== null ? `총 볼륨 ${volume}kg` : null,
      volume !== null && percent !== null ? `지난주보다 ${percent > 0 ? '+' : ''}${percent}%` : null,
    ].filter((p): p is string => p !== null)
    return (
      <div className={CARD}>
        <p className="text-sm font-semibold text-slate-800">오늘의 운동</p>
        <p className="mt-3 text-lg font-bold text-slate-900">오늘 운동 완료 ✓</p>
        {parts.length > 0 && <p className="mt-1 text-sm text-slate-500">{parts.join(' · ')}</p>}
        <button onClick={onOpenWorkout} className={LIGHT_BTN}>
          다음 루틴 미리 보기
        </button>
      </div>
    )
  }

  const names = nextDay.exercises.map((e) => e.name).filter((n) => typeof n === 'string' && n.length > 0)
  const shown = names.slice(0, 3)
  const rest = names.length - shown.length
  const minutes = estimateDayMinutes(nextDay.exercises)
  return (
    <div className={CARD}>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-slate-800">오늘의 운동</p>
        <span className="text-xs text-slate-500">
          {next.day}일차{next.label ? ` · ${next.label}` : ''}
        </span>
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900">
        {nextDay.exercises.length}종목{minutes > 0 ? ` · 약 ${minutes}분` : ''}
      </p>
      {shown.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          {shown.join(' · ')}
          {rest > 0 ? ` 외 ${rest}` : ''}
        </p>
      )}
      <button onClick={onOpenWorkout} className={DARK_BTN}>
        운동 시작하기
      </button>
    </div>
  )
}
