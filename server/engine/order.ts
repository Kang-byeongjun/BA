import type { Exercise } from './types.js';

const jointRank = (e: Exercise) => (e.joint === 'MULTI' ? 0 : 1);     // R1: 다관절 → 단관절/등척성
const sizeRank = (e: Exercise) => (e.size === 'LARGE' ? 0 : 1);       // R2: 대근육 → 소근육

/** R1·R2·R4 정렬. 동률은 입력 순서 유지(안정 정렬). R3(우선 부위 먼저)는 경고 전용이라 여기서 강제하지 않는다 */
export function sortByRules<T extends { exercise: Exercise }>(items: T[]): T[] {
  const idx = new Map(items.map((x, i) => [x, i]));
  return [...items].sort((a, b) => {
    const ca = a.exercise.type === 'CARDIO' ? 1 : 0;
    const cb = b.exercise.type === 'CARDIO' ? 1 : 0;
    if (ca !== cb) return ca - cb;                                        // R4
    if (ca === 1) return 0;
    const j = jointRank(a.exercise) - jointRank(b.exercise);
    if (j !== 0) return j;                                                // R1
    const s = sizeRank(a.exercise) - sizeRank(b.exercise);
    if (s !== 0) return s;                                                // R2
    return idx.get(a)! - idx.get(b)!;
  });
}
