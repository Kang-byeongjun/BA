import { serveWorkout, type NodeRequestLike, type NodeResponseLike } from '../server/http.js'

// POST /api/workout  { goal, experience, frequency, time, pain, focus, inbody } → 추천 운동 루틴
export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  await serveWorkout(req, res)
}
