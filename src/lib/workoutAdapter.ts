import type { WorkoutRequest } from '../../server/engine/types'
import type { PainArea, WorkoutExperience, WorkoutGoal, WorkoutProfile } from '../types'
import { PAIN_AREA_LABELS } from '../types'

/**
 * workoutAdapter — 팀원 앱의 WorkoutProfile을 운동 추천 엔진이 받는 WorkoutRequest로 바꾼다.
 * (엔진 타입은 `import type`으로만 가져오므로 브라우저 번들에 서버 코드가 들어가지 않는다)
 */

type EnginePain = WorkoutRequest['pain'][number]

// TODO(팀과 확정 필요): strength·body_shape는 엔진에 딱 맞는 목표가 없어 임시로 MUSCLE·FITNESS에 연결했다.
const GOAL_MAP: Record<WorkoutGoal, WorkoutRequest['goal']> = {
  fat_loss: 'DIET',
  muscle_gain: 'MUSCLE',
  strength: 'MUSCLE', // 임시 — 팀과 확정 필요
  body_shape: 'FITNESS', // 임시 — 팀과 확정 필요
}

const EXPERIENCE_MAP: Record<WorkoutExperience, WorkoutRequest['experience']> = {
  beginner: 'BEGINNER',
  intermediate: 'INTERMEDIATE',
  advanced: 'ADVANCED',
}

// TODO(팀과 확정 필요): wrist·ankle은 엔진에 해당 부위가 없어 null(변환에서 제외) → 화면에서 따로 안내한다.
const PAIN_MAP: Record<PainArea, EnginePain | null> = {
  shoulder: 'SHOULDER',
  back: 'LOWBACK',
  knee: 'KNEE',
  wrist: null, // 엔진에 없음 — 팀과 확정 필요
  ankle: null, // 엔진에 없음 — 팀과 확정 필요
}

/** 주당 횟수: 2회 이하 / 3회 / 4회 이상 */
export function toFrequency(weeklyFrequency: number): WorkoutRequest['frequency'] {
  if (weeklyFrequency <= 2) return 'FREQ_2'
  if (weeklyFrequency === 3) return 'FREQ_3'
  return 'FREQ_4P'
}

/**
 * 1회 운동 시간(분): 30분 이하 / 31~60분 / 61분 이상.
 * TODO(팀과 확정 필요): 앱 기본값인 45분은 엔진 구간이 30·60·90뿐이라 임시로 TIME_60에 넣는다.
 */
export function toTimeSlot(sessionDuration: number): WorkoutRequest['time'] {
  if (sessionDuration <= 30) return 'TIME_30'
  if (sessionDuration <= 60) return 'TIME_60'
  return 'TIME_90'
}

export interface WorkoutAdapterResult {
  /** 엔진에 그대로 보낼 요청 */
  request: WorkoutRequest
  /** 엔진이 다루지 못해 변환에서 뺀 통증 부위(손목·발목). 화면 안내용 */
  unsupportedPains: PainArea[]
}

export function toWorkoutRequest(profile: WorkoutProfile): WorkoutAdapterResult {
  const pain: EnginePain[] = []
  const unsupportedPains: PainArea[] = []
  for (const area of profile.painAreas) {
    const mapped = PAIN_MAP[area]
    if (mapped === null) {
      if (!unsupportedPains.includes(area)) unsupportedPains.push(area)
    } else if (!pain.includes(mapped)) {
      pain.push(mapped)
    }
  }

  return {
    request: {
      goal: GOAL_MAP[profile.goal],
      experience: EXPERIENCE_MAP[profile.experience],
      frequency: toFrequency(profile.weeklyFrequency),
      time: toTimeSlot(profile.sessionDuration),
      // 순서만 다른 같은 통증 목록이 같은 요청으로 취급되도록 정렬한다(결과 재사용 키에 쓰임).
      pain: pain.sort(),
      // 집중 부위·인바디 취약 구획은 아직 앱에 입력이 없다. 입력 방식이 정해지면 여기만 고친다.
      focus: [],
      inbody: { weak: { arm: false, trunk: false, leg: false } },
    },
    unsupportedPains,
  }
}

/** 빠진 부위 안내 문구. 없으면 null. 예) "손목·발목 통증은 아직 추천에 반영되지 않아요. …" */
export function unsupportedPainNotice(areas: PainArea[]): string | null {
  if (areas.length === 0) return null
  const names = areas.map((a) => PAIN_AREA_LABELS[a]).join('·')
  return `${names} 통증은 아직 추천에 반영되지 않아요. 해당 부위에 부담이 가는 동작은 피하고, 통증이 있으면 바로 멈춰주세요.`
}
