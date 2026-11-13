import { isSameDay } from './time'
import type { WaterLog } from '../types'

export function getTodayWaterTotal(logs: WaterLog[], now: number = Date.now()): number {
  return logs.filter((log) => isSameDay(log.timestamp, now)).reduce((sum, log) => sum + log.amount, 0)
}

// 홈/식단 탭 둘 다에서 똑같은 원탭 기록 버튼을 쓴다.
export const QUICK_WATER_AMOUNTS = [
  { label: '한 컵', ml: 200 },
  { label: '생수 한 병', ml: 500 },
]
