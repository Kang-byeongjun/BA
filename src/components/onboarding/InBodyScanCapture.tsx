import PhotoCaptureView from '../common/PhotoCaptureView'

interface Props {
  demo?: boolean
  onCapture: (imageDataUrl: string) => void
  onClose: () => void
}

export default function InBodyScanCapture({ demo = false, onCapture, onClose }: Props) {
  return (
    <PhotoCaptureView
      title="InBody 결과지 스캔"
      description={
        <>
          InBody 결과지가 전체 화면에 나오도록 촬영하거나
          <br />
          갤러리에서 사진을 선택해주세요.
        </>
      }
      primaryLabel="결과지 촬영하기"
      notice="업로드한 이미지는 AI 분석을 위해 사용됩니다. 신체 정보가 담긴 사진은 분석 후 저장하지 않아요."
      demo={demo}
      onCapture={onCapture}
      onClose={onClose}
    />
  )
}
