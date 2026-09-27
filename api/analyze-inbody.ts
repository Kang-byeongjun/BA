import { serveAnalysis, type NodeRequestLike, type NodeResponseLike } from '../server/http.js'

// POST /api/analyze-inbody  { image: <base64> }  → Claude Vision으로 InBody 결과지 수치 추출
export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  await serveAnalysis('inbody', req, res)
}
