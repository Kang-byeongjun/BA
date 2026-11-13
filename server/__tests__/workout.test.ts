import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisError } from '../../shared/errors.js'
import type { AiClient, StructuredRequest } from '../aiClient.js'
import { generateRoutine } from '../engine/generate.js'
import { LlmOutput, type WorkoutRequestInput, type WorkoutResult } from '../engine/types.js'
import { createWorkoutLlm } from '../workoutLlm.js'
import { handleWorkout } from '../workoutHandler.js'

// 실제 Claude/OpenAI API는 절대 호출하지 않는다. 가짜 AiClient로 어댑터·처리 함수만 검증한다.

const request: WorkoutRequestInput = { goal: 'MUSCLE', experience: 'BEGINNER', frequency: 'FREQ_3', time: 'TIME_60' }

/** 규칙 기반 기본 루틴을 "AI가 이렇게 답했다"고 가정한 정상 응답으로 쓴다. */
async function validLlmAnswer(): Promise<LlmOutput> {
  const r = await generateRoutine(request)
  return {
    days: r.days.map((d) => ({ day: d.day, exercises: d.exercises.map((e) => ({ id: e.id, reason: '테스트 이유' })) })),
    summary: '테스트 요약',
  }
}

function fakeAi(answers: (unknown | Error)[]): AiClient & { calls: StructuredRequest<unknown>[] } {
  const calls: StructuredRequest<unknown>[] = []
  let i = 0
  return {
    calls,
    async parseStructured<T>(req: StructuredRequest<T>): Promise<T> {
      calls.push(req as StructuredRequest<unknown>)
      const a = answers[Math.min(i++, answers.length - 1)]
      if (a instanceof Error) throw a
      return a as T
    },
  }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('createWorkoutLlm', () => {
  it('엔진 스키마(LlmOutput)와 프롬프트를 parseStructured에 넘기고 결과를 JSON 문자열로 돌려준다', async () => {
    const answer = await validLlmAnswer()
    const ai = fakeAi([answer])
    const text = await createWorkoutLlm(ai).complete({ system: 'S', user: 'U' })
    expect(JSON.parse(text)).toEqual(answer)
    expect(ai.calls[0]).toMatchObject({ schema: LlmOutput, system: 'S', prompt: 'U' })
  })

  it('다시 해도 소용없는 에러(인증 실패 등) 뒤에는 API를 다시 부르지 않는다', async () => {
    const ai = fakeAi([new AnalysisError('AUTH_FAILED', 'coach')])
    const llm = createWorkoutLlm(ai)
    await expect(llm.complete({ system: 'S', user: 'U' })).rejects.toMatchObject({ code: 'AUTH_FAILED' })
    await expect(llm.complete({ system: 'S', user: 'U' })).rejects.toMatchObject({ code: 'AUTH_FAILED' })
    expect(ai.calls).toHaveLength(1)
  })

  it('다시 해볼 만한 에러(시간 초과 등)는 다음 시도에서 다시 부른다', async () => {
    const ai = fakeAi([new AnalysisError('TIMEOUT', 'coach'), await validLlmAnswer()])
    const llm = createWorkoutLlm(ai)
    await expect(llm.complete({ system: 'S', user: 'U' })).rejects.toMatchObject({ code: 'TIMEOUT' })
    await expect(llm.complete({ system: 'S', user: 'U' })).resolves.toContain('테스트 요약')
    expect(ai.calls).toHaveLength(2)
  })
})

describe('handleWorkout', () => {
  it('AI 응답이 정상이면 source=llm 루틴을 돌려준다', async () => {
    const llm = createWorkoutLlm(fakeAi([await validLlmAnswer()]))
    const result = await handleWorkout(JSON.stringify(request), { llm })
    expect(result.status).toBe(200)
    const data = (result.body as { ok: true; data: WorkoutResult }).data
    expect(data.source).toBe('llm')
    expect(data.summary).toBe('테스트 요약')
  })

  it('AI가 계속 실패하면 기본 루틴(source=fallback)으로 200 응답한다', async () => {
    const llm = createWorkoutLlm(fakeAi([new AnalysisError('UPSTREAM_ERROR', 'coach')]))
    const result = await handleWorkout(request, { llm })
    expect(result.status).toBe(200)
    expect((result.body as { ok: true; data: WorkoutResult }).data.source).toBe('fallback')
  })

  it('API 키가 설정되지 않았으면 AI 없이 기본 루틴을 만든다', async () => {
    const result = await handleWorkout(request, { env: {} })
    expect(result.status).toBe(200)
    expect((result.body as { ok: true; data: WorkoutResult }).data.source).toBe('fallback')
  })

  it('OpenAI를 골랐는데 모델 이름이 없어도 기본 루틴을 만든다', async () => {
    const result = await handleWorkout(request, { env: { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-not-a-real-key' } })
    expect(result.status).toBe(200)
    expect((result.body as { ok: true; data: WorkoutResult }).data.source).toBe('fallback')
  })

  it('요청 형식이 틀리면 400 INVALID_REQUEST', async () => {
    for (const bad of ['{not json', { goal: 'NOPE' }, null]) {
      const result = await handleWorkout(bad, { llm: null })
      expect(result.status).toBe(400)
      expect(result.body).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } })
    }
  })
})
