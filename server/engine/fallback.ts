import type { Candidate, Frame, FocusGroup, LlmOutput } from './types.js';
import { sortByRules } from './order.js';

const byScore = (a: Candidate, b: Candidate) =>
  b.score - a.score || a.exercise.difficulty - b.exercise.difficulty || a.exercise.id.localeCompare(b.exercise.id);

/** LLM 실패 시 규칙만으로 만드는 기본 루틴: 필수 근육군 확보 → 균형 있게 채우기 → R1·R2·R4 정렬 */
export function fallbackRoutine(frame: Frame, cands: Candidate[]): LlmOutput {
  const usedAcrossDays = new Map<string, number>();
  const days = frame.days.map((day) => {
    const pool = cands
      .filter((c) => c.exercise.type === 'STRENGTH' && day.groups.includes(c.exercise.group as FocusGroup))
      .sort(byScore);
    const picked: Candidate[] = [];
    const perGroup = new Map<string, number>();
    const take = (c: Candidate) => {
      picked.push(c);
      perGroup.set(c.exercise.group, (perGroup.get(c.exercise.group) ?? 0) + 1);
      usedAcrossDays.set(c.exercise.id, (usedAcrossDays.get(c.exercise.id) ?? 0) + 1);
    };
    // 일차마다 같은 종목만 반복하지 않도록: 다른 날 이미 쓴 종목은 뒤로
    const fresh = (c: Candidate) => usedAcrossDays.get(c.exercise.id) ?? 0;
    const ranked = [...pool].sort((a, b) => fresh(a) - fresh(b) || byScore(a, b));

    for (const g of day.requiredGroups) {
      const c = ranked.find((x) => x.exercise.group === g && !picked.includes(x));
      if (c) take(c);
    }
    while (picked.length < day.count) {
      // 선택된 종목이 적은 근육군 우선, 그 안에서 점수 순
      const rest = ranked.filter((x) => !picked.includes(x));
      if (rest.length === 0) break;
      rest.sort((a, b) => (perGroup.get(a.exercise.group) ?? 0) - (perGroup.get(b.exercise.group) ?? 0) || fresh(a) - fresh(b) || byScore(a, b));
      take(rest[0]!);
    }
    const ordered = sortByRules(picked);
    if (day.cardio) {
      const cardio = cands.filter((c) => c.exercise.type === 'CARDIO').sort(byScore)[0];
      if (cardio) ordered.push(cardio);
    }
    return {
      day: day.day,
      exercises: ordered.map((c) => ({ id: c.exercise.id, reason: '규칙 기반 기본 루틴: 선택한 목표·부위·경험 수준에 맞춰 점수가 높은 종목을 골랐어요.' })),
    };
  });
  return { days, summary: 'AI 응답을 확인하지 못해 규칙 기반 기본 루틴으로 구성했어요.' };
}
