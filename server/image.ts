import { AnalysisError } from '../shared/errors.js'
import type { AnalysisKind } from '../shared/errors.js'
import type { ImageMediaType } from '../shared/analysis.js'
import { MAX_IMAGE_BYTES, MIN_IMAGE_BYTES } from './config.js'

export interface ValidatedImage {
  mediaType: ImageMediaType
  // 공백/접두사가 제거된 순수 base64
  base64: string
  bytes: number
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false
  return bytes.every((b, i) => buf[offset + i] === b)
}

/** 클라이언트가 알려준 mediaType을 믿지 않고 실제 바이트(매직 넘버)로 형식을 판별한다. */
export function sniffImageType(buf: Buffer): ImageMediaType | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'
  // RIFF....WEBP
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp'
  }
  return null
}

export function validateImage(image: string, kind: AnalysisKind): ValidatedImage {
  if (typeof image !== 'string' || image.length === 0) {
    throw new AnalysisError('INVALID_REQUEST', kind)
  }

  // data URL 접두사가 붙어 와도 허용
  const commaIndex = image.startsWith('data:') ? image.indexOf(',') : -1
  const base64 = (commaIndex >= 0 ? image.slice(commaIndex + 1) : image).trim()

  // 디코딩 전에 문자열 길이만으로 먼저 거른다.
  if (base64.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 8) {
    throw new AnalysisError('IMAGE_TOO_LARGE', kind)
  }
  if (!BASE64_PATTERN.test(base64)) {
    throw new AnalysisError('INVALID_IMAGE', kind)
  }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > MAX_IMAGE_BYTES) throw new AnalysisError('IMAGE_TOO_LARGE', kind)
  if (buffer.length < MIN_IMAGE_BYTES) throw new AnalysisError('INVALID_IMAGE', kind)

  const mediaType = sniffImageType(buffer)
  if (!mediaType) throw new AnalysisError('UNSUPPORTED_IMAGE_TYPE', kind)

  return { mediaType, base64, bytes: buffer.length }
}
