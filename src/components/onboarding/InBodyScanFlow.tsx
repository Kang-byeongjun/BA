import { useEffect, useRef, useState } from 'react'
import AnalyzingLoader from '../common/AnalyzingLoader'
import { getRandomInBodyAnalysis, type InBodyAnalysisResult } from '../../data/mockData'
import type { InBodyFormValues } from './InBodyInput'
import InBodyScanCapture from './InBodyScanCapture'

type Step = 'capture' | 'analyzing' | 'result'

interface Props {
  onApply: (values: Partial<InBodyFormValues>) => void
  onClose: () => void
}

const FIELDS: { key: keyof InBodyAnalysisResult; label: string; unit: string }[] = [
  { key: 'age', label: '나이', unit: '세' },
  { key: 'height', label: '키', unit: 'cm' },
  { key: 'weight', label: '체중', unit: 'kg' },
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg' },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg' },
  { key: 'bodyFatPercentage', label: '체지방률', unit: '%' },
  { key: 'basalMetabolicRate', label: '기초대사량', unit: 'kcal' },
]

export default function InBodyScanFlow({ onApply, onClose }: Props) {
  const [step, setStep] = useState<Step>('capture')
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState<InBodyAnalysisResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCapture = (imageDataUrl: string) => {
    setImage(imageDataUrl)
    setStep('analyzing')
    // 실제 InBody OCR/분석 API 연결 지점: 아래 setTimeout + getRandomInBodyAnalysis()를
    // 촬영된 이미지를 서버로 전송해 수치를 추출하는 API 호출로 대체하면 된다.
    timerRef.current = setTimeout(() => {
      setResult(getRandomInBodyAnalysis())
      setStep('result')
    }, 1600)
  }

  const handleApply = () => {
    if (!result) return
    onApply({
      gender: result.gender,
      age: String(result.age),
      height: String(result.height),
      weight: String(result.weight),
      skeletalMuscleMass: String(result.skeletalMuscleMass),
      bodyFatMass: String(result.bodyFatMass),
      bodyFatPercentage: String(result.bodyFatPercentage),
      basalMetabolicRate: String(result.basalMetabolicRate),
    })
  }

  if (step === 'capture') {
    return <InBodyScanCapture onCapture={handleCapture} onClose={onClose} />
  }

  if (step === 'analyzing') {
    return (
      <AnalyzingLoader
        image={image}
        message="AI가 InBody 결과지를 분석하고 있어요."
        subMessage="수치를 인식하는 중이에요..."
      />
    )
  }

  if (step === 'result' && result) {
    return (
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
          <p className="font-semibold text-slate-800">인식된 InBody 수치</p>
          <button onClick={onClose} className="text-sm font-medium text-slate-400">
            취소
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {image && (
            <div className="h-40 w-full overflow-hidden rounded-2xl">
              <img src={image} alt="촬영한 InBody 결과지" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-600">성별</span>
              <span className="text-sm font-semibold text-slate-800">{result.gender === 'male' ? '남성' : '여성'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">{f.label}</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {result[f.key]}
                    {f.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="px-1 text-xs text-slate-400">
            AI가 인식한 값이에요. 적용 후 다음 화면에서 직접 한 번 더 확인하고 수정할 수 있어요.
          </p>
        </div>

        <div className="border-t border-slate-100 bg-white p-4">
          <button
            onClick={handleApply}
            className="w-full rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-200"
          >
            이 값 적용하기
          </button>
        </div>
      </div>
    )
  }

  return null
}
