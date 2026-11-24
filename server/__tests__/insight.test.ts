import { describe, expect, it, vi } from 'vitest'
import type { InsightRequest } from '../../shared/coaching.js'
import type { AiClient } from '../aiClient.js'
import { buildInsightPrompt, handleInsight, INSIGHT_SYSTEM_PROMPT } from '../insightHandler.js'

const request: InsightRequest = {
  goalLabel: '체지방 감량',
  verdict: 'check_method',
  gaps: [
    { id: 'protein', label: '단백질 달성률', current: 62, target: 100, unit: '%' },
    { id: 'workout', label: '운동 횟수', current: 5, target: 9, unit: '회' },
  ],
}

const fakeClient = (lines = ['단백질이 목표의 62%예요. 오늘 +50g 채워요', '최근 3주 운동이 5회예요. 주 3회로 늘려요']) => {
  const parseStructured = vi.fn(async () => ({ lines }))
  return { client: { parseStructured } as unknown as AiClient, parseStructured }
}

describe('handleInsight', () => {
  it('앱이 정한 판정·보완할 점 숫자만 AI에게 보내고 항목별 문장을 돌려준다', async () => {
    const { client, parseStructured } = fakeClient()
    const res = await handleInsight(request, { client, env: {} })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, data: { lines: expect.any(Array) } })
    const arg = (parseStructured.mock.calls[0] as unknown as [{ prompt: string; system: string }])[0]
    expect(arg.system).toBe(INSIGHT_SYSTEM_PROMPT)
    expect(arg.system).toContain('no praise')
    expect(arg.prompt).toBe(buildInsightPrompt(request))
    for (const s of ['체지방 감량', 'check_method', '현재 62%', '현재 5회']) expect(arg.prompt).toContain(s)
  })

  it('보완할 점이 없으면 AI를 부르지 않는다', async () => {
    const { client, parseStructured } = fakeClient()
    const res = await handleInsight({ ...request, gaps: [] }, { client })
    expect(res.body).toEqual({ ok: true, data: { lines: [] } })
    expect(parseStructured).not.toHaveBeenCalled()
  })

  it('JSON 문자열도 받고, 형식이 틀리거나 항목이 3개 이상이면 AI를 부르지 않고 400', async () => {
    const { client, parseStructured } = fakeClient()
    expect((await handleInsight(JSON.stringify(request), { client })).status).toBe(200)
    parseStructured.mockClear()
    expect((await handleInsight({ goalLabel: 'x' }, { client })).status).toBe(400)
    expect((await handleInsight({ ...request, gaps: [...request.gaps, request.gaps[0]] }, { client })).status).toBe(400)
    expect(parseStructured).not.toHaveBeenCalled()
  })

  it('키가 설정되지 않았으면 에러 응답(앱이 예시 문장으로 대체)', async () => {
    const res = await handleInsight(request, { env: { AI_PROVIDER: 'openai' } })
    expect(res.body).toMatchObject({ ok: false, error: { code: 'MISSING_API_KEY' } })
  })
})
