import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { generateNutritionTarget } from '../../lib/nutrition'
import { GOAL_LABELS, NUTRIENT_LABELS, NUTRIENT_UNITS, type NutritionTarget } from '../../types'

const INBODY_ROWS: { key: 'age' | 'height' | 'weight' | 'skeletalMuscleMass' | 'bodyFatMass' | 'bodyFatPercentage' | 'basalMetabolicRate'; label: string; unit: string }[] = [
  { key: 'age', label: '나이', unit: '세' },
  { key: 'height', label: '키', unit: 'cm' },
  { key: 'weight', label: '체중', unit: 'kg' },
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg' },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg' },
  { key: 'bodyFatPercentage', label: '체지방률', unit: '%' },
  { key: 'basalMetabolicRate', label: '기초대사량', unit: 'kcal' },
]

const TARGET_KEYS: (keyof NutritionTarget)[] = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber']

export default function Profile() {
  const { profile, nutritionTarget, dispatch } = useApp()
  const [draftTarget, setDraftTarget] = useState<NutritionTarget | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!profile || !nutritionTarget) return null

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

      <div className="rounded-2xl bg-slate-900 p-5 text-white">
        <p className="text-xs text-slate-300">관리 목적</p>
        <p className="mt-1 text-lg font-bold">{GOAL_LABELS[profile.goal]}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-800">InBody 정보</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">성별</span>
            <span className="text-sm font-semibold text-slate-800">{profile.gender === 'male' ? '남성' : '여성'}</span>
          </div>
          {INBODY_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">{row.label}</span>
              <span className="text-sm font-semibold text-slate-800">
                {profile[row.key]}
                {row.unit}
              </span>
            </div>
          ))}
        </div>
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
