import type { ComponentType } from 'react'
import { Camera, Dumbbell, Home, UtensilsCrossed, UserRound } from 'lucide-react'

export type Tab = 'home' | 'meals' | 'workout' | 'profile'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  onCamera: () => void
}

type NavTab = { key: Tab; label: string; icon: ComponentType<{ size?: number }> }

const TABS: NavTab[] = [
  { key: 'home', label: '홈', icon: Home },
  { key: 'meals', label: '식단', icon: UtensilsCrossed },
]

const TABS_RIGHT: NavTab[] = [
  { key: 'workout', label: '운동', icon: Dumbbell },
  { key: 'profile', label: '마이', icon: UserRound },
]

function NavButton({
  tab,
  active,
  onChange,
}: {
  tab: NavTab
  active: Tab
  onChange: (tab: Tab) => void
}) {
  const Icon = tab.icon
  const isActive = active === tab.key
  return (
    <button
      onClick={() => onChange(tab.key)}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
        isActive ? 'text-emerald-600' : 'text-slate-400'
      }`}
    >
      <Icon size={22} />
      {tab.label}
    </button>
  )
}

export default function BottomNav({ active, onChange, onCamera }: Props) {
  return (
    <nav className="relative flex items-end border-t border-slate-100 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+4px)] backdrop-blur">
      {TABS.map((tab) => (
        <NavButton key={tab.key} tab={tab} active={active} onChange={onChange} />
      ))}

      <div className="flex flex-1 flex-col items-center justify-start">
        <button
          onClick={onCamera}
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-300 active:scale-95"
          aria-label="음식 촬영"
        >
          <Camera size={24} />
        </button>
        <span className="mt-0.5 text-[11px] font-medium text-emerald-600">촬영</span>
      </div>

      {TABS_RIGHT.map((tab) => (
        <NavButton key={tab.key} tab={tab} active={active} onChange={onChange} />
      ))}
    </nav>
  )
}
