import { EXERCISES } from './data.js';
import type { Candidate, Exercise, FocusGroup, PainPart, ResolvedGoal, WorkoutRequest, MuscleGroup } from './types.js';

const DIFF_CAP = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 } as const;
export const TRUNK_GROUPS: FocusGroup[] = ['CHEST', 'SHOULDER', 'BACK', 'ABS'];

/** A단계: F1(난이도) · F2(통증 높음 제외) · F2b(주의) + 점수(S1·S2·S3·S5) */
export function buildCandidates(
  req: Pick<WorkoutRequest, 'experience' | 'pain' | 'focus' | 'inbody'>,
  goal: ResolvedGoal,
  exercises: Exercise[] = EXERCISES,
): Candidate[] {
  const cap = DIFF_CAP[req.experience];
  const out: Candidate[] = [];
  for (const ex of exercises) {
    if (ex.difficulty > cap) continue;                                   // F1
    const levels = req.pain.map((p) => ex.burden[p]);
    if (levels.includes('HIGH')) continue;                               // F2
    const cautionParts: PainPart[] = req.pain.filter((p) => ex.burden[p] === 'MID'); // F2b
    out.push({ exercise: ex, score: score(ex, req, goal, cautionParts.length > 0), cautionParts });
  }
  return out;
}

function score(ex: Exercise, req: Pick<WorkoutRequest, 'focus' | 'inbody'>, goal: ResolvedGoal, caution: boolean): number {
  if (ex.type === 'CARDIO') return 0; // 유산소는 점수에서 제외(유산소 처방 미정)
  let s = 0;
  if (req.focus.includes(ex.group as FocusGroup)) s += 3;                // S1
  const w = req.inbody.weak;                                             // S2
  if (ex.group === 'ARM' && w.arm) s += 2;
  else if (ex.group === 'LEGS' && w.leg) s += 2;
  else if (TRUNK_GROUPS.includes(ex.group as FocusGroup) && w.trunk) s += 1;
  if (goal === 'DIET' && ex.size === 'LARGE') s += 1;                    // S3
  if (goal === 'MUSCLE' && ex.joint === 'MULTI') s += 1;
  if (caution) s -= 2;                                                   // S5
  return s;
}

/** 우선 부위(R3·점수 힌트용): 집중 부위 + 인바디 취약 구획 */
export function priorityGroups(req: Pick<WorkoutRequest, 'focus' | 'inbody'>): Set<MuscleGroup> {
  const s = new Set<MuscleGroup>(req.focus);
  if (req.inbody.weak.arm) s.add('ARM');
  if (req.inbody.weak.leg) s.add('LEGS');
  if (req.inbody.weak.trunk) TRUNK_GROUPS.forEach((g) => s.add(g));
  return s;
}

export function countByGroup(cands: Candidate[]): Record<MuscleGroup, number> {
  const c: Record<MuscleGroup, number> = { CHEST: 0, SHOULDER: 0, BACK: 0, ARM: 0, LEGS: 0, ABS: 0, CARDIO: 0 };
  for (const x of cands) c[x.exercise.group]++;
  return c;
}
