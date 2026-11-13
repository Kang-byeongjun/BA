/**
 * restAlarm — 휴식이 끝났을 때 진동과 짧은 알림음을 낸다.
 * 지원하지 않는 기기·브라우저에서는 아무 일도 하지 않는다(오류를 내지 않음).
 *
 * 브라우저는 사용자가 화면을 누르기 전에는 소리를 막는다(자동 재생 정책).
 * 그래서 세트 완료 체크(=사용자 터치) 때 unlockRestAlarm()으로 소리 장치를 미리 깨워 둔다.
 */

type AudioCtor = typeof AudioContext

let ctx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const Ctor: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    ctx = null
  }
  return ctx
}

/** 사용자 터치 직후에 불러서 소리를 낼 수 있게 준비한다 */
export function unlockRestAlarm(): void {
  const ac = getAudioContext()
  if (ac && ac.state === 'suspended') void ac.resume().catch(() => {})
}

function beep(ac: AudioContext): void {
  // 880Hz '삐-삐' 두 번 (각 0.15초)
  const start = ac.currentTime
  for (const offset of [0, 0.25]) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.15)
    osc.connect(gain).connect(ac.destination)
    osc.start(start + offset)
    osc.stop(start + offset + 0.16)
  }
}

export function playRestAlarm(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate([200, 100, 200])
  } catch {
    // 진동 미지원
  }
  try {
    const ac = getAudioContext()
    if (ac) beep(ac)
  } catch {
    // 소리 미지원
  }
}
