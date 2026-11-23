import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../../../server/engine/data'
import guidesJson from '../../data/exerciseGuides.json'
import { describeMuscles, getExerciseGuide, getMuscleViews, MUSCLE_LABELS_KO, type ExerciseGuide } from '../exerciseGuides'

const guide = (primary: ExerciseGuide['muscles']['primary'], secondary: ExerciseGuide['muscles']['secondary'] = []): ExerciseGuide => ({
  muscles: { primary, secondary },
  steps: ['a', 'b', 'c'],
  tips: ['t'],
})

describe('getExerciseGuide', () => {
  it('정상 id는 안내를 돌려준다', () => {
    const g = getExerciseGuide('L02')
    expect(g?.muscles.primary).toContain('quadriceps')
    expect(g?.steps.length).toBeGreaterThanOrEqual(3)
  })
  it('없는 id는 null', () => {
    expect(getExerciseGuide('ZZ99')).toBeNull()
    expect(getExerciseGuide('')).toBeNull()
    expect(getExerciseGuide(undefined)).toBeNull()
    expect(getExerciseGuide('toString')).toBeNull() // 객체 기본 속성 이름에 속지 않는다
  })
  it('custom- 으로 시작하는 id(직접 입력)는 null', () => {
    expect(getExerciseGuide('custom-abc123')).toBeNull()
  })
})

describe('안내 데이터(exerciseGuides.json) 점검', () => {
  const labels = Object.keys(MUSCLE_LABELS_KO)
  it('엔진의 모든 종목(91개)에 안내가 있고 형식이 맞다', () => {
    expect(EXERCISES.length).toBe(91)
    for (const e of EXERCISES) {
      const g = getExerciseGuide(e.id)
      expect(g, e.id).not.toBeNull()
      expect(g!.muscles.primary.length, `${e.id} 주 근육`).toBeGreaterThan(0)
      for (const m of [...g!.muscles.primary, ...g!.muscles.secondary]) expect(labels, `${e.id} ${m}`).toContain(m)
      expect(g!.steps.length, `${e.id} 단계`).toBeGreaterThanOrEqual(3)
      expect(g!.steps.length, `${e.id} 단계`).toBeLessThanOrEqual(5)
      expect(g!.tips.length, `${e.id} 팁`).toBeGreaterThanOrEqual(1)
      expect(g!.tips.length, `${e.id} 팁`).toBeLessThanOrEqual(2)
    }
  })
  it('엔진에 없는 id가 데이터에 남아 있지 않다', () => {
    const ids = new Set(EXERCISES.map((e) => e.id))
    for (const id of Object.keys(guidesJson)) expect(ids.has(id), id).toBe(true)
  })
})

describe('getMuscleViews', () => {
  it('앞면에만 있는 근육(가슴·복근)은 앞면에만 칠한다', () => {
    const v = getMuscleViews(guide(['chest'], ['abs']))
    expect(v.anterior).toEqual({ primary: ['chest'], secondary: ['abs'] })
    expect(v.posterior).toEqual({ primary: [], secondary: [] })
    expect(v.preferred).toBe('anterior')
  })

  it('뒷면에만 있는 근육(허리·둔근·햄스트링)은 뒷면에만 칠하고 대표 면이 뒷면이다', () => {
    const v = getMuscleViews(guide(['lower-back'], ['gluteal', 'hamstring']))
    expect(v.anterior).toEqual({ primary: [], secondary: [] })
    expect(v.posterior).toEqual({ primary: ['lower-back'], secondary: ['gluteal', 'hamstring'] })
    expect(v.preferred).toBe('posterior')
  })

  it('양쪽에 보이는 근육(삼두·전완·종아리)은 두 면 모두에 칠한다', () => {
    const v = getMuscleViews(guide(['triceps'], ['forearm', 'calves']))
    expect(v.anterior.primary).toEqual(['triceps'])
    expect(v.posterior.primary).toEqual(['triceps'])
    expect(v.anterior.secondary).toEqual(['forearm', 'calves'])
    expect(v.posterior.secondary).toEqual(['forearm', 'calves'])
    expect(v.preferred).toBe('anterior') // 같으면 앞면
  })

  it('칠할 근육이 더 많은 쪽이 대표 면이다', () => {
    // 등 운동: 앞면에는 이두만, 뒷면에는 등·승모·어깨 뒤
    const v = getMuscleViews(guide(['upper-back', 'trapezius'], ['biceps', 'back-deltoids']))
    expect(v.anterior.secondary).toEqual(['biceps'])
    expect(v.posterior.primary).toEqual(['upper-back', 'trapezius'])
    expect(v.preferred).toBe('posterior')
  })

  it('허벅지 안쪽(adductor)은 라이브러리의 앞면 abductors·뒷면 adductor 다각형으로 옮긴다', () => {
    const v = getMuscleViews(guide(['adductor']))
    expect(v.anterior.primary).toEqual(['abductors'])
    expect(v.posterior.primary).toEqual(['adductor'])
  })

  it('주 근육이 보조 근육에도 적혀 있으면 주 근육으로만 칠한다', () => {
    const v = getMuscleViews(guide(['chest'], ['chest', 'triceps']))
    expect(v.anterior).toEqual({ primary: ['chest'], secondary: ['triceps'] })
  })
})

describe('describeMuscles', () => {
  it('주 근육 먼저, 한글로 이어 붙인다', () => {
    expect(describeMuscles(guide(['quadriceps', 'gluteal'], ['hamstring']))).toBe('대퇴사두근, 둔근, 햄스트링')
  })
})
