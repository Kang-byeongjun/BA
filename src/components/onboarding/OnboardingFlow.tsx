import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { estimateBasalMetabolicRate } from '../../lib/bmr'
import { generateNutritionTarget } from '../../services/nutritionTargetService'
import type { Goal, NutritionTarget, UserProfile, WorkoutProfile } from '../../types'
import GoalSelect from './GoalSelect'
import InBodyInput, { type InBodyEntryMode, type InBodyFormValues } from './InBodyInput'
import NutritionTargetReview from './NutritionTargetReview'
import WorkoutProfileInput from './WorkoutProfileInput'

type Step = 'goal' | 'inbody' | 'workout' | 'target'

const EMPTY_INBODY: InBodyFormValues = {
  gender: 'male',
  age: '',
  height: '',
  weight: '',
  skeletalMuscleMass: '',
  bodyFatMass: '',
  bodyFatPercentage: '',
  bodyWater: '',
  proteinMass: '',
  mineralMass: '',
  basalMetabolicRate: '',
}

const EMPTY_WORKOUT_PROFILE: WorkoutProfile = {
  goal: 'fat_loss',
  experience: 'beginner',
  weeklyFrequency: 3,
  sessionDuration: 45,
  painAreas: [],
}

// 결과지에 없을 수 있는 선택 항목. 비어 있으면 null로, 값이 있으면 숫자로 변환한다.
function toNullableNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export default function OnboardingFlow() {
  const { dispatch } = useApp()
  const [step, setStep] = useState<Step>('goal')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [inBody, setInBody] = useState<InBodyFormValues>(EMPTY_INBODY)
  const [inBodyMode, setInBodyMode] = useState<InBodyEntryMode>('full')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [workoutProfile, setWorkoutProfile] = useState<WorkoutProfile>(EMPTY_WORKOUT_PROFILE)
  const [target, setTarget] = useState<NutritionTarget | null>(null)

  const handleInBodyNext = (values: InBodyFormValues, mode: InBodyEntryMode) => {
    setInBody(values)
    setInBodyMode(mode)

    const gender = values.gender
    const age = Number(values.age)
    const height = Number(values.height)
    const weight = Number(values.weight)
    // InBody 결과가 없으면(간편 모드) 실측 기초대사량이 없으므로 공식으로 추정한다.
    const measuredBmr = toNullableNumber(values.basalMetabolicRate)
    const basalMetabolicRate = measuredBmr ?? estimateBasalMetabolicRate(gender, age, height, weight)

    const nextProfile: UserProfile = {
      goal: goal ?? 'health_care',
      gender,
      age,
      height,
      weight,
      skeletalMuscleMass: toNullableNumber(values.skeletalMuscleMass),
      bodyFatMass: toNullableNumber(values.bodyFatMass),
      bodyFatPercentage: toNullableNumber(values.bodyFatPercentage),
      bodyWater: toNullableNumber(values.bodyWater),
      proteinMass: toNullableNumber(values.proteinMass),
      mineralMass: toNullableNumber(values.mineralMass),
      basalMetabolicRate,
      basalMetabolicRateEstimated: measuredBmr === null,
    }
    setProfile(nextProfile)
    setTarget(generateNutritionTarget(nextProfile))
    setStep('workout')
  }

  const handleWorkoutNext = (nextWorkoutProfile: WorkoutProfile) => {
    setWorkoutProfile(nextWorkoutProfile)
    setStep('target')
  }

  const handleConfirm = (finalTarget: NutritionTarget) => {
    if (!profile) return
    dispatch({ type: 'COMPLETE_ONBOARDING', profile, nutritionTarget: finalTarget, workoutProfile })
  }

  const handleDemo = () => dispatch({ type: 'LOAD_DEMO' })

  return (
    <div className="h-full bg-slate-50">
      {step === 'goal' && (
        <GoalSelect
          value={goal}
          onSelect={setGoal}
          onNext={() => goal && setStep('inbody')}
          onDemo={handleDemo}
        />
      )}
      {step === 'inbody' && (
        <InBodyInput
          initial={inBody}
          initialMode={inBodyMode}
          onBack={() => setStep('goal')}
          onNext={handleInBodyNext}
        />
      )}
      {step === 'workout' && (
        <WorkoutProfileInput
          initial={workoutProfile}
          onBack={() => setStep('inbody')}
          onNext={handleWorkoutNext}
        />
      )}
      {step === 'target' && target && (
        <NutritionTargetReview
          initial={target}
          onBack={() => setStep('workout')}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
