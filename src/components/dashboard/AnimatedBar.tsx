import { useEffect, useState } from 'react'

// 화면을 벗어났다가(예: 촬영 → 저장 후 홈으로 복귀) 다시 그려질 때 이전 너비에서 새 너비로 애니메이션되도록 기억해둔다.
const previousWidths = new Map<string, number>()

interface Props {
  // 바를 구분하는 값 (영양소 이름 등)
  id: string
  // 0~100
  width: number
  trackClass: string
  fillClass: string
  heightClass: string
}

export default function AnimatedBar({ id, width, trackClass, fillClass, heightClass }: Props) {
  const [shown, setShown] = useState(() => previousWidths.get(id) ?? 0)

  useEffect(() => {
    // 이전 너비가 먼저 그려진 뒤 새 너비로 바뀌어야 CSS transition이 동작한다.
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setShown(width)
        previousWidths.set(id, width)
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [id, width])

  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-full ${trackClass}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`}
        style={{ width: `${shown}%` }}
      />
    </div>
  )
}
