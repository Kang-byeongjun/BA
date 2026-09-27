import { Check } from 'lucide-react'

interface Props {
  image: string | null
  message: string
  // 진행 단계 이름과 현재 단계 index (예: 사진 확인 → AI 분석 → 영양 정보 계산 → 완료)
  steps: string[]
  activeStep: number
  // 데모 모드(예시 결과)일 때 표시
  demo?: boolean
  onCancel?: () => void
}

export default function AnalyzingLoader({ image, message, steps, activeStep, demo = false, onCancel }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-slate-950 px-8 text-center text-white">
      {image && (
        <div className="h-40 w-40 overflow-hidden rounded-3xl opacity-70">
          <img src={image} alt="분석 대상 이미지" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
      <p className="text-base font-medium">{message}</p>

      <ol className="w-full max-w-[16rem] space-y-2 text-left text-sm">
        {steps.map((label, i) => {
          const done = i < activeStep
          const current = i === activeStep
          return (
            <li key={label} className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  done ? 'bg-emerald-500 text-white' : current ? 'border-2 border-emerald-400 text-emerald-300' : 'border border-white/20 text-white/30'
                }`}
              >
                {done ? <Check size={12} /> : i + 1}
              </span>
              <span className={done ? 'text-white/60' : current ? 'font-medium text-white' : 'text-white/30'}>{label}</span>
            </li>
          )
        })}
      </ol>

      {demo && <p className="text-xs text-amber-300">데모 모드: 실제 AI가 아닌 예시 결과가 표시돼요.</p>}
      {onCancel && (
        <button onClick={onCancel} className="text-sm font-medium text-white/50">
          취소
        </button>
      )}
    </div>
  )
}
