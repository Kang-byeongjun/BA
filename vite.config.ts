import type { IncomingMessage } from 'node:http'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

type AnalysisKind = 'inbody' | 'food'
interface HandlersModule {
  handleAnalysis(
    kind: AnalysisKind,
    body: unknown,
    deps: { env: Record<string, string | undefined> },
  ): Promise<{ status: number; body: unknown }>
}

const ROUTES: Record<string, AnalysisKind> = {
  '/analyze-inbody': 'inbody',
  '/analyze-food': 'food',
}

// Vercel Function 요청 본문 한도(4.5MB)보다 조금 넉넉하게, 그 이상은 로컬에서도 거부한다.
const MAX_BODY_BYTES = 6 * 1024 * 1024

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        resolve(null)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * `npm run dev`에서도 배포 환경(Vercel Function)과 같은 /api/* 를 쓸 수 있게 해주는 개발 서버 전용 미들웨어.
 * api/ 폴더의 함수와 같은 server/handlers.ts를 호출하며, ANTHROPIC_API_KEY 등은 .env.local 에서 읽는다.
 * (서버 프로세스에서만 읽으므로 브라우저 번들에는 포함되지 않는다)
 */
function localAnalysisApi(mode: string): Plugin {
  return {
    name: 'local-analysis-api',
    apply: 'serve',
    configureServer(server) {
      const env: Record<string, string | undefined> = { ...loadEnv(mode, process.cwd(), ''), ...process.env }

      server.middlewares.use('/api', (req, res, next) => {
        const kind = ROUTES[(req.url ?? '').split('?')[0]]
        if (!kind) return next()

        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(body))
        }

        void (async () => {
          try {
            if (req.method !== 'POST') {
              res.setHeader('Allow', 'POST')
              return send(405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '잘못된 요청 방식이에요.' } })
            }
            const raw = await readBody(req)
            if (raw === null) {
              return send(413, { ok: false, error: { code: 'IMAGE_TOO_LARGE', message: '이미지 용량이 너무 커요. 더 작은 사진을 선택하거나 다시 촬영해주세요.' } })
            }
            const handlers = (await server.ssrLoadModule('/server/handlers.ts')) as unknown as HandlersModule
            const result = await handlers.handleAnalysis(kind, raw, { env })
            send(result.status, result.body)
          } catch {
            send(500, { ok: false, error: { code: 'INTERNAL', message: '분석 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.' } })
          }
        })()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), localAnalysisApi(mode)],
  test: {
    include: ['server/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
}))
