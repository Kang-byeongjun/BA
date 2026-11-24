import { serveInsight, type NodeRequestLike, type NodeResponseLike } from '../server/http.js'

// POST /api/insight  { inbody, diet, workout } (이미 계산된 숫자) → AI 종합 코칭 문장 { message }
export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  await serveInsight(req, res)
}
