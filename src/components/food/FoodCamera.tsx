import PhotoCaptureView from '../common/PhotoCaptureView'

interface Props {
  onCapture: (imageDataUrl: string) => void
  onClose: () => void
}

export default function FoodCamera({ onCapture, onClose }: Props) {
  return (
    <PhotoCaptureView
      title="음식 촬영"
      description={
        <>
          음식을 촬영하거나 갤러리에서 사진을 선택하면
          <br />
          AI가 영양 성분을 분석해드려요.
        </>
      }
      primaryLabel="사진 촬영하기"
      onCapture={onCapture}
      onClose={onClose}
    />
  )
}
