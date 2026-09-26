import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { useApp } from '../../context/AppContext'
import { getRandomFoodAnalysis } from '../../data/mockData'
import { generateId } from '../../lib/id'
import type { FoodAnalysisResult, Meal } from '../../types'
import AnalyzingLoader from '../common/AnalyzingLoader'
import FoodAnalysis from './FoodAnalysis'
import FoodCamera from './FoodCamera'

type Step = 'camera' | 'analyzing' | 'result'

interface Props {
  // saved가 true면 실제로 식사가 기록된 채 닫힌 것 (홈으로 이동해 갱신된 Progress Bar를 보여줘야 함).
  // false/undefined면 사용자가 촬영을 취소한 것.
  onDone: (saved?: boolean) => void
}

export default function FoodCaptureFlow({ onDone }: Props) {
  const { dispatch } = useApp()
  const [step, setStep] = useState<Step>('camera')
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState<FoodAnalysisResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCapture = (imageDataUrl: string) => {
    setImage(imageDataUrl)
    setStep('analyzing')
    // 실제 AI Vision API 연결 지점: 아래 setTimeout + getRandomFoodAnalysis()를
    // 이미지 업로드 후 분석 API 호출로 대체하면 된다.
    timerRef.current = setTimeout(() => {
      setResult(getRandomFoodAnalysis())
      setStep('result')
    }, 1800)
  }

  const handleConfirm: ComponentProps<typeof FoodAnalysis>['onConfirm'] = (data) => {
    const meal: Meal = {
      id: generateId('meal'),
      timestamp: Date.now(),
      slot: data.slot,
      title: data.title,
      image,
      foods: data.foods,
      calories: data.calories,
      protein: data.protein,
      carbohydrates: data.carbohydrates,
      fat: data.fat,
      fiber: data.fiber,
    }
    dispatch({ type: 'ADD_MEAL', meal })
    onDone(true)
  }

  if (step === 'camera') {
    return <FoodCamera onCapture={handleCapture} onClose={onDone} />
  }

  if (step === 'analyzing') {
    return <AnalyzingLoader image={image} message="AI가 음식을 분석하고 있어요." />
  }

  if (step === 'result' && result) {
    return <FoodAnalysis image={image} result={result} onConfirm={handleConfirm} onCancel={onDone} />
  }

  return null
}
