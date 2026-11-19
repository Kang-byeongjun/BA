import { describe, expect, it } from 'vitest'
import { CATALOG_GROUP_ORDER, EXERCISE_CATALOG, searchExercises } from '../exerciseCatalog'

describe('EXERCISE_CATALOG', () => {
  it('종목마다 id가 겹치지 않는다', () => {
    const ids = EXERCISE_CATALOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('CATALOG_GROUP_ORDER에 있는 부위만 쓰인다', () => {
    const groups = new Set(EXERCISE_CATALOG.map((e) => e.group))
    for (const g of groups) expect(CATALOG_GROUP_ORDER).toContain(g)
  })
})

describe('searchExercises', () => {
  it('빈 문자열이면 전체를 돌려준다', () => {
    expect(searchExercises('')).toHaveLength(EXERCISE_CATALOG.length)
    expect(searchExercises('   ')).toHaveLength(EXERCISE_CATALOG.length)
  })

  it('이름 일부로 찾는다(대소문자 무시)', () => {
    const result = searchExercises('스쿼트')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.name.includes('스쿼트'))).toBe(true)
  })

  it('일치하는 종목이 없으면 빈 배열', () => {
    expect(searchExercises('존재하지않는운동이름xyz')).toEqual([])
  })
})
