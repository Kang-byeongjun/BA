export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function formatTimeOfDay(timestamp: number): string {
  const d = new Date(timestamp)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function formatDurationKorean(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}시간 ${m}분`
  if (h > 0) return `${h}시간`
  if (m > 0) return `${m}분`
  return `${seconds}초`
}

export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function inferMealSlot(timestamp: number): '아침' | '점심' | '저녁' | '간식' {
  const hour = new Date(timestamp).getHours()
  if (hour >= 5 && hour < 11) return '아침'
  if (hour >= 11 && hour < 15) return '점심'
  if (hour >= 17 && hour < 21) return '저녁'
  return '간식'
}
