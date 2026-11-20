import { useMemo, useState } from 'react'
import type { WorkoutResult } from '../../../server/engine/types'
import { toWorkoutRequest, unsupportedPainNotice } from '../../lib/workoutAdapter'
import {
  getCachedWorkoutRoutine,
  getWorkoutRoutine,
  saveEditedWorkoutRoutine,
  type WorkoutRoutineResponse,
} from '../../services/workoutService'
import type { WorkoutProfile } from '../../types'
import RoutineView, { type RoutineDay } from './RoutineView'

/**
 * RoutineSection — 운동 탭 맨 위의 "추천 루틴" 카드.
 * - 처음 열 때는 저장된 결과만 보여준다(서버 호출 없음).
 * - 버튼을 눌렀을 때만 /api/workout을 부른다 → AI 키 한도를 아낀다.
 * - 종목 바꾸기·추가·삭제는 브라우저에서만 처리하고 따로 저장한다(AI 호출 없음).
 * WorkoutScreen은 프로필만 넘기고, 불러오기·로딩·오류 처리는 여기서 한다.
 */

interface Props {
  profile: WorkoutProfile | null
  /** 일차 탭 아래 "이 루틴으로 운동 시작"을 눌렀을 때 */
  onStart?: (day: RoutineDay) => void
}

export default function RoutineSection({ profile, onStart }: Props) {
  const [data, setData] = useState<WorkoutRoutineResponse | null>(() => (profile ? getCachedWorkoutRoutine(profile) : null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 직접 바꾼 내용이 있을 때 "다시 만들기"를 누르면 먼저 물어본다
  const [confirmReset, setConfirmReset] = useState(false)

  // 프로필이 바뀌면 그 프로필에 맞는 저장값으로 바꿔 보여준다(없으면 비움).
  // (useEffect 대신 렌더 중에 바로 맞추는 React 권장 방식 — 화면이 한 번 덜 깜빡인다)
  const [shownFor, setShownFor] = useState(profile)
  if (shownFor !== profile) {
    setShownFor(profile)
    setData(profile ? getCachedWorkoutRoutine(profile) : null)
    setError(null)
    setConfirmReset(false)
  }

  const generate = async () => {
    if (!profile || loading) return
    setConfirmReset(false)
    setLoading(true)
    setError(null)
    try {
      setData(await getWorkoutRoutine(profile, { force: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '루틴을 만들지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const onRegenerateClick = () => {
    if (data?.edited) setConfirmReset(true)
    else void generate()
  }

  const onEdit = (next: WorkoutResult) => {
    if (!profile || !data) return
    saveEditedWorkoutRoutine(profile, next)
    setData({ ...data, result: next, fromCache: true, edited: true })
  }

  const editContext = useMemo(() => {
    if (!profile) return null
    const { request } = toWorkoutRequest(profile)
    return { pain: request.pain, experience: request.experience }
  }, [profile])

  const notice = data ? unsupportedPainNotice(data.unsupportedPains) : null

  return (
    <section aria-label="추천 루틴" className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">추천 루틴</h2>
        {profile && (
          <button
            onClick={onRegenerateClick}
            disabled={loading}
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? '만드는 중…' : data ? '다시 만들기' : '루틴 만들기'}
          </button>
        )}
      </div>

      {!profile ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">운동 프로필을 먼저 입력해주세요</p>
      ) : (
        <>
          {confirmReset && (
            <div role="alertdialog" aria-label="다시 만들기 확인" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>직접 바꾼 내용이 사라지고 AI 추천으로 되돌아가요. 계속할까요?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-full border border-amber-200 bg-white py-1.5 font-semibold">
                  취소
                </button>
                <button onClick={() => void generate()} className="flex-1 rounded-full bg-emerald-500 py-1.5 font-semibold text-white">
                  네, 다시 만들기
                </button>
              </div>
            </div>
          )}
          {loading && (
            <p role="status" className="text-sm text-emerald-700">
              맞춤 루틴을 만들고 있어요. 잠시만 기다려주세요…
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {notice && <p className="text-xs text-slate-500">ⓘ {notice}</p>}
          {data ? (
            <RoutineView
              result={data.result}
              onStart={onStart}
              edited={data.edited}
              edit={editContext && !loading ? { context: editContext, onChange: onEdit } : undefined}
            />
          ) : (
            !loading && (
              <p className="rounded-2xl bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
                운동 프로필에 맞춘 루틴을 만들어 드릴게요. 위의 <b>루틴 만들기</b>를 눌러주세요.
              </p>
            )
          )}
        </>
      )}
    </section>
  )
}
