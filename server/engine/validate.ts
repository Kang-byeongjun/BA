import { EXERCISES } from './data.js';
import { priorityGroups } from './candidates.js';
import type { Candidate, Exercise, FocusGroup, Frame, Issue, LlmOutput, ResolvedGoal, ValidationResult, WorkoutRequest } from './types.js';
import { LlmOutput as LlmOutputSchema } from './types.js';

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
const WEEKLY_SET_TARGET = 10; // 근비대 목표 부위당 주간 세트 기준(설계 가정)

export interface ValidateCtx {
  req: Pick<WorkoutRequest, 'focus' | 'inbody'>;
  goal: ResolvedGoal;
  frame: Frame;
  candidates: Candidate[];
}

/** V1~V13 중 자동화 가능한 항목. hard 이슈가 하나라도 있으면 재시도 대상 */
export function validateRoutine(raw: unknown, ctx: ValidateCtx): ValidationResult {
  const hard: Issue[] = [];
  const warnings: Issue[] = [];
  const H = (code: string, message: string) => hard.push({ code, message });
  const W = (code: string, message: string) => warnings.push({ code, message });

  // V1·V11: 엄격 스키마 (수치 필드 등 정의되지 않은 키가 있으면 실패)
  const parsed = LlmOutputSchema.safeParse(raw);
  if (!parsed.success) {
    H('V1', `JSON 스키마 불일치: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.map(String).join('.')} ${i.message}`).join('; ')}`);
    return { hard, warnings };
  }
  const out: LlmOutput = parsed.data;
  const candById = new Map(ctx.candidates.map((c) => [c.exercise.id, c]));
  const prio = priorityGroups(ctx.req);

  if (out.days.length !== ctx.frame.days.length) {
    H('V1', `일차 수가 ${ctx.frame.days.length}여야 하는데 ${out.days.length}입니다`);
    return { hard, warnings };
  }

  const weeklySets: Record<string, number> = {};
  const rx = ctx.frame.prescription;
  const midSets = (rx.setsMin + rx.setsMax) / 2;

  out.days.forEach((d, i) => {
    const frame = ctx.frame.days[i]!;
    const tag = `${frame.day}일차`;
    if (d.day !== frame.day) H('V1', `${i + 1}번째 일차 번호가 ${frame.day}여야 합니다`);
    const exs: Exercise[] = [];
    const seen = new Set<string>();
    for (const e of d.exercises) {
      const c = candById.get(e.id);
      if (!c) { // V2: 후보 밖 ID (DB에는 있지만 필터로 제외된 경우 포함)
        H('V2', `${tag}: 후보에 없는 종목 ID ${e.id}${BY_ID.has(e.id) ? ' (필터로 제외된 종목)' : ''}`);
        continue;
      }
      if (seen.has(e.id)) H('V5', `${tag}: 중복 종목 ${e.id}`);
      seen.add(e.id);
      if (c.exercise.type === 'STRENGTH' && !frame.groups.includes(c.exercise.group as FocusGroup))
        H('V2', `${tag}: ${e.id}(${c.exercise.group})는 이 일차 대상 근육군이 아닙니다`);
      exs.push(c.exercise);
    }
    const strength = exs.filter((x) => x.type === 'STRENGTH');
    const cardio = exs.filter((x) => x.type === 'CARDIO');

    // V3: 부담 높음 종목 금지 — 후보 필터(F2)가 막고, V2가 후보 밖 ID를 잡으므로 별도 검사는 불필요

    // V3c: 주의 종목이 하루의 절반 초과
    const cautionN = strength.filter((x) => candById.get(x.id)!.cautionParts.length > 0).length;
    if (strength.length > 0 && cautionN > strength.length / 2) W('V3c', `${tag}: 주의 표시 종목이 절반을 넘습니다(${cautionN}/${strength.length})`);

    // V4: 종목 수 (유산소 제외)
    if (strength.length < frame.range[0] || strength.length > frame.range[1])
      H('V4', `${tag}: 근력 종목 수는 ${frame.range[0]}~${frame.range[1]}개여야 하는데 ${strength.length}개입니다`);
    const hasCardioCand = ctx.candidates.some((c) => c.exercise.type === 'CARDIO');
    if (frame.cardio && hasCardioCand && cardio.length !== 1) H('V4', `${tag}: 유산소는 정확히 1종목이어야 합니다(현재 ${cardio.length})`);
    if (!frame.cardio && cardio.length > 0) H('V4', `${tag}: 이 목표에서는 유산소를 넣지 않습니다`);

    // V6: 필수 근육군
    for (const g of frame.requiredGroups) {
      if (!strength.some((x) => x.group === g)) H('V6', `${tag}: 필수 근육군 ${g}가 빠졌습니다`);
    }

    // V9(R4): 유산소는 맨 뒤
    const firstCardio = exs.findIndex((x) => x.type === 'CARDIO');
    if (firstCardio >= 0 && exs.slice(firstCardio).some((x) => x.type !== 'CARDIO')) H('V9', `${tag}: 유산소는 마지막이어야 합니다`);

    // V7(R1): 다관절 → 단관절/등척성
    const firstNonMulti = strength.findIndex((x) => x.joint !== 'MULTI');
    if (firstNonMulti >= 0 && strength.slice(firstNonMulti).some((x) => x.joint === 'MULTI')) H('V7', `${tag}: 다관절 종목이 단관절/등척성 종목보다 앞서야 합니다`);

    // V8(R2): 같은 관절 분류 안에서 대근육 → 소근육
    for (const klass of ['MULTI', 'SINGLE', 'ISOMETRIC'] as const) {
      const sub = strength.filter((x) => x.joint === klass);
      const firstSmall = sub.findIndex((x) => x.size === 'SMALL');
      if (firstSmall >= 0 && sub.slice(firstSmall).some((x) => x.size === 'LARGE')) { H('V8', `${tag}: ${klass} 안에서 대근육 종목이 소근육 종목보다 앞서야 합니다`); break; }
    }

    // V10(R3): 우선 부위가 먼저 — 경고만
    if (prio.size > 0 && strength.length > 1) {
      const firstPrio = strength.findIndex((x) => prio.has(x.group));
      const lastNon = strength.map((x) => prio.has(x.group)).lastIndexOf(false);
      if (firstPrio > 0 && lastNon < firstPrio && firstPrio > strength.length / 2) W('V10', `${tag}: 우선 부위 종목이 뒤쪽에 배치되었습니다(참고)`);
    }

    for (const x of strength) weeklySets[x.group] = (weeklySets[x.group] ?? 0) + midSets;
  });

  // V12: 주간 볼륨 경고(근비대 목표)
  if (ctx.goal === 'MUSCLE') {
    for (const [g, sets] of Object.entries(weeklySets)) {
      if (sets < WEEKLY_SET_TARGET) W('V12', `${g}: 주간 약 ${sets}세트로 권장(약 ${WEEKLY_SET_TARGET}세트)보다 적습니다`);
    }
  }

  return { hard, warnings, routine: hard.length === 0 ? out : undefined };
}
