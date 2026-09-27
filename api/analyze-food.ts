import { serveAnalysis, type NodeRequestLike, type NodeResponseLike } from '../server/http.js'

// POST /api/analyze-food  { image: <base64> }  → Claude Vision으로 음식 종류·예상 중량 추출
export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  await serveAnalysis('food', req, res)
}
