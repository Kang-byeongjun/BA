import type { InBodyHistoryEntry, Meal, NutritionTarget } from '../types'
import { getDayStatusesInRange, getMonthlyDayStatuses } from './calendar'
import { sortInBodyHistory } from './inBodyHistoryOrder'
import { findComparisonEntry } from './inBodyTrend'
import { currentWeekDays, getDayWeekSeries } from './mealWeekTrend'

/**
 * 홈·대시보드의 한 줄 요약 숫자. 새 계산 규칙을 만들지 않고, 이미 있는 함수의 결과만 모은다.
 * (캘린더·주간 영양소·인바디 추이 컴포넌트가 쓰는 함수와 같은 것)
 */

/** 캘린더 "기록한 N일 중 N일 목표를 잘 지켰어요"와 같은 계산(이번 달) */
export function getMonthGoalSummary(
  meals: Meal[],
  target: NutritionTarget,
  now: number = Date.now(),
): { loggedDays: number; metDays: number } {
  const d = new Date(now)
  const days = getMonthlyDayStatuses(meals, target, d.getFullYear(), d.getMonth())
  const logged = days.filter((x) => x.status !== 'none')
  const met = logged.filter((x) => x.status === 'adequate' || x.status === 'near_goal')
  return { loggedDays: logged.length, metDays: met.length }
}

/** 이번 주 단백질 평균(기록한 날 기준, g)과 목표 달성 일수(캘린더와 같은 '적정·목표근접' 기준) */
export function getWeekProteinSummary(
  meals: Meal[],
  target: NutritionTarget,
  now: number = Date.now(),
): { avgProtein: number | null; metDays: number } {
  const series = getDayWeekSeries(meals, now)
  const logged = series.filter((d) => d.protein > 0)
  const avgProtein = logged.length > 0 ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length) : null
  const week = currentWeekDays(now)
  const statuses = getDayStatusesInRange(meals, target, week[0]!, week[6]!)
  const metDays = statuses.filter((s) => s === 'adequate' || s === 'near_goal').length
  return { avgProtein, metDays }
}

const round1 = (v: number) => Math.round(v * 10) / 10
const signed = (v: number) => `${v > 0 ? '+' : ''}${round1(v)}`

/** 인바디 접힌 요약: "체중 -N kg · 골격근 +N kg". 비교할 이전 측정이 없으면 최신 체중만, 기록이 없으면 null */
export function getInBodySummaryLine(rawHistory: InBodyHistoryEntry[]): string | null {
  const history = sortInBodyHistory(rawHistory) // 측정일 내림차순(맨 앞 = 가장 최근 측정)
  const latest = history[0]
  if (!latest) return null
  const prev = findComparisonEntry(history, latest)
  if (!prev) return latest.weight !== null ? `체중 ${latest.weight}kg · 비교할 이전 측정 없음` : '측정 1회'
  const parts: string[] = []
  if (latest.weight !== null && prev.weight !== null) parts.push(`체중 ${signed(latest.weight - prev.weight)}kg`)
  if (latest.skeletalMuscleMass !== null && prev.skeletalMuscleMass !== null) {
    parts.push(`골격근 ${signed(latest.skeletalMuscleMass - prev.skeletalMuscleMass)}kg`)
  }
  return parts.length > 0 ? parts.join(' · ') : `측정 ${history.length}회`
}

/**
 * 대시보드 "주간 영양소" 접힌 줄 요약 문장.
 * 이번 주 식사 기록이 하나도 없으면 안내 문구만, 있으면 "단백질 평균 · 목표 달성 N/7일".
 */
export function getWeekNutritionSummaryLine(meals: Meal[], target: NutritionTarget, now: number = Date.now()): string {
  const { avgProtein, metDays } = getWeekProteinSummary(meals, target, now)
  const hasMealThisWeek = getDayWeekSeries(meals, now).some((d) => d.calories > 0 || d.protein > 0 || d.carbohydrates > 0 || d.fat > 0 || d.fiber > 0)
  if (!hasMealThisWeek) return '이번 주 식사 기록이 아직 없어요'
  return `이번 주 단백질 평균 ${avgProtein === null ? '기록 없음' : `${avgProtein}g`} · 목표 달성 ${metDays}/7일`
}
