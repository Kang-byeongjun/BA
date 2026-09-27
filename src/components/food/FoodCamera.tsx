import PhotoCaptureView from '../common/PhotoCaptureView'

interface Props {
  demo?: boolean
  onCapture: (imageDataUrl: string) => void
  onClose: () => void
}

export default function FoodCamera({ demo = false, onCapture, onClose }: Props) {
  return (
    <PhotoCaptureView
      title="음식 촬영"
      description={
        <>
          음식을 촬영하거나 갤러리에서 사진을 선택하면
          <br />
          AI가 음식과 양을 분석해드려요.
        </>
      }
      primaryLabel="사진 촬영하기"
      notice="업로드한 이미지는 AI 분석을 위해 사용됩니다."
      demo={demo}
      onCapture={onCapture}
      onClose={onClose}
    />
  )
}
