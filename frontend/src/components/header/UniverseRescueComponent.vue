<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { GALAXY_THEMES } from '@/config/galaxyThemes'
import { formatNumber } from '@/config/numberFormat'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

const isMeepHovered = ref(false)
const isUniverseBarHovered = ref(false)

const galaxyName = computed(
  () => GALAXY_THEMES[galaxyStore.currentThemeIndex % GALAXY_THEMES.length].name,
)

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
  <div class="uni-block">
    <!-- Row 1: Galaxy icon + name, Meeps flush right -->
    <div class="gx-row">
      <img src="/img/galaxy-far.png" class="gx-icon" alt="Galaxy" />
      <div class="info-grp">
        <span class="info-lbl">Galaxy {{ galaxyStore.currentGalaxy }}</span>
        <span class="info-name">{{ galaxyName }}</span>
      </div>

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
    </div>

    <!-- Row 2: Universe rescue bar (or prestige button) -->
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
      <div class="rpg-bar-percent">
        Universe Rescue · {{ gameStore.universeRescueProgress.toFixed(1) }}%
      </div>
    </div>
    <button v-else class="prestige-btn" @click.stop="gameStore.openPrestigeModal()">
      ✦ PRESTIGE ✦
    </button>
  </div>
</template>

<style scoped>
/* ================================================================
   ROOT — galaxy row over the universe rescue bar
   ================================================================ */
.uni-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(3px, 0.5vw, 8px);
  width: 100%;
  height: clamp(56px, 4.2vw, 115px);
  padding: 6px 8px 3px;
  box-sizing: border-box;
  min-width: 0;
}

/* ================================================================
   ROW 1 — galaxy + meeps
   ================================================================ */
.gx-row {
  display: flex;
  align-items: center;
  gap: clamp(5px, 0.7vw, 9px);
  width: 100%;
  min-width: 0;
}

.gx-icon {
  width: clamp(20px, 2.2vw, 30px);
  height: clamp(20px, 2.2vw, 30px);
  object-fit: contain;
  flex-shrink: 0;
  transform: translateZ(0);
  will-change: transform;
  transition:
    transform 0.2s,
    filter 0.3s;
  user-select: none;
}

.gx-icon:hover {
  transform: scale(1.1) translateZ(0);
  filter: drop-shadow(0 0 8px rgba(138, 100, 220, 0.85));
}

.info-grp {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

.info-lbl {
  font-size: clamp(0.48rem, 0.5vw, 0.56rem);
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.5);
  line-height: 1;
  white-space: nowrap;
}

.info-name {
  font-size: clamp(0.72rem, 0.85vw, 0.92rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--rpg-green-border, #6ec040);
  text-shadow: 0 0 8px rgba(110, 192, 64, 0.3);
}

/* ── Meep block (flush right) ────────────────── */
.meep-block {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  margin-left: auto;
  isolation: isolate;
  transition: filter 0.3s;
}

.meep-block--rising {
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
}

.meep-icon {
  width: clamp(18px, 1.8vw, 30px);
  height: clamp(18px, 1.8vw, 30px);
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
  animation: meep-pulse 3s ease-in-out infinite;
}

.meep-icon:hover {
  transform: scale(1.1) translateZ(0);
  filter: drop-shadow(0 0 12px rgba(251, 146, 60, 1));
}

.meep-value {
  font-size: clamp(0.65rem, 0.9vw, 1rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fed7aa;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 0 8px rgba(251, 146, 60, 0.35);
  transition:
    color 0.3s,
    text-shadow 0.3s;
  letter-spacing: -0.01em;
  min-width: 3ch;
  max-width: none;
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

@keyframes meep-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(251, 146, 60, 0.9));
  }
}

/* ================================================================
   ROW 2 — RPG progress bar with always-visible inline label
   ================================================================ */
.rpg-bar-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  height: clamp(14px, 1.2vw, 22px);
  border-radius: 4px;
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
  font-size: clamp(0.56rem, 0.62vw, 0.7rem);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
  letter-spacing: 0.03em;
  z-index: 5;
  white-space: nowrap;
  overflow: hidden;
  pointer-events: none;
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
  width: 100%;
  height: clamp(14px, 1.2vw, 22px);
  padding: 0 8px;
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
