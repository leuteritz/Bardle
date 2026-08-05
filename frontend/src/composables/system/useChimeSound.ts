import {
  SFX_CHIME_GAIN,
  SFX_CHIME_MAIN_FREQ,
  SFX_CHIME_OVERTONE_FREQ,
  SFX_CHIME_MOD_FREQ,
  SFX_CHIME_MOD_DEPTH,
  SFX_CHIME_ATTACK_S,
  SFX_CHIME_DECAY_S,
  SFX_CHIME_OVERTONE_DELAY_S,
  SFX_CHIME_OVERTONE_DECAY_S,
  SFX_CHIME_SUB_FREQ,
  SFX_CHIME_SUB_GAIN,
  SFX_CHIME_SUB_DECAY_S,
} from '@/config/constants'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function playChimeSound(): void {
  const ac = getCtx()
  const now = ac.currentTime

  const master = ac.createGain()
  master.gain.setValueAtTime(SFX_CHIME_GAIN, now)
  master.connect(ac.destination)

  // Slow LFO — gentle cosmic pitch wobble on the main carrier
  const lfo = ac.createOscillator()
  const lfoGain = ac.createGain()
  lfo.frequency.value = SFX_CHIME_MOD_FREQ
  lfoGain.gain.value = SFX_CHIME_MOD_DEPTH
  lfo.connect(lfoGain)

  // Main carrier: triangle at C4 — warm NES-style retro tone
  const main = ac.createOscillator()
  const mainEnv = ac.createGain()
  main.type = 'triangle'
  main.frequency.value = SFX_CHIME_MAIN_FREQ
  lfoGain.connect(main.frequency)
  mainEnv.gain.setValueAtTime(0, now)
  mainEnv.gain.linearRampToValueAtTime(1, now + SFX_CHIME_ATTACK_S)
  mainEnv.gain.exponentialRampToValueAtTime(0.0001, now + SFX_CHIME_DECAY_S)
  main.connect(mainEnv)
  mainEnv.connect(master)

  // Overtone: square at C5 — crunchy 8-bit pulse shimmer
  const ot = ac.createOscillator()
  const otEnv = ac.createGain()
  const otStart = now + SFX_CHIME_OVERTONE_DELAY_S
  ot.type = 'square'
  ot.frequency.value = SFX_CHIME_OVERTONE_FREQ
  otEnv.gain.setValueAtTime(0, now)
  otEnv.gain.setValueAtTime(0.10, otStart)
  otEnv.gain.exponentialRampToValueAtTime(0.0001, now + SFX_CHIME_OVERTONE_DECAY_S)
  ot.connect(otEnv)
  otEnv.connect(master)

  // Sub-bass: sine at C2 — brief deep universe thump
  const sub = ac.createOscillator()
  const subEnv = ac.createGain()
  sub.type = 'sine'
  sub.frequency.value = SFX_CHIME_SUB_FREQ
  subEnv.gain.setValueAtTime(SFX_CHIME_SUB_GAIN, now)
  subEnv.gain.exponentialRampToValueAtTime(0.0001, now + SFX_CHIME_SUB_DECAY_S)
  sub.connect(subEnv)
  subEnv.connect(master)

  lfo.start(now)
  lfo.stop(now + SFX_CHIME_DECAY_S)
  main.start(now)
  main.stop(now + SFX_CHIME_DECAY_S)
  ot.start(otStart)
  ot.stop(now + SFX_CHIME_DECAY_S)
  sub.start(now)
  sub.stop(now + SFX_CHIME_SUB_DECAY_S)

  setTimeout(() => master.disconnect(), (SFX_CHIME_DECAY_S + 0.1) * 1000)
}
