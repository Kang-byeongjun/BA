import type { NutritionTarget } from '../../types'
import type { Change, IntervalAnalysis } from '../../lib/intervalReport'
import { buildFeedbackView, changeLabel, noFeedbackReason, otherPatternLines, periodLabel, signedNumber } from '../../lib/trendView'
import CollapsibleCard from '../dashboard/CollapsibleCard'

const changeText = (c: Change, unit: string, changeUnit = unit) =>
  c.start === null || c.end === null || c.change === null ? '값 없음' : `${c.start} → ${c.end}${unit} (${signedNumber(c.change)}${changeUnit})`

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-slate-800">{value}</dd>
    </div>
  )
}

/** 근거 보기: 최근 구간의 숫자 */
export function TrendEvidence({ latest }: { latest: IntervalAnalysis }) {
  const { diet, workout, evidence } = latest
  const expected = evidence.expectedFatChange
  const protein = diet.protein
  const others = otherPatternLines(latest)
  return (
    <CollapsibleCard title="근거 보기" summary={`운동 ${workout.sessions}회 · 식단 기록 ${diet.loggedDays}/${diet.periodDays}일`}>
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <dl className="space-y-2 text-xs">
          <Row label="운동 횟수" value={`${workout.sessions}회 (주 ${workout.perWeek}회)`} />
          <Row label="식단 기록일" value={`${diet.periodDays}일 중 ${diet.loggedDays}일`} />
          <Row
            label="단백질 하루 평균"
            value={protein ? `${protein.average}g${protein.percent === null ? '' : ` · 목표의 ${protein.percent}%`}` : '기록 없음'}
          />
          <Row label="체중" value={changeText(evidence.weight, 'kg')} />
          <Row label="체지방률" value={changeText(evidence.bodyFatPercentage, '%', '%p')} />
          <Row label="기대 체지방 변화" value={expected.expectedKg === null ? '계산할 수 없어요' : `대략 ${signedNumber(expected.expectedKg)}kg`} />
          <Row label="실제 체지방 변화" value={expected.actualKg === null ? '값 없음' : `${signedNumber(expected.actualKg)}kg`} />
          {evidence.excludedSets > 0 && <Row label="부위를 몰라 뺀 세트" value={`${evidence.excludedSets}세트`} />}
        </dl>
        {expected.expectedKg === null && expected.reason && <p className="mt-2 text-[11px] text-slate-400">{expected.reason}</p>}
        <p className="mt-3 text-[11px] text-slate-400">측정 시간대가 다르면 수분 때문에 1kg 안팎 달라질 수 있어요</p>
        {others.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-semibold text-slate-800">그 밖에 보이는 점</h4>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
              {others.map((o) => (
                <li key={o.key} data-testid="other-pattern">
                  {o.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleCard>
  )
}

/** 지난 결과 보기: 최근 구간보다 앞선 구간들 */
export function TrendHistory({ intervals, target }: { intervals: IntervalAnalysis[]; target: NutritionTarget | null }) {
  return (
    <CollapsibleCard title="지난 결과 보기" summary={intervals.length > 0 ? `지난 구간 ${intervals.length}개` : '아직 지난 구간이 없어요'}>
      {intervals.length === 0 ? (
        <p className="rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500">아직 지난 구간이 없어요</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white px-4">
          {intervals.map((i) => (
            <li key={i.period.toId} data-testid="past-interval" className="py-3">
              <p className="text-xs font-semibold text-slate-800">{periodLabel(i.period)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                체지방 {changeLabel(i.results.fat).text} · 골격근 {changeLabel(i.results.muscle).text}
              </p>
              {i.feedback.length === 0 && <p className="mt-0.5 text-xs text-slate-400">{noFeedbackReason(i)}</p>}
              {i.feedback.map((f) => (
                <p key={f.pattern.id} className="mt-0.5 text-xs text-slate-700">
                  {f.domain === 'diet' ? '식단' : '운동'} · {buildFeedbackView(i, f, target).title}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </CollapsibleCard>
  )
}
