import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { BMI_CATEGORY_LABELS, calculateBmi, classifyBmi } from '../../lib/bmi'
import { generateNutritionTarget } from '../../services/nutritionTargetService'
import {
  GOAL_LABELS,
  NUTRIENT_LABELS,
  NUTRIENT_UNITS,
  PAIN_AREA_LABELS,
  WORKOUT_EXPERIENCE_LABELS,
  WORKOUT_GOAL_LABELS,
  type Goal,
  type InBodyMeasurements,
  type NutritionTarget,
} from '../../types'
import InBodyScanFlow from '../onboarding/InBodyScanFlow'
import WorkoutProfileInput from '../onboarding/WorkoutProfileInput'
import InBodyTrend from './InBodyTrend'

// 나이/키/체중은 항상 값이 있고, 나머지 체성분 항목은 InBody 없이 시작했으면 null일 수 있다.
const REQUIRED_INBODY_ROWS: { key: 'age' | 'height' | 'weight'; label: string; unit: string }[] = [
  { key: 'age', label: '나이', unit: '세' },
  { key: 'height', label: '키', unit: 'cm' },
  { key: 'weight', label: '체중', unit: 'kg' },
]

const OPTIONAL_INBODY_ROWS: {
  key: 'skeletalMuscleMass' | 'bodyFatMass' | 'bodyFatPercentage' | 'bodyWater' | 'proteinMass' | 'mineralMass' | 'basalMetabolicRate'
  label: string
  unit: string
}[] = [
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg' },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg' },
  { key: 'bodyFatPercentage', label: '체지방률', unit: '%' },
  { key: 'bodyWater', label: '체수분', unit: 'L' },
  { key: 'proteinMass', label: '단백질량', unit: 'kg' },
  { key: 'mineralMass', label: '무기질량', unit: 'kg' },
  { key: 'basalMetabolicRate', label: '기초대사량', unit: 'kcal' },
]

const GOALS = Object.keys(GOAL_LABELS) as Goal[]

const TARGET_KEYS: (keyof NutritionTarget)[] = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber']

export default function Profile() {
  const { profile, nutritionTarget, workoutProfile, inBodyHistory, isDemo, aiMode, dispatch } = useApp()
  const [draftTarget, setDraftTarget] = useState<NutritionTarget | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [workoutEditOpen, setWorkoutEditOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (!profile || !nutritionTarget) return null

  const bmi = calculateBmi(profile.height, profile.weight)

  if (scanOpen) {
    return (
      <InBodyScanFlow
        mode={resolveAnalysisMode(isDemo, aiMode)}
        onApply={(measurements: InBodyMeasurements) => {
          // InBody 데이터가 바뀌면 개인 영양 목표도 자동으로 다시 계산되고 측정 이력에 남는다.
          dispatch({ type: 'UPDATE_INBODY', measurements, source: 'scan' })
          setDraftTarget(null)
          setNotice('InBody 정보가 바뀌어 영양 목표를 다시 계산했어요. 필요하면 아래에서 직접 수정할 수 있어요.')
          setScanOpen(false)
        }}
        onClose={() => setScanOpen(false)}
      />
    )
  }

  if (workoutEditOpen && workoutProfile) {
    return (
      <WorkoutProfileInput
        initial={workoutProfile}
        onBack={() => setWorkoutEditOpen(false)}
        onNext={(next) => {
          dispatch({ type: 'SET_WORKOUT_PROFILE', workoutProfile: next })
          setWorkoutEditOpen(false)
        }}
      />
    )
  }

  const handleGoalChange = (goal: Goal) => {
    if (goal === profile.goal) return
    const nextProfile = { ...profile, goal }
    const nextTarget = generateNutritionTarget(nextProfile)
    dispatch({ type: 'UPDATE_PROFILE', profile: nextProfile })
    dispatch({ type: 'UPDATE_NUTRITION_TARGET', target: nextTarget })
    setDraftTarget(nextTarget)
    setNotice('관리 목적이 바뀌어 영양 목표를 다시 계산했어요. 필요하면 아래에서 직접 수정할 수 있어요.')
  }

  const target = draftTarget ?? nutritionTarget

  const updateTarget = (key: keyof NutritionTarget, value: string) => {
    const num = Number(value)
    setDraftTarget({ ...target, [key]: Number.isFinite(num) ? num : 0 })
    setSaved(false)
  }

  const handleSave = () => {
    if (draftTarget) dispatch({ type: 'UPDATE_NUTRITION_TARGET', target: draftTarget })
    setSaved(true)
  }

  const handleRecalculate = () => {
    const recalculated = generateNutritionTarget(profile)
    setDraftTarget(recalculated)
    dispatch({ type: 'UPDATE_NUTRITION_TARGET', target: recalculated })
    setSaved(true)
  }

  return (
    <div className="space-y-5 px-4 pb-8 pt-6">
      <h1 className="text-xl font-bold text-slate-900">마이</h1>

      {notice && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

      <div className="rounded-2xl bg-slate-900 p-5 text-white">
        <p className="text-xs text-slate-300">관리 목적</p>
        <p className="mt-1 text-lg font-bold">{GOAL_LABELS[profile.goal]}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal}
              onClick={() => handleGoalChange(goal)}
              className={`rounded-xl py-2 text-xs font-semibold ${
                goal === profile.goal ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'
              }`}
            >
              {GOAL_LABELS[goal]}
            </button>
          ))}
        </div>
      </div>

      {isDemo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">데모 모드 AI 분석 방식</p>
          <p className="mt-1 text-xs text-amber-700">
            데모에서는 기본으로 예시 결과를 보여줘요. 실제 AI로 사진을 분석해보려면 아래에서 바꿔주세요.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['mock', 'real'] as const).map((m) => (
              <button
                key={m}
                onClick={() => dispatch({ type: 'SET_AI_MODE', aiMode: m })}
                className={`rounded-xl py-2 text-xs font-semibold ${
                  aiMode === m ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'
                }`}
              >
                {m === 'mock' ? '예시 결과 (데모)' : '실제 AI 분석'}
              </button>
            ))}
          </div>
        </div>
      )}


      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">InBody 정보</p>
          <button onClick={() => setScanOpen(true)} className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Sparkles size={14} />
            결과지 사진으로 업데이트
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">성별</span>
            <span className="text-sm font-semibold text-slate-800">{profile.gender === 'male' ? '남성' : '여성'}</span>
          </div>
          {REQUIRED_INBODY_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">{row.label}</span>
              <span className="text-sm font-semibold text-slate-800">
                {profile[row.key]}
                {row.unit}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">BMI</span>
            <span className="text-sm font-semibold text-slate-800">
              {bmi}
              <span className="ml-1 text-[11px] font-normal text-slate-400">({BMI_CATEGORY_LABELS[classifyBmi(bmi)]})</span>
            </span>
          </div>
          {OPTIONAL_INBODY_ROWS.map((row) => {
            const value = profile[row.key]
            const isEstimated = row.key === 'basalMetabolicRate' && profile.basalMetabolicRateEstimated
            return (
              <div key={row.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-sm font-semibold text-slate-800">
                  {value === null ? (
                    <span className="text-xs font-normal text-slate-400">측정 안 함</span>
                  ) : (
                    <>
                      {value}
                      {row.unit}
                      {isEstimated && <span className="ml-1 text-[11px] font-normal text-amber-500">(추정)</span>}
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        {profile.skeletalMuscleMass === null && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            아직 InBody 결과가 없어요. 결과지 사진을 올리면 체성분 항목이 채워지고 기초대사량도 더 정확해져요.
          </p>
        )}
      </div>

      <InBodyTrend history={inBodyHistory} />

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">운동 프로필</p>
          <button onClick={() => setWorkoutEditOpen(true)} className="text-xs font-medium text-emerald-600">
            수정
          </button>
        </div>
        {workoutProfile ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">운동 목표</span>
              <span className="text-sm font-semibold text-slate-800">{WORKOUT_GOAL_LABELS[workoutProfile.goal]}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">운동 경험</span>
              <span className="text-sm font-semibold text-slate-800">
                {WORKOUT_EXPERIENCE_LABELS[workoutProfile.experience]}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">주당 횟수</span>
              <span className="text-sm font-semibold text-slate-800">{workoutProfile.weeklyFrequency}회</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">1회 시간</span>
              <span className="text-sm font-semibold text-slate-800">{workoutProfile.sessionDuration}분</span>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">통증·부상</span>
              <span className="text-sm font-semibold text-slate-800">
                {workoutProfile.painAreas.length === 0
                  ? '없음'
                  : workoutProfile.painAreas.map((a) => PAIN_AREA_LABELS[a]).join(', ')}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">운동 프로필 정보가 없어요.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">개인 영양 목표</p>
          <button onClick={handleRecalculate} className="text-xs font-medium text-emerald-600">
            InBody 기준 다시 계산
          </button>
        </div>
        <div className="space-y-2">
          {TARGET_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-600">{NUTRIENT_LABELS[key]}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={target[key]}
                  onChange={(e) => updateTarget(key, e.target.value)}
                  className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400"
                />
                <span className="text-xs text-slate-400">{NUTRIENT_UNITS[key]}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          className="mt-3 w-full rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white"
        >
          {saved ? '저장됨 ✓' : '목표 저장하기'}
        </button>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <p className="mb-2 text-sm font-semibold text-rose-700">데이터 초기화</p>
        <p className="mb-3 text-xs text-rose-500">
          온보딩 정보, 식사 기록, 운동 기록이 모두 삭제되고 처음부터 다시 시작해요.
        </p>
        {confirmingReset ? (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingReset(false)}
              className="flex-1 rounded-full border-2 border-rose-200 py-2.5 text-sm font-semibold text-rose-500"
            >
              취소
            </button>
            <button
              onClick={() => dispatch({ type: 'RESET_APP' })}
              className="flex-1 rounded-full bg-rose-500 py-2.5 text-sm font-semibold text-white"
            >
              초기화하기
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            className="w-full rounded-full border-2 border-rose-200 py-2.5 text-sm font-semibold text-rose-500"
          >
            전체 데이터 초기화
          </button>
        )}
      </div>
    </div>
  )
}
