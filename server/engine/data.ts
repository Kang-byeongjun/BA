import exercisesJson from './data/exercises.json' with { type: 'json' };
import prescriptionJson from './data/prescription.json' with { type: 'json' };
import type { Exercise, Prescription, Experience, ResolvedGoal } from './types.js';

export const EXERCISES = exercisesJson as unknown as Exercise[];

type RxRow = Prescription & { goal: ResolvedGoal; experience: Experience };
const ROWS = prescriptionJson as unknown as RxRow[];

export function getPrescription(goal: ResolvedGoal, experience: Experience): Prescription {
  const row = ROWS.find((r) => r.goal === goal && r.experience === experience);
  if (!row) throw new Error(`처방표에 없는 조합: ${goal}/${experience}`);
  return row;
}
