import { AnalysisError, type AnalysisKind } from '../../shared/errors'

/** 취소(AbortSignal)를 지원하는 sleep. 데모 모드의 분석 지연 연출에만 사용한다. */
export function sleep(ms: number, kind: AnalysisKind, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AnalysisError('CANCELLED', kind))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new AnalysisError('CANCELLED', kind))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
