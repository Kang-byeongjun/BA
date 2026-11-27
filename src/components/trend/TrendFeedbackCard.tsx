import type { FeedbackView } from '../../lib/trendView'
import TrendBarChart from './TrendBarChart'

// 피드백 카드: 배지 + 제목 1줄 + 막대 그래프 1개 + 설명 1줄
export default function TrendFeedbackCard({ view }: { view: FeedbackView }) {
  return (
    <section data-testid="feedback-card" className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-dark">{view.badge}</span>
        <span className="text-[11px] text-slate-500">{view.toneLabel}</span>
      </div>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug text-slate-900">{view.title}</h3>
      <div className="mt-2">
        <TrendBarChart model={view.chart} />
      </div>
      {view.foods.length > 0 && (
        <ul aria-label="목표를 넘긴 날 저녁·간식에 자주 먹은 음식" className="mt-2 flex flex-wrap gap-1.5">
          {view.foods.map((f) => (
            <li key={f} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800">
              {f}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-500">{view.description}</p>
    </section>
  )
}
