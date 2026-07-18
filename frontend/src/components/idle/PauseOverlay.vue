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
          <!-- Header -->
          <header class="pause-header">
            <span class="pause-eyebrow">
              <span class="eyebrow-line" aria-hidden="true" />
              The galaxy holds its breath
              <span class="eyebrow-line" aria-hidden="true" />
            </span>
            <h1 class="pause-title">Paused</h1>
            <span class="pause-timer" aria-label="Pause duration">{{ pauseDuration }}</span>
            <div class="pause-meta-row">
              <span class="meta-chip">Level {{ gameStore.level }}</span>
              <span class="meta-divider" aria-hidden="true" />
              <span class="meta-chip">Universe {{ gameStore.currentUniverse }}</span>
              <span class="meta-divider" aria-hidden="true" />
              <span class="meta-chip">Galaxy {{ galaxyStore.currentGalaxy }}</span>
            </div>
          </header>

          <!-- Hero: frozen orbit + accumulating chimes -->
          <div class="orbit-hero" aria-hidden="false">
            <div class="orbit-ring orbit-ring--outer" aria-hidden="true">
              <span class="orbit-body orbit-body--outer" />
            </div>
            <div class="orbit-ring orbit-ring--inner" aria-hidden="true">
              <span class="orbit-body orbit-body--inner" />
            </div>
            <img src="/img/BardAbilities/BardChime.png" alt="" class="orbit-chime" />
          </div>

          <div class="chime-readout">
            <span class="chime-value">+{{ formatNumber(accumulatedChimes) }}</span>
            <span class="chime-label">Chimes while paused</span>
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
              <span class="stat-tile__hint">while paused</span>
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
              <span class="stat-tile__hint">while paused</span>
            </div>
          </div>

          <!-- Awaiting on return -->
          <div v-if="hasCallouts" class="callout-section">
            <span class="callout-heading">Awaiting your return</span>
            <div class="callout-row">
              <div v-if="isPlanetDiscovered" class="callout callout--champion">
                <Icon icon="game-icons:barbute" width="18" height="18" aria-hidden="true" />
                Champion found
              </div>
              <div v-if="gameStore.pendingAugmentSelections.length > 0" class="callout callout--gold">
                <Icon icon="game-icons:upgrade" width="16" height="16" aria-hidden="true" />
                Level-Up ×{{ gameStore.pendingAugmentSelections.length }}
              </div>
              <div v-if="pendingStars > 0" class="callout callout--star">
                <span class="star-orb" aria-hidden="true">
                  <Icon icon="game-icons:star-formation" width="16" height="16" class="star-orb__icon" />
                </span>
                <span class="star-callout__text">
                  {{ pendingStars === 1 ? 'Star spawned' : 'Stars spawned' }}
                  <span class="star-callout__count">×{{ pendingStars }}</span>
                </span>
                <span class="star-sparkle star-sparkle--a" aria-hidden="true">✦</span>
                <span class="star-sparkle star-sparkle--b" aria-hidden="true">✦</span>
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
import { computed, ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useWindowFocus } from '@/composables/useWindowFocus'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber } from '@/config/numberFormat'
import { MATERIALS } from '@/config/materials'

const { windowFocused } = useWindowFocus()
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()

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
})

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
})

const pauseDuration = computed(() => {
  const total = pauseTick.value
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
.pause-panel {
  position: relative;
  z-index: 1;
  width: min(520px, 94vw);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(14px, 2.4vh, 24px);
  padding: clamp(22px, 4vh, 40px) clamp(20px, 4vw, 44px) clamp(18px, 3vh, 30px);
  background: #1e1006;
  border: 1px solid rgba(122, 78, 32, 0.8);
  border-radius: 18px;
  box-shadow:
    0 40px 100px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 200, 80, 0.12);
}

/* ── Header ───────────────────────────────────────────── */
.pause-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.pause-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: clamp(0.62rem, 0.9vw, 0.72rem);
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.5);
  white-space: nowrap;
}
.eyebrow-line {
  width: clamp(18px, 3vw, 34px);
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(240, 208, 96, 0.35));
}
.eyebrow-line:last-child {
  transform: scaleX(-1);
}
.pause-title {
  margin: 0;
  font-family: 'MedievalSharp', cursive;
  font-size: clamp(2.4rem, 4.5vw, 3.6rem);
  font-weight: 400;
  line-height: 1;
  color: #f4e2a0;
  letter-spacing: 0.1em;
  text-shadow:
    0 0 30px rgba(240, 208, 96, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.8);
}
.pause-timer {
  font-size: clamp(0.8rem, 1.1vw, 0.95rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.12em;
  color: rgba(216, 200, 160, 0.55);
}
.pause-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(0.62rem, 0.85vw, 0.7rem);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.45);
  white-space: nowrap;
}
.meta-divider {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(200, 185, 140, 0.35);
}

/* ── Orbit hero ───────────────────────────────────────── */
.orbit-hero {
  position: relative;
  width: clamp(120px, 16vh, 170px);
  height: clamp(120px, 16vh, 170px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.orbit-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed rgba(240, 208, 96, 0.28);
}
.orbit-ring--outer {
  inset: 0;
  transform: rotate(-18deg);
  animation: ring-breathe 4.5s ease-in-out infinite;
}
.orbit-ring--inner {
  inset: 17%;
  transform: rotate(42deg);
  border-color: rgba(255, 200, 80, 0.18);
  animation: ring-breathe 4.5s ease-in-out 1.4s infinite;
}
@keyframes ring-breathe {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
.orbit-body {
  position: absolute;
  border-radius: 50%;
}
.orbit-body--outer {
  top: 12%;
  right: 8%;
  width: 9px;
  height: 9px;
  background: #f0d060;
  box-shadow: 0 0 10px rgba(240, 208, 96, 0.9);
}
.orbit-body--inner {
  bottom: 10%;
  left: 14%;
  width: 6px;
  height: 6px;
  background: #c89040;
  box-shadow: 0 0 8px rgba(200, 144, 64, 0.9);
}
.orbit-chime {
  width: 46%;
  height: 46%;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 14px rgba(232, 192, 64, 0.6));
  animation: chime-float 5s ease-in-out infinite;
}
@keyframes chime-float {
  0%,
  100% {
    transform: translateY(3px);
  }
  50% {
    transform: translateY(-3px);
  }
}

/* ── Chime readout ────────────────────────────────────── */
.chime-readout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  margin-top: calc(-1 * clamp(6px, 1vh, 12px));
}
.chime-value {
  font-size: clamp(1.9rem, 3.2vw, 2.7rem);
  font-weight: 800;
  line-height: 1;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 24px rgba(240, 208, 96, 0.5),
    0 0 50px rgba(200, 144, 64, 0.25);
}
.chime-label {
  font-size: clamp(0.66rem, 0.9vw, 0.76rem);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.5);
}

/* ── Stat tiles ───────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(8px, 1.2vw, 12px);
  width: 100%;
}
.stat-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: clamp(10px, 1.4vh, 14px) clamp(10px, 1.4vw, 14px);
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
.stat-tile__hint {
  font-size: clamp(0.58rem, 0.8vw, 0.66rem);
  color: rgba(216, 200, 160, 0.32);
  letter-spacing: 0.05em;
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
.callout {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: clamp(0.72rem, 1vw, 0.82rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  border: 1px solid;
}
.callout--champion {
  background: rgba(232, 192, 64, 0.14);
  border-color: rgba(232, 192, 64, 0.5);
  color: #f0d060;
  animation: callout-glow 2.2s ease-in-out infinite;
}
@keyframes callout-glow {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(232, 192, 64, 0);
  }
  50% {
    box-shadow: 0 0 18px rgba(232, 192, 64, 0.35);
  }
}
.callout--gold {
  background: rgba(232, 192, 64, 0.08);
  border-color: rgba(232, 192, 64, 0.3);
  color: #e8c040;
}
.callout--star {
  position: relative;
  padding: 7px 16px 7px 8px;
  background: linear-gradient(135deg, rgba(240, 208, 96, 0.14), rgba(64, 192, 180, 0.08));
  border-color: rgba(240, 208, 96, 0.45);
  color: #f4e2a0;
  overflow: visible;
  animation: star-glow 2.6s ease-in-out infinite;
}
@keyframes star-glow {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(240, 208, 96, 0);
  }
  50% {
    box-shadow: 0 0 16px rgba(240, 208, 96, 0.3);
  }
}
.star-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(255, 236, 160, 0.35), rgba(240, 208, 96, 0.08) 70%);
  border: 1px solid rgba(240, 208, 96, 0.5);
  flex-shrink: 0;
}
.star-orb__icon {
  color: #f0d060;
  filter: drop-shadow(0 0 5px rgba(240, 208, 96, 0.8));
  animation: star-twinkle 2.6s ease-in-out infinite;
}
@keyframes star-twinkle {
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
.star-callout__text {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.star-callout__count {
  font-size: 1.05em;
  font-weight: 800;
  color: #f0d060;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px rgba(240, 208, 96, 0.55);
}
.star-sparkle {
  position: absolute;
  font-size: 8px;
  line-height: 1;
  color: rgba(240, 208, 96, 0.85);
  pointer-events: none;
  animation: sparkle-blink 2.2s ease-in-out infinite;
}
.star-sparkle--a {
  top: -4px;
  right: 10px;
}
.star-sparkle--b {
  bottom: -3px;
  left: 14px;
  font-size: 6px;
  animation-delay: 1.1s;
}
@keyframes sparkle-blink {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.6);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
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

/* ── Small heights (720p) ─────────────────────────────── */
@media (max-height: 760px) {
  .orbit-hero {
    width: 104px;
    height: 104px;
  }
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
  .orbit-ring--outer,
  .orbit-ring--inner,
  .orbit-chime,
  .stat-tile--crit,
  .callout--champion,
  .callout--star,
  .star-orb__icon,
  .star-sparkle {
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
