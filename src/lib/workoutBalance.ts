import type { WorkoutDashboardSummary } from './workoutSummary'

/** 가장 적은 부위가 근력 운동 전체의 이 비율보다 작으면 균형 안내를 보여준다 */
export const BALANCE_THRESHOLD = 0.15

/** 받침(마지막 글자 끝소리) 유무에 따라 '이/가' 중 하나를 붙인다 */
function withSubject(word: string): string {
  const code = word.charCodeAt(word.length - 1)
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
  return `${word}${hasBatchim ? '이' : '가'}`
}

/**
 * 부위별 볼륨(규칙 기반, AI 아님)으로 한 줄 균형 안내를 만든다. 안내할 게 없으면 null.
 * 유산소·기타는 근력 균형에서 뺀다. 이번 주에 기록된 근력 부위가 2개 미만이면 비교하지 않는다.
 */
export function getBalanceAdvice(
  muscleVolumes: WorkoutDashboardSummary['muscleVolumes'],
  threshold = BALANCE_THRESHOLD,
): string | null {
  const strength = muscleVolumes.filter((m) => m.group !== 'CARDIO' && m.group !== 'OTHER' && Number.isFinite(m.volume) && m.volume > 0)
  if (strength.length < 2) return null
  const total = strength.reduce((s, m) => s + m.volume, 0)
  if (total <= 0) return null
  const lowest = strength.reduce((a, b) => (b.volume < a.volume ? b : a))
  if (lowest.volume / total >= threshold) return null
  return `${withSubject(lowest.label)} 적어요. 다음 루틴에서 늘려보세요`
}
