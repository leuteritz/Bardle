<template>
  <div v-if="active" ref="rootEl" class="osh" aria-hidden="true">
    <!-- Support-Anker: rotierendes Planeten-Portrait + Label -->
    <div class="osh-anchor" :style="{ left: `${ORBITAL_SUPPORT_X_PCT}%`, top: `${ORBITAL_SUPPORT_Y_PCT}%` }">
      <div class="osh-planet" :class="{ 'osh-planet--firing': volleyFlash }">
        <img :src="currentPlanetImage" alt="" draggable="false" />
        <svg class="osh-orbit-ring" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" class="osh-orbit-ring-dash" />
        </svg>
      </div>
      <span class="osh-label">Orbital Support</span>
      <span class="osh-dps">{{ dmgPerSecond }} dmg/s</span>
    </div>

    <!-- Kometen-Volleys Richtung Boss -->
    <span
      v-for="v in volleys"
      :key="v.id"
      class="osh-comet"
      :style="{
        left: `${ORBITAL_SUPPORT_X_PCT}%`,
        top: `${ORBITAL_SUPPORT_Y_PCT}%`,
        '--px': v.px + 'px',
        '--py': v.py + 'px',
      }"
    />

    <!-- Einschlag + goldene Schadenszahl am Boss -->
    <TransitionGroup name="osh-pop">
      <span
        v-for="f in floats"
        :key="f.id"
        class="osh-float"
        :style="{ left: '50%', top: '36%' }"
      >
        -{{ f.value }}
      </span>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/planetShopStore'
import {
  ORBITAL_SUPPORT_FLIGHT_MS,
  ORBITAL_SUPPORT_FLOAT_MS,
  ORBITAL_SUPPORT_X_PCT,
  ORBITAL_SUPPORT_Y_PCT,
  STRIKER_BOSS_ANCHOR_X_PCT,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  STRIKER_PROJECTILE_IMPACT_FRAC,
} from '@/config/constants'

const bossStore = usePlanetBossStore()
const planetShopStore = usePlanetShopStore()

// Der echte Abzug pro Sekunde: boss.passiveDPS (Snapshot beim Spawn) —
// NICHT die aktuelle CPS, die kann abweichen
const dmgPerSecond = computed(() => bossStore.activeBoss?.passiveDPS ?? 0)

const bossAlive = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

// Immer sichtbar, solange der Boss lebt — bei 0 dmg/s ruht das HUD nur
const active = computed(() => bossAlive.value)

// Rotierende Quelle: die gekauften Planeten feuern abwechselnd — ohne
// gekaufte Slots springt ein generischer Planet ein
const supportImages = computed(() => {
  const imgs = planetShopStore.purchasedSlots
    .filter((s) => s.role)
    .map((s) => PLANET_ROLES[s.role!].image)
  return imgs.length > 0 ? imgs : ['/img/planet.png']
})

const planetIdx = ref(0)
const currentPlanetImage = computed(
  () => supportImages.value[planetIdx.value % supportImages.value.length],
)

// Arena-Größe für den Kometen-Flugvektor (transform braucht px)
const rootEl = ref<HTMLDivElement | null>(null)
const arenaSize = ref({ w: 0, h: 0 })
let resizeObserver: ResizeObserver | null = null

const flightVector = computed(() => {
  const { w, h } = arenaSize.value
  return {
    px: Math.round(
      ((STRIKER_BOSS_ANCHOR_X_PCT - ORBITAL_SUPPORT_X_PCT) / 100) * w * STRIKER_PROJECTILE_IMPACT_FRAC,
    ),
    py: Math.round(
      ((STRIKER_BOSS_ANCHOR_Y_PCT - ORBITAL_SUPPORT_Y_PCT) / 100) * h * STRIKER_PROJECTILE_IMPACT_FRAC,
    ),
  }
})

// ── Volleys + Floats ──────────────────────────────────────────────────────
interface Volley {
  id: number
  px: number
  py: number
}

const volleys = ref<Volley[]>([])
const floats = ref<{ id: number; value: number }[]>([])
const volleyFlash = ref(false)
let volleyId = 0
const timeouts: number[] = []

function later(ms: number, fn: () => void) {
  timeouts.push(window.setTimeout(fn, ms))
}

function fireVolley() {
  if (!bossAlive.value || dmgPerSecond.value <= 0) return
  planetIdx.value = (planetIdx.value + 1) % supportImages.value.length

  volleyFlash.value = false
  requestAnimationFrame(() => {
    volleyFlash.value = true
  })

  const id = ++volleyId
  volleys.value.push({ id, ...flightVector.value })
  later(ORBITAL_SUPPORT_FLIGHT_MS, () => {
    volleys.value = volleys.value.filter((v) => v.id !== id)
    if (!bossAlive.value) return
    floats.value.push({ id, value: dmgPerSecond.value })
    later(ORBITAL_SUPPORT_FLOAT_MS, () => {
      floats.value = floats.value.filter((f) => f.id !== id)
    })
  })
}

// Exakt an die echte Schadensanwendung im Store gekoppelt — kein eigenes
// Interval, das gegen den Game-Tick driften könnte
watch(
  () => bossStore.passiveHitCounter,
  () => fireVolley(),
)

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (rect) arenaSize.value = { w: rect.width, h: rect.height }
  })
})

// rootEl existiert erst, wenn v-if greift — Observer dann (re-)anbinden
watch(rootEl, (el, prev) => {
  if (prev && resizeObserver) resizeObserver.unobserve(prev)
  if (el && resizeObserver) {
    resizeObserver.observe(el)
    const rect = el.getBoundingClientRect()
    arenaSize.value = { w: rect.width, h: rect.height }
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  timeouts.forEach(window.clearTimeout)
  timeouts.length = 0
})
</script>

<style scoped>
.osh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* über der .arena (z-index 1), unter HUD (3) und Squad (4) */
  z-index: 2;
}

/* ── Support-Anker: Planet + Label, goldene Chime-Signatur ───────────────── */
.osh-anchor {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.osh-planet {
  position: relative;
  width: 76px;
  height: 76px;
}

.osh-planet img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 14px rgba(232, 192, 64, 0.4)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8));
}

/* Abschuss-Puls: Planet zuckt kurz auf, wenn seine Salve startet */
.osh-planet--firing img {
  animation: osh-fire-pulse 0.5s cubic-bezier(0.2, 1.2, 0.4, 1);
}

@keyframes osh-fire-pulse {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.14);
  }
  100% {
    transform: scale(1);
  }
}

/* Gestrichelter Orbit-Ring — langsame Rotation als "Bereitschafts"-Signal */
.osh-orbit-ring {
  position: absolute;
  inset: -8px;
  width: calc(100% + 16px);
  height: calc(100% + 16px);
  animation: osh-ring-spin 18s linear infinite;
  will-change: transform;
}

.osh-orbit-ring-dash {
  fill: none;
  stroke: rgba(232, 192, 64, 0.4);
  stroke-width: 2;
  stroke-dasharray: 6 12;
  stroke-linecap: round;
}

@keyframes osh-ring-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.osh-label {
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(232, 192, 64, 0.75);
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.35), 0 1px 2px rgba(0, 0, 0, 0.95);
}

.osh-dps {
  font-size: 1rem;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.55),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

/* ── Komet: goldener Chime-Funke fliegt zum Boss ─────────────────────────── */
.osh-comet {
  position: absolute;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, #e8c040 45%, transparent 75%);
  box-shadow:
    0 0 14px #e8c040,
    0 0 30px rgba(232, 192, 64, 0.6);
  animation: osh-comet-fly 0.42s cubic-bezier(0.3, 0, 0.75, 0.5) forwards;
  will-change: transform, opacity;
  z-index: 1;
}

@keyframes osh-comet-fly {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  15% {
    opacity: 1;
    transform: translate(calc(var(--px) * 0.08), calc(var(--py) * 0.08)) scale(1);
  }
  100% {
    opacity: 1;
    transform: translate(var(--px), var(--py)) scale(1.15);
  }
}

/* ── Goldene Schadenszahl am Boss ────────────────────────────────────────── */
.osh-float {
  position: absolute;
  transform: translateX(-50%);
  font-size: 1.1rem;
  font-weight: 900;
  color: #ffe9a0;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.8);
  z-index: 2;
}

.osh-pop-enter-active {
  animation: osh-float-up 1s ease-out forwards;
  will-change: transform, opacity;
}

.osh-pop-leave-active {
  display: none;
}

@keyframes osh-float-up {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.8);
  }
  18% {
    opacity: 1;
    transform: translateX(-50%) translateY(-6px) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-42px) scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .osh-planet--firing img,
  .osh-orbit-ring,
  .osh-comet,
  .osh-pop-enter-active {
    animation: none;
  }
}
</style>
