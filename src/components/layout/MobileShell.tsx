import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  footer?: ReactNode
}

export default function MobileShell({ children, footer }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200 sm:py-6">
      <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-slate-50 sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-[2.5rem] sm:shadow-2xl">
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer}
      </div>
    </div>
  )
}
