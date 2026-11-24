/**
 * "내 운동, 잘하고 있을까요?" 진단 카드가 쓰는 타입.
 * 판정과 숫자는 모두 앱 코드(src/lib/coachingInsight.ts)가 정하고, AI는 "보완할 점"의 문장만 쓴다.
 */

export type CoachingGoal = 'fat_loss' | 'muscle_gain' | 'strength' | 'body_shape'

export type Verdict = 'on_track' | 'muscle_loss' | 'check_method' | 'need_consistency' | 'need_data'

/** 결과(인바디 변화). 비교할 측정이 없으면 delta는 null */
export interface ResultFacts {
  measurements: number
  periodDays: number
  weightDelta: number | null
  muscleDelta: number | null
  fatDelta: number | null
}

/** 과정(실천) */
export interface ProcessFacts {
  /** 어제까지 최근 7일 중 식단을 기록한 날 */
  dietLoggedDays: number
  /** 그중 목표를 지킨 날 */
  dietOnTrackDays: number
  /** 기록한 날 평균 단백질 ÷ 목표 단백질 (%). 기록이 없으면 null */
  proteinPercent: number | null
  /** 하루 평균 단백질(g) / 목표 단백질(g) — 부족분 계산용 */
  avgProtein: number | null
  targetProtein: number
  /** 최근 3주 운동 횟수 */
  workoutSessions: number
  /** 앞쪽 절반 대비 뒤쪽 절반 평균 볼륨 변화(%). 비교 불가면 null */
  volumeChangePercent: number | null
}

export type GapId = 'muscle' | 'result' | 'protein' | 'diet' | 'workout' | 'record' | 'inbody'

/** 목표 대비 벗어난 항목 하나. AI에게는 이 값(숫자)만 보낸다. */
export interface Gap {
  id: GapId
  label: string
  current: number
  target: number
  unit: string
}

/** /api/insight 요청 본문 */
export interface InsightRequest {
  goalLabel: string
  verdict: Verdict
  gaps: Gap[]
}
