import { z } from 'zod'
import type { InsightRequest } from '../shared/coaching.js'
import { AnalysisError } from '../shared/errors.js'
import { createAiClient, describeCause, type AiClient } from './aiClient.js'
import type { Env } from './config.js'
import type { HandlerResult } from './handlers.js'

// 텍스트만 쓰는 요청이라 에러 종류는 운동 추천·식사 코치와 같은 'coach'를 쓴다.
const KIND = 'coach' as const
const MAX_TOKENS = 600
const INVALID_MESSAGE = '코칭 요청 형식이 올바르지 않아요.'

const requestSchema = z.object({
  goalLabel: z.string().max(20),
  verdict: z.enum(['on_track', 'muscle_loss', 'check_method', 'need_consistency', 'need_data']),
  gaps: z
    .array(
      z.object({
        id: z.enum(['muscle', 'result', 'protein', 'diet', 'workout', 'record', 'inbody']),
        label: z.string().max(30),
        current: z.number().finite(),
        target: z.number().finite(),
        unit: z.string().max(5),
      }),
    )
    .max(2),
}) satisfies z.ZodType<InsightRequest>

// 항목마다 한 문장. 길이·숫자·칭찬 금지 검사는 앱(src/lib/coachingInsight.ts)이 다시 하고, 어긋나면 예시 문장을 쓴다.
const linesSchema = z.object({ lines: z.array(z.string()) })

export const INSIGHT_SYSTEM_PROMPT = `<role>
You write short Korean "what to fix" lines for a fitness app's diagnosis card.
</role>

<instructions>
The app has already decided the verdict and chosen the gaps (items that are furthest from the user's goal). Do not change the verdict, and do not recalculate, change, or invent any number.
For each gap, in the same order, write exactly one Korean line of about 25 characters in the form "cause → action", for example: 단백질이 목표의 62%예요. 오늘 +60g 채워요
Rules: state the difference from the goal (the shortfall amount) as a number, e.g. the gap's shortfall or its target number; do not start with or use success, praise, or encouragement wording (no "성공", "잘했어요", "내일도 화이팅" etc.); no medical claims; polite 해요체; no more than 30 characters.
A gap means the user is below the goal, so never say it was achieved.
</instructions>

<output_rules>
Return {"lines": [...]} with exactly one string per gap, in the same order as the gaps.
</output_rules>`

const GAP_UNIT_NOTE: Record<string, string> = {
  muscle: '0보다 작으면 줄어든 것',
  result: '목표 방향이 아님',
  protein: '목표 100% 대비',
  diet: '7일 중 목표를 지킨 날',
  workout: '최근 3주 횟수',
  record: '7일 중 기록한 날',
  inbody: '측정 횟수',
}

export function buildInsightPrompt(r: InsightRequest): string {
  const gaps = r.gaps.map((g, i) => `${i + 1}. ${g.label}: 현재 ${g.current}${g.unit} / 목표 ${g.target}${g.unit} / 차이 ${Math.round(Math.abs(g.target - g.current) * 10) / 10}${g.unit} (${GAP_UNIT_NOTE[g.id]})`)
  return [`운동 목표: ${r.goalLabel}`, `판정(앱이 정함): ${r.verdict}`, '보완할 점:', ...gaps].join('\n')
}

export interface InsightHandlerDeps {
  env?: Env
  /** 테스트용 가짜 AI 클라이언트 */
  client?: AiClient
}

/** POST /api/insight 처리. 앱이 정한 판정·보완할 점(숫자)을 검사해서 AI에게 항목별 한 문장만 쓰게 한다. */
export async function handleInsight(rawBody: unknown, deps: InsightHandlerDeps = {}): Promise<HandlerResult> {
  const env: Env = deps.env ?? process.env
  try {
    let value: unknown = rawBody
    if (Buffer.isBuffer(value)) value = value.toString('utf8')
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch {
        throw new AnalysisError('INVALID_REQUEST', KIND, INVALID_MESSAGE)
      }
    }
    const parsed = requestSchema.safeParse(value)
    if (!parsed.success) throw new AnalysisError('INVALID_REQUEST', KIND, INVALID_MESSAGE)
    // 보완할 점이 없으면 AI를 부르지 않는다
    if (parsed.data.gaps.length === 0) return { status: 200, body: { ok: true, data: { lines: [] } } }

    const client = deps.client ?? createAiClient(env, KIND)
    const data = await client.parseStructured({
      schema: linesSchema,
      system: INSIGHT_SYSTEM_PROMPT,
      prompt: buildInsightPrompt(parsed.data),
      maxTokens: MAX_TOKENS,
    })
    return { status: 200, body: { ok: true, data } }
  } catch (err) {
    const error = err instanceof AnalysisError ? err : new AnalysisError('INTERNAL', KIND, undefined, err)
    console.error(`[insight] ${error.code} (${describeCause(err)})`) // 입력 숫자·API Key는 로그에 남기지 않는다.
    return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message } } }
  }
}
