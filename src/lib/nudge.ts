import type { MealSlot } from '../types'

export interface HomeNudge {
  message: string
  action: 'log-dinner' | 'add-water'
}

// 저녁 7시가 넘었는데 저녁 기록이 없으면 물어본다("놓친 것 같은데요?").
const DINNER_CHECK_HOUR = 19
// 오후 6시 기준으로 목표의 30%도 못 마셨으면 뒤처진 걸로 본다.
const WATER_CHECK_HOUR = 18
const WATER_BEHIND_RATIO = 0.3

/**
 * 홈 화면 상단에 딱 하나만 띄울 "놓친 것 같은데요?" 넛지. 여러 개를 동시에 보여주면
 * 잔소리처럼 느껴지므로, 가장 급한 것 하나만 고른다(저녁 기록 > 물 섭취).
 */
export function getHomeNudge(params: {
  hour: number
  loggedSlots: Set<MealSlot>
  waterMl: number
  waterTargetMl: number
}): HomeNudge | null {
  const { hour, loggedSlots, waterMl, waterTargetMl } = params

  if (hour >= DINNER_CHECK_HOUR && !loggedSlots.has('저녁')) {
    return { message: '저녁 식사가 아직 기록되지 않았어요. 오늘 저녁엔 뭘 드셨나요?', action: 'log-dinner' }
  }

  if (hour >= WATER_CHECK_HOUR && waterMl < waterTargetMl * WATER_BEHIND_RATIO) {
    return { message: '오늘 물을 거의 못 드셨네요. 지금 한 잔 마셔볼까요?', action: 'add-water' }
  }

  return null
}
