import { describe, expect, it } from 'vitest'
import { getBalanceAdvice } from '../workoutBalance'
import { estimateDayMinutes } from '../workoutEstimate'

const mv = (group: 'CHEST' | 'BACK' | 'LEGS' | 'ARM' | 'CARDIO', label: string, volume: number) => ({ group, label, volume })

describe('getBalanceAdvice', () => {
  it('가장 적은 부위가 15% 미만이면 한 줄 안내를 만든다(받침에 따라 이/가)', () => {
    expect(getBalanceAdvice([mv('CHEST', '가슴', 900), mv('BACK', '등', 900), mv('LEGS', '하체', 100)])).toBe(
      '하체가 적어요. 다음 루틴에서 늘려보세요',
    )
    expect(getBalanceAdvice([mv('CHEST', '가슴', 900), mv('ARM', '팔', 50)])).toBe('팔이 적어요. 다음 루틴에서 늘려보세요')
  })

  it('균형이 잡혔거나 비교할 부위가 모자라면 null', () => {
    expect(getBalanceAdvice([mv('CHEST', '가슴', 800), mv('LEGS', '하체', 700)])).toBeNull()
    expect(getBalanceAdvice([mv('CHEST', '가슴', 800)])).toBeNull()
    expect(getBalanceAdvice([])).toBeNull()
  })

  it('유산소는 근력 균형 계산에서 뺀다', () => {
    expect(getBalanceAdvice([mv('CHEST', '가슴', 900), mv('LEGS', '하체', 800), mv('CARDIO', '유산소', 1)])).toBeNull()
  })
})

describe('estimateDayMinutes', () => {
  const rx = { setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 2, restMin: 80, restMax: 80 }
  it('종목이 없으면 0, 있으면 5분 단위', () => {
    expect(estimateDayMinutes([])).toBe(0)
    // 3세트 × (40+80)초 = 6분 → 5분 단위 반올림 5
    expect(estimateDayMinutes([{ prescription: rx }])).toBe(5)
    // 5종목 = 30분
    expect(estimateDayMinutes(Array(5).fill({ prescription: rx }))).toBe(30)
  })
  it('유산소(처방 없음)는 10분으로 센다', () => {
    expect(estimateDayMinutes([{ prescription: null }])).toBe(10)
  })
})
