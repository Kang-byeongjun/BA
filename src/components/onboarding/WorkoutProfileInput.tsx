import { useState } from 'react'
import {
  PAIN_AREA_LABELS,
  WORKOUT_EXPERIENCE_LABELS,
  WORKOUT_GOAL_LABELS,
  type PainArea,
  type WorkoutExperience,
  type WorkoutGoal,
  type WorkoutProfile,
} from '../../types'

interface Props {
  initial: WorkoutProfile
  onBack: () => void
  onNext: (profile: WorkoutProfile) => void
}

const GOALS = Object.keys(WORKOUT_GOAL_LABELS) as WorkoutGoal[]
const EXPERIENCES = Object.keys(WORKOUT_EXPERIENCE_LABELS) as WorkoutExperience[]
const PAIN_AREAS = Object.keys(PAIN_AREA_LABELS) as PainArea[]
const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6]
const DURATION_OPTIONS = [20, 30, 45, 60, 90]

export default function WorkoutProfileInput({ initial, onBack, onNext }: Props) {
  const [profile, setProfile] = useState<WorkoutProfile>(initial)

  const togglePainArea = (area: PainArea) => {
    setProfile((prev) => ({
      ...prev,
      painAreas: prev.painAreas.includes(area)
        ? prev.painAreas.filter((a) => a !== area)
        : [...prev.painAreas, area],
    }))
  }

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-12">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-600">3 / 4</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">운동 스타일을 알려주세요</h1>
        <p className="mt-1 text-sm text-slate-500">맞춤 운동 루틴을 만드는 데 사용할게요.</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">운동 목표</label>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => setProfile((prev) => ({ ...prev, goal: g }))}
                className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${
                  profile.goal === g
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {WORKOUT_GOAL_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">운동 경험</label>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCES.map((e) => (
              <button
                key={e}
                onClick={() => setProfile((prev) => ({ ...prev, experience: e }))}
                className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${
                  profile.experience === e
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {WORKOUT_EXPERIENCE_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">주당 운동 가능 횟수</label>
          <div className="grid grid-cols-6 gap-1.5">
            {FREQUENCY_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setProfile((prev) => ({ ...prev, weeklyFrequency: n }))}
                className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                  profile.weeklyFrequency === n
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">1회 운동 가능 시간</label>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setProfile((prev) => ({ ...prev, sessionDuration: d }))}
                className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition ${
                  profile.sessionDuration === d
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {d}분
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">통증·부상 부위 (선택)</label>
          <div className="grid grid-cols-3 gap-2">
            {PAIN_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => togglePainArea(area)}
                className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                  profile.painAreas.includes(area)
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {PAIN_AREA_LABELS[area]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">없으면 선택하지 않고 넘어가세요.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={onBack}
          className="w-1/3 rounded-full border-2 border-slate-200 py-4 font-semibold text-slate-500"
        >
          이전
        </button>
        <button
          onClick={() => onNext(profile)}
          className="w-2/3 rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200"
        >
          다음
        </button>
      </div>
    </div>
  )
}
