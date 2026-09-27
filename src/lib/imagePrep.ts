import { AnalysisError, type AnalysisKind } from '../../shared/errors'

/**
 * 서버로 보내기 전 이미지를 준비한다.
 * - Vercel Function 요청 본문 한도(4.5MB)를 넘지 않도록 긴 변 1568px 이하 JPEG로 리사이즈·압축한다.
 *   (Claude Vision도 긴 변 1568px 이상은 내부적으로 축소하므로 인식 품질 손해가 거의 없다)
 * - 원본 사진은 저장하지 않는다. 목록 표시용 작은 썸네일만 따로 만든다.
 */

export interface PreparedImage {
  // data URL 접두사가 없는 순수 base64 (JPEG) — 서버 전송용
  base64: string
  // 화면 표시/식사 기록 목록용 작은 썸네일 (data URL)
  thumbnail: string
  // 분석 화면에서 보여줄 미리보기 (data URL, 업로드본과 동일)
  preview: string
}

const MAX_SOURCE_BYTES = 30 * 1024 * 1024
const MAX_UPLOAD_BYTES = 3_000_000 // 서버 상한(3.2MB)보다 약간 작게
const EDGE_STEPS = [1568, 1280, 1024, 800]
const QUALITY_STEPS = [0.88, 0.78, 0.68]
const THUMBNAIL_EDGE = 320

function dataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',')
  const length = dataUrl.length - (commaIndex + 1)
  return Math.floor((length * 3) / 4)
}

function loadImage(dataUrl: string, kind: AnalysisKind): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new AnalysisError('UNSUPPORTED_IMAGE_TYPE', kind))
    img.src = dataUrl
  })
}

function drawScaled(img: HTMLImageElement, maxEdge: number, kind: AnalysisKind): HTMLCanvasElement {
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = Math.min(1, maxEdge / longEdge)
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AnalysisError('INVALID_IMAGE', kind)

  // 투명 배경(PNG 등)이 검게 나오지 않도록 흰색으로 채운다.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

export async function prepareImage(dataUrl: string, kind: AnalysisKind): Promise<PreparedImage> {
  const match = /^data:([^;,]*)[;,]/.exec(dataUrl)
  if (!match) throw new AnalysisError('INVALID_IMAGE', kind)

  const mime = match[1].toLowerCase()
  if (!mime.startsWith('image/') || mime === 'image/svg+xml') {
    throw new AnalysisError('UNSUPPORTED_IMAGE_TYPE', kind)
  }
  if (dataUrlBytes(dataUrl) > MAX_SOURCE_BYTES) throw new AnalysisError('IMAGE_TOO_LARGE', kind)

  // 브라우저가 해석하지 못하는 형식(HEIC 등)은 여기서 UNSUPPORTED_IMAGE_TYPE으로 걸러진다.
  const img = await loadImage(dataUrl, kind)
  if (!img.naturalWidth || !img.naturalHeight) throw new AnalysisError('INVALID_IMAGE', kind)

  for (const edge of EDGE_STEPS) {
    const canvas = drawScaled(img, edge, kind)
    for (const quality of QUALITY_STEPS) {
      const jpeg = canvas.toDataURL('image/jpeg', quality)
      if (dataUrlBytes(jpeg) <= MAX_UPLOAD_BYTES) {
        const thumbnail = drawScaled(img, THUMBNAIL_EDGE, kind).toDataURL('image/jpeg', 0.7)
        return { base64: jpeg.slice(jpeg.indexOf(',') + 1), thumbnail, preview: jpeg }
      }
    }
  }
  throw new AnalysisError('IMAGE_TOO_LARGE', kind)
}
