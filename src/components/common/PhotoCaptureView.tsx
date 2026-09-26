import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { Camera, Image as ImageIcon, X } from 'lucide-react'
import { useRef, type ChangeEvent, type ReactNode } from 'react'

interface Props {
  title: string
  description: ReactNode
  primaryLabel?: string
  onCapture: (imageDataUrl: string) => void
  onClose: () => void
}

const isNative = Capacitor.isNativePlatform()

export default function PhotoCaptureView({ title, description, primaryLabel = '사진 촬영하기', onCapture, onClose }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onCapture(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // 실제 Android/iOS 앱(Capacitor)에서는 브라우저 파일 입력 대신 네이티브 카메라 플러그인을 사용해
  // 기기 카메라 앱을 직접 띄운다. 웹/PWA에서는 <input type="file" capture> 방식으로 동작한다.
  const takeNativePhoto = async (source: CameraSource) => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source,
        quality: 80,
        allowEditing: false,
      })
      if (photo.dataUrl) onCapture(photo.dataUrl)
    } catch {
      // 사용자가 촬영/선택을 취소한 경우 등 — 별도 에러 처리 없이 무시
    }
  }

  const handlePrimary = () => {
    if (isNative) {
      void takeNativePhoto(CameraSource.Camera)
    } else {
      cameraInputRef.current?.click()
    }
  }

  const handleGallery = () => {
    if (isNative) {
      void takeNativePhoto(CameraSource.Photos)
    } else {
      galleryInputRef.current?.click()
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="rounded-full bg-white/10 p-2">
          <X size={20} />
        </button>
        <p className="text-sm font-medium text-white/80">{title}</p>
        <div className="w-9" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-white/30">
          <Camera size={40} className="text-white/50" />
        </div>
        <p className="text-sm text-white/60">{description}</p>
      </div>

      <div className="flex flex-col gap-3 p-6 pb-10">
        <button
          onClick={handlePrimary}
          className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 py-4 font-semibold"
        >
          <Camera size={20} />
          {primaryLabel}
        </button>
        <button
          onClick={handleGallery}
          className="flex items-center justify-center gap-2 rounded-full bg-white/10 py-4 font-semibold"
        >
          <ImageIcon size={20} />
          앨범에서 선택하기
        </button>
      </div>

      {!isNative && (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  )
}
