import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { buildIntervalReport } from '../../lib/intervalReport'
import { intervalKey } from '../../lib/todoChecks'
import { buildFeedbackView, recordNotice } from '../../lib/trendView'
import { loadWorkoutHistory } from '../../lib/workoutHistory'
import TrendFeedbackCard from './TrendFeedbackCard'
import { TrendEvidence, TrendHistory } from './TrendFolds'
import TrendResultCard from './TrendResultCard'
import TrendTodoCard from './TrendTodoCard'

// 리포트 "변화 추이": 결과 → 피드백(식단·운동) → 할 일 → 접힌 근거·지난 결과. 숫자와 문장은 모두 코드가 만든다(AI 호출 없음).
export default function TrendReport() {
  const { meals, nutritionTarget, inBodyHistory, workouts, workoutProfile, profile } = useApp()
  const report = useMemo(
    () =>
      buildIntervalReport({
        goal: workoutProfile?.goal,
        dietGoal: profile?.goal,
        inBodyHistory,
        meals,
        target: nutritionTarget,
        workoutHistory: loadWorkoutHistory(),
        workouts,
        profile,
      }),
    [workoutProfile?.goal, profile, inBodyHistory, meals, nutritionTarget, workouts],
  )

  const [latest, ...past] = report.intervals
  if (!latest) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-sm text-slate-500">
        인바디를 2주 간격으로 두 번 재면 분석해 드려요
      </p>
    )
  }

  const views = latest.feedback.map((f) => buildFeedbackView(latest, f, nutritionTarget))
  const notice = recordNotice(latest)
  const noticeLine = notice && <p className="px-1 text-sm text-slate-500">{notice}</p>
  const todos = latest.feedback.map((f) => ({ id: f.pattern.id, text: f.pattern.todo.text }))
  const key = intervalKey(latest.period.to)

  return (
    <div className="space-y-3">
      <TrendResultCard series={report.series} latest={latest} previous={past[0]} />
      {/* 식단 기록이 모자라면 식단 카드 자리(맨 위)에, 운동 기록이 모자라면 운동 카드 자리(맨 아래)에 한 줄 */}
      {!latest.diet.sufficient && noticeLine}
      {views.map((v) => (
        <TrendFeedbackCard key={v.id} view={v} />
      ))}
      {latest.diet.sufficient && noticeLine}
      {todos.length > 0 && <TrendTodoCard key={key} storageKey={key} todos={todos} />}
      <TrendEvidence latest={latest} />
      <TrendHistory intervals={past} target={nutritionTarget} />
    </div>
  )
}
