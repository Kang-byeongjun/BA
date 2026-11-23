// 리포트 "변화 추이" 꺾은선 카드의 좌표·라벨 계산(보여주는 용도만, 저장 데이터는 건드리지 않는다).

export interface TrendInput {
  timestamp: number
  value: number
}

export interface TrendPoint extends TrendInput {
  x: number
  y: number
}

export interface TrendBox {
  width: number
  height: number
  padX: number
  padTop: number
  padBottom: number
}

/** 값을 SVG 좌표로 바꾼다. 점이 하나면 가운데, 값이 모두 같으면 평평한 선(세로 가운데)으로 놓는다. */
export function layoutTrend(points: TrendInput[], box: TrendBox): TrendPoint[] {
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const plotH = box.height - box.padTop - box.padBottom
  const innerW = box.width - box.padX * 2
  return points.map((p, i) => ({
    ...p,
    x: points.length === 1 ? box.width / 2 : box.padX + (i / (points.length - 1)) * innerW,
    y: max === min ? box.padTop + plotH / 2 : box.padTop + (1 - (p.value - min) / (max - min)) * plotH,
  }))
}

/** 이웃한 점 사이 간격이 라벨 너비보다 넓으면 모든 라벨을 보여줘도 겹치지 않는다. */
export function labelsFit(count: number, innerWidth: number, labelWidth: number): boolean {
  if (count <= 1) return true
  return innerWidth / (count - 1) >= labelWidth
}

/** 라벨이 겹치면 처음·마지막만 보인다. 보일 점의 번호 집합 */
export function visibleLabelIndexes(count: number, fit: boolean): Set<number> {
  if (fit) return new Set(Array.from({ length: count }, (_, i) => i))
  return new Set(count <= 1 ? [0] : [0, count - 1])
}

/** 글자 수로 어림잡은 라벨 너비(px). 숫자는 폭이 거의 일정해서 이 정도면 충분하다. */
export function estimateLabelWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62 + 6
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 모든 점이 같은 연도면 MM.DD, 아니면 YY.MM.DD */
export function formatPointDates(timestamps: number[]): string[] {
  const dates = timestamps.map((t) => new Date(t))
  const sameYear = dates.every((d) => d.getFullYear() === dates[0]!.getFullYear())
  return dates.map((d) =>
    sameYear ? `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}` : `${pad2(d.getFullYear() % 100)}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`,
  )
}

/** "2025년 08월 04일" */
export function formatMeasureDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}년 ${pad2(d.getMonth() + 1)}월 ${pad2(d.getDate())}일`
}
