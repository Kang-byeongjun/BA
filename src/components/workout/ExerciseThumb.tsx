import { getExerciseGuide, getMuscleViews, getThumbFocus, type ThumbFocus } from '../../lib/exerciseGuides'
import MuscleMap from './MuscleMap'

interface Props {
  /** 종목 id. 안내가 없는 종목(직접 입력 포함)이면 칠하지 않은 회색 몸을 보여준다 */
  id: string
  /** md: 약 56×80px(루틴 목록), sm: 약 36×52px(종목 고르는 창) */
  size?: 'md' | 'sm'
}

const SIZE_CLASS = { md: 'h-20 w-14', sm: 'h-[52px] w-9' } as const

// 몸 그림은 가로 100 × 세로 200 비율이다. 하체·상체 위주 종목은 1.25배로 키워서(가로는 양끝을 조금 자른다)
// 허리 위(위쪽 114/200) 또는 허리 아래(아래쪽 114/200)만 보이게 한다. 몸 전체 종목은 그대로 전체를 보여준다.
const ZOOM_BOX: Record<ThumbFocus, { width: string; height: string; left: string; top: string }> = {
  full: { width: '100%', height: '100%', left: '0', top: '0' },
  upper: { width: '125%', height: '175%', left: '-12.5%', top: '0' },
  lower: { width: '125%', height: '175%', left: '-12.5%', top: '-75%' },
}

// 종목 옆에 붙이는 작은 근육 맵. 칠할 근육이 더 많은 쪽(앞면 또는 뒷면) 한 면만 보여준다.
// 종목 이름이 바로 옆에 글자로 있으므로 스크린 리더에는 읽히지 않게 한다.
export default function ExerciseThumb({ id, size = 'md' }: Props) {
  const guide = getExerciseGuide(id)
  const view = guide ? getMuscleViews(guide).preferred : 'anterior'
  const focus: ThumbFocus = guide ? getThumbFocus(guide) : 'full'
  return (
    <div
      aria-hidden="true"
      data-testid="exercise-thumb"
      data-has-guide={guide ? 'true' : 'false'}
      data-view={view}
      data-focus={focus}
      className={`${SIZE_CLASS[size]} relative shrink-0 overflow-hidden rounded-lg bg-slate-50 p-1`}
    >
      <div className="relative h-full w-full">
        <div className="absolute" style={ZOOM_BOX[focus]}>
          <MuscleMap guide={guide} view={view} decorative />
        </div>
      </div>
    </div>
  )
}
