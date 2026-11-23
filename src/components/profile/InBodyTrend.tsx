import { ChevronDown, ChevronUp, Sparkles, Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { getMetricSeries, IN_BODY_METRIC_FIELDS } from '../../lib/inBodyChart'
import { sortInBodyHistory } from '../../lib/inBodyHistoryOrder'
import { formatRelativeDate } from '../../lib/time'
import { IN_BODY_SOURCE_LABELS, type InBodyHistoryEntry, type InBodyMeasurements } from '../../types'
import InBodyScanFlow from '../onboarding/InBodyScanFlow'
import TrendLineCard from './TrendLineCard'

interface Props {
  history: InBodyHistoryEntry[]
}

type Range = 'recent' | 'all'
const RECENT_COUNT = 5

// 클릭해서 열고 닫는 섹션. "전체 측정 기록"처럼 항상 보여줄 필요는 없는 내용에 쓴다.
function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between py-0.5">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

function AddMeasurementButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs font-medium text-primary">
      <Sparkles size={14} />
      새 측정 추가
    </button>
  )
}

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const options: { key: Range; label: string }[] = [
    { key: 'recent', label: '최근 5회' },
    { key: 'all', label: '전체' },
  ]
  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label="표시 기간">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
            value === o.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// 리포트 "변화 추이" 칸: 지표별 꺾은선 카드 4개 + 새 측정 추가 + 전체 측정 기록
export default function InBodyTrend({ history: rawHistory }: Props) {
  const history = sortInBodyHistory(rawHistory) // 측정일 내림차순(맨 앞 = 가장 최근 측정)
  const { aiMode, isDemo, dispatch } = useApp()
  const [scanOpen, setScanOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('recent')
  // 마이 탭(Profile.tsx)의 InBody 직접 수정과 같은 안내 — 여기서 측정해도 개인 영양 목표가
  // 똑같이 자동 재계산되는데(UPDATE_INBODY 리듀서), 눈에 보이는 변화가 없어서 안 바뀐 줄 아는
  // 사용자가 있어 명시적으로 알려준다.
  const [notice, setNotice] = useState<string | null>(null)

  const deleteEntry = (id: string) => {
    dispatch({ type: 'DELETE_INBODY_ENTRY', id })
    setConfirmDeleteId(null)
  }

  if (scanOpen) {
    return (
      <InBodyScanFlow
        mode={resolveAnalysisMode(isDemo, aiMode)}
        onApply={(measurements: InBodyMeasurements) => {
          dispatch({ type: 'UPDATE_INBODY', measurements, source: 'scan' })
          setNotice('InBody 정보가 바뀌어 마이 탭의 개인 영양 목표도 자동으로 다시 계산했어요.')
          setScanOpen(false)
        }}
        onClose={() => setScanOpen(false)}
      />
    )
  }

  if (history.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">인바디 추이</p>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {notice && <p className="rounded-xl bg-primary-softer px-3 py-2 text-xs text-primary-dark">{notice}</p>}

      {history.length < 2 && <p className="text-xs text-slate-400">비교할 이전 측정이 아직 없어요</p>}

      {IN_BODY_METRIC_FIELDS.map((f) => {
        const series = getMetricSeries(history, f.key)
        const shown = range === 'recent' ? series.slice(-RECENT_COUNT) : series
        return <TrendLineCard key={f.key} label={f.label} unit={f.unit} points={shown} />
      })}

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">측정 기록</p>
          <AddMeasurementButton onClick={() => setScanOpen(true)} />
        </div>
        <CollapsibleSection title={`전체 측정 기록 (${history.length})`} defaultOpen={false}>
          <div className="max-h-44 space-y-1.5 overflow-y-auto">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <div>
                  <span className="font-medium text-slate-700">{formatRelativeDate(entry.timestamp)}</span>
                  <span className="ml-2 text-slate-400">{IN_BODY_SOURCE_LABELS[entry.source]}</span>
                </div>
                {confirmDeleteId === entry.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteEntry(entry.id)} className="font-semibold text-rose-600">
                      삭제
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400">
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">
                      {entry.weight !== null ? `${entry.weight}kg` : '—'}
                      {entry.bodyFatPercentage !== null ? ` · 체지방 ${entry.bodyFatPercentage}%` : ''}
                    </span>
                    <button onClick={() => setConfirmDeleteId(entry.id)} aria-label="이 측정 기록 삭제" className="text-slate-300 hover:text-rose-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
