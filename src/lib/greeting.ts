import type { DayStatus } from './calendar'

export interface GreetingContext {
  streakDays: number
  hasLoggedToday: boolean
  yesterdayStatus: DayStatus
  hour: number // 0~23, 지금 시각
}

// 스트릭을 내세울 만큼 쌓였다고 볼 기준(1~2일은 아직 "연속"이라고 말하기엔 애매하다).
const STREAK_CALLOUT_THRESHOLD = 3
// 기록이 없으면 "아직 안 드셨나요"보다 "기록을 깜빡하셨나요"에 가까워지는 시각.
const MISSED_LOG_HOUR = 14

/**
 * 홈 화면 인사말의 "안녕하세요," 뒤에 붙는 문장. 매번 같은 말이 아니라 스트릭·어제 결과·
 * 지금 시각 중 가장 말할 가치가 있는 하나를 골라 코치처럼 말을 건다.
 * 우선순위: 스트릭 자랑 > 오늘 기록 누락 리마인드 > 어제 결과에 대한 반응 > 기본 문구.
 */
export function buildHomeGreeting({ streakDays, hasLoggedToday, yesterdayStatus, hour }: GreetingContext): string {
  if (streakDays >= STREAK_CALLOUT_THRESHOLD) {
    return `벌써 ${streakDays}일 연속 기록 중이에요! 오늘도 이어가볼까요?`
  }

  if (!hasLoggedToday && hour >= MISSED_LOG_HOUR) {
    return '아직 오늘 식사 기록이 없네요. 지금 바로 챙겨볼까요?'
  }

  if (yesterdayStatus === 'deficient' || yesterdayStatus === 'exceeded') {
    return '어제는 목표랑 조금 멀어졌는데, 오늘 다시 좋은 흐름 만들어봐요.'
  }

  if (yesterdayStatus === 'adequate' || yesterdayStatus === 'near_goal') {
    return '어제처럼 오늘도 좋은 흐름 이어가볼까요?'
  }

  return '오늘도 목표를 향해 달려볼까요?'
}
