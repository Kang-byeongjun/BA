import PhotoCaptureView from '../common/PhotoCaptureView'

interface Props {
  onCapture: (imageDataUrl: string) => void
  onClose: () => void
}

export default function InBodyScanCapture({ onCapture, onClose }: Props) {
  return (
    <PhotoCaptureView
      title="InBody 결과지 스캔"
      description={
        <>
          InBody 측정 결과지를 촬영하거나 갤러리에서 사진을 선택하면
          <br />
          AI가 수치를 자동으로 읽어드려요.
        </>
      }
      primaryLabel="결과지 촬영하기"
      onCapture={onCapture}
      onClose={onClose}
    />
  )
}
