<template>
  <!-- ① Back-Layer: Sterne HINTER der Sonne (z-index 3) -->
  <div class="star-orbit-layer star-orbit-back" aria-hidden="true">
    <!-- Champion-Stern (hinter Sonne) -->
    <div
      v-if="showChampionStar && champState.isBehind"
      class="star-entity star-entity--champion star-entity--behind"
      :style="champEntityStyle"
      data-star-type="champion"
    >
      <div class="star-core star-core--champion" :style="champCoreStyle" />
      <div class="star-corona star-corona--champion" :style="champCoronaStyle" />
      <div
        class="deco-orbit"
        style="--orbit-r: 38px; --dur: 9s; --delay: 0s; --pcol: #b87030; --psize: 7px"
      />
      <div
        class="deco-orbit"
        style="--orbit-r: 52px; --dur: 15s; --delay: -6s; --pcol: #3070b0; --psize: 6px"
      />
      <div
        class="deco-orbit"
        style="--orbit-r: 26px; --dur: 6s; --delay: -2s; --pcol: #50a028; --psize: 5px"
      />
      <div class="star-badge star-badge--champion">★ Champion</div>
    </div>

    <!-- Ressourcen-Stern (hinter Sonne) -->
    <div
      v-if="showResourceStar && resState.isBehind"
      class="star-entity star-entity--resource star-entity--behind"
      :style="resEntityStyle"
      data-star-type="resource"
    >
      <div class="star-core star-core--resource" :style="resCoreStyle" />
      <div class="star-corona star-corona--resource" :style="resCoronaStyle" />
      <div
        class="deco-orbit"
        style="--orbit-r: 34px; --dur: 8s; --delay: 0s; --pcol: #18b0a0; --psize: 7px"
      />
      <div
        class="deco-orbit"
        style="--orbit-r: 48px; --dur: 13s; --delay: -4s; --pcol: #9028b8; --psize: 5px"
      />
      <div class="star-badge star-badge--resource">✦ Ressource · {{ resTimerStr }}</div>
    </div>
  </div>

  <!-- ② Front-Layer: Sterne VOR der Sonne (z-index 7) -->
  <div class="star-orbit-layer star-orbit-front" aria-hidden="true">
    <!-- Champion-Stern (vor Sonne) -->
    <div
      v-if="showChampionStar && !champState.isBehind"
      class="star-entity star-entity--champion"
      :style="champEntityStyle"
      data-star-type="champion"
    >
      <div class="star-core star-core--champion" :style="champCoreStyle" />
      <div class="star-corona star-corona--champion" :style="champCoronaStyle" />
      <div
        class="deco-orbit"
        style="--orbit-r: 38px; --dur: 9s; --delay: 0s; --pcol: #b87030; --psize: 7px"
      />
      <div
        class="deco-orbit"
        style="--orbit-r: 52px; --dur: 15s; --delay: -6s; --pcol: #3070b0; --psize: 6px"
      />
      <div
        class="deco-orbit"
        style="--orbit-r: 26px; --dur: 6s; --delay: -2s; --pcol: #50a028; --psize: 5px"
      />
      <div class="star-badge star-badge--champion">★ Champion</div>
    </div>

    <!-- Ressourcen-Stern (vor Sonne) -->
    <div
      v-if="showResourceStar && !resState.isBehind"
      class="star-entity star-entity--resource"
      :style="resEntityStyle"
      data-star-type="resource"
    >
      <div class="star-core star-core--resource" :style="resCoreStyle" />
      <div class="star-corona star-corona--resource" :style="resCoronaStyle" />
      <div
        class="deco-orbit"
        style="--orbit-r: 34px; --dur: 8s; --delay: 0s; --pcol: #18b0a0; --psize: 7px"
      />
      <div
        class="deco-orbit"
        style="--orbit-r: 48px; --dur: 13s; --delay: -4s; --pcol: #9028b8; --psize: 5px"
      />
      <div class="star-badge star-badge--resource">✦ Ressource · {{ resTimerStr }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { getOrbitPos } from '../../../utils/orbitMath'
import { ORBIT_TIERS } from '@/config/constants.ts'

// ── Orbit-Parameter ───────────────────────────────────────────────────────────

// Champion-Stern → star[0]
const CHAMP_RX = ORBIT_TIERS.star[0].rx
const CHAMP_RY = ORBIT_TIERS.star[0].ry
const CHAMP_TILT = ORBIT_TIERS.star[0].tiltRad
const CHAMP_SPEED = 0.000022
const CHAMP_SIZE = 34

// Ressourcen-Stern → star[1]
const RES_RX = ORBIT_TIERS.star[1].rx
const RES_RY = ORBIT_TIERS.star[1].ry
const RES_TILT = ORBIT_TIERS.star[1].tiltRad
const RES_SPEED = 0.000042
const RES_SIZE = 28

// ── Sonnenfarb-Typen (realistisch: gelb, orange, rot, weißblau, weiß) ────────

interface SunColorProfile {
  core: [string, string, string] // [innen, mitte, außen]
  glow1: string
  glow2: string
  glow3: string
  corona: string
  coronaGlow: string
  pulseSpeed: string
}

const SUN_PROFILES: SunColorProfile[] = [
  // Gelbe Sonne (G-Typ, wie unsere Sonne)
  {
    core: ['#fffde0', '#ffe050', '#c87010'],
    glow1: 'rgba(255, 220, 60, 0.95)',
    glow2: 'rgba(230, 160, 20, 0.65)',
    glow3: 'rgba(190, 110, 10, 0.32)',
    corona: 'rgba(255, 210, 60, 0.4)',
    coronaGlow: 'rgba(255, 210, 60, 0.28)',
    pulseSpeed: '2.8s',
  },
  // Orange Sonne (K-Typ)
  {
    core: ['#ffe8c0', '#ff9020', '#8a3800'],
    glow1: 'rgba(255, 140, 40, 0.95)',
    glow2: 'rgba(220, 90, 20, 0.65)',
    glow3: 'rgba(160, 60, 10, 0.32)',
    corona: 'rgba(255, 130, 40, 0.4)',
    coronaGlow: 'rgba(255, 120, 30, 0.28)',
    pulseSpeed: '3.2s',
  },
  // Roter Riese (M-Typ)
  {
    core: ['#ffc0a0', '#e84010', '#6a1808'],
    glow1: 'rgba(240, 80, 30, 0.95)',
    glow2: 'rgba(200, 50, 20, 0.65)',
    glow3: 'rgba(140, 30, 10, 0.32)',
    corona: 'rgba(230, 70, 30, 0.4)',
    coronaGlow: 'rgba(220, 60, 20, 0.28)',
    pulseSpeed: '4s',
  },
  // Weißblauer Stern (A/F-Typ)
  {
    core: ['#ffffff', '#d0e8ff', '#4880d0'],
    glow1: 'rgba(160, 210, 255, 0.95)',
    glow2: 'rgba(100, 160, 240, 0.65)',
    glow3: 'rgba(60, 100, 200, 0.32)',
    corona: 'rgba(140, 200, 255, 0.45)',
    coronaGlow: 'rgba(120, 180, 255, 0.3)',
    pulseSpeed: '2.2s',
  },
  // Weißer Stern (F-Typ)
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

// ── State ─────────────────────────────────────────────────────────────────────

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

// Zufällige Farbprofile beim Mount festlegen
const champProfile = ref<SunColorProfile>(SUN_PROFILES[0])
const resProfile = ref<SunColorProfile>(SUN_PROFILES[0])

let champAngle = Math.PI * 0.6
let resAngle = Math.PI * 1.3
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

// ── Dynamische Farb-Styles aus Profilen ───────────────────────────────────────

const champCoreStyle = computed(() => {
  const p = champProfile.value
  return {
    background: `radial-gradient(circle, ${p.core[0]} 0%, ${p.core[1]} 45%, ${p.core[2]} 100%)`,
    boxShadow: `0 0 14px ${p.glow1}, 0 0 32px ${p.glow2}, 0 0 56px ${p.glow3}`,
    animationDuration: p.pulseSpeed,
  }
})

const champCoronaStyle = computed(() => {
  const p = champProfile.value
  return {
    borderColor: p.corona,
    boxShadow: `0 0 8px ${p.coronaGlow}, inset 0 0 8px ${p.coronaGlow}`,
  }
})

const resCoreStyle = computed(() => {
  const p = resProfile.value
  return {
    background: `radial-gradient(circle, ${p.core[0]} 0%, ${p.core[1]} 45%, ${p.core[2]} 100%)`,
    boxShadow: `0 0 12px ${p.glow1}, 0 0 26px ${p.glow2}, 0 0 46px ${p.glow3}`,
    animationDuration: p.pulseSpeed,
  }
})

const resCoronaStyle = computed(() => {
  const p = resProfile.value
  return {
    borderColor: p.corona,
    boxShadow: `0 0 7px ${p.coronaGlow}, inset 0 0 7px ${p.coronaGlow}`,
  }
})

// ── Orbit-Berechnung ──────────────────────────────────────────────────────────

function computeStarState(x: number, y: number, ry: number, size: number): StarRenderState {
  const screenCy = window.innerHeight / 2
  const relY = (y - screenCy) / Math.max(ry, 1)
  const isBehind = relY < -0.05
  const depth = Math.max(0, Math.min(1, (relY + 1) / 2))
  const scale = 0.72 + depth * 0.56
  const opacity = isBehind ? 0.22 + depth * 0.38 : 0.78 + depth * 0.22
  const zIndex = isBehind ? Math.floor(3 + depth * 2) : Math.floor(6 + depth * 2)
  void size
  return { x, y, isBehind, opacity, scale, zIndex }
}

function animate(ts: number) {
  const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
  lastTs = ts

  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2

  if (showChampionStar.value) {
    champAngle += CHAMP_SPEED * dt
    const { x, y } = getOrbitPos(champAngle, CHAMP_RX, CHAMP_RY, CHAMP_TILT, cx, cy)
    champState.value = computeStarState(x, y, CHAMP_RY, CHAMP_SIZE)
  }

  if (showResourceStar.value) {
    resAngle += RES_SPEED * dt
    const { x, y } = getOrbitPos(resAngle, RES_RX, RES_RY, RES_TILT, cx, cy)
    resState.value = computeStarState(x, y, RES_RY, RES_SIZE)
  }

  animFrame = requestAnimationFrame(animate)
}

// ── Computed Styles ───────────────────────────────────────────────────────────

const champEntityStyle = computed(() => {
  const { x, y, scale, opacity } = champState.value
  const s = CHAMP_SIZE
  return {
    transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(${scale.toFixed(4)})`,
    opacity: String(opacity.toFixed(3)),
    zIndex: String(champState.value.zIndex),
    width: `${s}px`,
    height: `${s}px`,
  }
})

const resEntityStyle = computed(() => {
  const { x, y, scale, opacity } = resState.value
  const s = RES_SIZE
  return {
    transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(${scale.toFixed(4)})`,
    opacity: String(opacity.toFixed(3)),
    zIndex: String(resState.value.zIndex),
    width: `${s}px`,
    height: `${s}px`,
  }
})

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

/* ── Star Entity ─────────────────────────────────────────────────────────────── */
.star-entity {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

/* ── Star Core (Farbe kommt via :style aus dem Profil) ───────────────────────── */
.star-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  animation: star-pulse 2.8s ease-in-out infinite;
}

.star-core--champion {
  width: 34px;
  height: 34px;
}

.star-core--resource {
  width: 28px;
  height: 28px;
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

/* ── Corona ──────────────────────────────────────────────────────────────────── */
.star-corona {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  border: 1px solid transparent; /* Farbe kommt via :style */
  transform: translate(-50%, -50%);
  animation: corona-spin 20s linear infinite;
  pointer-events: none;
}

.star-corona--champion {
  width: 52px;
  height: 52px;
  animation-duration: 18s;
}

.star-corona--resource {
  width: 46px;
  height: 46px;
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

/* ── Deco-Orbit (kleinere Punkte) ────────────────────────────────────────────── */
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

/* ── Star Badge ──────────────────────────────────────────────────────────────── */
.star-badge {
  position: absolute;
  top: calc(100% + 60px);
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
  color: #ffe070;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(200, 140, 20, 0.55);
  text-shadow: 0 0 8px rgba(255, 200, 50, 0.85);
}

.star-badge--resource {
  color: #60eed8;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(20, 180, 150, 0.5);
  text-shadow: 0 0 8px rgba(40, 210, 180, 0.8);
}

/* ── Behind-Dämpfung ─────────────────────────────────────────────────────────── */
.star-entity--behind .star-corona {
  opacity: 0.4;
}
.star-entity--behind .star-badge {
  opacity: 0.5;
}
</style>
