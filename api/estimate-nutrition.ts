import { serveNutritionEstimate, type NodeRequestLike, type NodeResponseLike } from '../server/http.js'

// POST /api/estimate-nutrition  { foodName, cookingMethod? } → DB에 없는 음식의 100g당 영양소 AI 추정치
export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  await serveNutritionEstimate(req, res)
}
