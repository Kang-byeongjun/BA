import type { MuscleGroup } from '../../server/engine/types'

/**
 * exerciseCatalog — 운동 기록 화면에서 "직접 종목 추가"를 고를 때 쓰는 근력 종목 목록.
 * server/engine/data/exercises.json(추천 엔진의 종목 DB)에서 화면 표시에 필요한 값만
 * 추려 옮겨 적었다(엔진의 점수 계산 로직·부담도 같은 내부 값은 브라우저로 보내지 않는다).
 * 유산소(CARDIO) 종목은 세트 기록 대상이 아니라서 뺐다.
 */

export interface CatalogExercise {
  id: string
  name: string
  group: Exclude<MuscleGroup, 'CARDIO'>
  equipment: string
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  { id: 'C01', name: '머신 체스트 프레스', group: 'CHEST', equipment: '머신' },
  { id: 'C02', name: '덤벨 벤치 프레스', group: 'CHEST', equipment: '덤벨' },
  { id: 'C03', name: '바벨 벤치 프레스', group: 'CHEST', equipment: '바벨' },
  { id: 'C04', name: '인클라인 덤벨 프레스', group: 'CHEST', equipment: '덤벨' },
  { id: 'C05', name: '푸시업', group: 'CHEST', equipment: '맨몸' },
  { id: 'C06', name: '펙덱 플라이', group: 'CHEST', equipment: '머신' },
  { id: 'C07', name: '케이블 크로스오버', group: 'CHEST', equipment: '케이블' },
  { id: 'C08', name: '레버리지 인클라인 체스트 프레스', group: 'CHEST', equipment: '머신' },
  { id: 'C09', name: '케이블 체스트 프레스', group: 'CHEST', equipment: '케이블' },
  { id: 'C10', name: '로우 케이블 크로스오버', group: 'CHEST', equipment: '케이블' },
  { id: 'C11', name: '스미스머신 벤치 프레스', group: 'CHEST', equipment: '머신' },
  { id: 'C12', name: '덤벨 플라이', group: 'CHEST', equipment: '덤벨' },
  { id: 'C13', name: '인클라인 푸시업', group: 'CHEST', equipment: '맨몸' },
  { id: 'S01', name: '머신 숄더 프레스', group: 'SHOULDER', equipment: '머신' },
  { id: 'S02', name: '덤벨 숄더 프레스', group: 'SHOULDER', equipment: '덤벨' },
  { id: 'S03', name: '바벨 오버헤드 프레스', group: 'SHOULDER', equipment: '바벨' },
  { id: 'S04', name: '덤벨 사이드 레터럴 레이즈', group: 'SHOULDER', equipment: '덤벨' },
  { id: 'S05', name: '케이블 페이스 풀', group: 'SHOULDER', equipment: '케이블' },
  { id: 'S06', name: '리버스 펙덱', group: 'SHOULDER', equipment: '머신' },
  { id: 'S07', name: '케이블 시티드 래터럴 레이즈', group: 'SHOULDER', equipment: '케이블' },
  { id: 'S08', name: '케이블 리어 델트 플라이', group: 'SHOULDER', equipment: '케이블' },
  { id: 'S09', name: '스미스머신 숄더 프레스', group: 'SHOULDER', equipment: '머신' },
  { id: 'S10', name: '시티드 덤벨 숄더 프레스', group: 'SHOULDER', equipment: '덤벨' },
  { id: 'S11', name: '벤치 지지 덤벨 리어 델트 레이즈', group: 'SHOULDER', equipment: '덤벨' },
  { id: 'B01', name: '랫 풀다운', group: 'BACK', equipment: '머신' },
  { id: 'B02', name: '시티드 케이블 로우', group: 'BACK', equipment: '케이블' },
  { id: 'B03', name: '머신 로우 (가슴 지지형)', group: 'BACK', equipment: '머신' },
  { id: 'B04', name: '원암 덤벨 로우', group: 'BACK', equipment: '덤벨' },
  { id: 'B05', name: '바벨 로우', group: 'BACK', equipment: '바벨' },
  { id: 'B06', name: '풀업(턱걸이)', group: 'BACK', equipment: '맨몸' },
  { id: 'B07', name: '어시스티드 풀업', group: 'BACK', equipment: '머신' },
  { id: 'B08', name: '스트레이트암 풀다운', group: 'BACK', equipment: '케이블' },
  { id: 'B09', name: '클로즈 그립 랫 풀다운', group: 'BACK', equipment: '케이블' },
  { id: 'B10', name: '레버리지 하이 로우', group: 'BACK', equipment: '머신' },
  { id: 'B11', name: '레버리지 아이소 로우', group: 'BACK', equipment: '머신' },
  { id: 'B12', name: '라잉 T바 로우 (가슴 지지)', group: 'BACK', equipment: '머신' },
  { id: 'B13', name: '원암 랫 풀다운', group: 'BACK', equipment: '케이블' },
  { id: 'B14', name: '벤트오버 덤벨 로우', group: 'BACK', equipment: '덤벨' },
  { id: 'B15', name: '백 익스텐션', group: 'BACK', equipment: '기타' },
  { id: 'A01', name: '덤벨 바이셉 컬', group: 'ARM', equipment: '덤벨' },
  { id: 'A02', name: '바벨 컬', group: 'ARM', equipment: '바벨' },
  { id: 'A03', name: '해머 컬', group: 'ARM', equipment: '덤벨' },
  { id: 'A04', name: '케이블 트라이셉 푸시다운', group: 'ARM', equipment: '케이블' },
  { id: 'A05', name: '오버헤드 트라이셉 익스텐션', group: 'ARM', equipment: '덤벨' },
  { id: 'A06', name: '머신 트라이셉 익스텐션', group: 'ARM', equipment: '머신' },
  { id: 'A07', name: '머신 바이셉 컬', group: 'ARM', equipment: '머신' },
  { id: 'A08', name: '머신 프리처 컬', group: 'ARM', equipment: '머신' },
  { id: 'A09', name: '케이블 바이셉 컬', group: 'ARM', equipment: '케이블' },
  { id: 'A10', name: '케이블 로프 해머 컬', group: 'ARM', equipment: '케이블' },
  { id: 'A11', name: '로프 트라이셉 푸시다운', group: 'ARM', equipment: '케이블' },
  { id: 'A12', name: '딥 머신', group: 'ARM', equipment: '머신' },
  { id: 'A13', name: '케이블 로프 오버헤드 트라이셉 익스텐션', group: 'ARM', equipment: '케이블' },
  { id: 'L01', name: '레그 프레스', group: 'LEGS', equipment: '머신' },
  { id: 'L02', name: '바벨 스쿼트', group: 'LEGS', equipment: '바벨' },
  { id: 'L03', name: '고블렛 스쿼트', group: 'LEGS', equipment: '덤벨' },
  { id: 'L04', name: '스미스머신 스쿼트', group: 'LEGS', equipment: '머신' },
  { id: 'L05', name: '덤벨 런지', group: 'LEGS', equipment: '덤벨' },
  { id: 'L06', name: '레그 익스텐션', group: 'LEGS', equipment: '머신' },
  { id: 'L07', name: '힙 쓰러스트', group: 'LEGS', equipment: '바벨' },
  { id: 'L08', name: '레그 컬', group: 'LEGS', equipment: '머신' },
  { id: 'L09', name: '루마니안 데드리프트', group: 'LEGS', equipment: '바벨' },
  { id: 'L10', name: '데드리프트', group: 'LEGS', equipment: '바벨' },
  { id: 'L11', name: '힙 어브덕션', group: 'LEGS', equipment: '머신' },
  { id: 'L12', name: '카프 레이즈', group: 'LEGS', equipment: '머신' },
  { id: 'L13', name: '핵 스쿼트 머신', group: 'LEGS', equipment: '머신' },
  { id: 'L14', name: '라잉 레그 컬', group: 'LEGS', equipment: '머신' },
  { id: 'L15', name: '시티드 레그 컬', group: 'LEGS', equipment: '머신' },
  { id: 'L16', name: '시티드 카프 레이즈', group: 'LEGS', equipment: '머신' },
  { id: 'L17', name: '힙 어덕션 (내전근 머신)', group: 'LEGS', equipment: '머신' },
  { id: 'L18', name: '케이블 풀스루', group: 'LEGS', equipment: '케이블' },
  { id: 'L19', name: '케이블 킥백', group: 'LEGS', equipment: '케이블' },
  { id: 'L20', name: '맨몸 스쿼트', group: 'LEGS', equipment: '맨몸' },
  { id: 'L21', name: '글루트 브릿지', group: 'LEGS', equipment: '맨몸' },
  { id: 'L22', name: '덤벨 스텝업', group: 'LEGS', equipment: '덤벨' },
  { id: 'Ab01', name: '플랭크', group: 'ABS', equipment: '맨몸' },
  { id: 'Ab02', name: '크런치', group: 'ABS', equipment: '맨몸' },
  { id: 'Ab03', name: '데드버그', group: 'ABS', equipment: '맨몸' },
  { id: 'Ab04', name: '행잉 니 레이즈', group: 'ABS', equipment: '맨몸' },
  { id: 'Ab05', name: '케이블 크런치', group: 'ABS', equipment: '케이블' },
  { id: 'Ab06', name: '에브 크런치 머신', group: 'ABS', equipment: '머신' },
  { id: 'Ab07', name: '팔로프 프레스', group: 'ABS', equipment: '케이블' },
  { id: 'Ab08', name: '사이드 플랭크', group: 'ABS', equipment: '맨몸' },
  { id: 'Ab09', name: '리버스 크런치', group: 'ABS', equipment: '맨몸' },
]

export const CATALOG_GROUP_ORDER: Exclude<MuscleGroup, 'CARDIO'>[] = ['CHEST', 'BACK', 'SHOULDER', 'ARM', 'LEGS', 'ABS']

/** 이름 일부로 종목을 찾는다(대소문자·공백 무시) */
export function searchExercises(query: string): CatalogExercise[] {
  const q = query.trim().toLowerCase()
  if (!q) return EXERCISE_CATALOG
  return EXERCISE_CATALOG.filter((e) => e.name.toLowerCase().includes(q))
}
