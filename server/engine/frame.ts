import { getPrescription } from './data.js';
import type { DayFrame, FocusGroup, Frame, ResolvedGoal, WorkoutRequest } from './types.js';

const UPPER: FocusGroup[] = ['CHEST', 'SHOULDER', 'BACK', 'ARM'];
const LOWER: FocusGroup[] = ['LEGS', 'ABS']; // 복부를 하체일에 배치: 설계 가정
const FULL: FocusGroup[] = ['CHEST', 'SHOULDER', 'BACK', 'ARM', 'LEGS', 'ABS'];
/** 종목 수가 근육군 수보다 적을 때 먼저 확보할 근육군(대근육 우선) */
const COVER_PRIORITY: FocusGroup[] = ['LEGS', 'BACK', 'CHEST', 'SHOULDER', 'ARM', 'ABS'];

/** 통합규칙 4단계 + 종목수계산기 결과 */
const COUNT = { TIME_30: { count: 3, range: [3, 4] }, TIME_60: { count: 7, range: [6, 7] }, TIME_90: { count: 8, range: [8, 8] } } as const;

export function requiredGroups(groups: FocusGroup[], count: number): FocusGroup[] {
  if (count >= groups.length) return [...groups];
  return COVER_PRIORITY.filter((g) => groups.includes(g)).slice(0, count);
}

/** 통합규칙 3~4·6~7단계: 분할 · 종목 수 · 처방 수치 */
export function buildFrame(req: Pick<WorkoutRequest, 'frequency' | 'time' | 'experience'>, goal: ResolvedGoal): Frame {
  const { count, range } = COUNT[req.time];
  const cardio = goal === 'DIET'; // 체지방 감량: 유산소 병행(맨 뒤 1종목). 유산소 처방(시간 등)은 미정
  const mk = (day: number, label: string, groups: FocusGroup[]): DayFrame => ({
    day, label, groups, count, range: [range[0], range[1]], requiredGroups: requiredGroups(groups, count), cardio,
  });
  let days: DayFrame[];
  if (req.frequency === 'FREQ_2') days = [mk(1, '전신', FULL), mk(2, '전신', FULL)];
  else if (req.frequency === 'FREQ_3') days = [mk(1, '전신', FULL), mk(2, '전신', FULL), mk(3, '전신', FULL)];
  else days = [mk(1, '상체', UPPER), mk(2, '하체', LOWER), mk(3, '상체', UPPER), mk(4, '하체', LOWER)];
  return { days, prescription: getPrescription(goal, req.experience) };
}
