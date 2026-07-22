<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="!windowFocused"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        @click.self="unpause"
      >
        <!-- Drifting star dust -->
        <div class="pause-particles" aria-hidden="true">
          <span v-for="i in 14" :key="i" class="particle" :style="particleStyle(i)" />
        </div>

        <div class="pause-panel">
          <RpgFrame />
          <!-- Header -->
          <header class="pause-header">
            <h1 class="pause-title">Paused</h1>
            <div class="pause-timer" role="timer" aria-label="Pause duration">
              <span class="pause-timer__value">
                <span
                  v-for="(ch, i) in timerChars"
                  :key="i"
                  :class="ch === ':' ? 'timer-sep' : 'timer-digit'"
                >{{ ch }}</span>
              </span>
            </div>
            <div class="pause-meta-row">
              <span class="meta-chip">
                <span class="meta-chip__label">Level</span>
                <span class="meta-chip__value">{{ gameStore.level }}</span>
              </span>
              <span class="meta-chip">
                <span class="meta-chip__label">Universe</span>
                <span class="meta-chip__value">{{ gameStore.currentUniverse }}</span>
              </span>
              <span class="meta-chip">
                <span class="meta-chip__label">Galaxy</span>
                <span class="meta-chip__value">{{ galaxyStore.currentGalaxy }}</span>
              </span>
            </div>
          </header>

          <!-- Hero: the live sun in its current phase (no planets, no champions) -->
          <div class="sun-hero" aria-hidden="true">
            <CometDisc v-if="solarStore.isCometState" :diameter="sunDiameter" />
            <PhaseSunDisc v-else :diameter="sunDiameter" />
          </div>
          <span class="sun-phase-label" :style="{ color: sunPhaseLabelColor }">
            {{ sunPhase.name }}
          </span>

          <div class="chime-readout">
            <img src="/img/BardAbilities/BardChime.png" alt="" class="chime-img" />
            <span class="chime-value">+{{ formatNumber(accumulatedChimes) }}</span>
          </div>

          <!-- Stat tiles -->
          <div class="stat-grid">
            <div class="stat-tile" :class="{ 'stat-tile--crit': hpPercent <= 25 }">
              <span class="stat-tile__label">
                <Icon icon="game-icons:hearts" width="13" height="13" class="stat-tile__icon stat-tile__icon--hp" aria-hidden="true" />
                Health
              </span>
              <span class="stat-tile__value">
                {{ Math.round(playerStore.currentHP) }}<span class="stat-tile__sub">/{{ playerStore.maxHP }}</span>
              </span>
              <div class="hp-bar-track">
                <div class="hp-bar-fill" :class="hpColor" :style="{ width: hpPercent + '%' }" />
              </div>
            </div>

            <div class="stat-tile">
              <span class="stat-tile__label">
                <Icon icon="game-icons:crossed-swords" width="13" height="13" class="stat-tile__icon" aria-hidden="true" />
                Kills
              </span>
              <span class="stat-tile__value">{{ formatNumber(pauseKills) }}</span>
            </div>

            <div class="stat-tile">
              <span class="stat-tile__label">
                <Icon icon="game-icons:ore" width="13" height="13" class="stat-tile__icon" aria-hidden="true" />
                Materials
              </span>
              <span v-if="pauseMaterialEntries.length === 0" class="stat-tile__value stat-tile__value--dim">—</span>
              <div v-else class="material-row">
                <span
                  v-for="mat in pauseMaterialEntries.slice(0, 3)"
                  :key="mat.id"
                  class="material-chip"
                  :title="mat.name"
                >
                  <img v-if="mat.image" :src="mat.image" :alt="mat.name" class="material-chip__img" />
                  <span class="material-chip__amount">{{ formatNumber(mat.amount) }}</span>
                </span>
                <span v-if="pauseMaterialEntries.length > 3" class="material-chip material-chip--more">
                  +{{ pauseMaterialEntries.length - 3 }}
                </span>
              </div>
            </div>
          </div>

          <!-- Awaiting on return -->
          <div v-if="hasCallouts" class="callout-section">
            <span class="callout-heading">Awaiting your return</span>
            <div class="callout-row">
              <div v-if="isPlanetDiscovered" class="callout callout--champion">
                <span class="callout-orb" aria-hidden="true">
                  <Icon icon="game-icons:barbute" width="16" height="16" class="callout-orb__icon" />
                </span>
                <span class="callout__text">Champion found</span>
              </div>
              <div v-if="gameStore.pendingAugmentSelections.length > 0" class="callout callout--level">
                <span class="callout-orb" aria-hidden="true">
                  <Icon icon="game-icons:upgrade" width="16" height="16" class="callout-orb__icon" />
                </span>
                <span class="callout__text">
                  Level-Up
                  <span class="callout__count">×{{ gameStore.pendingAugmentSelections.length }}</span>
                </span>
              </div>
              <div v-if="pendingStars > 0" class="callout callout--star">
                <span class="callout-orb" aria-hidden="true">
                  <Icon icon="game-icons:star-formation" width="16" height="16" class="callout-orb__icon" />
                </span>
                <span class="callout__text">
                  {{ pendingStars === 1 ? 'Star spawned' : 'Stars spawned' }}
                  <span class="callout__count">×{{ pendingStars }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Continue -->
          <button class="continue-btn" @click="unpause">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6 3 21 12 6 21 6 3" />
            </svg>
            Resume journey
          </button>
          <span class="pause-hint">or click anywhere to continue</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useWindowFocus } from '@/composables/useWindowFocus'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { formatNumber } from '@/config/numberFormat'
import { MATERIALS } from '@/config/materials'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  PAUSE_SUN_MIN_DIAMETER,
  PAUSE_SUN_MAX_DIAMETER,
  PAUSE_SUN_VH_FACTOR,
} from '@/config/constants'
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'

const { windowFocused } = useWindowFocus()
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()
const planetShopStore = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()

function computeSunDiameter(): number {
  return Math.round(
    Math.min(
      PAUSE_SUN_MAX_DIAMETER,
      Math.max(PAUSE_SUN_MIN_DIAMETER, window.innerHeight * PAUSE_SUN_VH_FACTOR),
    ),
  )
}

const sunDiameter = ref(computeSunDiameter())
function onResize() {
  sunDiameter.value = computeSunDiameter()
}

onMounted(() => window.addEventListener('resize', onResize))

const sunPhase = computed(() =>
  solarStore.isCometState
    ? COMET_PHASE_DATA
    : (STAR_PHASE_DATA[planetShopStore.currentSunStage] ?? STAR_PHASE_DATA[0]),
)
const sunPhaseLabelColor = computed(() => {
  const p = sunPhase.value
  return 'phasePrimary' in p ? p.phasePrimary : p.accent
})

const pendingStars = computed(() => galaxyStore.pendingResourceStars)
const hpPercent = computed(() => playerStore.hpPercent)

const hpColor = computed(() => {
  if (hpPercent.value > 50) return 'hp--green'
  if (hpPercent.value > 25) return 'hp--yellow'
  return 'hp--red'
})

const pauseStartChimes = ref(0)
const pauseTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null

watch(
  windowFocused,
  (focused) => {
    if (!focused) {
      gameStore.setPauseState(true)
      pauseStartChimes.value = gameStore.chimes
      pauseTick.value = 0
      pauseInterval = setInterval(() => {
        pauseTick.value++
      }, 1000)
    } else {
      gameStore.setPauseState(false)
      if (pauseInterval !== null) {
        clearInterval(pauseInterval)
        pauseInterval = null
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pauseInterval !== null) clearInterval(pauseInterval)
  window.removeEventListener('resize', onResize)
})

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
})

const timerChars = computed(() => {
  const total = pauseTick.value
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return `${h > 0 ? h + ':' : ''}${mm}:${ss}`.split('')
})

const pauseKills = computed(() => gameStore.pauseStats.kills)
const pauseMaterialEntries = computed(() =>
  Object.entries(gameStore.pauseStats.materialsEarned).map(([id, amount]) => {
    const mat = MATERIALS.find((m) => m.id === id)
    return { id, amount, name: mat?.name ?? id, image: mat?.image ?? null }
  }),
)

const isPlanetDiscovered = computed(
  () => galaxyStore.championTravelState === 'champion_available',
)

const hasCallouts = computed(
  () =>
    isPlanetDiscovered.value ||
    gameStore.pendingAugmentSelections.length > 0 ||
    pendingStars.value > 0,
)

function unpause() {
  window.focus()
}

function particleStyle(i: number): Record<string, string> {
  const left = (i * 137.5) % 100
  const top = (i * 61.8 + 13) % 100
  const size = 1.5 + (i % 4)
  const delay = ((i * 0.45) % 4).toFixed(1)
  const duration = (4 + (i % 6)).toFixed(1)
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  }
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────── */
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(12px, 3vh, 40px);
  background:
    radial-gradient(ellipse at 50% 110%, rgba(255, 200, 80, 0.08) 0%, transparent 55%),
    rgba(8, 4, 0, 0.85);
  backdrop-filter: blur(10px) saturate(0.85);
  -webkit-backdrop-filter: blur(10px) saturate(0.85);
  overflow-y: auto;
}

/* ── Particles ────────────────────────────────────────── */
.pause-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(240, 224, 180, 0.8) 0%, transparent 70%);
  animation: particle-drift 6s ease-in-out infinite alternate;
  opacity: 0.3;
}
@keyframes particle-drift {
  from {
    transform: translateY(0);
    opacity: 0.12;
  }
  to {
    transform: translateY(-22px);
    opacity: 0.4;
  }
}

/* ── Panel ────────────────────────────────────────────── */
/* Same frame as the BardProfileMenu modal (.rp-modal): flat dark body, the
   bottom-bar notch curvature and the gold accent line along the top edge. */
.pause-panel {
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: min(560px, 94vw);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(14px, 2.4vh, 24px);
  padding: clamp(22px, 4vh, 40px) clamp(20px, 4vw, 44px) clamp(18px, 3vh, 30px);
  background: #111008;
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1));
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
}
.pause-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  box-shadow: 0 0 8px rgba(200, 150, 30, 0.5);
  pointer-events: none;
}

/* ── Header ───────────────────────────────────────────── */
.pause-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.pause-title {
  margin: 0;
  font-family: 'MedievalSharp', cursive;
  font-size: clamp(2.8rem, 5.2vw, 4.2rem);
  font-weight: 400;
  line-height: 1;
  color: #f4e2a0;
  letter-spacing: 0.1em;
  text-shadow:
    0 0 30px rgba(240, 208, 96, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.8);
}
.pause-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: clamp(6px, 1vh, 10px);
}
.pause-timer__value {
  display: inline-flex;
  align-items: baseline;
  font-size: clamp(2rem, 3.6vw, 3rem);
  font-weight: 800;
  line-height: 1;
  color: #f0d060;
  text-shadow:
    0 0 22px rgba(240, 208, 96, 0.45),
    0 0 48px rgba(200, 144, 64, 0.22);
  animation: timer-breathe 5s ease-in-out infinite;
}
/* Every glyph sits in a fixed-width cell so nothing shifts as digits change. */
.timer-digit {
  display: inline-block;
  width: 0.74em;
  text-align: center;
}
.timer-sep {
  display: inline-block;
  width: 0.44em;
  text-align: center;
  transform: translateY(-0.04em);
}
@keyframes timer-breathe {
  0%,
  100% {
    text-shadow:
      0 0 22px rgba(240, 208, 96, 0.45),
      0 0 48px rgba(200, 144, 64, 0.22);
  }
  50% {
    text-shadow:
      0 0 30px rgba(240, 208, 96, 0.7),
      0 0 64px rgba(200, 144, 64, 0.35);
  }
}
.pause-meta-row {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(16px, 2.2vw, 28px);
  margin-top: clamp(8px, 1.2vh, 14px);
}
.meta-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}
.meta-chip__label {
  font-size: clamp(0.66rem, 0.9vw, 0.76rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.55);
}
.meta-chip__value {
  font-size: clamp(1rem, 1.5vw, 1.3rem);
  font-weight: 800;
  line-height: 1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(236, 224, 192, 0.25);
}

/* ── Sun hero ─────────────────────────────────────────── */
.sun-hero {
  position: relative;
  width: clamp(160px, 24vh, 300px);
  height: clamp(160px, 24vh, 300px);
  flex-shrink: 0;
  pointer-events: none;
}
.sun-phase-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: calc(-1 * clamp(10px, 1.6vh, 18px));
  font-family: 'MedievalSharp', cursive;
  font-size: clamp(1.05rem, 1.6vw, 1.5rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-shadow: 0 0 18px currentColor;
}
/* ── Chime readout ────────────────────────────────────── */
.chime-readout {
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.6vw, 20px);
}
.chime-img {
  width: clamp(54px, 7.5vh, 84px);
  height: clamp(54px, 7.5vh, 84px);
  object-fit: contain;
  filter: drop-shadow(0 0 16px rgba(232, 192, 64, 0.65));
  animation: chime-glow 5s ease-in-out infinite;
}
@keyframes chime-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 12px rgba(232, 192, 64, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(232, 192, 64, 0.8));
  }
}
.chime-value {
  font-size: clamp(2.4rem, 4.2vw, 3.6rem);
  font-weight: 800;
  line-height: 1;
  transform: translateY(0.06em);
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 24px rgba(240, 208, 96, 0.5),
    0 0 50px rgba(200, 144, 64, 0.25);
}

/* ── Stat tiles ───────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* Feste Zeilenhöhe: alle drei Tiles exakt gleich groß, egal wie viel
     Inhalt (HP-Leiste, Material-Chips) eine einzelne Kachel hat. */
  grid-auto-rows: clamp(84px, 11vh, 104px);
  gap: clamp(8px, 1.2vw, 12px);
  width: 100%;
}
.stat-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 7px;
  padding: clamp(10px, 1.4vh, 14px) clamp(10px, 1.4vw, 14px);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: rgba(255, 200, 80, 0.05);
  border: 1px solid rgba(122, 78, 32, 0.55);
  border-radius: 12px;
  min-width: 0;
}
.stat-tile--crit {
  border-color: rgba(204, 96, 80, 0.4);
  animation: crit-pulse 1s ease-in-out infinite alternate;
}
@keyframes crit-pulse {
  from {
    background: rgba(204, 96, 80, 0.04);
  }
  to {
    background: rgba(204, 96, 80, 0.12);
  }
}
.stat-tile__label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(0.6rem, 0.85vw, 0.7rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.5);
  white-space: nowrap;
}
.stat-tile__icon {
  color: rgba(216, 200, 160, 0.55);
  flex-shrink: 0;
}
.stat-tile__icon--hp {
  color: #cc6050;
}
.stat-tile__value {
  font-size: clamp(1.05rem, 1.6vw, 1.4rem);
  font-weight: 800;
  line-height: 1.1;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stat-tile__value--dim {
  color: rgba(216, 200, 160, 0.3);
}
.stat-tile__sub {
  font-size: 0.68em;
  font-weight: 600;
  color: rgba(216, 200, 160, 0.45);
}
/* HP bar */
.hp-bar-track {
  position: relative;
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 3px;
  overflow: hidden;
}
.hp-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition:
    width 600ms cubic-bezier(0.25, 1, 0.5, 1),
    background 600ms ease;
}
.hp--green {
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 6px rgba(82, 184, 48, 0.5);
}
.hp--yellow {
  background: linear-gradient(to right, #7a5010, #d4a020);
  box-shadow: 0 0 6px rgba(212, 160, 32, 0.5);
}
.hp--red {
  background: linear-gradient(to right, #6a1a10, #cc6050);
  box-shadow: 0 0 6px rgba(204, 96, 80, 0.6);
}

/* Materials */
.material-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  justify-content: center;
}
.material-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px 2px 3px;
  background: rgba(64, 192, 180, 0.08);
  border: 1px solid rgba(64, 192, 180, 0.22);
  border-radius: 8px;
  font-size: clamp(0.62rem, 0.85vw, 0.72rem);
  font-weight: 700;
  color: #7fd8d0;
  font-variant-numeric: tabular-nums;
}
.material-chip--more {
  padding: 2px 6px;
  color: rgba(216, 200, 160, 0.5);
  background: rgba(255, 200, 80, 0.06);
  border-color: rgba(122, 78, 32, 0.5);
}
.material-chip__img {
  width: 14px;
  height: 14px;
  object-fit: contain;
  image-rendering: pixelated;
}

/* ── Callouts ─────────────────────────────────────────── */
.callout-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.callout-heading {
  font-size: clamp(0.6rem, 0.85vw, 0.68rem);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
}
.callout-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
/* One shared callout style — modifiers only swap the accent color (--co-color). */
.callout {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 7px 16px 7px 8px;
  border-radius: 999px;
  font-size: clamp(0.72rem, 1vw, 0.82rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  border: 1px solid color-mix(in srgb, var(--co-color) 45%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--co-color) 14%, transparent),
    color-mix(in srgb, var(--co-color) 5%, transparent)
  );
  color: color-mix(in srgb, var(--co-color) 55%, #f2ead0);
  overflow: visible;
  animation: callout-glow 2.6s ease-in-out infinite;
}
.callout--champion {
  --co-color: #f0d060;
}
.callout--level {
  --co-color: #74d448;
}
.callout--star {
  --co-color: #7fd8d0;
}
@keyframes callout-glow {
  0%,
  100% {
    box-shadow: 0 0 0 color-mix(in srgb, var(--co-color) 0%, transparent);
  }
  50% {
    box-shadow: 0 0 16px color-mix(in srgb, var(--co-color) 32%, transparent);
  }
}
.callout-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 40% 35%,
    color-mix(in srgb, var(--co-color) 35%, transparent),
    color-mix(in srgb, var(--co-color) 8%, transparent) 70%
  );
  border: 1px solid color-mix(in srgb, var(--co-color) 50%, transparent);
  flex-shrink: 0;
}
.callout-orb__icon {
  color: var(--co-color);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--co-color) 80%, transparent));
  animation: orb-twinkle 2.6s ease-in-out infinite;
}
@keyframes orb-twinkle {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.18) rotate(12deg);
    opacity: 1;
  }
}
.callout__text {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.callout__count {
  font-size: 1.05em;
  font-weight: 800;
  color: var(--co-color);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px color-mix(in srgb, var(--co-color) 55%, transparent);
}

/* ── Continue button ──────────────────────────────────── */
.continue-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  padding: clamp(11px, 1.6vh, 15px) 0;
  background: linear-gradient(to bottom, rgba(240, 208, 96, 0.16), rgba(200, 144, 64, 0.1));
  border: 1px solid rgba(240, 208, 96, 0.45);
  border-radius: 12px;
  color: #f4e2a0;
  font-size: clamp(0.82rem, 1.15vw, 0.95rem);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.1s ease;
}
.continue-btn:hover {
  background: linear-gradient(to bottom, rgba(240, 208, 96, 0.26), rgba(200, 144, 64, 0.16));
  border-color: rgba(240, 208, 96, 0.75);
  box-shadow: 0 0 24px rgba(240, 208, 96, 0.25);
  transform: translateY(-1px);
}
.continue-btn:active {
  transform: translateY(0);
  box-shadow: none;
}
.continue-btn:focus-visible {
  outline: 2px solid #f0d060;
  outline-offset: 3px;
}
.pause-hint {
  font-size: clamp(0.62rem, 0.85vw, 0.7rem);
  color: rgba(216, 200, 160, 0.35);
  letter-spacing: 0.08em;
  font-style: italic;
}

/* ── Transitions ──────────────────────────────────────── */
.pause-fade-enter-active {
  transition: opacity 0.3s ease;
}
.pause-fade-enter-active .pause-panel {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.pause-fade-leave-active {
  transition: opacity 0.18s ease;
}
.pause-fade-enter-from {
  opacity: 0;
}
.pause-fade-enter-from .pause-panel {
  transform: scale(0.94) translateY(14px);
}
.pause-fade-leave-to {
  opacity: 0;
}

/* ── Narrow screens ───────────────────────────────────── */
@media (max-width: 480px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
  .stat-tile:first-child {
    grid-column: 1 / -1;
  }
}

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .particle,
  .chime-img,
  .stat-tile--crit,
  .callout,
  .callout-orb__icon,
  .pause-timer__value {
    animation: none;
  }
  .continue-btn,
  .pause-fade-enter-active,
  .pause-fade-leave-active,
  .pause-fade-enter-active .pause-panel {
    transition: opacity 0.15s;
  }
}
</style>
