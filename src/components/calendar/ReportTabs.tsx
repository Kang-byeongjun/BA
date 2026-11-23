export type ReportTab = 'week' | 'inbody' | 'trend'

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'week', label: '이번 주' },
  { key: 'inbody', label: '인바디 결과' },
  { key: 'trend', label: '변화 추이' },
]

interface Props {
  value: ReportTab
  onChange: (tab: ReportTab) => void
}

// 리포트 맨 위 세 칸 탭: 연한 회색 바탕에 선택된 칸만 흰 배경 + 포인트 색 글자
export default function ReportTabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="리포트 보기" className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {TABS.map((t) => {
        const selected = t.key === value
        return (
          <button
            key={t.key}
            id={`report-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`report-panel-${t.key}`}
            onClick={() => onChange(t.key)}
            className={`min-w-0 flex-1 whitespace-nowrap rounded-lg px-1 py-2 text-sm font-semibold ${
              selected ? 'bg-white text-primary shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
