<template>
  <Teleport to="body">
    <div v-if="active" ref="wrapperRef" class="nebula-flythrough" aria-hidden="true">
      <div ref="layer0Ref" class="nf-layer nf-layer-0"></div>
      <div ref="layer1Ref" class="nf-layer nf-layer-1"></div>
      <div ref="layer2Ref" class="nf-layer nf-layer-2"></div>
      <div ref="layer3Ref" class="nf-layer nf-layer-3"></div>
      <div ref="dust0Ref" class="nf-dust nf-dust-0"></div>
      <div ref="dust1Ref" class="nf-dust nf-dust-1"></div>
      <div ref="void0Ref" class="nf-void nf-void-0"></div>
      <div ref="void1Ref" class="nf-void nf-void-1"></div>
      <div ref="void2Ref" class="nf-void nf-void-2"></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useNebulaTrigger } from '@/composables/useNebulaTrigger'
import { useRenderingPaused } from '@/composables/useRenderingPaused'

// ─── Palettes ──────────────────────────────────────────────────────────────────

type NebulaPalette = {
  name: string
  base: string
  core: string
  mid: string
  outer: string
  accent: string
}

const NEBULA_PALETTES: NebulaPalette[] = [
  {
    name: 'carina',
    base: '#300010',
    core: '#cc3355',
    mid: '#ff6688',
    outer: '#ff99bb',
    accent: '#ffccdd',
  },
  {
    name: 'pleiades',
    base: '#000820',
    core: '#1144aa',
    mid: '#2288ff',
    outer: '#66bbff',
    accent: '#aaddff',
  },
  {
    name: 'pillars',
    base: '#0f0015',
    core: '#7722aa',
    mid: '#cc44ff',
    outer: '#ff88cc',
    accent: '#ffaa88',
  },
  {
    name: 'eta',
    base: '#001508',
    core: '#116633',
    mid: '#22bb55',
    outer: '#88ffaa',
    accent: '#ddcc22',
  },
]

// ─── State ─────────────────────────────────────────────────────────────────────

const active = ref(false)

const wrapperRef = ref<HTMLDivElement>()
const layer0Ref = ref<HTMLDivElement>()
const layer1Ref = ref<HTMLDivElement>()
const layer2Ref = ref<HTMLDivElement>()
const layer3Ref = ref<HTMLDivElement>()
const dust0Ref = ref<HTMLDivElement>()
const dust1Ref = ref<HTMLDivElement>()
const void0Ref = ref<HTMLDivElement>()
const void1Ref = ref<HTMLDivElement>()
const void2Ref = ref<HTMLDivElement>()

let timerHandle: ReturnType<typeof setTimeout> | null = null
let rafHandle: number | null = null

let timerStartedAt = 0
let timerTotalDelay = 0
let isTimerPaused = false

let eventElapsedAtPause = 0
let eventStart = 0

let eventDuration = 0
let enterDur = 0
let throughDur = 0

let currentPalette: NebulaPalette = NEBULA_PALETTES[0]
let prefersReducedMotion = false
let parallaxTime = 0
let lastRafTs = 0

const { isRenderingPaused } = useRenderingPaused()

// ─── Wolkenlücken ─────────────────────────────────────────────────────────────

type VoidState = { x: number; y: number; vx: number; vy: number }
const voidStates: VoidState[] = [
  { x: 50, y: 50, vx: 0, vy: 0 },
  { x: 50, y: 50, vx: 0, vy: 0 },
  { x: 50, y: 50, vx: 0, vy: 0 },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randVel(min: number, max: number, fallback: number): number {
  const v = rand(min, max)
  return Math.abs(v) < 0.8 ? fallback : v
}

function easeInCubic(t: number) {
  return t * t * t
}
function easeOutCubic(t: number) {
  const s = 1 - t
  return 1 - s * s * s
}
function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5)
}

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function rgba(hex: string, a: number) {
  const [r, g, b] = hex2rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

// ─── Palette ───────────────────────────────────────────────────────────────────

function applyPalette(p: NebulaPalette) {
  const l0 = layer0Ref.value
  const l1 = layer1Ref.value
  const l2 = layer2Ref.value
  const l3 = layer3Ref.value
  if (!l0 || !l1 || !l2 || !l3) return
  l0.style.background = `radial-gradient(ellipse 120% 90% at 50% 50%, ${rgba(p.base, 0.35)} 0%, ${rgba(p.outer, 0.12)} 45%, transparent 75%)`
  l1.style.background = `radial-gradient(ellipse 85% 70% at 40% 45%, ${rgba(p.mid, 0.32)} 0%, ${rgba(p.core, 0.18)} 35%, ${rgba(p.outer, 0.08)} 65%, transparent 85%)`
  l2.style.background = `radial-gradient(ellipse 70% 55% at 62% 55%, ${rgba(p.outer, 0.22)} 0%, ${rgba(p.mid, 0.12)} 50%, transparent 80%)`
  l3.style.background = `radial-gradient(ellipse 45% 40% at 48% 50%, ${rgba(p.accent, 0.28)} 0%, ${rgba(p.core, 0.14)} 40%, transparent 75%)`
}

// ─── Schichtdichte ─────────────────────────────────────────────────────────────

function updateLayerDensity(pt: number, weight: number) {
  const osc = (phase: number, freq: number, floor: number) => {
    const raw = 0.5 + 0.5 * Math.sin(pt * freq + phase)
    return 1 - weight * (1 - (floor + (1 - floor) * raw))
  }
  if (layer0Ref.value) layer0Ref.value.style.opacity = String(osc(0.0, 0.13, 0.55))
  if (layer1Ref.value) layer1Ref.value.style.opacity = String(osc(1.4, 0.27, 0.1))
  if (layer2Ref.value) layer2Ref.value.style.opacity = String(osc(2.9, 0.41, 0.08))
  if (layer3Ref.value) layer3Ref.value.style.opacity = String(osc(4.2, 0.18, 0.2))
}

function setVoidPos(el: HTMLDivElement | undefined, cx: number, cy: number, opacity: number) {
  if (!el) return
  el.style.left = `${cx}%`
  el.style.top = `${cy}%`
  el.style.transform = 'translate(-50%, -50%)'
  el.style.opacity = String(Math.max(0, Math.min(1, opacity)))
}

function setTranslate(el: HTMLDivElement | undefined, x: number, y: number) {
  if (el) el.style.transform = `translate(${x}px, ${y}px)`
}

// ─── Animationsframe ───────────────────────────────────────────────────────────

function animate(ts: number) {
  if (!active.value) return

  const delta = lastRafTs === 0 ? 0 : (ts - lastRafTs) / 1000
  lastRafTs = ts
  const elapsed = ts - eventStart
  const total = eventDuration

  let globalAlpha: number, globalScale: number
  let densityWeight: number, voidAlpha: number

  if (elapsed < enterDur) {
    const t = elapsed / enterDur
    globalAlpha = easeInCubic(t)
    globalScale = 0.008 + easeOutQuint(t) * 0.992
    densityWeight = 0
    voidAlpha = 0
  } else if (elapsed < enterDur + throughDur) {
    const t = (elapsed - enterDur) / throughDur
    globalAlpha = 1
    globalScale = 1.0 + t * 0.06
    densityWeight = Math.min(t / 0.12, 1)
    voidAlpha = densityWeight * 0.88
  } else {
    const exitDur = total - enterDur - throughDur
    const t = Math.min((elapsed - enterDur - throughDur) / exitDur, 1)
    globalAlpha = easeOutCubic(1 - t)
    globalScale = 1.06 + t * 0.09
    densityWeight = 1
    voidAlpha = 0.88
  }

  if (wrapperRef.value) {
    wrapperRef.value.style.opacity = String(globalAlpha)
    wrapperRef.value.style.transform = `scale(${globalScale})`
  }

  if (!prefersReducedMotion) {
    parallaxTime += delta
    updateLayerDensity(parallaxTime, densityWeight)
    const amp = 28
    setTranslate(
      layer0Ref.value,
      Math.sin(parallaxTime * 0.08) * amp * 0.4,
      Math.cos(parallaxTime * 0.06) * amp * 0.3,
    )
    setTranslate(
      layer1Ref.value,
      Math.sin(parallaxTime * 0.12 + 1.2) * amp * 0.7,
      Math.cos(parallaxTime * 0.1 + 0.5) * amp * 0.6,
    )
    setTranslate(
      layer2Ref.value,
      Math.cos(parallaxTime * 0.18 + 2.4) * amp * 1.0,
      Math.sin(parallaxTime * 0.15 + 1.0) * amp * 0.9,
    )
    setTranslate(
      layer3Ref.value,
      Math.sin(parallaxTime * 0.25 + 0.8) * amp * 1.4,
      Math.cos(parallaxTime * 0.22 + 1.8) * amp * 1.2,
    )
    setTranslate(
      dust0Ref.value,
      Math.cos(parallaxTime * 0.09 + 3.1) * amp * 0.5,
      Math.sin(parallaxTime * 0.07 + 2.0) * amp * 0.4,
    )
    setTranslate(
      dust1Ref.value,
      Math.sin(parallaxTime * 0.14 + 1.5) * amp * 0.8,
      Math.cos(parallaxTime * 0.11 + 0.3) * amp * 0.7,
    )

    voidStates.forEach((v) => {
      v.x += v.vx * delta
      v.y += v.vy * delta
      if (v.x < -28) v.x = 128
      if (v.x > 128) v.x = -28
      if (v.y < -28) v.y = 128
      if (v.y > 128) v.y = -28
    })
  }

  setVoidPos(void0Ref.value, voidStates[0].x, voidStates[0].y, voidAlpha)
  setVoidPos(void1Ref.value, voidStates[1].x, voidStates[1].y, voidAlpha)
  setVoidPos(void2Ref.value, voidStates[2].x, voidStates[2].y, voidAlpha)

  if (elapsed >= total) {
    endEvent()
    return
  }
  rafHandle = requestAnimationFrame(animate)
}

// ─── Event-Lifecycle ───────────────────────────────────────────────────────────

function startEvent() {
  timerHandle = null
  isTimerPaused = false
  currentPalette = NEBULA_PALETTES[Math.floor(Math.random() * NEBULA_PALETTES.length)]
  eventDuration = rand(9000, 15000)
  enterDur = eventDuration * 0.3
  throughDur = eventDuration * 0.55
  eventElapsedAtPause = 0
  eventStart = performance.now()
  lastRafTs = 0
  parallaxTime = 0

  voidStates[0] = {
    x: rand(20, 80),
    y: rand(15, 70),
    vx: randVel(-7, 7, 3.5),
    vy: randVel(-5, 5, 2.0),
  }
  voidStates[1] = {
    x: rand(10, 65),
    y: rand(30, 85),
    vx: randVel(-9, 9, -4.0),
    vy: randVel(-6, 4, -2.5),
  }
  voidStates[2] = {
    x: rand(35, 90),
    y: rand(10, 65),
    vx: randVel(-6, 8, 4.5),
    vy: randVel(-7, 3, 3.0),
  }

  active.value = true
  requestAnimationFrame(() => {
    applyPalette(currentPalette)
    if (!isRenderingPaused.value) {
      rafHandle = requestAnimationFrame(animate)
    }
  })
}

function endEvent() {
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle)
    rafHandle = null
  }
  active.value = false
  scheduleNext()
}

function scheduleNext() {
  const delay = rand(30_000, 90_000)
  timerTotalDelay = delay
  timerStartedAt = Date.now()
  isTimerPaused = false
  timerHandle = setTimeout(startEvent, delay)
}

// ─── Rendering-Pause-Handling ─────────────────────────────────────────────────

function handleBlur() {
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle)
    rafHandle = null
  }
  if (active.value) {
    eventElapsedAtPause = performance.now() - eventStart
  }
  if (timerHandle !== null && !isTimerPaused) {
    const alreadyElapsed = Date.now() - timerStartedAt
    timerTotalDelay = Math.max(0, timerTotalDelay - alreadyElapsed)
    clearTimeout(timerHandle)
    timerHandle = null
    isTimerPaused = true
  }
  lastRafTs = 0
}

function handleFocus() {
  if (isTimerPaused) {
    timerStartedAt = Date.now()
    timerHandle = setTimeout(startEvent, timerTotalDelay)
    isTimerPaused = false
  }
  if (active.value && rafHandle === null) {
    eventStart = performance.now() - eventElapsedAtPause
    lastRafTs = 0
    rafHandle = requestAnimationFrame(animate)
  }
}

// ─── Externer Trigger ─────────────────────────────────────────────────────────

const { triggerRequested } = useNebulaTrigger()
watch(triggerRequested, (requested) => {
  if (!requested) return
  triggerRequested.value = false
  if (timerHandle !== null) {
    clearTimeout(timerHandle)
    timerHandle = null
  }
  if (active.value) {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle)
      rafHandle = null
    }
    active.value = false
    requestAnimationFrame(() => startEvent())
  } else {
    startEvent()
  }
})

// ─── Lifecycle ────────────────────────────────────────────────────────────────

watch(isRenderingPaused, (paused) => {
  if (paused) handleBlur()
  else handleFocus()
})

onMounted(() => {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  scheduleNext()
})

onBeforeUnmount(() => {
  if (timerHandle !== null) clearTimeout(timerHandle)
  if (rafHandle !== null) cancelAnimationFrame(rafHandle)
})
</script>

<style scoped>
.nebula-flythrough {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
  transform-origin: 50% 50%;
  will-change: opacity, transform;
}
.nf-layer {
  position: absolute;
  inset: -15%;
  width: 130%;
  height: 130%;
  pointer-events: none;
  mix-blend-mode: screen;
  will-change: transform, opacity;
}
.nf-dust {
  position: absolute;
  pointer-events: none;
  mix-blend-mode: multiply;
  border-radius: 50%;
  will-change: transform;
}
.nf-dust-0 {
  width: 70%;
  height: 40%;
  top: 30%;
  left: 15%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.38) 0%, transparent 70%);
}
.nf-dust-1 {
  width: 45%;
  height: 30%;
  top: 55%;
  left: 40%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.22) 0%, transparent 65%);
}
.nf-void {
  position: absolute;
  pointer-events: none;
  mix-blend-mode: multiply;
  border-radius: 50%;
  will-change: transform, opacity, left, top;
}
.nf-void-0 {
  width: 58%;
  height: 52%;
  background: radial-gradient(
    ellipse,
    rgba(0, 0, 0, 0.74) 0%,
    rgba(0, 0, 0, 0.32) 40%,
    transparent 68%
  );
}
.nf-void-1 {
  width: 50%;
  height: 58%;
  background: radial-gradient(
    ellipse,
    rgba(0, 0, 0, 0.66) 0%,
    rgba(0, 0, 0, 0.26) 44%,
    transparent 70%
  );
}
.nf-void-2 {
  width: 54%;
  height: 46%;
  background: radial-gradient(
    ellipse,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.2) 40%,
    transparent 66%
  );
}
@media (prefers-reduced-motion: reduce) {
  .nf-layer,
  .nf-dust,
  .nf-void {
    transition: none !important;
    animation: none !important;
  }
}
</style>
