import type { ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
}

// "라벨 ··· 값" 한 줄. 가운데 점선이 늘어나고, 값이 길면(예: 통증 부위 여러 개) 다음 줄로 자연스럽게 내려간다.
export default function InfoRow({ label, children }: Props) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-slate-300" />
      <span className="min-w-0 max-w-full break-keep text-right font-semibold text-slate-800">{children}</span>
    </div>
  )
}
