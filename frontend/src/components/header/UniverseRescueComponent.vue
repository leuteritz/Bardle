<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { formatNumber } from '@/config/numberFormat'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

const isStarHovered = ref(false)
const isMeepHovered = ref(false)
const isUniverseBarHovered = ref(false)

const displayMeeps = ref(gameStore.meeps)
const isIncreasing = ref(false)

watch(
  () => gameStore.meeps,
  (newVal, oldVal) => {
    isIncreasing.value = newVal > oldVal
    const steps = 20
    const diff = newVal - oldVal
    const stepSize = diff / steps
    let current = oldVal
    let i = 0
    const interval = setInterval(() => {
      i++
      current += stepSize
      displayMeeps.value = Math.round(i < steps ? current : newVal)
      if (i >= steps) {
        clearInterval(interval)
        setTimeout(() => (isIncreasing.value = false), 300)
      }
    }, 16)
  },
)
</script>

<template>
  <div class="universe-panel">
    <!-- HUD Top: Galaxy + Stars stat cards -->
    <div class="hud-top">
      <div class="stat-card stat-card--galaxy">
        <img src="/img/galaxy.png" class="stat-icon" alt="Galaxie" />
        <span class="stat-card-label">GALAXY</span>
        <span class="stat-card-value galaxy-value">{{ galaxyStore.currentGalaxy }}</span>
      </div>

      <div class="hud-divider" aria-hidden="true" />

      <div
        class="stat-card stat-card--stars"
        :class="{ 'stat-card--lit-green': isStarHovered }"
        @mouseenter="isStarHovered = true"
        @mouseleave="isStarHovered = false"
      >
        <img src="/img/star.png" class="stat-icon" alt="Sterne" />
        <span class="stat-card-label">STARS</span>
        <span class="stat-card-value star-value">
          {{ galaxyStore.starsRescued }}<span class="stat-card-sep">/</span
          >{{ galaxyStore.starsRequired }}
        </span>
      </div>
    </div>

    <!-- Bottom row: Meep + Universe progress bar -->
    <div class="bottom-row">
      <div
        class="meep-block"
        :class="{ 'meep-block--rising': isIncreasing, 'meep-block--lit': isUniverseBarHovered }"
        @mouseenter="isMeepHovered = true"
        @mouseleave="isMeepHovered = false"
      >
        <img src="/img/BardAbilities/BardMeep.png" class="meep-icon" alt="Meeps" />
        <span class="meep-value" :class="{ 'meep-value--rising': isIncreasing }">
          {{ formatNumber(displayMeeps) }}
        </span>
      </div>

      <div
        v-if="!gameStore.prestigeAvailable"
        class="rpg-bar-wrap"
        :class="{ 'rpg-bar-wrap--glow': isMeepHovered || isUniverseBarHovered }"
        @mouseenter="isUniverseBarHovered = true"
        @mouseleave="isUniverseBarHovered = false"
      >
        <div class="rpg-bar-border" />
        <div class="rpg-bar-fill" :style="{ width: gameStore.universeRescueProgress + '%' }">
          <div class="rpg-bar-flow" />
          <div class="rpg-bar-gloss" />
        </div>
        <div class="rpg-ticks" aria-hidden="true">
          <div class="rpg-tick" style="left: 25%" />
          <div class="rpg-tick" style="left: 50%" />
          <div class="rpg-tick" style="left: 75%" />
        </div>
        <div
          class="rpg-bar-percent"
          :class="{ 'rpg-bar-percent--visible': isMeepHovered || isUniverseBarHovered }"
        >
          {{ gameStore.universeRescueProgress.toFixed(1) }}%
        </div>
      </div>
      <button v-else class="prestige-btn" @click.stop="gameStore.openPrestigeModal()">
        ✦ PRESTIGE ✦
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ================================================================
   ROOT
   ================================================================ */
.universe-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 6px 12px;
  box-sizing: border-box;
}

/* ================================================================
   HUD TOP — two stat cards
   ================================================================ */
.hud-top {
  display: flex;
  align-items: stretch;
  width: 100%;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  padding: 4px 6px;
}

.stat-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  transform: translateZ(0);
  will-change: transform;
  image-rendering: auto;
  transition:
    transform 0.2s,
    filter 0.3s;
  user-select: none;
}

.stat-card--galaxy .stat-icon:hover {
  transform: scale(1.1) translateZ(0);
  filter: drop-shadow(0 0 8px rgba(138, 100, 220, 0.85));
}

.stat-card--stars .stat-icon:hover {
  transform: scale(1.1) translateZ(0);
  filter: drop-shadow(0 0 8px rgba(82, 184, 48, 0.85));
}

.stat-card-label {
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255, 200, 80, 0.5);
  line-height: 1;
}

.stat-card-value {
  font-size: 1.55rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  letter-spacing: -0.02em;
}

.galaxy-value {
  color: #c8a0f0;
  text-shadow: 0 0 10px rgba(138, 100, 220, 0.45);
}

.star-value {
  color: #a8e060;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.4);
  transition:
    color 0.3s,
    text-shadow 0.3s;
}

.stat-card--lit-green .star-value {
  color: #c8f080;
  text-shadow:
    0 0 14px rgba(82, 184, 48, 0.7),
    0 0 28px rgba(82, 184, 48, 0.3);
}

.stat-card-sep {
  color: rgba(255, 200, 80, 0.45);
  font-size: 1.1rem;
  margin-inline: 1px;
}

.hud-divider {
  width: 1px;
  align-self: stretch;
  background: rgba(255, 200, 80, 0.15);
  margin-inline: 6px;
  flex-shrink: 0;
}

/* ================================================================
   BOTTOM ROW — Meep + RPG bar
   ================================================================ */
.bottom-row {
  display: flex;
  align-items: center;
  width: 100%;
}

/* ── Meep-Block ────────────────────────────── */
.meep-block {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  isolation: isolate;
  transition: filter 0.3s;
}

.meep-block--rising {
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
}

.meep-icon {
  width: 44px;
  height: 44px;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: auto;
  transform: translateZ(0);
  will-change: transform;
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.75));
  transition:
    transform 0.2s,
    filter 0.3s;
  user-select: none;
}

.meep-icon:hover {
  transform: scale(1.1) translateZ(0);
  filter: drop-shadow(0 0 12px rgba(251, 146, 60, 1));
}

.meep-value {
  font-size: 1.3rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fed7aa;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 0 8px rgba(251, 146, 60, 0.3);
  transition:
    color 0.3s,
    text-shadow 0.3s;
  letter-spacing: -0.01em;
  min-width: 4ch;
  max-width: 5ch;
}

.meep-value--rising {
  color: #fdba74;
  text-shadow:
    0 0 12px rgba(251, 146, 60, 0.85),
    0 0 24px rgba(251, 146, 60, 0.4);
}

.meep-block--lit .meep-icon {
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.9));
  transform: scale(1.05) translateZ(0);
}

.meep-block--lit .meep-value {
  color: #fdba74;
  text-shadow:
    0 0 10px rgba(251, 146, 60, 0.75),
    0 0 20px rgba(251, 146, 60, 0.35);
}

/* ================================================================
   GROSSE RPG-PROGRESSBAR
   ================================================================ */
.rpg-bar-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 22px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 0 0 2px rgba(255, 200, 60, 0.22),
    inset 0 2px 8px rgba(0, 0, 0, 0.65);
  background: rgba(8, 4, 0, 0.7);
  transition: box-shadow 0.25s ease;
}

.rpg-bar-wrap--glow {
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 0 0 2px rgba(255, 200, 60, 0.55),
    0 0 14px rgba(255, 200, 60, 0.55),
    inset 0 2px 8px rgba(0, 0, 0, 0.65);
}

.rpg-bar-border {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  border: 1px solid rgba(255, 200, 60, 0.28);
  pointer-events: none;
  z-index: 3;
}

.rpg-bar-fill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  min-width: 6px;
  border-radius: 4px;
  background: linear-gradient(
    to bottom,
    rgba(255, 240, 130, 0.75) 0%,
    rgba(255, 200, 20, 1) 25%,
    rgba(215, 145, 0, 1) 55%,
    rgba(255, 200, 20, 1) 78%,
    rgba(255, 240, 130, 0.7) 100%
  );
  transition: width 1.1s cubic-bezier(0.4, 0, 0.2, 1);
  animation: barPulse 3.5s ease-in-out infinite;
  overflow: hidden;
  z-index: 1;
}

.rpg-bar-flow {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(255, 255, 255, 0.09) 14px,
    rgba(255, 255, 255, 0.03) 22px,
    transparent 36px
  );
  animation: flowMove 2.2s linear infinite;
}

.rpg-bar-gloss {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to bottom, rgba(255, 245, 160, 0.18) 0%, transparent 100%);
  border-radius: 4px 4px 0 0;
  pointer-events: none;
}

.rpg-ticks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.rpg-tick {
  position: absolute;
  top: 20%;
  bottom: 20%;
  width: 1px;
  background: rgba(255, 215, 0, 0.2);
}

.rpg-bar-percent {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
  letter-spacing: 0.03em;
  z-index: 5;
  opacity: 0;
  transform: translateY(2px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
  pointer-events: none;
}

.rpg-bar-percent--visible {
  opacity: 1;
  transform: translateY(0);
}

@keyframes barPulse {
  0%,
  100% {
    box-shadow:
      0 0 8px rgba(255, 215, 0, 0.35),
      inset 0 0 6px rgba(255, 215, 0, 0.1);
  }
  50% {
    box-shadow:
      0 0 20px rgba(255, 215, 0, 0.6),
      inset 0 0 10px rgba(255, 215, 0, 0.2);
  }
}

@keyframes flowMove {
  from {
    background-position-x: 0px;
  }
  to {
    background-position-x: 72px;
  }
}

/* ================================================================
   PRESTIGE BUTTON
   ================================================================ */
.prestige-btn {
  flex: 1;
  height: 22px;
  padding: 0 12px;
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #3a1870 0%, #5e2fa0 45%, #c08030 100%);
  color: #fff;
  border: 1px solid rgba(200, 150, 60, 0.6);
  border-radius: 4px;
  cursor: pointer;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  transition:
    transform 0.18s,
    box-shadow 0.18s;
  animation: prestigeGlow 2.5s ease-in-out infinite;
}

.prestige-btn:hover {
  transform: scale(1.03);
}

.prestige-btn:active {
  transform: scale(0.96);
}

@keyframes prestigeGlow {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(200, 144, 64, 0.35);
  }
  50% {
    box-shadow: 0 0 22px rgba(200, 144, 64, 0.7);
  }
}
</style>
