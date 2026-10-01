import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { InBodyExtraction } from '../../../shared/analysis'
import { AnalysisError, isRetryable, type AnalysisErrorCode } from '../../../shared/errors'
import { prepareImage, type PreparedImage } from '../../lib/imagePrep'
import { sleep } from '../../lib/sleep'
import type { AnalysisMode } from '../../services/foodVisionService'
import { analyzeInBodyImage, toMeasurements } from '../../services/inBodyVisionService'
import type { InBodyMeasurements } from '../../types'
import AnalysisErrorView from '../common/AnalysisErrorView'
import AnalyzingLoader from '../common/AnalyzingLoader'
import InBodyScanCapture from './InBodyScanCapture'

type Step = 'capture' | 'analyzing' | 'result' | 'error'

interface Props {
  mode: AnalysisMode
  onApply: (measurements: InBodyMeasurements) => void
  onClose: () => void
}

type FieldKey = keyof InBodyMeasurements

const FIELDS: { key: FieldKey; label: string; unit: string }[] = [
  { key: 'weight', label: '체중', unit: 'kg' },
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg' },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg' },
  { key: 'bodyFatPercentage', label: '체지방률', unit: '%' },
  { key: 'bodyWater', label: '체수분', unit: 'L' },
  { key: 'proteinMass', label: '단백질량', unit: 'kg' },
  { key: 'mineralMass', label: '무기질량', unit: 'kg' },
  { key: 'basalMetabolicRate', label: '기초대사량', unit: 'kcal' },
]

const STEPS = ['사진 확인', 'AI 분석', '수치 정리', '완료']
const LOW_CONFIDENCE = 0.6

function toInputValues(m: InBodyMeasurements): Record<FieldKey, string> {
  const out = {} as Record<FieldKey, string>
  for (const { key } of FIELDS) out[key] = m[key] === null ? '' : String(m[key])
  return out
}

function confidenceLabel(confidence: number): { text: string; className: string } {
  if (confidence >= 0.8) return { text: '인식 신뢰도 높음', className: 'bg-emerald-100 text-emerald-700' }
  if (confidence >= LOW_CONFIDENCE) return { text: '인식 신뢰도 보통', className: 'bg-amber-100 text-amber-700' }
  return { text: '인식 신뢰도 낮음', className: 'bg-rose-100 text-rose-700' }
}

export default function InBodyScanFlow({ mode, onApply, onClose }: Props) {
  const [step, setStep] = useState<Step>('capture')
  const [stage, setStage] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [extraction, setExtraction] = useState<InBodyExtraction | null>(null)
  const [values, setValues] = useState<Record<FieldKey, string>>(() =>
    toInputValues({
      weight: null,
      skeletalMuscleMass: null,
      bodyFatMass: null,
      bodyFatPercentage: null,
      bodyWater: null,
      proteinMass: null,
      mineralMass: null,
      basalMetabolicRate: null,
    }),
  )
  const [missing, setMissing] = useState<Set<FieldKey>>(new Set())
  const [error, setError] = useState<{ code: AnalysisErrorCode; message: string; canRetry: boolean } | null>(null)

  const preparedRef = useRef<PreparedImage | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const fail = (err: unknown) => {
    const analysisError = err instanceof AnalysisError ? err : new AnalysisError('INTERNAL', 'inbody')
    if (analysisError.code === 'CANCELLED') return
    setError({
      code: analysisError.code,
      message: analysisError.message,
      canRetry: preparedRef.current !== null && isRetryable(analysisError.code),
    })
    setStep('error')
  }

  // 준비된(리사이즈된) 이미지를 서버 API로 보내 분석한다. 다시 분석할 때도 같은 이미지를 재사용한다.
  const analyze = async (prepared: PreparedImage) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStep('analyzing')
    setStage(1)
    try {
      const result = await analyzeInBodyImage(prepared, { mode, signal: controller.signal })
      setStage(2)
      await sleep(250, 'inbody', controller.signal)
      const measurements = toMeasurements(result)
      setExtraction(result)
      setValues(toInputValues(measurements))
      setMissing(new Set(FIELDS.filter((f) => measurements[f.key] === null).map((f) => f.key)))
      setStage(3)
      setStep('result')
    } catch (err) {
      fail(err)
    }
  }

  const handleCapture = async (dataUrl: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStep('analyzing')
    setStage(0)
    setError(null)
    try {
      const prepared = await prepareImage(dataUrl, 'inbody')
      if (controller.signal.aborted) return
      preparedRef.current = prepared
      // 신체 정보가 담긴 사진이므로 분석 화면 미리보기에만 쓰고 어디에도 저장하지 않는다.
      setPreview(prepared.preview)
      await analyze(prepared)
    } catch (err) {
      fail(err)
    }
  }

  const handleCancelAnalyzing = () => {
    abortRef.current?.abort()
    setStep('capture')
  }

  const retakePhoto = () => {
    abortRef.current?.abort()
    preparedRef.current = null
    setPreview(null)
    setStep('capture')
  }

  if (step === 'capture') {
    return <InBodyScanCapture demo={mode === 'mock'} onCapture={(d) => void handleCapture(d)} onClose={onClose} />
  }

  if (step === 'analyzing') {
    return (
      <AnalyzingLoader
        image={preview}
        message="AI가 InBody 결과를 읽고 있어요."
        steps={STEPS}
        activeStep={stage}
        demo={mode === 'mock'}
        onCancel={handleCancelAnalyzing}
      />
    )
  }

  if (step === 'error' && error) {
    return (
      <AnalysisErrorView
        message={error.message}
        onRetry={error.canRetry ? () => preparedRef.current && void analyze(preparedRef.current) : undefined}
        onRetake={retakePhoto}
        onClose={onClose}
      />
    )
  }

  if (step === 'result' && extraction) {
    const parsed = FIELDS.map((f) => {
      const raw = values[f.key].trim()
      if (raw === '') return { key: f.key, value: null as number | null, invalid: false }
      const n = Number(raw)
      return { key: f.key, value: Number.isFinite(n) && n > 0 ? n : null, invalid: !(Number.isFinite(n) && n > 0) }
    })
    const hasInvalid = parsed.some((p) => p.invalid)
    const filledCount = parsed.filter((p) => p.value !== null).length
    const partial = missing.size > 0 || extraction.confidence < LOW_CONFIDENCE
    const badge = confidenceLabel(extraction.confidence)

    const apply = () => {
      const measurements = {} as InBodyMeasurements
      for (const p of parsed) measurements[p.key] = p.value
      onApply(measurements)
    }

    return (
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
          <p className="font-semibold text-slate-800">AI가 분석한 InBody 정보</p>
          <button onClick={onClose} className="text-sm font-medium text-slate-400">
            취소
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {mode === 'mock' && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              데모 모드: 실제 AI가 아닌 예시 결과예요.
            </p>
          )}

          {preview && (
            <div className="h-32 w-full overflow-hidden rounded-2xl">
              <img src={preview} alt="업로드한 InBody 결과지" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">읽은 값을 확인하고, 틀린 값은 직접 고쳐주세요.</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>{badge.text}</span>
          </div>

          {partial && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>일부 항목을 정확하게 읽지 못했어요. 결과지를 확인하고 값을 직접 수정해주세요.</p>
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
            {FIELDS.map((f) => {
              const wasMissing = missing.has(f.key)
              const invalid = parsed.find((p) => p.key === f.key)?.invalid
              return (
                <div key={f.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor={`inbody-${f.key}`} className="text-sm font-medium text-slate-700">
                      {f.label}
                    </label>
                    {wasMissing && values[f.key].trim() === '' && (
                      <span className="text-[11px] font-medium text-amber-600">읽지 못했어요 · 직접 입력</span>
                    )}
                    {invalid && <span className="text-[11px] font-medium text-rose-500">0보다 큰 숫자를 입력해주세요</span>}
                  </div>
                  <div
                    className={`flex items-center rounded-xl border-2 bg-white px-3 focus-within:border-emerald-400 ${
                      invalid ? 'border-rose-300' : wasMissing && values[f.key].trim() === '' ? 'border-amber-300' : 'border-slate-100'
                    }`}
                  >
                    <input
                      id={`inbody-${f.key}`}
                      type="number"
                      inputMode="decimal"
                      value={values[f.key]}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder="-"
                      className="w-full bg-transparent py-2.5 text-base font-semibold text-slate-900 outline-none"
                    />
                    <span className="pl-2 text-sm text-slate-400">{f.unit}</span>
                  </div>
                </div>
              )
            })}
            {extraction.bmi !== null && (
              <p className="pt-1 text-xs text-slate-400">참고: 결과지의 BMI는 {extraction.bmi}로 읽었어요.</p>
            )}
          </div>

          {extraction.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
              {extraction.warnings.map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
          )}

          <p className="px-1 text-xs text-slate-400">
            성별·나이·키는 결과지에서 가져오지 않아요. 적용 후 다음 화면에서 직접 확인해주세요.
          </p>
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-white p-4">
          <button
            onClick={() => preparedRef.current && void analyze(preparedRef.current)}
            className="w-1/3 rounded-full border-2 border-slate-200 py-3.5 text-sm font-semibold text-slate-500"
          >
            다시 분석
          </button>
          <button
            onClick={apply}
            disabled={hasInvalid || filledCount === 0}
            className="w-2/3 rounded-full bg-emerald-500 py-3.5 font-semibold text-white shadow-lg shadow-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            확인하고 적용
          </button>
        </div>
      </div>
    )
  }

  return null
}
