import { useEffect, useRef, useState } from 'react'
import type { FoodExtraction } from '../../../shared/analysis'
import { AnalysisError, isRetryable, type AnalysisErrorCode } from '../../../shared/errors'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { prepareImage, type PreparedImage } from '../../lib/imagePrep'
import { sleep } from '../../lib/sleep'
import { analyzeFoodImage } from '../../services/foodVisionService'
import { buildMeal } from '../../services/mealService'
import type { Meal } from '../../types'
import AnalysisErrorView from '../common/AnalysisErrorView'
import AnalyzingLoader from '../common/AnalyzingLoader'
import FoodAnalysis from './FoodAnalysis'
import FoodCamera from './FoodCamera'

type Step = 'camera' | 'analyzing' | 'result' | 'error'

interface Props {
  // 식사를 기록하고 닫히면 기록된 Meal을, 취소하고 닫히면 아무 값도 없이 호출된다.
  onDone: (savedMeal?: Meal) => void
}

const STEPS = ['사진 확인', 'AI 분석', '영양 정보 계산', '완료']

/**
 * 음식 사진 흐름: 촬영/업로드 → (브라우저에서 리사이즈) → 서버 API → Claude Vision → 사용자 확인/수정 → 기록
 * 분석이 실패하면 mock 결과로 대체하지 않고 에러 화면을 보여준다.
 */
export default function FoodCaptureFlow({ onDone }: Props) {
  const { dispatch, isDemo, aiMode } = useApp()
  const mode = resolveAnalysisMode(isDemo, aiMode)

  const [step, setStep] = useState<Step>('camera')
  const [stage, setStage] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [extraction, setExtraction] = useState<FoodExtraction | null>(null)
  // "다시 분석"할 때 결과 화면의 편집 상태를 새로 시작하기 위한 키
  const [runId, setRunId] = useState(0)
  const [error, setError] = useState<{ code: AnalysisErrorCode; message: string; canRetry: boolean } | null>(null)

  const preparedRef = useRef<PreparedImage | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const fail = (err: unknown) => {
    const analysisError = err instanceof AnalysisError ? err : new AnalysisError('INTERNAL', 'food')
    if (analysisError.code === 'CANCELLED') return
    setError({
      code: analysisError.code,
      message: analysisError.message,
      // 사진 자체의 문제가 아니고 준비된 이미지가 있을 때만 같은 사진으로 다시 시도할 수 있다.
      canRetry: preparedRef.current !== null && isRetryable(analysisError.code),
    })
    setStep('error')
  }

  const analyze = async (prepared: PreparedImage) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStep('analyzing')
    setStage(1)
    try {
      const result = await analyzeFoodImage(prepared, { mode, signal: controller.signal })
      setStage(2)
      await sleep(350, 'food', controller.signal)
      setExtraction(result)
      setRunId((n) => n + 1)
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
      const prepared = await prepareImage(dataUrl, 'food')
      if (controller.signal.aborted) return
      preparedRef.current = prepared
      setPreview(prepared.preview)
      await analyze(prepared)
    } catch (err) {
      fail(err)
    }
  }

  const retakePhoto = () => {
    abortRef.current?.abort()
    preparedRef.current = null
    setPreview(null)
    setStep('camera')
  }

  const handleCancelClose = () => {
    abortRef.current?.abort()
    onDone()
  }

  if (step === 'camera') {
    return <FoodCamera demo={mode === 'mock'} onCapture={(d) => void handleCapture(d)} onClose={onDone} />
  }

  if (step === 'analyzing') {
    return (
      <AnalyzingLoader
        image={preview}
        message="AI가 음식과 양을 분석하고 있어요."
        steps={STEPS}
        activeStep={stage}
        demo={mode === 'mock'}
        onCancel={retakePhoto}
      />
    )
  }

  if (step === 'error' && error) {
    return (
      <AnalysisErrorView
        message={error.message}
        onRetry={error.canRetry ? () => preparedRef.current && void analyze(preparedRef.current) : undefined}
        onRetake={retakePhoto}
        onClose={handleCancelClose}
      />
    )
  }

  if (step === 'result' && extraction) {
    return (
      <FoodAnalysis
        key={runId}
        preview={preview}
        extraction={extraction}
        mode={mode}
        onReanalyze={() => preparedRef.current && void analyze(preparedRef.current)}
        onConfirm={({ title, slot, rows }) => {
          const meal = buildMeal({ title, slot, rows, thumbnail: preparedRef.current?.thumbnail ?? null })
          dispatch({ type: 'ADD_MEAL', meal })
          onDone(meal)
        }}
        onCancel={handleCancelClose}
      />
    )
  }

  return null
}
