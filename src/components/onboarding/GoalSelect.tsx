import type { ReactNode } from 'react'
import { Flame, Dumbbell, Scale, HeartPulse } from 'lucide-react'
import { GOAL_LABELS, type Goal } from '../../types'

interface Props {
  value: Goal | null
  onSelect: (goal: Goal) => void
  onNext: () => void
  onDemo: () => void
}

const GOAL_OPTIONS: { goal: Goal; icon: ReactNode; desc: string }[] = [
  { goal: 'fat_loss', icon: <Flame size={26} />, desc: '체지방을 줄이고 슬림한 몸을 만들어요' },
  { goal: 'muscle_gain', icon: <Dumbbell size={26} />, desc: '근육량을 늘리고 탄탄해져요' },
  { goal: 'weight_maintain', icon: <Scale size={26} />, desc: '지금 체형과 컨디션을 유지해요' },
  { goal: 'health_care', icon: <HeartPulse size={26} />, desc: '균형 잡힌 식습관으로 건강을 관리해요' },
]

export default function GoalSelect({ value, onSelect, onNext, onDemo }: Props) {
  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-12">
      <div className="mb-8">
        <p className="text-sm font-semibold text-emerald-600">1 / 3</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">관리 목적을 선택해주세요</h1>
        <p className="mt-1 text-sm text-slate-500">목적에 맞춰 개인 영양 목표를 만들어드려요.</p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {GOAL_OPTIONS.map((opt) => {
          const active = value === opt.goal
          return (
            <button
              key={opt.goal}
              onClick={() => onSelect(opt.goal)}
              className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                active
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {opt.icon}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{GOAL_LABELS[opt.goal]}</p>
                <p className="text-xs text-slate-500">{opt.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={onNext}
          disabled={!value}
          className="w-full rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200 transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          다음
        </button>
        <button onClick={onDemo} className="w-full py-2 text-sm font-medium text-slate-400">
          데모 데이터로 바로 체험하기
        </button>
      </div>
    </div>
  )
}
