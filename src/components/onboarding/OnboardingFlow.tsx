import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateNutritionTarget } from '../../lib/nutrition'
import type { Goal, NutritionTarget, UserProfile } from '../../types'
import GoalSelect from './GoalSelect'
import InBodyInput, { type InBodyFormValues } from './InBodyInput'
import NutritionTargetReview from './NutritionTargetReview'

type Step = 'goal' | 'inbody' | 'target'

const EMPTY_INBODY: InBodyFormValues = {
  gender: 'male',
  age: '',
  height: '',
  weight: '',
  skeletalMuscleMass: '',
  bodyFatMass: '',
  bodyFatPercentage: '',
  basalMetabolicRate: '',
}

export default function OnboardingFlow() {
  const { dispatch } = useApp()
  const [step, setStep] = useState<Step>('goal')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [inBody, setInBody] = useState<InBodyFormValues>(EMPTY_INBODY)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [target, setTarget] = useState<NutritionTarget | null>(null)

  const handleInBodyNext = (values: InBodyFormValues) => {
    setInBody(values)
    const nextProfile: UserProfile = {
      goal: goal ?? 'health_care',
      gender: values.gender,
      age: Number(values.age),
      height: Number(values.height),
      weight: Number(values.weight),
      skeletalMuscleMass: Number(values.skeletalMuscleMass),
      bodyFatMass: Number(values.bodyFatMass),
      bodyFatPercentage: Number(values.bodyFatPercentage),
      basalMetabolicRate: Number(values.basalMetabolicRate),
    }
    setProfile(nextProfile)
    setTarget(generateNutritionTarget(nextProfile))
    setStep('target')
  }

  const handleConfirm = (finalTarget: NutritionTarget) => {
    if (!profile) return
    dispatch({ type: 'COMPLETE_ONBOARDING', profile, nutritionTarget: finalTarget })
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
        <InBodyInput initial={inBody} onBack={() => setStep('goal')} onNext={handleInBodyNext} />
      )}
      {step === 'target' && target && (
        <NutritionTargetReview
          initial={target}
          onBack={() => setStep('inbody')}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
