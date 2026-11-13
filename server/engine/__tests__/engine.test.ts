import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import sim from './fixtures/pain-sim.json' with { type: 'json' };
import { buildCandidates, countByGroup } from '../candidates.js';
import { buildFrame } from '../frame.js';
import { resolveGoal } from '../goal.js';
import { fallbackRoutine } from '../fallback.js';
import { validateRoutine } from '../validate.js';
import { generateRoutine } from '../generate.js';
import { createMockClient } from '../llm.js';
import { WorkoutRequest as WorkoutRequestSchema } from '../types.js';
import type { Experience, Frequency, MuscleGroup, PainPart, ResolvedGoal, TimeSlot, WorkoutRequest } from '../types.js';

interface SimRow { experience: Experience; pain: PainPart[]; counts: Record<MuscleGroup, number> }

const base = (o: Partial<WorkoutRequest> = {}): WorkoutRequest => ({
  goal: 'MUSCLE', focus: [], experience: 'INTERMEDIATE', pain: [], frequency: 'FREQ_3', time: 'TIME_60',
  inbody: { weak: { arm: false, trunk: false, leg: false } }, ...o,
});
const ctxOf = (req: WorkoutRequest, goal: ResolvedGoal) => {
  const candidates = buildCandidates(req, goal);
  const frame = buildFrame(req, goal);
  return { req, goal, frame, candidates };
};

describe('후보 판정이 엑셀 시뮬레이션과 일치', () => {
  for (const row of sim as SimRow[]) {
    it(`${row.experience} / ${row.pain.join('+') || '없음'}`, () => {
      const c = countByGroup(buildCandidates(base({ experience: row.experience, pain: row.pain }), 'MUSCLE'));
      for (const g of ['CHEST', 'SHOULDER', 'BACK', 'ARM', 'LEGS', 'ABS', 'CARDIO'] as const) expect(c[g]).toBe(row.counts[g]);
    });
  }
});

describe('목표 자동 추천', () => {
  const r = (fat: number, mus: number) => resolveGoal({ goal: 'UNSURE', inbody: { weak: { arm: false, trunk: false, leg: false }, fatAdjustKg: fat, muscleAdjustKg: mus } }).goal;
  it('조합별 결과', () => {
    expect(r(-3, 2)).toBe('MUSCLE');
    expect(r(-3, 0)).toBe('DIET');
    expect(r(0, 2)).toBe('MUSCLE');
    expect(r(0, 0)).toBe('FITNESS');
  });
  it('권장치가 없으면 오류', () => {
    expect(() => resolveGoal({ goal: 'UNSURE', inbody: { weak: { arm: false, trunk: false, leg: false } } })).toThrow();
  });
});

describe('기본 루틴(fallback)이 모든 조합에서 하드 검증 통과', () => {
  const exps: Experience[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  const pains: PainPart[][] = [[], ['LOWBACK'], ['KNEE'], ['SHOULDER'], ['KNEE', 'SHOULDER'], ['LOWBACK', 'KNEE', 'SHOULDER']];
  const freqs: Frequency[] = ['FREQ_2', 'FREQ_3', 'FREQ_4P'];
  const times: TimeSlot[] = ['TIME_30', 'TIME_60', 'TIME_90'];
  const goals: ResolvedGoal[] = ['DIET', 'MUSCLE', 'FITNESS'];
  it('전수 검사', () => {
    const failures: string[] = [];
    let n = 0;
    for (const experience of exps) for (const pain of pains) for (const frequency of freqs) for (const time of times) for (const goal of goals) {
      const req = base({ goal, experience, pain, frequency, time, focus: ['CHEST'] });
      const ctx = ctxOf(req, goal);
      const v = validateRoutine(fallbackRoutine(ctx.frame, ctx.candidates), ctx);
      n++;
      if (v.hard.length) failures.push(`${experience}/${pain.join('+')}/${frequency}/${time}/${goal}: ${v.hard.map((h) => h.code + ' ' + h.message).join(' | ')}`);
    }
    expect(n).toBe(3 * 6 * 3 * 3 * 3);
    expect(failures.slice(0, 5)).toEqual([]);
  });
});

describe('검증기', () => {
  const req = base();
  const ctx = ctxOf(req, 'MUSCLE');
  const good = fallbackRoutine(ctx.frame, ctx.candidates);
  it('정상 루틴 통과', () => expect(validateRoutine(good, ctx).hard).toEqual([]));
  it('V1: 수치 필드가 있으면 실패', () => {
    const bad = JSON.parse(JSON.stringify(good));
    bad.days[0].exercises[0].sets = 3;
    expect(validateRoutine(bad, ctx).hard[0]?.code).toBe('V1');
  });
  it('V1: 맨 바깥에 모르는 키가 있어도 실패', () => {
    const bad = { ...good, extra: 1 };
    expect(validateRoutine(bad, ctx).hard[0]?.code).toBe('V1');
  });
  it('V2: 후보 밖 ID', () => {
    const bad = JSON.parse(JSON.stringify(good));
    bad.days[0].exercises[0].id = 'NOPE';
    expect(validateRoutine(bad, ctx).hard.some((i) => i.code === 'V2')).toBe(true);
  });
  it('V2: 통증(높음)으로 제외된 종목', () => {
    const r2 = base({ pain: ['KNEE'] });
    const c2 = ctxOf(r2, 'MUSCLE');
    const excluded = ctxOf(base(), 'MUSCLE').candidates.find((c) => c.exercise.burden.KNEE === 'HIGH' && c.exercise.type === 'STRENGTH')!;
    const bad = JSON.parse(JSON.stringify(fallbackRoutine(c2.frame, c2.candidates)));
    bad.days[0].exercises[0].id = excluded.exercise.id;
    expect(validateRoutine(bad, c2).hard.some((i) => i.code === 'V2')).toBe(true);
  });
  it('V4: 종목 수 부족', () => {
    const bad = JSON.parse(JSON.stringify(good));
    bad.days[0].exercises = bad.days[0].exercises.slice(0, 2);
    expect(validateRoutine(bad, ctx).hard.some((i) => i.code === 'V4')).toBe(true);
  });
  it('V5: 중복', () => {
    const bad = JSON.parse(JSON.stringify(good));
    bad.days[0].exercises[1].id = bad.days[0].exercises[0].id;
    expect(validateRoutine(bad, ctx).hard.some((i) => i.code === 'V5')).toBe(true);
  });
  it('V7: 단관절이 다관절보다 앞', () => {
    const bad = JSON.parse(JSON.stringify(good));
    bad.days[0].exercises.reverse();
    expect(validateRoutine(bad, ctx).hard.some((i) => ['V7', 'V8'].includes(i.code))).toBe(true);
  });
  it('V9: 유산소는 마지막', () => {
    const r2 = base({ goal: 'DIET' });
    const c2 = ctxOf(r2, 'DIET');
    const g = JSON.parse(JSON.stringify(fallbackRoutine(c2.frame, c2.candidates)));
    expect(validateRoutine(g, c2).hard).toEqual([]);
    const ex = g.days[0].exercises; ex.unshift(ex.pop());
    expect(validateRoutine(g, c2).hard.some((i) => i.code === 'V9')).toBe(true);
  });
});

describe('주의(중간 부담) 처리', () => {
  it('통증 중간 종목은 후보에 남고 −2점, 결과에 ⚠ 문구와 대체종목', async () => {
    const req = base({ pain: ['KNEE', 'SHOULDER'], experience: 'ADVANCED' });
    const cands = buildCandidates(req, 'MUSCLE');
    const cautious = cands.filter((c) => c.cautionParts.length > 0);
    expect(cautious.length).toBeGreaterThan(0);
    const res = await generateRoutine(req);
    const withCaution = res.days.flatMap((d) => d.exercises).filter((e) => e.caution);
    for (const e of withCaution) expect(e.caution!.text.startsWith('⚠')).toBe(true);
  });
});

describe('generateRoutine + 모의 LLM', () => {
  const req = base();
  const ctx = ctxOf(req, 'MUSCLE');
  const goodJson = JSON.stringify(fallbackRoutine(ctx.frame, ctx.candidates));

  it('LLM이 올바른 JSON을 주면 source=llm, 처방 수치는 시스템이 붙임', async () => {
    const llm = createMockClient([goodJson]);
    const res = await generateRoutine(req, { llm });
    expect(res.source).toBe('llm');
    expect(res.attempts).toBe(1);
    expect(res.days[0]!.exercises[0]!.prescription).not.toBeNull();
  });
  it('코드펜스가 붙어도 파싱', async () => {
    const res = await generateRoutine(req, { llm: createMockClient(['```json\n' + goodJson + '\n```']) });
    expect(res.source).toBe('llm');
  });
  it('잘못된 응답 후 재시도에서 성공, 재시도 프롬프트에 오류 포함', async () => {
    const llm = createMockClient(['{"days":[],"summary":"x"}', goodJson]);
    const res = await generateRoutine(req, { llm });
    expect(res.source).toBe('llm');
    expect(res.attempts).toBe(2);
    expect(llm.calls[1]!.user).toContain('fixThese');
  });
  it('3번 모두 실패하면 기본 루틴으로 대체', async () => {
    const llm = createMockClient(['not json', new Error('timeout'), '{}']);
    const res = await generateRoutine(req, { llm });
    expect(res.source).toBe('fallback');
    expect(res.attempts).toBe(3);
    expect(res.attemptErrors).toHaveLength(3);
  });
  it('LLM이 없어도 동작', async () => {
    expect((await generateRoutine(req)).source).toBe('fallback');
  });
});

// 원본 handler 테스트를 대신함 (요청 처리 함수는 2단계 api/workout.ts에서 연결)
describe('요청 검사 (Zod 4)', () => {
  it('잘못된 요청은 ZodError', async () => {
    await expect(generateRoutine({ goal: 'X' })).rejects.toBeInstanceOf(ZodError);
  });
  it('필수값만 보내도 정상 동작', async () => {
    const res = await generateRoutine({ goal: 'DIET', experience: 'BEGINNER', frequency: 'FREQ_2', time: 'TIME_30' });
    expect(res.days).toHaveLength(2);
  });
  it('생략한 focus·pain·inbody는 기본값으로 채워짐', () => {
    const r = WorkoutRequestSchema.parse({ goal: 'DIET', experience: 'BEGINNER', frequency: 'FREQ_2', time: 'TIME_30' });
    expect(r.focus).toEqual([]);
    expect(r.pain).toEqual([]);
    expect(r.inbody).toEqual({ weak: { arm: false, trunk: false, leg: false } });
  });
  it('inbody를 빈 객체나 권장치만 보내도 weak 기본값이 채워짐', () => {
    const p = (inbody: unknown) => WorkoutRequestSchema.parse({ goal: 'UNSURE', experience: 'BEGINNER', frequency: 'FREQ_2', time: 'TIME_30', inbody }).inbody;
    expect(p({}).weak).toEqual({ arm: false, trunk: false, leg: false });
    expect(p({ fatAdjustKg: -2, muscleAdjustKg: 0 })).toEqual({ weak: { arm: false, trunk: false, leg: false }, fatAdjustKg: -2, muscleAdjustKg: 0 });
  });
  it('집중 부위는 2개까지만', () => {
    expect(WorkoutRequestSchema.safeParse({ goal: 'DIET', experience: 'BEGINNER', frequency: 'FREQ_2', time: 'TIME_30', focus: ['CHEST', 'BACK', 'ARM'] }).success).toBe(false);
  });
});
