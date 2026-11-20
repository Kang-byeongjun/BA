import { ArrowDown, ArrowUp, Dumbbell, Minus } from 'lucide-react'
import AnimatedBar from '../dashboard/AnimatedBar'
import { formatDurationKorean, formatRelativeDate } from '../../lib/time'
import { getBalanceAdvice } from '../../lib/workoutBalance'
import type { WorkoutCardData } from '../../lib/workoutCardData'
import { useWorkoutCardData } from './useWorkoutCardData'

interface Props {
  /** 테스트·미리보기용. 없으면 앱 데이터로 만든다 */
  data?: WorkoutCardData
}

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일']
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function Change({ rate }: { rate: number | null }) {
  if (!isNum(rate)) return <span className="text-xs text-slate-300">지난주 기록 없음</span>
  const percent = Math.round(rate * 100)
  if (percent === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-slate-400">
        <Minus size={12} />
        변화 없음
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-600">
      {percent > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {percent > 0 ? '+' : ''}
      {percent}%
    </span>
  )
}

// 대시보드 운동 섹션: 요일 점 · 주간 볼륨 · 부위별 볼륨 + 균형 안내 · 최근 기록 3개
export default function DashboardWorkoutSection({ data }: Props) {
  return data ? <DashboardWorkoutSectionView data={data} /> : <DashboardWorkoutSectionConnected />
}

// 앱 데이터(AppProvider 안)를 쓰는 경우
function DashboardWorkoutSectionConnected() {
  return <DashboardWorkoutSectionView data={useWorkoutCardData()} />
}

function DashboardWorkoutSectionView({ data }: { data: WorkoutCardData }) {
  const { summary, weekDots } = data

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">운동</p>

      {summary.recent.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-6 text-center">
          <Dumbbell size={24} className="text-slate-300" />
          <p className="text-xs text-slate-400">아직 운동 기록이 없어요. 운동 탭에서 시작해보세요.</p>
        </div>
      ) : (
        <WithRecords summary={summary} weekDots={weekDots} />
      )}
    </div>
  )
}

function WithRecords({ summary, weekDots }: Pick<WorkoutCardData, 'summary' | 'weekDots'>) {
  const advice = getBalanceAdvice(summary.muscleVolumes)
  const maxMuscle = summary.muscleVolumes[0]?.volume ?? 0
  const noWorkoutThisWeek = summary.week.count === 0
  const thisWeekVolume = isNum(summary.volume.thisWeek) ? summary.volume.thisWeek : 0

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">이번 주 운동한 요일</p>
        <div className="flex justify-between">
          {DAY_NAMES.map((name, i) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <span
                data-testid={`week-dot-${i}`}
                data-done={weekDots[i] ? 'true' : 'false'}
                className={`h-3 w-3 rounded-full ${weekDots[i] ? 'bg-slate-900' : 'bg-slate-200'}`}
              />
              <span className="text-xs text-slate-400">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">주간 볼륨(헬스)</p>
        {noWorkoutThisWeek ? (
          <p className="mt-0.5 text-sm font-medium text-slate-600">이번 주 첫 운동을 시작해보세요</p>
        ) : (
          <div className="mt-0.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-800">{thisWeekVolume}kg</span>
            <Change rate={summary.volume.changeRate} />
          </div>
        )}
      </div>

      {summary.muscleVolumes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">이번 주 부위별 볼륨</p>
          <div className="space-y-2">
            {summary.muscleVolumes.map((m) => (
              <div key={m.group}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="text-slate-600">{m.label}</span>
                  <span className="text-slate-400">{m.volume}kg</span>
                </div>
                <AnimatedBar
                  id={`dash-muscle-${m.group}`}
                  width={maxMuscle > 0 ? (m.volume / maxMuscle) * 100 : 0}
                  trackClass="bg-slate-100"
                  fillClass="bg-slate-400"
                  heightClass="h-1.5"
                />
              </div>
            ))}
          </div>
          {advice && <p className="mt-2 text-xs font-medium text-amber-600">{advice}</p>}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">최근 기록</p>
        <div className="space-y-1.5">
          {summary.recent.slice(0, 3).map((s) => (
            <div key={`${s.startTime}-${s.endTime}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <div>
                <span className="font-medium text-slate-700">{formatRelativeDate(s.startTime)}</span>
                <span className="ml-2 text-slate-400">
                  {s.type}
                  {s.label ? ` · ${s.label}` : ''}
                </span>
              </div>
              <span className="text-slate-500">
                {formatDurationKorean(s.durationSeconds)}
                {isNum(s.totalVolume) ? ` · ${Math.round(s.totalVolume * 10) / 10}kg` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
