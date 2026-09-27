import { AlertTriangle } from 'lucide-react'

interface Props {
  message: string
  // 같은 사진으로 다시 시도해볼 수 있는 경우에만 전달
  onRetry?: () => void
  onRetake: () => void
  onClose: () => void
}

export default function AnalysisErrorView({ message, onRetry, onRetake, onClose }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-slate-950 px-8 text-center text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
        <AlertTriangle size={30} />
      </div>
      <div>
        <p className="text-lg font-semibold">분석하지 못했어요</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{message}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {onRetry && (
          <button onClick={onRetry} className="rounded-full bg-emerald-500 py-3.5 font-semibold">
            다시 시도
          </button>
        )}
        <button
          onClick={onRetake}
          className={`rounded-full py-3.5 font-semibold ${onRetry ? 'bg-white/10' : 'bg-emerald-500'}`}
        >
          다른 사진으로 다시 촬영
        </button>
        <button onClick={onClose} className="py-2 text-sm font-medium text-white/50">
          닫기
        </button>
      </div>
    </div>
  )
}
