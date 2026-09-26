interface Props {
  image: string | null
  message: string
  subMessage?: string
}

export default function AnalyzingLoader({ image, message, subMessage = '잠시만 기다려주세요...' }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-slate-950 px-8 text-center text-white">
      {image && (
        <div className="h-48 w-48 overflow-hidden rounded-3xl opacity-70">
          <img src={image} alt="분석 대상 이미지" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
      <p className="text-base font-medium">{message}</p>
      <p className="text-sm text-white/50">{subMessage}</p>
    </div>
  )
}
