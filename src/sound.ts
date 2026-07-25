/** Tiny WebAudio blips - no assets, no dependencies. */
type SoundName = 'hit' | 'miss' | 'sunk' | 'win' | 'lose' | 'place'

const TONES: Record<SoundName, { freq: number; to: number; duration: number; type: OscillatorType }> = {
  hit: { freq: 220, to: 110, duration: 0.28, type: 'square' },
  miss: { freq: 320, to: 180, duration: 0.14, type: 'sine' },
  sunk: { freq: 160, to: 60, duration: 0.6, type: 'sawtooth' },
  win: { freq: 440, to: 880, duration: 0.7, type: 'triangle' },
  lose: { freq: 300, to: 90, duration: 0.9, type: 'sawtooth' },
  place: { freq: 520, to: 640, duration: 0.08, type: 'sine' },
}

let ctx: AudioContext | null = null
let enabled = true

const context = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  return ctx
}

/**
 * Create and resume the AudioContext. Must be called from a user-gesture
 * handler; browsers keep contexts created elsewhere suspended.
 */
export function unlockAudio(): void {
  const audio = context()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()
}

export const setSoundEnabled = (value: boolean): void => {
  enabled = value
}

export const isSoundEnabled = (): boolean => enabled

function emit(audio: AudioContext, name: SoundName): void {
  const { freq, to, duration, type } = TONES[name]
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  const now = audio.currentTime

  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(gain).connect(audio.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

export function playSound(name: SoundName): void {
  if (!enabled) return
  const audio = context()
  if (!audio) return
  if (audio.state === 'suspended') {
    // Schedule only once the clock is actually running, otherwise the note is
    // started against a frozen currentTime and is never heard.
    void audio.resume().then(() => {
      if (enabled && audio.state === 'running') emit(audio, name)
    })
    return
  }
  emit(audio, name)
}
