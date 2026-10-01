import { serveCoachMeal, type NodeRequestLike, type NodeResponseLike } from '../server/http.js'

// POST /api/coach-meal  { mealTitle, ingredients, nutrientLabel, ... } → 추천 식사에 대한 AI 코칭 문구 한 줄
export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  await serveCoachMeal(req, res)
}
