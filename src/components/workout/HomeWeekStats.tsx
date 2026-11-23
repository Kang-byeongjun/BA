import { Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import AnimatedBar from '../dashboard/AnimatedBar'
import type { WorkoutCardData } from '../../lib/workoutCardData'
import { useWorkoutCardData } from './useWorkoutCardData'

interface Props {
  /** 테스트·미리보기용. 없으면 앱 데이터로 만든다 */
  data?: WorkoutCardData
  /** 식단 목표 칸(다음 단계에서 연결). 넘기면 세 번째 칸으로 보인다 */
  dietSlot?: ReactNode
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const CELL = 'rounded-xl border border-slate-100 bg-white px-3 py-3'

// 홈 요약 칸: 이번 주 운동 횟수(진행 막대) · 연속 운동일 · (식단 목표 자리)
export default function HomeWeekStats(props: Props) {
  return props.data ? <HomeWeekStatsView data={props.data} dietSlot={props.dietSlot} /> : <HomeWeekStatsConnected dietSlot={props.dietSlot} />
}

// 앱 데이터(AppProvider 안)를 쓰는 경우
function HomeWeekStatsConnected({ dietSlot }: Pick<Props, 'dietSlot'>) {
  return <HomeWeekStatsView data={useWorkoutCardData()} dietSlot={dietSlot} />
}

function HomeWeekStatsView({ data, dietSlot }: { data: WorkoutCardData } & Pick<Props, 'dietSlot'>) {
  const { summary } = data
  const { week } = summary
  const count = isNum(week.count) ? week.count : 0
  const goal = isNum(week.goal) && week.goal > 0 ? week.goal : null
  const streak = isNum(summary.streakDays) ? summary.streakDays : 0

  return (
    <div className={`grid gap-2 ${dietSlot ? 'grid-cols-3' : 'grid-cols-2'}`}>
      <div className={CELL}>
        <p className="text-xs text-slate-500">이번 주 운동</p>
        <p className="mt-1 text-sm text-slate-500">
          <span className="text-lg font-bold text-slate-900">{count}</span>
          {goal !== null ? ` / ${goal}회` : '회'}
        </p>
        {goal !== null && (
          <div className="mt-2">
            <AnimatedBar
              id="home-week-progress"
              width={Math.min(100, (count / goal) * 100)}
              trackClass="bg-slate-100"
              fillClass={count >= goal ? 'bg-emerald-500' : 'bg-primary'}
              heightClass="h-1.5"
            />
          </div>
        )}
      </div>
      <div className={CELL}>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Flame size={12} />
          연속 운동
        </p>
        <p className="mt-1 text-sm text-slate-500">
          <span className="text-lg font-bold text-slate-900">{streak}</span>일
        </p>
      </div>
      {dietSlot}
    </div>
  )
}
