import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { resolveAnalysisMode } from '../../lib/aiMode'
import { calculateBmi } from '../../lib/bmi'
import { computeShapePositions, type InBodyStandardRange } from '../../lib/inBodyBodyType'
import { bmiRange, bodyFatPercentRange, FIXED_RANGE_NOTE } from '../../lib/inBodyFixedRanges'
import { sortInBodyHistory } from '../../lib/inBodyHistoryOrder'
import { formatMeasureDate } from '../../lib/inBodyTrendChart'
import type { InBodyHistoryEntry, InBodyMeasurements } from '../../types'
import InBodyScanFlow from '../onboarding/InBodyScanFlow'
import BodyShapeChart from './BodyShapeChart'

interface Row {
  key: string
  label: string
  value: number | null
  unit: string
  /** 결과지에서 읽은 표준 범위(이미 보정돼 저장된 값). 없으면 막대를 그리지 않는다 */
  range: InBodyStandardRange | null
  /** true면 결과지가 아니라 고정 기준(일반 성인)으로 그린 막대 */
  fixed?: boolean
}

function MetricRow({ row }: { row: Row }) {
  const pos = row.range ? computeShapePositions([row.range])[0] : null
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="w-[104px] shrink-0">
        <p className="text-[11px] text-slate-500">{row.label}</p>
        {row.value === null ? (
          <p className="text-sm font-semibold text-slate-400">측정 안 함</p>
        ) : (
          <p className="whitespace-nowrap">
            <span className="text-2xl font-extrabold tabular-nums text-slate-900">{row.value}</span>
            <span className="ml-0.5 text-xs text-slate-500">{row.unit}</span>
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {pos ? (
          <>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>표준이하</span>
              <span>표준</span>
              <span>표준이상</span>
            </div>
            <div
              role="img"
              aria-label={`${row.label} 표준 범위 막대`}
              data-testid={`bar-${row.key}`}
              className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-[#ececec]"
            >
              {/* 값 채움을 먼저 그리고, 표준 구간을 그 위에 반투명으로 겹쳐서 채움 위에서도 구간이 보인다 */}
              {pos.valuePos !== null && (
                <div
                  data-testid={`bar-fill-${row.key}`}
                  className="absolute inset-y-0 left-0 rounded-full bg-[#222]"
                  style={{ width: `${pos.valuePos * 100}%` }}
                />
              )}
              <div
                data-testid={`bar-zone-${row.key}`}
                className="absolute inset-y-0 z-10 bg-[#c4c4c4]"
                style={{ left: `${pos.zoneMinPos * 100}%`, right: `${100 - pos.zoneMaxPos * 100}%`, opacity: 0.85 }}
              />
            </div>
            {row.fixed && <p className="mt-1 text-[10px] text-slate-400">{FIXED_RANGE_NOTE}</p>}
          </>
        ) : (
          <p className="text-[11px] text-slate-400">표준 범위 정보가 없어요</p>
        )}
      </div>
    </div>
  )
}

// 리포트 "인바디 결과" 칸: 날짜 막대(◀ ▶) + 지표 행 5개 + 체형 분석
export default function InBodyResult({ history: rawHistory }: { history: InBodyHistoryEntry[] }) {
  const history = sortInBodyHistory(rawHistory) // 맨 앞 = 가장 최근 측정
  const { profile, meals, nutritionTarget, isDemo, aiMode, dispatch } = useApp()
  const [index, setIndex] = useState(0)
  // 체형 판정에 실패한 기록의 "재측정" — 인바디 추이의 새 측정 추가와 같은 스캔 화면을 쓴다.
  const [remeasureId, setRemeasureId] = useState<string | null>(null)
  // 인바디 추이의 새 측정 추가와 같은 안내 — 영양 목표가 자동으로 다시 계산됐다는 걸 알려준다.
  const [notice, setNotice] = useState<string | null>(null)

  if (remeasureId) {
    return (
      <InBodyScanFlow
        mode={resolveAnalysisMode(isDemo, aiMode)}
        onApply={(measurements: InBodyMeasurements) => {
          dispatch({ type: 'REPLACE_INBODY_ENTRY', id: remeasureId, measurements, source: 'scan' })
          setNotice('InBody 정보가 바뀌어 마이 탭의 개인 영양 목표도 자동으로 다시 계산했어요.')
          setRemeasureId(null)
        }}
        onClose={() => setRemeasureId(null)}
      />
    )
  }

  if (history.length === 0) return null

  // 기록이 지워져 번호가 범위를 벗어나도 안전하게 맞춘다
  const at = Math.min(index, history.length - 1)
  const entry = history[at]!
  const ranges = entry.standardRanges
  const bmi = profile && entry.weight !== null ? calculateBmi(profile.height, entry.weight) : null

  const rows: Row[] = [
    { key: 'weight', label: '체중', value: entry.weight, unit: 'kg', range: ranges?.weight ?? null },
    { key: 'skeletalMuscleMass', label: '골격근량', value: entry.skeletalMuscleMass, unit: 'kg', range: ranges?.skeletalMuscleMass ?? null },
    { key: 'bodyFatMass', label: '체지방량', value: entry.bodyFatMass, unit: 'kg', range: ranges?.bodyFatMass ?? null },
    { key: 'bodyFatPercentage', label: '체지방률', value: entry.bodyFatPercentage, unit: '%', range: bodyFatPercentRange(profile?.gender, entry.bodyFatPercentage), fixed: true },
    { key: 'bmi', label: 'BMI', value: bmi, unit: 'kg/m²', range: bmiRange(bmi), fixed: true },
  ]

  const hasOlder = at < history.length - 1
  const hasNewer = at > 0
  const arrow = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-30'

  return (
    <div className="space-y-3">
      {notice && <p className="rounded-xl bg-primary-softer px-3 py-2 text-xs text-primary-dark">{notice}</p>}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-primary px-2 py-2 text-white">
        <button type="button" aria-label="이전 측정" disabled={!hasOlder} onClick={() => setIndex(at + 1)} className={arrow}>
          <ChevronLeft size={20} />
        </button>
        <p className="min-w-0 text-center text-sm font-semibold">{formatMeasureDate(entry.timestamp)} 측정</p>
        <button type="button" aria-label="다음 측정" disabled={!hasNewer} onClick={() => setIndex(at - 1)} className={arrow}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white px-4">
        {rows.map((r) => (
          <MetricRow key={r.key} row={r} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-800">체형 분석</p>
        <BodyShapeChart entry={entry} meals={meals} nutritionTarget={nutritionTarget} onRemeasure={setRemeasureId} />
      </div>
    </div>
  )
}
