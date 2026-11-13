import { isSameDay } from './time'
import type { WaterLog } from '../types'

export function getTodayWaterTotal(logs: WaterLog[], now: number = Date.now()): number {
  return logs.filter((log) => isSameDay(log.timestamp, now)).reduce((sum, log) => sum + log.amount, 0)
}
