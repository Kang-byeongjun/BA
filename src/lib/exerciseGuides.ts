import guidesJson from '../data/exerciseGuides.json'
import { TYPED_ID_PREFIX } from './routineEdit'

/**
 * exerciseGuides — 종목별 "자극 근육 + 수행 방법" 안내. 데이터는 src/data/exerciseGuides.json(종목 id → 안내).
 * 화면 그리기는 react-body-highlighter 라이브러리가 하고, 이 파일은 "어떤 근육을 앞면/뒷면 어디에 칠할지"만 정한다.
 */

/** 안내 데이터에서 쓰는 근육 이름(react-body-highlighter의 근육 이름과 같다) */
export type GuideMuscle =
  | 'chest'
  | 'upper-back'
  | 'lower-back'
  | 'trapezius'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'front-deltoids'
  | 'back-deltoids'
  | 'abs'
  | 'obliques'
  | 'quadriceps'
  | 'hamstring'
  | 'gluteal'
  | 'adductor'
  | 'calves'

export interface ExerciseGuide {
  muscles: { primary: GuideMuscle[]; secondary: GuideMuscle[] }
  /** 수행 방법(3~5단계, 한 단계는 한 문장) */
  steps: string[]
  /** 흔한 실수·호흡·주의사항(1~2개) */
  tips: string[]
}

const GUIDES = guidesJson as unknown as Record<string, ExerciseGuide>

/** 종목 id의 안내. 없거나 직접 입력한 종목(custom-…)이면 null */
export function getExerciseGuide(id: string | null | undefined): ExerciseGuide | null {
  if (!id || id.startsWith(TYPED_ID_PREFIX)) return null
  return Object.hasOwn(GUIDES, id) ? GUIDES[id]! : null
}

export const MUSCLE_LABELS_KO: Record<GuideMuscle, string> = {
  chest: '가슴',
  'upper-back': '등(광배·중부)',
  'lower-back': '허리(척추기립근)',
  trapezius: '승모근',
  biceps: '이두근',
  triceps: '삼두근',
  forearm: '전완',
  'front-deltoids': '어깨(앞·측면)',
  'back-deltoids': '어깨(뒤)',
  abs: '복근',
  obliques: '옆구리(복사근)',
  quadriceps: '대퇴사두근',
  hamstring: '햄스트링',
  gluteal: '둔근',
  adductor: '내전근(허벅지 안쪽)',
  calves: '종아리',
}

/** 근육 맵 색: 몸(연한 회색) · 보조 근육(연한 빨강) · 주 근육(빨강) */
export const MUSCLE_COLORS = { body: '#d9dee5', secondary: '#fca5a5', primary: '#ef4444' } as const

export type BodyView = 'anterior' | 'posterior'

/**
 * 몸 그림 라이브러리가 실제로 그리는 근육(앞면/뒷면).
 * - 앞면에만: chest, abs, obliques, quadriceps, front-deltoids, biceps
 * - 뒷면에만: upper-back, lower-back, trapezius, back-deltoids, hamstring, gluteal
 * - 양쪽: triceps, forearm, calves
 * - adductor(허벅지 안쪽): 라이브러리가 앞면 'abductors'·뒷면 'adductor'라는 이름으로 그린다(이름이 반대로 붙어 있다).
 */
const VIEW_MUSCLES: Record<BodyView, Partial<Record<GuideMuscle, string>>> = {
  anterior: {
    chest: 'chest',
    abs: 'abs',
    obliques: 'obliques',
    quadriceps: 'quadriceps',
    'front-deltoids': 'front-deltoids',
    biceps: 'biceps',
    triceps: 'triceps',
    forearm: 'forearm',
    calves: 'calves',
    adductor: 'abductors',
  },
  posterior: {
    'upper-back': 'upper-back',
    'lower-back': 'lower-back',
    trapezius: 'trapezius',
    'back-deltoids': 'back-deltoids',
    hamstring: 'hamstring',
    gluteal: 'gluteal',
    triceps: 'triceps',
    forearm: 'forearm',
    calves: 'calves',
    adductor: 'adductor',
  },
}

export interface ViewMuscles {
  /** 진하게 칠할 근육(라이브러리 이름) */
  primary: string[]
  /** 연하게 칠할 근육(라이브러리 이름) */
  secondary: string[]
}

export interface MuscleViews {
  anterior: ViewMuscles
  posterior: ViewMuscles
  /** 썸네일에 쓸 대표 면: 칠할 근육이 더 많은 쪽(같으면 주 근육이 많은 쪽, 그래도 같으면 앞면) */
  preferred: BodyView
}

function viewOf(guide: ExerciseGuide, view: BodyView): ViewMuscles {
  const table = VIEW_MUSCLES[view]
  const primary = guide.muscles.primary.flatMap((m) => table[m] ?? [])
  // 주 근육이면서 보조 근육으로도 적혀 있으면 주 근육으로만 칠한다
  const secondary = guide.muscles.secondary.flatMap((m) => (guide.muscles.primary.includes(m) ? [] : (table[m] ?? [])))
  return { primary, secondary }
}

export function getMuscleViews(guide: ExerciseGuide): MuscleViews {
  const anterior = viewOf(guide, 'anterior')
  const posterior = viewOf(guide, 'posterior')
  const count = (v: ViewMuscles) => v.primary.length + v.secondary.length
  let preferred: BodyView = 'anterior'
  if (count(posterior) > count(anterior) || (count(posterior) === count(anterior) && posterior.primary.length > anterior.primary.length)) {
    preferred = 'posterior'
  }
  return { anterior, posterior, preferred }
}

/** "대퇴사두근, 둔근"처럼 한글 근육 이름을 이어 붙인다(주 근육 먼저) */
export function describeMuscles(guide: ExerciseGuide): string {
  const names = [...guide.muscles.primary, ...guide.muscles.secondary.filter((m) => !guide.muscles.primary.includes(m))]
  return names.map((m) => MUSCLE_LABELS_KO[m]).join(', ')
}
