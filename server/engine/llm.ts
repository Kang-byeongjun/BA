import type { Candidate, Frame, Issue, ResolvedGoal, WorkoutRequest } from './types.js';

/**
 * 엔진이 LLM에게 바라는 것은 "system·user 문장을 주면 JSON 문자열을 돌려주는 것" 하나뿐이다.
 * 실제 구현(Anthropic/OpenAI 선택)은 server/workoutLlm.ts에서 기존 server/aiClient.ts를 이용해 만든다.
 * 엔진 안에서는 API 키나 process.env를 읽지 않는다.
 */
export interface LlmClient {
  complete(input: { system: string; user: string }): Promise<string>;
}

export const SYSTEM_PROMPT = [
  '당신은 헬스 트레이너입니다. 주어진 후보 종목 안에서만 오늘의 운동 루틴을 고릅니다.',
  '규칙:',
  '1) 각 일차의 후보 목록에 있는 id만 사용합니다. 목록 밖의 종목을 만들지 않습니다.',
  '2) 일차마다 "count"개의 근력 종목을 고릅니다. requiredGroups의 근육군은 반드시 1개 이상 포함합니다.',
  '3) 순서: 다관절 → 단관절/등척성, 같은 분류 안에서는 대근육 → 소근육, 유산소는 맨 마지막입니다.',
  '4) 같은 일차에 같은 종목을 두 번 넣지 않습니다.',
  '5) 세트·횟수·무게·시간 같은 숫자는 절대 출력하지 않습니다(시스템이 붙입니다).',
  '6) 각 종목에 reason을 한 문장(한국어)으로 씁니다. 후보 목록의 정보(집중 부위, 인바디 취약 구획 등)에 근거한 이유만 씁니다.',
  '7) 출력은 JSON 하나만: {"days":[{"day":1,"exercises":[{"id":"...","reason":"..."}]}],"summary":"한두 문장"}',
].join('\n');

export function buildUserPrompt(args: {
  req: WorkoutRequest; goal: ResolvedGoal; frame: Frame; candidates: Candidate[]; previousIssues?: Issue[];
}): string {
  const { req, goal, frame, candidates, previousIssues } = args;
  const days = frame.days.map((d) => ({
    day: d.day,
    label: d.label,
    count: d.count,
    allowedCount: d.range,
    requiredGroups: d.requiredGroups,
    cardioLast: d.cardio,
    candidates: candidates
      .filter((c) => (c.exercise.type === 'CARDIO' ? d.cardio : d.groups.includes(c.exercise.group)))
      .sort((a, b) => b.score - a.score)
      .map((c) => ({
        id: c.exercise.id, name: c.exercise.name, group: c.exercise.group,
        joint: c.exercise.joint, size: c.exercise.size, score: c.score,
        caution: c.cautionParts.length > 0,
      })),
  }));
  const body: Record<string, unknown> = {
    goal, experience: req.experience, focus: req.focus, inbodyWeak: req.inbody.weak, pain: req.pain, days,
  };
  if (previousIssues && previousIssues.length > 0) {
    body.fixThese = previousIssues.map((i) => `${i.code}: ${i.message}`);
  }
  return JSON.stringify(body);
}

/** JSON 본문 추출: ```json 펜스나 앞뒤 설명이 붙어도 첫 { ~ 마지막 }만 사용 */
export function parseJson(text: string): unknown {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('응답에서 JSON을 찾지 못했습니다');
  return JSON.parse(text.slice(a, b + 1));
}

/** 테스트·오프라인용 가짜 LLM: 미리 정한 응답을 순서대로 돌려준다 (실제 API를 호출하지 않음) */
export function createMockClient(responses: (string | Error)[]): LlmClient & { calls: { system: string; user: string }[] } {
  const calls: { system: string; user: string }[] = [];
  let i = 0;
  return {
    calls,
    async complete(input) {
      calls.push(input);
      const r = responses[Math.min(i++, responses.length - 1)]!;
      if (r instanceof Error) throw r;
      return r;
    },
  };
}
