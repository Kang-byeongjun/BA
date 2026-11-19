// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

// 모듈 안에 AudioContext를 하나만 만들어 두므로 테스트마다 새로 불러온다.
async function load() {
  vi.resetModules()
  return import('../restAlarm')
}

afterEach(() => {
  vi.unstubAllGlobals()
  // jsdom의 navigator에 직접 붙인 vibrate 제거
  delete (navigator as { vibrate?: unknown }).vibrate
})

function fakeAudio() {
  const started: number[] = []
  const instances: { resume: ReturnType<typeof vi.fn> }[] = []
  const node = () => ({ connect: vi.fn((n: unknown) => n), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } })
  class FakeCtx {
    constructor() {
      instances.push(this)
    }
    state = 'suspended'
    currentTime = 0
    destination = {}
    resume = vi.fn(async () => {
      this.state = 'running'
    })
    createGain = () => node()
    createOscillator = () => ({
      ...node(),
      type: '',
      frequency: { value: 0 },
      start: (t: number) => started.push(t),
      stop: vi.fn(),
    })
  }
  return { FakeCtx, started, instances }
}

describe('restAlarm', () => {
  it('진동과 짧은 알림음(삐-삐 두 번)을 낸다', async () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const { FakeCtx, started } = fakeAudio()
    vi.stubGlobal('AudioContext', FakeCtx)

    const { playRestAlarm } = await load()
    playRestAlarm()
    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(started).toHaveLength(2)
  })

  it('사용자 터치 때 소리 장치를 깨운다', async () => {
    const { FakeCtx, instances } = fakeAudio()
    vi.stubGlobal('AudioContext', FakeCtx)
    const { unlockRestAlarm } = await load()
    unlockRestAlarm()
    expect(instances).toHaveLength(1)
    expect(instances[0]!.resume).toHaveBeenCalled()
  })

  it('진동·소리를 지원하지 않는 기기에서도 오류 없이 넘어간다', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { playRestAlarm, unlockRestAlarm } = await load()
    expect(() => {
      unlockRestAlarm()
      playRestAlarm()
    }).not.toThrow()
  })
})
