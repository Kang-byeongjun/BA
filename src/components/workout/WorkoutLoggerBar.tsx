import { ChevronUp, SkipForward, Timer } from 'lucide-react'
import { formatClock } from '../../lib/time'
import { formatRest } from '../../lib/workoutLog'

/**
 * WorkoutLoggerBar — 기록 화면 아래에 붙어 있는 바.
 * 왼쪽: 휴식 타이머(ON/OFF, 남은 시간, 누르면 −10초·+10초·건너뛰기 펼침)
 * 가운데: 전체 운동 시간 / 오른쪽: "운동 완료" 버튼
 * 값과 동작은 모두 props로 받는다(시간 계산은 WorkoutLogger가 한다).
 */

interface Props {
  restEnabled: boolean
  /** 쉬는 중이면 남은 초, 아니면 null */
  restRemaining: number | null
  restDone: boolean
  expanded: boolean
  elapsedSeconds: number
  onToggleRest: () => void
  onToggleExpand: () => void
  onAdjustRest: (deltaSeconds: number) => void
  onSkipRest: () => void
  /** 다음 단계에서 연결한다 */
  onFinish?: () => void
}

export default function WorkoutLoggerBar(p: Props) {
  const running = p.restRemaining !== null
  const showPanel = running && p.expanded

  let restLabel: string
  if (running) restLabel = formatRest(p.restRemaining!)
  else if (p.restDone) restLabel = '휴식 끝!'
  else restLabel = p.restEnabled ? '대기' : 'OFF'

  return (
    <div className="sticky bottom-0 z-10 mt-auto border-t border-slate-100 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur">
      {showPanel && (
        <div role="group" aria-label="휴식 조절" className="mb-2 grid grid-cols-3 gap-2">
          <button
            onClick={() => p.onAdjustRest(-10)}
            className="h-11 rounded-2xl bg-emerald-50 text-sm font-semibold text-emerald-700 active:scale-95"
          >
            −10초
          </button>
          <button
            onClick={() => p.onAdjustRest(10)}
            className="h-11 rounded-2xl bg-emerald-50 text-sm font-semibold text-emerald-700 active:scale-95"
          >
            +10초
          </button>
          <button
            onClick={p.onSkipRest}
            className="flex h-11 items-center justify-center gap-1 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600 active:scale-95"
          >
            <SkipForward size={15} /> 건너뛰기
          </button>
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* 왼쪽: 휴식 타이머 */}
        <div className="flex min-w-0 items-center gap-1">
          <button
            role="switch"
            aria-checked={p.restEnabled}
            aria-label="휴식 타이머"
            onClick={p.onToggleRest}
            className="flex h-10 shrink-0 items-center"
          >
            <span
              className={`relative h-6 w-10 rounded-full transition ${p.restEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  p.restEnabled ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
          </button>
          <button
            onClick={p.onToggleExpand}
            disabled={!running}
            aria-expanded={showPanel}
            aria-label={running ? `휴식 남은 시간 ${formatRest(p.restRemaining!)}, 눌러서 조절` : undefined}
            className={`flex h-10 min-w-0 items-center gap-1 rounded-xl px-1.5 text-left ${
              running ? 'bg-emerald-50 text-emerald-700' : p.restDone ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <Timer size={16} className="shrink-0" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[10px] font-medium opacity-80">휴식</span>
              <span
                role={p.restDone && !running ? 'status' : undefined}
                className="truncate text-sm font-bold tabular-nums"
              >
                {restLabel}
              </span>
            </span>
            {running && <ChevronUp size={14} className={`shrink-0 transition ${showPanel ? '' : 'rotate-180'}`} />}
          </button>
        </div>

        {/* 가운데: 전체 운동 시간 */}
        <div className="text-center leading-tight">
          <p className="text-[10px] font-medium text-slate-400">운동 시간</p>
          <p aria-label="전체 운동 시간" className="font-mono text-base font-bold tabular-nums text-slate-900">
            {formatClock(p.elapsedSeconds)}
          </p>
        </div>

        {/* 오른쪽: 운동 완료 (동작은 다음 단계) */}
        <div className="flex justify-end">
          <button
            onClick={p.onFinish}
            className="h-10 rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-200 active:scale-95"
          >
            운동 완료
          </button>
        </div>
      </div>
    </div>
  )
}
