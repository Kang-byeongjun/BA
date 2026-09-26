import type { WorkoutType } from '../../types'

interface Props {
  value: WorkoutType
  onChange: (type: WorkoutType) => void
  onStart: () => void
}

const TYPES: { type: WorkoutType; emoji: string }[] = [
  { type: '헬스', emoji: '🏋️' },
  { type: '러닝', emoji: '🏃' },
  { type: '걷기', emoji: '🚶' },
  { type: '자전거', emoji: '🚴' },
  { type: '스쿼시', emoji: '🎾' },
  { type: '기타', emoji: '✨' },
]

export default function WorkoutTypeSelect({ value, onChange, onStart }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-500">운동 종류</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => onChange(t.type)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-semibold transition ${
                value === t.type
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-100 bg-white text-slate-500'
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              {t.type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-3xl border border-slate-100 bg-white py-14">
        <span className="font-mono text-5xl font-bold tabular-nums text-slate-300">00:00:00</span>
        <button
          onClick={onStart}
          className="rounded-full bg-emerald-500 px-10 py-4 font-semibold text-white shadow-lg shadow-emerald-200"
        >
          운동 시작
        </button>
      </div>
    </div>
  )
}
