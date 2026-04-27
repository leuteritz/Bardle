<template>
  <!-- Star Orbit-Ring Layer (crisp dashed guide rings) -->
  <svg class="star-orbit-rings" aria-hidden="true">
    <ellipse
      v-if="showChampionStar"
      :cx="screenCx"
      :cy="screenCy"
      :rx="CHAMP_RX"
      :ry="CHAMP_RY"
      :transform="`rotate(${CHAMP_STAR.tiltDeg}, ${screenCx}, ${screenCy})`"
      fill="none"
      :stroke="CHAMP_COLOR"
      stroke-opacity="0.55"
      stroke-width="1.5"
      stroke-dasharray="5 8"
    />
    <ellipse
      v-if="showResourceStar"
      :cx="screenCx"
      :cy="screenCy"
      :rx="RES_RX"
      :ry="RES_RY"
      :transform="`rotate(${RES_STAR.tiltDeg}, ${screenCx}, ${screenCy})`"
      fill="none"
      :stroke="RES_COLOR"
      stroke-opacity="0.55"
      stroke-width="1.5"
      stroke-dasharray="5 8"
    />
  </svg>

  <!-- ① Back-Layer: Sterne HINTER der Sonne (z-index 3) -->
  <div class="star-orbit-layer star-orbit-back" aria-hidden="true">
    <div
      v-if="showChampionStar && champState.isBehind"
      class="star-entity star-entity--champion star-entity--behind"
      :style="champEntityStyle"
      data-star-type="champion"
    >
      <div class="star-core star-core--champion" :style="champCoreStyle" />
      <div class="star-corona star-corona--champion" :style="champCoronaStyle" />
      <div v-for="(ds, i) in champDecoStyles" :key="i" class="deco-orbit" :style="ds" />
      <div class="star-badge star-badge--champion" :style="champBadgeStyle">★ Champion</div>
    </div>

    <div
      v-if="showResourceStar && resState.isBehind"
      class="star-entity star-entity--resource star-entity--behind"
      :style="resEntityStyle"
      data-star-type="resource"
    >
      <div class="star-core star-core--resource" :style="resCoreStyle" />
      <div class="star-corona star-corona--resource" :style="resCoronaStyle" />
      <div v-for="(ds, i) in resDecoStyles" :key="i" class="deco-orbit" :style="ds" />
      <div class="star-badge star-badge--resource" :style="resBadgeStyle">
        ✦ Ressource · {{ resTimerStr }}
      </div>
    </div>
  </div>

  <!-- ② Front-Layer: Sterne VOR der Sonne (z-index 7) -->
  <div class="star-orbit-layer star-orbit-front" aria-hidden="true">
    <div
      v-if="showChampionStar && !champState.isBehind"
      class="star-entity star-entity--champion"
      :style="champEntityStyle"
      data-star-type="champion"
    >
      <div class="star-core star-core--champion" :style="champCoreStyle" />
      <div class="star-corona star-corona--champion" :style="champCoronaStyle" />
      <div v-for="(ds, i) in champDecoStyles" :key="i" class="deco-orbit" :style="ds" />
      <div class="star-badge star-badge--champion" :style="champBadgeStyle">★ Champion</div>
    </div>

    <div
      v-if="showResourceStar && !resState.isBehind"
      class="star-entity star-entity--resource"
      :style="resEntityStyle"
      data-star-type="resource"
    >
      <div class="star-core star-core--resource" :style="resCoreStyle" />
      <div class="star-corona star-corona--resource" :style="resCoronaStyle" />
      <div v-for="(ds, i) in resDecoStyles" :key="i" class="deco-orbit" :style="ds" />
      <div class="star-badge star-badge--resource" :style="resBadgeStyle">
        ✦ Ressource · {{ resTimerStr }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { getOrbitPos } from '../../../utils/orbitMath'
import { ORBIT_TIERS } from '@/config/constants.ts'

// ── Orbit-Parameter aus ORBIT_TIERS ──────────────────────────────────────────

const CHAMP_STAR = ORBIT_TIERS.star[0]
const RES_STAR = ORBIT_TIERS.star[1]

const CHAMP_RX = CHAMP_STAR.rx
const CHAMP_RY = CHAMP_STAR.ry
const CHAMP_TILT = CHAMP_STAR.tiltRad
const CHAMP_COLOR = CHAMP_STAR.color
const CHAMP_SPEED = 0.000022
const CHAMP_SIZE = CHAMP_STAR.size

const RES_RX = RES_STAR.rx
const RES_RY = RES_STAR.ry
const RES_TILT = RES_STAR.tiltRad
const RES_COLOR = RES_STAR.color
const RES_SPEED = 0.000042
const RES_SIZE = RES_STAR.size

// ── Visuelle Verhältniswerte ──────────────────────────────────────────────────

const CHAMP_VISUAL = {
  coronaRatio: 52 / 34,
  badgeGapPx: 12,
  glow1Ratio: 14 / 34,
  glow2Ratio: 32 / 34,
  glow3Ratio: 56 / 34,
  coronaGlowRatio: 8 / 34,
  deco: [
    { orbitRatio: 38 / 34, sizeRatio: 7 / 34, color: '#b87030', dur: '9s', delay: '0s' },
    { orbitRatio: 52 / 34, sizeRatio: 6 / 34, color: '#3070b0', dur: '15s', delay: '-6s' },
    { orbitRatio: 26 / 34, sizeRatio: 5 / 34, color: '#50a028', dur: '6s', delay: '-2s' },
  ],
} as const

const RES_VISUAL = {
  coronaRatio: 46 / 28,
  badgeGapPx: 12,
  glow1Ratio: 12 / 28,
  glow2Ratio: 26 / 28,
  glow3Ratio: 46 / 28,
  coronaGlowRatio: 7 / 28,
  deco: [
    { orbitRatio: 34 / 28, sizeRatio: 7 / 28, color: '#18b0a0', dur: '8s', delay: '0s' },
    { orbitRatio: 48 / 28, sizeRatio: 5 / 28, color: '#9028b8', dur: '13s', delay: '-4s' },
  ],
} as const

// ── Sonnenfarb-Profile ────────────────────────────────────────────────────────

interface SunColorProfile {
  core: [string, string, string]
  glow1: string
  glow2: string
  glow3: string
  corona: string
  coronaGlow: string
  pulseSpeed: string
}

const SUN_PROFILES: SunColorProfile[] = [
  {
    core: ['#fffde0', '#ffe050', '#c87010'],
    glow1: 'rgba(255, 220, 60, 0.95)',
    glow2: 'rgba(230, 160, 20, 0.65)',
    glow3: 'rgba(190, 110, 10, 0.32)',
    corona: 'rgba(255, 210, 60, 0.4)',
    coronaGlow: 'rgba(255, 210, 60, 0.28)',
    pulseSpeed: '2.8s',
  },
  {
    core: ['#ffe8c0', '#ff9020', '#8a3800'],
    glow1: 'rgba(255, 140, 40, 0.95)',
    glow2: 'rgba(220, 90, 20, 0.65)',
    glow3: 'rgba(160, 60, 10, 0.32)',
    corona: 'rgba(255, 130, 40, 0.4)',
    coronaGlow: 'rgba(255, 120, 30, 0.28)',
    pulseSpeed: '3.2s',
  },
  {
    core: ['#ffc0a0', '#e84010', '#6a1808'],
    glow1: 'rgba(240, 80, 30, 0.95)',
    glow2: 'rgba(200, 50, 20, 0.65)',
    glow3: 'rgba(140, 30, 10, 0.32)',
    corona: 'rgba(230, 70, 30, 0.4)',
    coronaGlow: 'rgba(220, 60, 20, 0.28)',
    pulseSpeed: '4s',
  },
  {
    core: ['#ffffff', '#d0e8ff', '#4880d0'],
    glow1: 'rgba(160, 210, 255, 0.95)',
    glow2: 'rgba(100, 160, 240, 0.65)',
    glow3: 'rgba(60, 100, 200, 0.32)',
    corona: 'rgba(140, 200, 255, 0.45)',
    coronaGlow: 'rgba(120, 180, 255, 0.3)',
    pulseSpeed: '2.2s',
  },
  {
    core: ['#ffffff', '#f8f0d8', '#b09050'],
    glow1: 'rgba(255, 245, 210, 0.95)',
    glow2: 'rgba(240, 220, 160, 0.6)',
    glow3: 'rgba(200, 180, 120, 0.3)',
    corona: 'rgba(255, 240, 200, 0.4)',
    coronaGlow: 'rgba(255, 230, 180, 0.25)',
    pulseSpeed: '3s',
  },
]

function pickRandomProfile(): SunColorProfile {
  return SUN_PROFILES[Math.floor(Math.random() * SUN_PROFILES.length)]
}

function px(n: number): string {
  return `${Math.round(n)}px`
}

function makeGlow(
  size: number,
  profile: SunColorProfile,
  ratios: { glow1Ratio: number; glow2Ratio: number; glow3Ratio: number },
) {
  return [
    `0 0 ${px(size * ratios.glow1Ratio)} ${profile.glow1}`,
    `0 0 ${px(size * ratios.glow2Ratio)} ${profile.glow2}`,
    `0 0 ${px(size * ratios.glow3Ratio)} ${profile.glow3}`,
  ].join(', ')
}

function makeCoronaGlow(size: number, profile: SunColorProfile, ratio: number) {
  const v = px(size * ratio)
  return `0 0 ${v} ${profile.coronaGlow}, inset 0 0 ${v} ${profile.coronaGlow}`
}

// ── State ─────────────────────────────────────────────────────────────────────

const screenCx = window.innerWidth / 2
const screenCy = window.innerHeight / 2
const screenW = window.innerWidth
const screenH = window.innerHeight

const galaxyStore = useGalaxyStore()

interface StarRenderState {
  x: number
  y: number
  isBehind: boolean
  opacity: number
  scale: number
  zIndex: number
}

const champState = ref<StarRenderState>({
  x: 0,
  y: 0,
  isBehind: false,
  opacity: 0,
  scale: 1,
  zIndex: 6,
})
const resState = ref<StarRenderState>({
  x: 0,
  y: 0,
  isBehind: false,
  opacity: 0,
  scale: 1,
  zIndex: 6,
})

const champProfile = ref<SunColorProfile>(SUN_PROFILES[0])
const resProfile = ref<SunColorProfile>(SUN_PROFILES[0])

const BEHIND_SUN_SPEED_MULTIPLIER = 1.5
const BEHIND_SPEED_LERP = 0.04

let champAngle = Math.PI * 0.6
let resAngle = Math.PI * 1.3
let champSpeedMul = 1.0
let resSpeedMul = 1.0
let animFrame = 0
let lastTs = 0

// ── Visibility ────────────────────────────────────────────────────────────────

const showChampionStar = computed(
  () =>
    galaxyStore.championTravelState === 'champion_available' ||
    galaxyStore.championTravelState === 'champion_spawned',
)

const showResourceStar = computed(() => galaxyStore.resourceStarActive)

// ── Timer ─────────────────────────────────────────────────────────────────────

const resTimerStr = computed(() => {
  const s = Math.ceil(Math.max(0, galaxyStore.resourceStarDurationMs) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
})

// ── Entity Styles (Position + Größe direkt als px – keine CSS-Variablen) ─────

const champEntityStyle = computed(() => {
  const { x, y, scale, opacity, zIndex } = champState.value
  const s = CHAMP_SIZE
  return {
    transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(${scale.toFixed(4)})`,
    opacity: String(opacity.toFixed(3)),
    zIndex: String(zIndex),
    width: `${s}px`,
    height: `${s}px`,
  }
})

const resEntityStyle = computed(() => {
  const { x, y, scale, opacity, zIndex } = resState.value
  const s = RES_SIZE
  return {
    transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(${scale.toFixed(4)})`,
    opacity: String(opacity.toFixed(3)),
    zIndex: String(zIndex),
    width: `${s}px`,
    height: `${s}px`,
  }
})

// ── Core Styles (width + height direkt in px, kein var()) ─────────────────────

const champCoreStyle = computed(() => {
  const p = champProfile.value
  return {
    width: `${CHAMP_SIZE}px`,
    height: `${CHAMP_SIZE}px`,
    background: `radial-gradient(circle, ${p.core[0]} 0%, ${p.core[1]} 45%, ${p.core[2]} 100%)`,
    boxShadow: makeGlow(CHAMP_SIZE, p, CHAMP_VISUAL),
    animationDuration: p.pulseSpeed,
  }
})

const resCoreStyle = computed(() => {
  const p = resProfile.value
  return {
    width: `${RES_SIZE}px`,
    height: `${RES_SIZE}px`,
    background: `radial-gradient(circle, ${p.core[0]} 0%, ${p.core[1]} 45%, ${p.core[2]} 100%)`,
    boxShadow: makeGlow(RES_SIZE, p, RES_VISUAL),
    animationDuration: p.pulseSpeed,
  }
})

// ── Corona Styles (width + height direkt in px, kein var()) ───────────────────

const champCoronaStyle = computed(() => {
  const p = champProfile.value
  const s = Math.round(CHAMP_SIZE * CHAMP_VISUAL.coronaRatio)
  return {
    width: `${s}px`,
    height: `${s}px`,
    borderColor: p.corona,
    boxShadow: makeCoronaGlow(CHAMP_SIZE, p, CHAMP_VISUAL.coronaGlowRatio),
  }
})

const resCoronaStyle = computed(() => {
  const p = resProfile.value
  const s = Math.round(RES_SIZE * RES_VISUAL.coronaRatio)
  return {
    width: `${s}px`,
    height: `${s}px`,
    borderColor: p.corona,
    boxShadow: makeCoronaGlow(RES_SIZE, p, RES_VISUAL.coronaGlowRatio),
  }
})

// ── Deco-Orbit Styles (direkt berechnet, kein CSS-Variablen-Cascade) ─────────

const champDecoStyles = computed(() =>
  CHAMP_VISUAL.deco.map((d) => ({
    '--orbit-r': px(CHAMP_SIZE * d.orbitRatio),
    '--psize': px(CHAMP_SIZE * d.sizeRatio),
    '--pcol': d.color,
    '--dur': d.dur,
    '--delay': d.delay,
  })),
)

const resDecoStyles = computed(() =>
  RES_VISUAL.deco.map((d) => ({
    '--orbit-r': px(RES_SIZE * d.orbitRatio),
    '--psize': px(RES_SIZE * d.sizeRatio),
    '--pcol': d.color,
    '--dur': d.dur,
    '--delay': d.delay,
  })),
)

// ── Badge Styles (top direkt in px, kein var()) ───────────────────────────────

const champBadgeStyle = computed(() => ({
  top: `${CHAMP_SIZE + CHAMP_VISUAL.badgeGapPx}px`,
}))

const resBadgeStyle = computed(() => ({
  top: `${RES_SIZE + RES_VISUAL.badgeGapPx}px`,
}))

// ── Orbit-Berechnung ──────────────────────────────────────────────────────────

function computeStarState(x: number, y: number, ry: number): StarRenderState {
  const screenCy = window.innerHeight / 2
  const relY = (y - screenCy) / Math.max(ry, 1)
  const isBehind = relY < -0.05
  const depth = Math.max(0, Math.min(1, (relY + 1) / 2))
  const scale = 0.72 + depth * 0.56
  const opacity = isBehind ? 0.22 + depth * 0.38 : 0.78 + depth * 0.22
  const zIndex = isBehind ? Math.floor(3 + depth * 2) : Math.floor(6 + depth * 2)
  return { x, y, isBehind, opacity, scale, zIndex }
}

function animate(ts: number) {
  const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
  lastTs = ts
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2

  if (showChampionStar.value) {
    const champTargetMul = champState.value.isBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
    champSpeedMul += (champTargetMul - champSpeedMul) * BEHIND_SPEED_LERP
    champAngle += CHAMP_SPEED * champSpeedMul * dt
    const { x, y } = getOrbitPos(champAngle, CHAMP_RX, CHAMP_RY, CHAMP_TILT, cx, cy)
    champState.value = computeStarState(x, y, CHAMP_RY)
  }

  if (showResourceStar.value) {
    const resTargetMul = resState.value.isBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
    resSpeedMul += (resTargetMul - resSpeedMul) * BEHIND_SPEED_LERP
    resAngle += RES_SPEED * resSpeedMul * dt
    const { x, y } = getOrbitPos(resAngle, RES_RX, RES_RY, RES_TILT, cx, cy)
    resState.value = computeStarState(x, y, RES_RY)
  }

  animFrame = requestAnimationFrame(animate)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const { isRenderingPaused } = useRenderingPaused()

watch(isRenderingPaused, (paused) => {
  if (paused) {
    cancelAnimationFrame(animFrame)
    animFrame = 0
  } else if (!animFrame) {
    animFrame = requestAnimationFrame(animate)
  }
})

onMounted(() => {
  champProfile.value = pickRandomProfile()
  resProfile.value = pickRandomProfile()
  animFrame = requestAnimationFrame(animate)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
/* ── Orbit SVGs ─────────────────────────────────────────────────────────────── */
.star-orbit-rings {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  pointer-events: none;
  overflow: visible;
}

/* ── Layer ──────────────────────────────────────────────────────────────────── */
.star-orbit-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.star-orbit-back {
  z-index: 3;
}
.star-orbit-front {
  z-index: 7;
}

/* ── Star Entity ───────────────────────────────────────────────────────────── */
.star-entity {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

/* ── Star Core ─────────────────────────────────────────────────────────────── */
/*
 * width + height kommen AUSSCHLIESSLICH aus dem Inline-Style (champCoreStyle /
 * resCoreStyle). Kein var(), kein hardcodiertes px – Größe = ORBIT_TIERS.star[n].size.
 */
.star-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  animation: star-pulse 2.8s ease-in-out infinite;
}

@keyframes star-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.12);
  }
}

/* ── Corona ────────────────────────────────────────────────────────────────── */
/*
 * width + height kommen aus champCoronaStyle / resCoronaStyle (= size × coronaRatio).
 */
.star-corona {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid transparent;
  animation: corona-spin 20s linear infinite;
  pointer-events: none;
}

.star-corona--champion {
  animation-duration: 18s;
}
.star-corona--resource {
  animation-duration: 24s;
}

@keyframes corona-spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* ── Deco-Orbit ────────────────────────────────────────────────────────────── */
/*
 * --orbit-r und --psize werden direkt per :style auf dem deco-orbit-Element
 * gesetzt (champDecoStyles / resDecoStyles) – kein Eltern-Cascade nötig.
 */
.deco-orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  animation: deco-spin var(--dur) linear var(--delay) infinite;
  pointer-events: none;
}

.deco-orbit::after {
  content: '';
  position: absolute;
  width: var(--psize, 6px);
  height: var(--psize, 6px);
  border-radius: 50%;
  background: var(--pcol, #888);
  transform: translateX(var(--orbit-r, 34px)) translateY(-50%);
  box-shadow:
    0 0 4px var(--pcol, #888),
    0 0 8px color-mix(in srgb, var(--pcol, #888) 45%, transparent);
}

@keyframes deco-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ── Star Badge ────────────────────────────────────────────────────────────── */
/*
 * `top` kommt aus champBadgeStyle / resBadgeStyle (= size + badgeGapPx).
 * Kein var() mehr nötig.
 */
.star-badge {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 3px;
  pointer-events: none;
  user-select: none;
}

.star-badge--champion {
  color: v-bind(CHAMP_COLOR);
  border: 1px solid color-mix(in srgb, v-bind(CHAMP_COLOR) 55%, transparent);
  text-shadow: 0 0 8px color-mix(in srgb, v-bind(CHAMP_COLOR) 85%, transparent);
}

.star-badge--resource {
  color: v-bind(RES_COLOR);
  border: 1px solid color-mix(in srgb, v-bind(RES_COLOR) 50%, transparent);
  text-shadow: 0 0 8px color-mix(in srgb, v-bind(RES_COLOR) 80%, transparent);
}

/* ── Behind-Dämpfung ───────────────────────────────────────────────────────── */
.star-entity--behind {
  filter: blur(2px) brightness(0.75) saturate(0.65);
  transition: filter 0.25s ease;
}
.star-entity--behind .star-corona {
  opacity: 0.4;
}
.star-entity--behind .star-badge {
  opacity: 0.5;
}
</style>
