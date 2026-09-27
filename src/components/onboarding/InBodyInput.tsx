import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { Gender } from '../../types'
import InBodyScanFlow from './InBodyScanFlow'

export interface InBodyFormValues {
  gender: Gender
  age: string
  height: string
  weight: string
  skeletalMuscleMass: string
  bodyFatMass: string
  bodyFatPercentage: string
  basalMetabolicRate: string
}

interface Props {
  initial: InBodyFormValues
  onBack: () => void
  onNext: (values: InBodyFormValues) => void
}

const FIELDS: { key: keyof InBodyFormValues; label: string; unit: string }[] = [
  { key: 'age', label: '나이', unit: '세' },
  { key: 'height', label: '키', unit: 'cm' },
  { key: 'weight', label: '체중', unit: 'kg' },
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg' },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg' },
  { key: 'bodyFatPercentage', label: '체지방률', unit: '%' },
  { key: 'basalMetabolicRate', label: '기초대사량', unit: 'kcal' },
]

export default function InBodyInput({ initial, onBack, onNext }: Props) {
  const [values, setValues] = useState<InBodyFormValues>(initial)
  const [scanOpen, setScanOpen] = useState(false)

  const update = (key: keyof InBodyFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const isValid = FIELDS.every((f) => values[f.key].trim() !== '' && Number(values[f.key]) > 0)

  if (scanOpen) {
    return (
      <InBodyScanFlow
        // 온보딩 중에는 항상 실제 AI 분석을 사용한다 (mock은 데모 모드에서만)
        mode="real"
        onApply={(scanned) => {
          // 읽지 못한 항목(null)은 기존 입력값을 그대로 두고, 읽은 값만 폼에 채운다.
          setValues((prev) => ({
            ...prev,
            ...(scanned.weight !== null && { weight: String(scanned.weight) }),
            ...(scanned.skeletalMuscleMass !== null && { skeletalMuscleMass: String(scanned.skeletalMuscleMass) }),
            ...(scanned.bodyFatMass !== null && { bodyFatMass: String(scanned.bodyFatMass) }),
            ...(scanned.bodyFatPercentage !== null && { bodyFatPercentage: String(scanned.bodyFatPercentage) }),
            ...(scanned.basalMetabolicRate !== null && { basalMetabolicRate: String(scanned.basalMetabolicRate) }),
          }))
          setScanOpen(false)
        }}
        onClose={() => setScanOpen(false)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-12">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-600">2 / 3</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">InBody 정보를 입력해주세요</h1>
        <p className="mt-1 text-sm text-slate-500">최근 InBody 측정 결과를 입력하면 목표를 계산해드려요.</p>
      </div>

      <button
        onClick={() => setScanOpen(true)}
        className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-left"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">InBody 결과지 사진으로 자동 입력</p>
          <p className="text-xs text-emerald-600/80">AI가 결과지의 체중·골격근량·체지방·기초대사량을 읽어 채워줘요</p>
        </div>
      </button>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">성별</label>
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setValues((prev) => ({ ...prev, gender: g }))}
                className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${
                  values.gender === g
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {g === 'male' ? '남성' : '여성'}
              </button>
            ))}
          </div>
        </div>

        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">{f.label}</label>
            <div className="flex items-center rounded-xl border-2 border-slate-100 bg-white px-4 focus-within:border-emerald-400">
              <input
                type="number"
                inputMode="decimal"
                value={values[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder="0"
                className="w-full bg-transparent py-3 text-base text-slate-900 outline-none"
              />
              <span className="pl-2 text-sm text-slate-400">{f.unit}</span>
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
          onClick={() => onNext(values)}
          disabled={!isValid}
          className="w-2/3 rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200 transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          다음
        </button>
      </div>
    </div>
  )
}
