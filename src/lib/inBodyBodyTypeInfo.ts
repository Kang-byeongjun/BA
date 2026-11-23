import type { InBodyBodyType } from './inBodyBodyType'
import type { InBodyStandardRanges } from '../types'

// 체형 판정 "기준"은 inBodyBodyType.ts의 classifyBodyType(골격근량·체지방량의 표준 대비 비율 비교, 임계값
// BALANCED_THRESHOLD)을 그대로 쓴다. 이 파일은 판정 결과를 화면에 설명하는 문구만 모아 둔다.

export interface BodyTypeInfo {
  badge: string
  title: string
  description: string
}

export const BODY_TYPE_INFO: Record<InBodyBodyType, BodyTypeInfo> = {
  C: {
    badge: 'C형',
    title: '지방이 더 우세한 체형',
    description: '골격근량이 체지방량보다 표준에서 더 뒤처져 있어요. 근력 운동을 늘려보세요.',
  },
  I: {
    badge: 'I형',
    title: '균형 잡힌 표준 체형',
    description: '골격근량과 체지방량이 표준에 비슷하게 맞아 있어요. 지금 균형을 유지해보세요.',
  },
  D: {
    badge: 'D형',
    title: '근육이 더 우세한 체형',
    description: '골격근량이 체지방량보다 표준에서 더 앞서 있어요. 지금 운동 습관을 이어가세요.',
  },
}

export const BODY_TYPE_DISCLAIMER = '의료 진단이 아닌 참고용 간이 추정이에요.'

/** "C·I·D형이란?" 접힌 안내 문구 */
export const BODY_TYPE_GUIDE: { badge: string; text: string }[] = [
  { badge: 'C형', text: '막대 끝점이 왼쪽으로 휘어 알파벳 C처럼 보여요. 골격근량이 체지방량보다 표준 대비 낮은 편이에요.' },
  { badge: 'I형', text: '막대 끝점이 거의 일직선이에요. 골격근량과 체지방량의 표준 대비 정도가 비슷해요.' },
  { badge: 'D형', text: '막대 끝점이 오른쪽으로 불룩해 D처럼 보여요. 골격근량이 체지방량보다 표준 대비 높은 편이에요.' },
]

/**
 * 체형 판정을 생략한 이유를 알기 쉬운 문장으로 돌려준다.
 * 반드시 "체형 판정은 생략했어요"로 끝나서, 이유가 달라도 같은 말로 마무리된다.
 */
export function describeMissingReason(ranges: InBodyStandardRanges | null): string {
  const muscle = ranges?.skeletalMuscleMass ?? null
  const fat = ranges?.bodyFatMass ?? null
  if (!muscle && !fat) {
    return '이 기록에는 결과지의 표준범위 정보가 없어서(직접 입력·간편 입력·데모 기록 등) 체형 판정은 생략했어요.'
  }
  if (!muscle || !fat) {
    const missing = !muscle ? '골격근량' : '체지방량'
    return `결과지에서 ${missing}의 표준범위를 읽지 못해 체형 판정은 생략했어요.`
  }
  if (muscle.value === null || fat.value === null) {
    return '표준범위는 읽었지만 내 측정값이 막대 어디에 있는지 읽지 못해 체형 판정은 생략했어요.'
  }
  return '결과지의 표준범위를 비교하지 못해 체형 판정은 생략했어요.'
}
