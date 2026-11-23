import type { Goal, WorkoutGoal } from '../types'

/**
 * 마이 탭 "나의 목표" 버튼(식단 목적) → 함께 바뀌는 운동 목표.
 * 나중에 대응을 바꾸려면 이 표만 고치면 된다.
 */
export const GOAL_TO_WORKOUT_GOAL: Record<Goal, WorkoutGoal> = {
  fat_loss: 'fat_loss',
  muscle_gain: 'muscle_gain',
  weight_maintain: 'body_shape',
  health_care: 'strength',
}
