import { useState } from 'react'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, type NutritionTarget } from '../../types'

interface Props {
  initial: NutritionTarget
  onBack: () => void
  onConfirm: (target: NutritionTarget) => void
}

const KEYS: (keyof NutritionTarget)[] = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber']

export default function NutritionTargetReview({ initial, onBack, onConfirm }: Props) {
  const [target, setTarget] = useState<NutritionTarget>(initial)

  const update = (key: keyof NutritionTarget, value: string) => {
    const num = Number(value)
    setTarget((prev) => ({ ...prev, [key]: Number.isFinite(num) ? num : 0 }))
  }

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-12">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-600">3 / 3</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">개인 영양 목표가 완성됐어요</h1>
        <p className="mt-1 text-sm text-slate-500">
          입력하신 InBody 데이터를 기반으로 계산된 하루 목표예요. 필요하면 직접 수정할 수 있어요.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {KEYS.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4"
          >
            <span className="font-medium text-slate-700">{NUTRIENT_LABELS[key]}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={target[key]}
                onChange={(e) => update(key, e.target.value)}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-base font-semibold text-slate-900 outline-none focus:border-emerald-400"
              />
              <span className="text-sm text-slate-400">{NUTRIENT_UNITS[key]}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={onBack}
          className="w-1/3 rounded-full border-2 border-slate-200 py-4 font-semibold text-slate-500"
        >
          이전
        </button>
        <button
          onClick={() => onConfirm(target)}
          className="w-2/3 rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200"
        >
          시작하기
        </button>
      </div>
    </div>
  )
}
