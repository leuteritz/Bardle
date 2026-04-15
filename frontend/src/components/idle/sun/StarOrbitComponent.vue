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
      <div class="star-core" data-star-core="champion" />
      <div class="star-corona star-corona--champion" />
      <div class="deco-orbit" style="--orbit-r:46px;--dur:9s;--delay:0s;--pcol:#b87030;--psize:10px" />
      <div class="deco-orbit" style="--orbit-r:64px;--dur:15s;--delay:-6s;--pcol:#3070b0;--psize:8px" />
      <div class="deco-orbit" style="--orbit-r:32px;--dur:6s;--delay:-2s;--pcol:#50a028;--psize:7px" />
      <div class="star-badge star-badge--champion">★ Champion</div>
    </div>

    <!-- Ressourcen-Stern (hinter Sonne) -->
    <div
      v-if="showResourceStar && resState.isBehind"
      class="star-entity star-entity--resource star-entity--behind"
      :style="resEntityStyle"
      data-star-type="resource"
    >
      <div class="star-core" data-star-core="resource" />
      <div class="star-corona star-corona--resource" />
      <div class="deco-orbit" style="--orbit-r:42px;--dur:8s;--delay:0s;--pcol:#18b0a0;--psize:9px" />
      <div class="deco-orbit" style="--orbit-r:58px;--dur:13s;--delay:-4s;--pcol:#9028b8;--psize:7px" />
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
      <div class="star-core" data-star-core="champion" />
      <div class="star-corona star-corona--champion" />
      <div class="deco-orbit" style="--orbit-r:46px;--dur:9s;--delay:0s;--pcol:#b87030;--psize:10px" />
      <div class="deco-orbit" style="--orbit-r:64px;--dur:15s;--delay:-6s;--pcol:#3070b0;--psize:8px" />
      <div class="deco-orbit" style="--orbit-r:32px;--dur:6s;--delay:-2s;--pcol:#50a028;--psize:7px" />
      <div class="star-badge star-badge--champion">★ Champion</div>
    </div>

    <!-- Ressourcen-Stern (vor Sonne) -->
    <div
      v-if="showResourceStar && !resState.isBehind"
      class="star-entity star-entity--resource"
      :style="resEntityStyle"
      data-star-type="resource"
    >
      <div class="star-core" data-star-core="resource" />
      <div class="star-corona star-corona--resource" />
      <div class="deco-orbit" style="--orbit-r:42px;--dur:8s;--delay:0s;--pcol:#18b0a0;--psize:9px" />
      <div class="deco-orbit" style="--orbit-r:58px;--dur:13s;--delay:-4s;--pcol:#9028b8;--psize:7px" />
      <div class="star-badge star-badge--resource">✦ Ressource · {{ resTimerStr }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { getOrbitPos } from '../../../utils/orbitMath'

// ── Orbit-Parameter ───────────────────────────────────────────────────────────

// Champion-Stern: goldener Orbit, mittelgroßer Radius
const CHAMP_RX    = 370
const CHAMP_RY    = 160
const CHAMP_TILT  = 0.18
const CHAMP_SPEED = 0.000022   // rad/ms — eine Runde ≈ 4.7 min
const CHAMP_SIZE  = 34

// Ressourcen-Stern: etwas größerer Orbit, leicht versetzt
const RES_RX    = 430
const RES_RY    = 188
const RES_TILT  = 0.27
const RES_SPEED = 0.000042     // rad/ms — eine Runde ≈ 2.5 min
const RES_SIZE  = 28

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

const champState = ref<StarRenderState>({ x: 0, y: 0, isBehind: false, opacity: 0, scale: 1, zIndex: 6 })
const resState   = ref<StarRenderState>({ x: 0, y: 0, isBehind: false, opacity: 0, scale: 1, zIndex: 6 })

let champAngle = Math.PI * 0.6   // Startwinkel Champion-Stern
let resAngle   = Math.PI * 1.3   // Startwinkel Ressourcen-Stern

let animFrame  = 0
let lastTs     = 0

// ── Visibility ────────────────────────────────────────────────────────────────

const showChampionStar = computed(() =>
  galaxyStore.championTravelState === 'champion_available' ||
  galaxyStore.championTravelState === 'champion_spawned',
)

const showResourceStar = computed(() => galaxyStore.resourceStarActive)

// ── Timer-Anzeige für Ressourcen-Stern ───────────────────────────────────────

const resTimerStr = computed(() => {
  const s = Math.ceil(Math.max(0, galaxyStore.resourceStarDurationMs) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
})

// ── Orbit-Berechnung ──────────────────────────────────────────────────────────

function computeStarState(
  x: number,
  y: number,
  ry: number,
  size: number,
): StarRenderState {
  const screenCy = window.innerHeight / 2
  const relY = (y - screenCy) / Math.max(ry, 1)
  const isBehind = relY < -0.05
  const depth = Math.max(0, Math.min(1, (relY + 1) / 2))
  const scale  = 0.72 + depth * 0.56
  const opacity = isBehind ? 0.22 + depth * 0.38 : 0.78 + depth * 0.22
  const zIndex = isBehind ? Math.floor(3 + depth * 2) : Math.floor(6 + depth * 2)
  void size
  return { x, y, isBehind, opacity, scale, zIndex }
}

function animate(ts: number) {
  const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
  lastTs = ts

  const cx = window.innerWidth  / 2
  const cy = window.innerHeight / 2

  // ── Champion-Stern ──────────────────────────────────────────────────────────
  if (showChampionStar.value) {
    champAngle += CHAMP_SPEED * dt
    const { x, y } = getOrbitPos(champAngle, CHAMP_RX, CHAMP_RY, CHAMP_TILT, cx, cy)
    champState.value = computeStarState(x, y, CHAMP_RY, CHAMP_SIZE)
  }

  // ── Ressourcen-Stern ────────────────────────────────────────────────────────
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
    opacity:   String(opacity.toFixed(3)),
    zIndex:    String(champState.value.zIndex),
    width:     `${s}px`,
    height:    `${s}px`,
  }
})

const resEntityStyle = computed(() => {
  const { x, y, scale, opacity } = resState.value
  const s = RES_SIZE
  return {
    transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(${scale.toFixed(4)})`,
    opacity:   String(opacity.toFixed(3)),
    zIndex:    String(resState.value.zIndex),
    width:     `${s}px`,
    height:    `${s}px`,
  }
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  animFrame = requestAnimationFrame(animate)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
/* ── Layer (fixed, inset 0 — kein pointer-events) ───────────────────────────── */
.star-orbit-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.star-orbit-back  { z-index: 3; }
.star-orbit-front { z-index: 7; }

/* ── Star Entity (Position durch transform gesetzt) ─────────────────────────── */
.star-entity {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

/* ── Star Core ───────────────────────────────────────────────────────────────── */
.star-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  animation: star-pulse 2.8s ease-in-out infinite;
}

[data-star-core="champion"] {
  width: 34px;
  height: 34px;
  background: radial-gradient(circle, #ffe8a0 0%, #d4a020 45%, #7a4808 100%);
  box-shadow:
    0 0 14px rgba(255, 200, 60, 0.9),
    0 0 32px rgba(220, 140, 20, 0.6),
    0 0 56px rgba(180, 100, 10, 0.3);
}

[data-star-core="resource"] {
  width: 28px;
  height: 28px;
  background: radial-gradient(circle, #a0ffe8 0%, #18c0a8 45%, #085848 100%);
  box-shadow:
    0 0 12px rgba(40, 220, 190, 0.9),
    0 0 26px rgba(20, 180, 150, 0.55),
    0 0 46px rgba(10, 130, 110, 0.28);
}

@keyframes star-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1);    }
  50%       { transform: translate(-50%, -50%) scale(1.12); }
}

/* ── Corona (äußerer Glühring) ───────────────────────────────────────────────── */
.star-corona {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: corona-spin 20s linear infinite;
  pointer-events: none;
}

.star-corona--champion {
  width: 52px;
  height: 52px;
  border: 1px solid rgba(255, 200, 60, 0.35);
  box-shadow:
    0 0 8px rgba(255, 200, 60, 0.25),
    inset 0 0 8px rgba(255, 200, 60, 0.12);
  animation-duration: 18s;
}

.star-corona--resource {
  width: 46px;
  height: 46px;
  border: 1px solid rgba(40, 220, 190, 0.32);
  box-shadow:
    0 0 7px rgba(40, 220, 190, 0.22),
    inset 0 0 7px rgba(40, 220, 190, 0.1);
  animation-duration: 24s;
}

@keyframes corona-spin {
  from { transform: translate(-50%, -50%) rotate(0deg);   }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}

/* ── Decorative Orbiting Planets ─────────────────────────────────────────────── */
/* Jedes .deco-orbit ist eine unsichtbare Box im Zentrum des Stars, die rotiert.
   Das ::after-Pseudo-Element ist der sichtbare Planetenpunkt, per translateX() versetzt. */
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
  width: var(--psize, 8px);
  height: var(--psize, 8px);
  border-radius: 50%;
  background: var(--pcol, #888);
  /* Setzt den Punkt an den Orbit-Rand, zentriert vertikal */
  transform: translateX(var(--orbit-r, 40px)) translateY(-50%);
  box-shadow:
    0 0 5px var(--pcol, #888),
    0 0 10px color-mix(in srgb, var(--pcol, #888) 45%, transparent);
}

@keyframes deco-spin {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}

/* ── Star Badge (Label unter dem Stern) ──────────────────────────────────────── */
.star-badge {
  position: absolute;
  top: calc(100% + 72px);
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

/* ── Hinter-der-Sonne: gedimmter, weniger sichtbar ──────────────────────────── */
.star-entity--behind .star-corona { opacity: 0.4; }
.star-entity--behind .star-badge  { opacity: 0.5; }
</style>
