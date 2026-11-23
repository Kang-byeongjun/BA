import { getExerciseGuide, getMuscleViews } from '../../lib/exerciseGuides'
import MuscleMap from './MuscleMap'

interface Props {
  /** 종목 id. 안내가 없는 종목(직접 입력 포함)이면 칠하지 않은 회색 몸을 보여준다 */
  id: string
  /** md: 약 56×80px(루틴 목록), sm: 약 36×52px(종목 고르는 창) */
  size?: 'md' | 'sm'
}

const SIZE_CLASS = { md: 'h-20 w-14', sm: 'h-[52px] w-9' } as const

// 종목 옆에 붙이는 작은 근육 맵. 칠할 근육이 더 많은 쪽(앞면 또는 뒷면) 한 면만 보여준다.
// 종목 이름이 바로 옆에 글자로 있으므로 스크린 리더에는 읽히지 않게 한다.
export default function ExerciseThumb({ id, size = 'md' }: Props) {
  const guide = getExerciseGuide(id)
  const view = guide ? getMuscleViews(guide).preferred : 'anterior'
  return (
    <div
      aria-hidden="true"
      data-testid="exercise-thumb"
      data-has-guide={guide ? 'true' : 'false'}
      data-view={view}
      className={`${SIZE_CLASS[size]} shrink-0 rounded-lg bg-slate-50 p-1`}
    >
      <MuscleMap guide={guide} view={view} decorative />
    </div>
  )
}
