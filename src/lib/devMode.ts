import { useEffect, useState } from 'react'

/**
 * 숨겨진 "업데이트 노트" 패널 잠금 해제 상태. 팀원 데모용 — 일반 사용자 플로우에는 노출되지 않고,
 * 특정 요소를 짧은 시간 안에 여러 번 탭해야 풀린다(안드로이드 개발자 모드와 같은 패턴).
 * 한 번 풀리면 localStorage에 남아 새로고침해도 다시 탭할 필요가 없다.
 */
const STORAGE_KEY = 'devModeUnlocked'
const TAP_THRESHOLD = 4
const TAP_WINDOW_MS = 5000

export function useDevMode(): [boolean, () => void] {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!unlocked) return
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // 저장 실패해도(프라이빗 모드 등) 이번 세션에서는 계속 풀린 상태로 둔다.
    }
  }, [unlocked])

  return [unlocked, () => setUnlocked(true)]
}

/** 짧은 시간 안에 n번 탭했는지 세는 카운터. onUnlock은 임계치를 넘는 순간 한 번만 호출된다. */
export function useSecretTapCounter(onUnlock: () => void) {
  const [taps, setTaps] = useState<number[]>([])

  const registerTap = () => {
    const now = Date.now()
    const recent = [...taps.filter((t) => now - t < TAP_WINDOW_MS), now]
    if (recent.length >= TAP_THRESHOLD) {
      setTaps([])
      onUnlock()
      return
    }
    setTaps(recent)
  }

  return registerTap
}
