import Model, { type IExerciseData, type Muscle } from 'react-body-highlighter'
import { describeMuscles, getMuscleViews, MUSCLE_COLORS, type BodyView, type ExerciseGuide } from '../../lib/exerciseGuides'

/**
 * MuscleMap — 몸 앞면/뒷면 그림에서 운동하는 근육을 빨갛게 칠한다.
 * 주 근육은 진한 빨강, 보조 근육은 연한 빨강, 나머지 몸은 연한 회색.
 * (react-body-highlighter는 "여러 운동에 몇 번 들어 있나"로 색을 정한다 → 주 근육은 두 번, 보조 근육은 한 번 넣는다)
 */

const HIGHLIGHT_COLORS = [MUSCLE_COLORS.secondary, MUSCLE_COLORS.primary]

interface Props {
  /** 칠할 근육 정보. null이면 칠하지 않은 회색 몸만 그린다 */
  guide: ExerciseGuide | null
  view: BodyView
  /** true면 스크린 리더가 읽지 않는다(옆에 같은 정보가 글자로 있을 때) */
  decorative?: boolean
  /** aria-label 앞에 붙일 말(예: "앞면 ") */
  labelPrefix?: string
}

export default function MuscleMap({ guide, view, decorative = false, labelPrefix = '' }: Props) {
  const muscles = guide ? getMuscleViews(guide)[view] : { primary: [], secondary: [] }
  const data: IExerciseData[] = []
  if (muscles.primary.length > 0) {
    // 주 근육은 두 번 넣어서 진한 색(두 번째 색)이 되게 한다
    data.push({ name: 'primary-1', muscles: muscles.primary as Muscle[] }, { name: 'primary-2', muscles: muscles.primary as Muscle[] })
  }
  if (muscles.secondary.length > 0) data.push({ name: 'secondary', muscles: muscles.secondary as Muscle[] })

  const label = guide ? `${labelPrefix}자극 부위: ${describeMuscles(guide)}` : `${labelPrefix}근육 정보 없음`

  return (
    <div
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
      data-view={view}
      className="pointer-events-none h-full w-full [&_polygon]:cursor-default!"
    >
      <Model type={view} data={data} bodyColor={MUSCLE_COLORS.body} highlightedColors={HIGHLIGHT_COLORS} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
