import { buildCandidates } from './candidates.js';
import { EXERCISES } from './data.js';
import { fallbackRoutine } from './fallback.js';
import { buildFrame } from './frame.js';
import { resolveGoal } from './goal.js';
import { SYSTEM_PROMPT, buildUserPrompt, parseJson, type LlmClient } from './llm.js';
import { validateRoutine } from './validate.js';
import { WorkoutRequest } from './types.js';
import type { Candidate, Issue, LlmOutput, PainPart, Prescription, RoutineExercise, WorkoutResult } from './types.js';

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
const PAIN_KO: Record<PainPart, string> = { LOWBACK: '허리', KNEE: '무릎', SHOULDER: '어깨' };

function cautionFor(c: Candidate, pain: PainPart[]): RoutineExercise['caution'] {
  if (c.cautionParts.length === 0) return null;
  const alt = c.exercise.altId ? BY_ID.get(c.exercise.altId) : undefined;
  const altOk = alt && !pain.some((p) => alt.burden[p] === 'HIGH') ? alt : undefined;
  const parts = c.cautionParts.map((p) => PAIN_KO[p]).join('·');
  return {
    parts: c.cautionParts,
    text: `⚠ ${parts}에 부담이 있을 수 있어요. 통증이 느껴지면 바로 멈추고${altOk ? ` ${altOk.name}(으)로 바꿔주세요.` : ' 쉬운 강도로 낮춰주세요.'}`,
    alternativeId: altOk?.id ?? null,
  };
}

export interface GenerateOptions { llm?: LlmClient; maxRetries?: number; }

/**
 * 전체 흐름: 요청 검사 → 목표 결정 → 후보 선정 → 분할/종목 수 → (LLM 선택 + 검증, 실패 시 재시도) → 기본 루틴 대체 → 처방 부착.
 * 요청 형식이 틀리면 ZodError를 던진다(호출하는 쪽에서 400으로 바꾼다).
 */
export async function generateRoutine(input: unknown, opts: GenerateOptions = {}): Promise<WorkoutResult> {
  const req = WorkoutRequest.parse(input);
  const { goal, reason } = resolveGoal(req);
  const candidates = buildCandidates(req, goal);
  const frame = buildFrame(req, goal);
  const ctx = { req, goal, frame, candidates };
  const maxRetries = opts.maxRetries ?? 2;

  let routine: LlmOutput | undefined;
  let warnings: Issue[] = [];
  let source: 'llm' | 'fallback' = 'fallback';
  const attemptErrors: Issue[][] = [];
  let attempts = 0;

  if (opts.llm) {
    let prev: Issue[] | undefined;
    for (let a = 0; a <= maxRetries; a++) {
      attempts++;
      try {
        const text = await opts.llm.complete({ system: SYSTEM_PROMPT, user: buildUserPrompt({ req, goal, frame, candidates, previousIssues: prev }) });
        const v = validateRoutine(parseJson(text), ctx);
        if (v.hard.length === 0 && v.routine) { routine = v.routine; warnings = v.warnings; source = 'llm'; break; }
        attemptErrors.push(v.hard); prev = v.hard;
      } catch (e) {
        const issue = { code: 'LLM', message: e instanceof Error ? e.message : String(e) };
        attemptErrors.push([issue]); prev = [issue];
      }
    }
  }
  if (!routine) {
    routine = fallbackRoutine(frame, candidates);
    const v = validateRoutine(routine, ctx);
    warnings = v.warnings;
    if (v.hard.length > 0) throw new Error(`기본 루틴이 검증을 통과하지 못했습니다: ${v.hard.map((i) => i.code + ' ' + i.message).join('; ')}`);
  }

  const candById = new Map(candidates.map((c) => [c.exercise.id, c]));
  const rxOf = (rx: Prescription) => ({ setsMin: rx.setsMin, setsMax: rx.setsMax, repsMin: rx.repsMin, repsMax: rx.repsMax, rirMin: rx.rirMin, rirMax: rx.rirMax, restMin: rx.restMin, restMax: rx.restMax });

  return {
    resolvedGoal: goal,
    goalReason: reason,
    source, attempts, attemptErrors, warnings,
    summary: routine.summary,
    prescriptionNote: frame.prescription.note,
    days: routine.days.map((d, i) => ({
      day: d.day,
      label: frame.days[i]!.label,
      exercises: d.exercises.map((e, k) => {
        const c = candById.get(e.id)!;
        return {
          order: k + 1, id: e.id, name: c.exercise.name, group: c.exercise.group, reason: e.reason,
          caution: cautionFor(c, req.pain),
          prescription: c.exercise.type === 'STRENGTH' ? rxOf(frame.prescription) : null,
        };
      }),
    })),
  };
}
