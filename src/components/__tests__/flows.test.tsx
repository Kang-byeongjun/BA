// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FoodExtraction, InBodyExtraction } from '../../../shared/analysis'
import { AppProvider, useApp } from '../../context/AppContext'
import FoodCaptureFlow from '../food/FoodCaptureFlow'
import InBodyScanFlow from '../onboarding/InBodyScanFlow'

// 브라우저 전용 Canvas 리사이즈는 mock으로 대체하고, 나머지(업로드 → 서버 API → 확인/수정 → 저장)는 실제 코드로 실행한다.
vi.mock('../../lib/imagePrep', () => ({
  prepareImage: vi.fn(async () => ({
    base64: 'QUFB',
    thumbnail: 'data:image/jpeg;base64,THUMB',
    preview: 'data:image/jpeg;base64,PREVIEW',
  })),
}))

const food: FoodExtraction = {
  isFood: true,
  mealName: '닭가슴살 현미밥 브로콜리',
  foods: [
    { name: '닭가슴살', estimatedGrams: 120, cookingMethod: 'grilled', confidence: 0.91 },
    { name: '현미밥', estimatedGrams: 180, cookingMethod: null, confidence: 0.84 },
    { name: '브로콜리', estimatedGrams: 70, cookingMethod: 'steamed', confidence: 0.8 },
  ],
  overallConfidence: 0.85,
  warnings: ['사진만으로 정확한 중량을 측정할 수 없어 양은 추정값입니다.'],
}

const inbody: InBodyExtraction = {
  isInBodyReport: true,
  weightKg: 75.2,
  skeletalMuscleMassKg: 34.1,
  bodyFatMassKg: null,
  bodyFatPercentage: 18.4,
  bmi: 24.6,
  basalMetabolicRateKcal: 1702,
  confidence: 0.55,
  warnings: ['체지방량 숫자가 흐릿해서 읽지 못했어요.'],
}

function ok(data: unknown) {
  return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
function fail(code: string, message: string, status = 422) {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), { status, headers: { 'Content-Type': 'application/json' } })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Probe() {
  const { meals } = useApp()
  return <div data-testid="meal-count">{meals.length}</div>
}

// 카메라/앨범 버튼 뒤의 숨은 파일 입력에 사진을 넣는다.
function uploadPhoto() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['fake-image'], 'photo.jpg', { type: 'image/jpeg' })
  fireEvent.change(input, { target: { files: [file] } })
}

const wait = { timeout: 4000 }

describe('음식 사진 흐름 (Test B)', () => {
  it('촬영 → 서버 API 호출 → 확인/수정 → 저장 → 식사 기록 반영', async () => {
    fetchMock.mockResolvedValue(ok(food))
    const onDone = vi.fn()
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={onDone} />
        <Probe />
      </AppProvider>,
    )

    expect(screen.getByText('업로드한 이미지는 AI 분석을 위해 사용됩니다.')).toBeTruthy()
    uploadPhoto()

    // 실제 API 호출: 서버 API로 준비된 이미지(base64)를 전송한다
    expect(await screen.findByText('AI 음식 분석', undefined, wait)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/analyze-food')
    expect(JSON.parse(init.body as string)).toEqual({ image: 'QUFB' })

    // 인식 결과와 예상 영양소
    expect(screen.getByDisplayValue('닭가슴살')).toBeTruthy()
    expect(screen.getByDisplayValue('현미밥')).toBeTruthy()
    expect(screen.getByDisplayValue('브로콜리')).toBeTruthy()
    expect(screen.getByText(/총 495/)).toBeTruthy()
    expect(screen.getByText('사진 분석을 기반으로 한 예상량입니다. 실제 섭취량에 맞게 수정해주세요.')).toBeTruthy()

    // 중량 수정 → 영양소 재계산 (현미밥 180g → 190g: 495 → 511)
    fireEvent.click(screen.getAllByLabelText('10g 늘리기')[1])
    expect(screen.getByText(/총 511/)).toBeTruthy()

    // 저장
    fireEvent.click(screen.getByText('식사 기록하기'))
    expect(onDone).toHaveBeenCalledTimes(1)
    const meal = onDone.mock.calls[0][0]
    expect(meal).toMatchObject({ calories: 511, image: 'data:image/jpeg;base64,THUMB', title: '닭가슴살 현미밥 브로콜리' })
    expect(meal.foods.map((f: { name: string; amount: string }) => `${f.name} ${f.amount}`)).toEqual(['닭가슴살 120g', '현미밥 190g', '브로콜리 70g'])

    // 식사 기록이 앱 상태(→ 대시보드 진행 바)에 반영되고, 원본 사진이 아닌 썸네일만 저장된다
    await waitFor(() => expect(screen.getByTestId('meal-count').textContent).toBe('1'))
    const stored = JSON.parse(localStorage.getItem('ai-diet-app:meals') ?? '[]')
    expect(stored[0].image).toBe('data:image/jpeg;base64,THUMB')
    expect(JSON.stringify(stored)).not.toContain('PREVIEW')
  })

  it('영양 정보를 찾지 못한 음식이 있으면 저장할 수 없고, 삭제하면 저장할 수 있다', async () => {
    fetchMock.mockResolvedValue(
      ok({ ...food, foods: [...food.foods, { name: '정체불명 특별 메뉴', estimatedGrams: 100, cookingMethod: null, confidence: 0.3 }] }),
    )
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={vi.fn()} />
      </AppProvider>,
    )
    uploadPhoto()
    await screen.findByText('AI 음식 분석', undefined, wait)

    const save = screen.getByText('식사 기록하기') as HTMLButtonElement
    expect(save.disabled).toBe(true)
    expect(screen.getAllByText(/영양 정보를 찾지 못했어요/).length).toBeGreaterThan(0)
    expect(screen.getByText('인식 확신 낮음')).toBeTruthy()

    fireEvent.click(screen.getAllByLabelText('음식 삭제')[3])
    expect((screen.getByText('식사 기록하기') as HTMLButtonElement).disabled).toBe(false)
  })

  it('음식 추가하기 → 이름 입력 → 목록에서 선택하면 영양소가 합산된다', async () => {
    fetchMock.mockResolvedValue(ok(food))
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={vi.fn()} />
      </AppProvider>,
    )
    uploadPhoto()
    await screen.findByText('AI 음식 분석', undefined, wait)

    fireEvent.click(screen.getByText('음식 추가하기'))
    const inputs = screen.getAllByLabelText('음식 이름')
    const newInput = inputs[inputs.length - 1]
    fireEvent.change(newInput, { target: { value: '소시지' } })
    fireEvent.click(await screen.findByText('100g당 300kcal'))

    // 495 + 소시지 100g(300kcal) = 795
    expect(screen.getByText(/총 795/)).toBeTruthy()
  })

  it('음식이 아닌 사진 (Test C): 음식 데이터를 만들지 않고 안내 후 기록되지 않는다', async () => {
    fetchMock.mockResolvedValue(fail('NOT_FOOD', '음식 사진이 아닌 것 같아요. 음식이 잘 보이도록 위에서 다시 촬영해주세요.'))
    const onDone = vi.fn()
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={onDone} />
        <Probe />
      </AppProvider>,
    )
    uploadPhoto()

    expect(await screen.findByText(/음식 사진이 아닌 것 같아요/, undefined, wait)).toBeTruthy()
    expect(screen.queryByText('식사 기록하기')).toBeNull()
    // 사진 자체의 문제라 같은 사진으로 "다시 시도"는 제안하지 않는다
    expect(screen.queryByText('다시 시도')).toBeNull()
    expect(screen.getByText('다른 사진으로 다시 촬영')).toBeTruthy()
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByTestId('meal-count').textContent).toBe('0')
  })

  it('API 오류 (Test E): mock으로 대체하지 않고 오류 화면 + 다시 시도, 재시도 성공 시 결과 표시', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(ok(food))
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={vi.fn()} />
        <Probe />
      </AppProvider>,
    )
    uploadPhoto()

    expect(await screen.findByText('네트워크 연결을 확인하고 다시 시도해주세요.', undefined, wait)).toBeTruthy()
    // 오류 상태에서 가짜(mock) 분석 결과가 보이지 않는다
    expect(screen.queryByText('AI 음식 분석')).toBeNull()
    expect(screen.queryByDisplayValue('닭가슴살')).toBeNull()
    expect(screen.getByTestId('meal-count').textContent).toBe('0')

    fireEvent.click(screen.getByText('다시 시도'))
    expect(await screen.findByText('AI 음식 분석', undefined, wait)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('서버 API Key 미설정 오류를 그대로 안내한다 (mock 대체 없음)', async () => {
    fetchMock.mockResolvedValue(fail('MISSING_API_KEY', 'AI 분석 서버가 아직 설정되지 않았어요. 관리자에게 ANTHROPIC_API_KEY 설정을 요청해주세요.', 500))
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={vi.fn()} />
      </AppProvider>,
    )
    uploadPhoto()
    expect(await screen.findByText(/ANTHROPIC_API_KEY 설정을 요청해주세요/, undefined, wait)).toBeTruthy()
    expect(screen.queryByText('식사 기록하기')).toBeNull()
  })

  it('데모 모드에서는 서버를 호출하지 않고 예시 결과를 보여준다', async () => {
    localStorage.setItem('ai-diet-app:isDemo', 'true')
    localStorage.setItem('ai-diet-app:aiMode', '"mock"')
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={vi.fn()} />
      </AppProvider>,
    )
    expect(screen.getByText(/데모 모드/)).toBeTruthy()
    uploadPhoto()
    expect(await screen.findByText('AI 음식 분석', undefined, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByText(/데모 모드: 실제 AI가 아닌 예시 결과예요/)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('데모가 아니면 저장된 aiMode가 mock이어도 실제 API를 호출한다', async () => {
    localStorage.setItem('ai-diet-app:aiMode', '"mock"')
    fetchMock.mockResolvedValue(ok(food))
    render(
      <AppProvider>
        <FoodCaptureFlow onDone={vi.fn()} />
      </AppProvider>,
    )
    uploadPhoto()
    await screen.findByText('AI 음식 분석', undefined, wait)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('InBody 사진 흐름 (Test A / D)', () => {
  it('촬영 → 서버 API → 수치 확인 → 읽지 못한 값 직접 입력 → 적용', async () => {
    fetchMock.mockResolvedValue(ok(inbody))
    const onApply = vi.fn()
    render(
      <AppProvider>
        <InBodyScanFlow mode="real" onApply={onApply} onClose={vi.fn()} />
      </AppProvider>,
    )
    expect(screen.getByText(/분석 후 저장하지 않아요/)).toBeTruthy()
    uploadPhoto()

    expect(await screen.findByText('AI가 분석한 InBody 정보', undefined, wait)).toBeTruthy()
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('/api/analyze-inbody')

    // 읽은 값은 채워지고, 읽지 못한 값(null)은 비어 있으며 안내가 표시된다 (임의로 만들지 않음)
    expect((screen.getByLabelText('체중') as HTMLInputElement).value).toBe('75.2')
    expect((screen.getByLabelText('골격근량') as HTMLInputElement).value).toBe('34.1')
    expect((screen.getByLabelText('체지방량') as HTMLInputElement).value).toBe('')
    expect(screen.getByText(/읽지 못했어요 · 직접 입력/)).toBeTruthy()
    expect(screen.getByText(/일부 항목을 정확하게 읽지 못했어요/)).toBeTruthy()
    expect(screen.getByText('인식 신뢰도 낮음')).toBeTruthy()
    expect(screen.getByText(/체지방량 숫자가 흐릿해서/)).toBeTruthy()

    // 사용자가 값을 수정하고 적용
    fireEvent.change(screen.getByLabelText('체지방량'), { target: { value: '13.8' } })
    fireEvent.change(screen.getByLabelText('체중'), { target: { value: '75.0' } })
    fireEvent.click(screen.getByText('확인하고 적용'))
    expect(onApply).toHaveBeenCalledWith({
      weight: 75,
      skeletalMuscleMass: 34.1,
      bodyFatMass: 13.8,
      bodyFatPercentage: 18.4,
      basalMetabolicRate: 1702,
    })
  })

  it('잘못된 값이 있으면 적용할 수 없고, 다시 분석하면 같은 이미지로 API를 다시 호출한다', async () => {
    // Response 본문은 한 번만 읽을 수 있으므로 호출마다 새 응답을 만든다
    fetchMock.mockImplementation(async () => ok({ ...inbody, confidence: 0.95, bodyFatMassKg: 13.8, warnings: [] }))
    render(
      <AppProvider>
        <InBodyScanFlow mode="real" onApply={vi.fn()} onClose={vi.fn()} />
      </AppProvider>,
    )
    uploadPhoto()
    await screen.findByText('AI가 분석한 InBody 정보', undefined, wait)
    expect(screen.queryByText(/일부 항목을 정확하게 읽지 못했어요/)).toBeNull()

    fireEvent.change(screen.getByLabelText('체중'), { target: { value: '-3' } })
    expect((screen.getByText('확인하고 적용') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByText('다시 분석'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), wait)
    expect(await screen.findByText('AI가 분석한 InBody 정보', undefined, wait)).toBeTruthy()
    expect((screen.getByLabelText('체중') as HTMLInputElement).value).toBe('75.2')
  })

  it('InBody 결과지가 아닌 사진 (Test D): 수치를 만들지 않고 안내한다', async () => {
    fetchMock.mockResolvedValue(fail('NOT_IN_BODY_REPORT', 'InBody 결과지가 아닌 것 같아요. 결과지 전체가 화면에 나오도록 다시 촬영해주세요.'))
    const onApply = vi.fn()
    render(
      <AppProvider>
        <InBodyScanFlow mode="real" onApply={onApply} onClose={vi.fn()} />
      </AppProvider>,
    )
    uploadPhoto()
    expect(await screen.findByText(/InBody 결과지가 아닌 것 같아요/, undefined, wait)).toBeTruthy()
    expect(screen.queryByLabelText('체중')).toBeNull()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('API 오류: 데모 값(mock)으로 대체하지 않는다', async () => {
    fetchMock.mockResolvedValue(fail('UPSTREAM_ERROR', 'AI 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.', 502))
    render(
      <AppProvider>
        <InBodyScanFlow mode="real" onApply={vi.fn()} onClose={vi.fn()} />
      </AppProvider>,
    )
    uploadPhoto()
    expect(await screen.findByText(/일시적인 문제가 있어요/, undefined, wait)).toBeTruthy()
    expect(screen.queryByLabelText('체중')).toBeNull()
    expect(screen.getByText('다시 시도')).toBeTruthy()
  })
})
