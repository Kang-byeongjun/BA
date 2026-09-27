import type { AnalysisKind } from '../shared/errors.js'
import { describeError } from '../shared/errors.js'
import { handleAnalysis } from './handlers.js'

// Vercel Node.js Function의 req/res 중 실제로 쓰는 부분만 정의한다(@vercel/node 의존성 없이 사용).
export interface NodeRequestLike {
  method?: string
  body?: unknown
}

export interface NodeResponseLike {
  setHeader(name: string, value: string): unknown
  status(code: number): NodeResponseLike
  json(body: unknown): unknown
}

export async function serveAnalysis(kind: AnalysisKind, req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  // 분석 결과(신체 정보 포함)가 CDN이나 브라우저에 캐시되지 않게 한다.
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: describeError('METHOD_NOT_ALLOWED', kind) } })
    return
  }

  const result = await handleAnalysis(kind, req.body)
  res.status(result.status).json(result.body)
}
