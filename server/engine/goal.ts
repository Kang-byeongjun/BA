import type { ResolvedGoal, WorkoutRequest } from './types.js';

/** 목표자동추천 시트의 기준값 (설계 가정) */
export const FAT_THRESHOLD_KG = 1;
export const MUSCLE_THRESHOLD_KG = 1;

// 조건별 고정 문구 (LLM이 새 근거를 만들지 않도록). 초안 — 팀 검토 필요
const REASON = {
  both: '인바디 권장치가 지방은 줄이고 근육은 늘리라고 안내해요. 근육 운동을 중심으로 하고 유산소를 함께 하면 두 가지를 같이 노릴 수 있어요.',
  fat: '인바디 권장치가 지방을 줄이라고 안내해요. 근력 운동과 유산소를 함께 해서 체지방 감량에 집중해요.',
  muscle: '인바디 권장치가 근육을 늘리라고 안내해요. 근육 증가에 맞춘 근력 운동 위주로 구성해요.',
  neither: '인바디 권장치가 크게 조정할 부분이 없다고 안내해요. 전반적인 체력과 건강 유지에 맞춰 구성해요.',
} as const;

export function resolveGoal(req: Pick<WorkoutRequest, 'goal' | 'inbody'>): { goal: ResolvedGoal; reason: string | null } {
  if (req.goal !== 'UNSURE') return { goal: req.goal, reason: null };
  const { fatAdjustKg, muscleAdjustKg } = req.inbody;
  if (fatAdjustKg === undefined || muscleAdjustKg === undefined) {
    throw new Error("goal이 UNSURE이면 inbody.fatAdjustKg와 inbody.muscleAdjustKg가 필요합니다(권장치가 없는 기종은 별도 규칙 필요)");
  }
  const fat = fatAdjustKg <= -FAT_THRESHOLD_KG;
  const muscle = muscleAdjustKg >= MUSCLE_THRESHOLD_KG;
  if (fat && muscle) return { goal: 'MUSCLE', reason: REASON.both };
  if (fat) return { goal: 'DIET', reason: REASON.fat };
  if (muscle) return { goal: 'MUSCLE', reason: REASON.muscle };
  return { goal: 'FITNESS', reason: REASON.neither };
}
