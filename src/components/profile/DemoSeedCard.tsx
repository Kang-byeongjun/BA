import { useState } from 'react'
import { applyDemoSeed, hasDemoBackup, restoreDemoBackup } from '../../lib/demoSeed'

type Pending = 'fill' | 'restore' | null

// 개발자용 "시연 데이터" 카드(?dev=1일 때만 마이 탭 맨 아래에 보인다). AI·네트워크는 쓰지 않는다.
export default function DemoSeedCard() {
  const [pending, setPending] = useState<Pending>(null)
  const [hasBackup, setHasBackup] = useState(hasDemoBackup)
  const [message, setMessage] = useState<string | null>(null)
  const [details, setDetails] = useState<string[]>([])

  const fill = () => {
    const result = applyDemoSeed()
    setHasBackup(true)
    setMessage('시연 데이터를 채웠어요')
    setDetails([
      result.keptExistingBackup ? '이미 있던 백업은 그대로 두었어요(처음 상태 보존).' : '이전 상태를 백업했어요.',
      ...(result.mismatch.length > 0
        ? [`프로필의 인바디 기준 값이 마지막 인바디와 달라요: ${result.mismatch.join(' / ')}`]
        : ['프로필의 인바디 기준 값(체중·골격근량)이 마지막 인바디와 일치해요.']),
      '아래 "화면 새로고침"을 누르면 홈·리포트에 새 값이 반영돼요.',
    ])
    setPending(null)
  }

  const restore = () => {
    const ok = restoreDemoBackup()
    setHasBackup(hasDemoBackup())
    setMessage(ok ? '이전 상태로 되돌렸어요' : '되돌릴 백업이 없어요')
    setDetails(ok ? ['아래 "화면 새로고침"을 누르면 홈·리포트에 반영돼요.'] : [])
    setPending(null)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">시연 데이터</p>
      <p className="mt-1 text-xs text-slate-400">발표용 인바디·운동·식단 기록을 한 번에 채워요. 개발자용이에요.</p>

      {pending === null ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setPending('fill')}
            className="min-w-0 flex-1 rounded-full bg-primary px-2 py-2.5 text-sm font-semibold text-white"
          >
            시연 데이터 채우기
          </button>
          <button
            onClick={() => setPending('restore')}
            disabled={!hasBackup}
            className="min-w-0 flex-1 rounded-full border-2 border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전 상태로 되돌리기
          </button>
        </div>
      ) : (
        <div role="alertdialog" aria-label="시연 데이터 확인" className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            {pending === 'fill'
              ? '지금 저장된 인바디·운동·식단 기록을 시연용 기록으로 바꿔요. 이전 상태는 백업돼요.'
              : '백업해 둔 이전 상태로 되돌리고 백업을 지워요.'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPending(null)} className="flex-1 rounded-full border border-slate-200 bg-white py-2 font-semibold">
              취소
            </button>
            <button onClick={pending === 'fill' ? fill : restore} className="flex-1 rounded-full bg-primary py-2 font-semibold text-white">
              확인
            </button>
          </div>
        </div>
      )}

      {message && (
        <div role="status" className="mt-3 space-y-1 rounded-xl bg-primary-softer px-3 py-2 text-xs text-primary-dark">
          <p className="font-semibold">{message}</p>
          {details.map((d) => (
            <p key={d}>{d}</p>
          ))}
          <button onClick={() => window.location.reload()} className="mt-1 font-semibold underline">
            화면 새로고침
          </button>
        </div>
      )}
    </div>
  )
}
