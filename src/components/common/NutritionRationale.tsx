import { useState } from 'react'
import type { NutrientRationale } from '../../services/nutritionTargetService'
import { NUTRIENT_LABELS, type NutritionTarget } from '../../types'

interface Props {
  rationale: Record<keyof NutritionTarget, NutrientRationale>
}

const KEYS: (keyof NutritionTarget)[] = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber']

/** 영양 목표 숫자가 어떤 공식·문헌 근거로 나왔는지 펼쳐서 보여주는 공통 UI. (마이페이지, 온보딩 목표 확인 화면에서 재사용) */
export default function NutritionRationale({ rationale }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-emerald-600"
      >
        {open ? '근거 숨기기 ▲' : '이 숫자는 어떻게 나왔나요? ▼'}
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-3">
          {KEYS.map((key) => (
            <div key={key}>
              <p className="text-xs font-semibold text-slate-700">{NUTRIENT_LABELS[key]}</p>
              <p className="mt-0.5 text-xs text-slate-500">{rationale[key].summary}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">출처: {rationale[key].citation}</p>
            </div>
          ))}
          <p className="border-t border-slate-200 pt-2 text-[11px] text-slate-400">
            문헌이 제시하는 안전 범위 안에서 목적에 맞게 계산한 근사치이며, 개인별 의학적 처방이 아니에요. 필요하면 위에서 직접 수정할 수 있어요.
          </p>
        </div>
      )}
    </div>
  )
}
