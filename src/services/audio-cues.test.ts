import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __audioCuesTestInternals,
  isAudioCuesEnabled,
  playAudioCue,
  primeAudioCues,
  setAudioCuesEnabled,
} from './audio-cues'

type MockOscillator = {
  type: OscillatorType
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

type MockGain = {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
  }
  connect: ReturnType<typeof vi.fn>
}

interface MockAudioContext {
  currentTime: number
  state: AudioContextState
  destination: object
  resume: ReturnType<typeof vi.fn>
  createOscillator: ReturnType<typeof vi.fn>
  createGain: ReturnType<typeof vi.fn>
  oscillators: MockOscillator[]
  gains: MockGain[]
}

function buildMockContext(initialState: AudioContextState = 'running'): MockAudioContext {
  const oscillators: MockOscillator[] = []
  const gains: MockGain[] = []

  const ctx: MockAudioContext = {
    currentTime: 0,
    state: initialState,
    destination: {},
    resume: vi.fn(async () => {
      ctx.state = 'running'
    }),
    createOscillator: vi.fn(() => {
      const osc: MockOscillator = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(osc)
      return osc
    }),
    createGain: vi.fn(() => {
      const gain: MockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }
      gains.push(gain)
      return gain
    }),
    oscillators,
    gains,
  }

  return ctx
}

function buildLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

function installWindow(mockCtx: MockAudioContext) {
  const localStorage = buildLocalStorage()
  const AudioContextMock = vi.fn(function MockedAudioContext(this: MockAudioContext) {
    Object.assign(this, mockCtx)
    return this
  })
  const mockWindow = {
    localStorage,
    AudioContext: AudioContextMock,
  }
  ;(globalThis as unknown as Record<string, unknown>).window = mockWindow
  return mockWindow
}

function installWindowWithoutAudio() {
  ;(globalThis as unknown as Record<string, unknown>).window = {
    localStorage: buildLocalStorage(),
  }
}

function removeWindow() {
  delete (globalThis as unknown as Record<string, unknown>).window
}

describe('audio-cues', () => {
  let mockCtx: MockAudioContext

  beforeEach(() => {
    __audioCuesTestInternals.reset()
    mockCtx = buildMockContext('running')
    installWindow(mockCtx)
  })

  afterEach(() => {
    __audioCuesTestInternals.reset()
    removeWindow()
  })

  it('defaults to enabled when preference is unset', () => {
    expect(isAudioCuesEnabled()).toBe(true)
  })

  it('persists the enabled preference', () => {
    setAudioCuesEnabled(false)
    expect(isAudioCuesEnabled()).toBe(false)
    setAudioCuesEnabled(true)
    expect(isAudioCuesEnabled()).toBe(true)
  })

  it('is a no-op before priming', () => {
    playAudioCue('start')
    expect(mockCtx.createOscillator).not.toHaveBeenCalled()
  })

  it('plays a three-tone chime for the start cue after priming', () => {
    primeAudioCues()
    playAudioCue('start')
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3)
    expect(mockCtx.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(1047, 0)
  })

  it('plays a double tone for the lap cue', () => {
    primeAudioCues()
    playAudioCue('lap')
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2)
  })

  it('plays a four-tone chime for the complete cue', () => {
    primeAudioCues()
    playAudioCue('complete')
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4)
  })

  it('does not play when cues are disabled', () => {
    primeAudioCues()
    setAudioCuesEnabled(false)
    playAudioCue('start')
    expect(mockCtx.createOscillator).not.toHaveBeenCalled()
  })

  it('resumes a suspended context on prime', () => {
    __audioCuesTestInternals.reset()
    removeWindow()
    mockCtx = buildMockContext('suspended')
    installWindow(mockCtx)

    primeAudioCues()
    expect(mockCtx.resume).toHaveBeenCalled()
  })

  it('does nothing and does not throw when no AudioContext is available', () => {
    __audioCuesTestInternals.reset()
    removeWindow()
    installWindowWithoutAudio()

    expect(() => {
      primeAudioCues()
      playAudioCue('start')
    }).not.toThrow()
  })
})
