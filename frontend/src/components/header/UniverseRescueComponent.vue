<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { formatNumber } from '@/config/numberFormat'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

const starsProgress = computed(() =>
  Math.min(100, (galaxyStore.starsRescued / Math.max(1, galaxyStore.starsRequired)) * 100),
)

// Array für jedes Stern-Segment
const starSegments = computed(() => {
  const total = Math.max(1, galaxyStore.starsRequired)
  return Array.from({ length: total }, (_, i) => ({
    filled: i < galaxyStore.starsRescued,
  }))
})

const starDividers = computed(() => {
  const n = starSegments.value.length
  return n > 1 ? Array.from({ length: n - 1 }, (_, i) => ((i + 1) / n) * 100) : []
})

const isStarHovered = ref(false)
const isMeepHovered = ref(false)
const isUniverseBarHovered = ref(false)
const isStarBarHovered = ref(false)

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
    <div class="stats-row">
      <!-- Galaxy-Block -->
      <div class="galaxy-block">
        <span class="galaxy-icon">🌌</span>
        <span class="galaxy-value">{{ galaxyStore.currentGalaxy }}</span>
      </div>

      <div class="stats-divider" aria-hidden="true">|</div>

      <!-- Star-Block -->
      <div
        class="star-block"
        :class="{ 'star-block--lit': isStarBarHovered }"
        @mouseenter="isStarHovered = true"
        @mouseleave="isStarHovered = false"
      >
        <img src="/img/star.png" class="star-icon" alt="Sterne" />
        <span class="star-value"
          >{{ galaxyStore.starsRescued }} / {{ galaxyStore.starsRequired }}</span
        >
      </div>

      <div class="stats-divider" aria-hidden="true">|</div>

      <!-- Meep-Block -->
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

    <!-- ── Sterne-Progressbar (segmentiert) ── -->
    <div
      class="star-bar-wrap"
      :class="{ 'star-bar-wrap--glow': isStarHovered || isStarBarHovered }"
      @mouseenter="isStarBarHovered = true"
      @mouseleave="isStarBarHovered = false"
    >
      <div class="star-bar-border" />
      <div class="star-segments">
        <div
          v-for="(seg, i) in starSegments"
          :key="i"
          class="star-segment"
          :class="{ 'star-segment--filled': seg.filled }"
        >
          <div v-if="seg.filled" class="star-segment-flow" />
          <div v-if="seg.filled" class="star-segment-gloss" />
        </div>
        <div
          v-for="(pct, d) in starDividers"
          :key="'div-' + d"
          class="star-divider"
          :style="{ left: pct + '%' }"
          aria-hidden="true"
        />
      </div>
    </div>

    <!-- Große RPG-Progressbar -->
    <div
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
      <div class="rpg-bar-percent" :class="{ 'rpg-bar-percent--visible': isMeepHovered || isUniverseBarHovered }">
        {{ gameStore.universeRescueProgress.toFixed(1) }}%
      </div>
    </div>

    <!-- Prestige Button -->
    <div v-if="gameStore.prestigeAvailable" class="prestige-wrap">
      <button class="prestige-btn" @click.stop="gameStore.openPrestigeModal()">✦ PRESTIGE ✦</button>
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
   STATS-ZEILE
   ================================================================ */
.stats-row {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  overflow: hidden;
}

/* ── Galaxy-Block ──────────────────────────── */
.galaxy-block {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  isolation: isolate;
}

.galaxy-icon {
  font-size: 1.5rem;
  line-height: 1;
  user-select: none;
  transition:
    transform 0.2s,
    filter 0.3s;
}
.galaxy-icon:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 8px rgba(138, 100, 220, 0.85));
}

.galaxy-value {
  font-size: 1.1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #c8a0f0;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(138, 100, 220, 0.35);
  letter-spacing: -0.01em;
}

/* ── Star-Block ────────────────────────────── */
.star-block {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  isolation: isolate;
}

.star-icon {
  width: 40px;
  height: 40px;
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
.star-icon:hover {
  transform: scale(1.1) translateZ(0);
  filter: drop-shadow(0 0 8px rgba(82, 184, 48, 0.85));
}

.star-value {
  font-size: 1.1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #a8e060;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.35);
  letter-spacing: -0.01em;
  transition:
    color 0.3s,
    text-shadow 0.3s;
}

/* ── Meep-Block ────────────────────────────── */
.meep-block {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  isolation: isolate;
  transition: filter 0.3s;
}
.meep-block--rising {
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
}

.meep-icon {
  width: 40px;
  height: 40px;
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
  font-size: 1.1rem;
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
}
.meep-value--rising {
  color: #fdba74;
  text-shadow:
    0 0 12px rgba(251, 146, 60, 0.85),
    0 0 24px rgba(251, 146, 60, 0.4);
}

/* ── Star-Block lit (Star-Bar hover) ─────── */
.star-block--lit .star-icon {
  filter: drop-shadow(0 0 8px rgba(82, 184, 48, 0.85));
  transform: scale(1.05) translateZ(0);
}
.star-block--lit .star-value {
  color: #c8f080;
  text-shadow:
    0 0 10px rgba(82, 184, 48, 0.7),
    0 0 20px rgba(82, 184, 48, 0.3);
}

/* ── Meep-Block lit (Universe-Bar hover) ──── */
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

/* ── Stats-Divider ─────────────────────────── */
.stats-divider {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
  color: rgba(255, 200, 80, 0.4);
  font-size: 1.2rem;
  line-height: 1;
  padding-inline: 10px;
  user-select: none;
}

/* ================================================================
   STERNE-PROGRESSBAR – SEGMENTIERT
   ================================================================ */
.star-bar-wrap {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  border-radius: 4px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 0 0 2px rgba(82, 184, 48, 0.2),
    inset 0 2px 6px rgba(0, 0, 0, 0.65);
  background: #050808;
  transition: box-shadow 0.25s ease;
  overflow: hidden;
}
.star-bar-wrap--glow {
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 0 0 2px rgba(82, 184, 48, 0.55),
    0 0 14px rgba(82, 184, 48, 0.55),
    inset 0 2px 6px rgba(0, 0, 0, 0.65);
}

/* Rahmen über allem */
.star-bar-border {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  border: 1px solid rgba(82, 184, 48, 0.25);
  pointer-events: none;
  z-index: 4;
}

/* Segment-Container */
.star-segments {
  display: flex;
  position: relative;
  height: 16px;
  width: 100%;
  box-sizing: border-box;
}

/* Overlay-Divider (always visible, independent of fill state) */
.star-divider {
  position: absolute;
  top: 20%;
  bottom: 20%;
  width: 1px;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.4);
  z-index: 3;
  pointer-events: none;
}

/* Einzelnes Segment */
.star-segment {
  flex: 1;
  border-radius: 2px;
  background: rgba(10, 20, 10, 0.6);
  position: relative;
  overflow: hidden;
  transition:
    background 0.4s ease,
    box-shadow 0.4s ease;
}

/* Gefülltes Segment */
.star-segment--filled {
  background: linear-gradient(
    to bottom,
    rgba(160, 230, 100, 0.75) 0%,
    rgba(82, 184, 48, 1) 25%,
    rgba(46, 122, 26, 1) 55%,
    rgba(82, 184, 48, 1) 78%,
    rgba(160, 230, 100, 0.7) 100%
  );
  box-shadow: inset 0 0 5px rgba(82, 184, 48, 0.3);
  animation: segmentPulse 3.5s ease-in-out infinite;
}

/* Fließendes Streifenmuster im Segment */
.star-segment-flow {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(255, 255, 255, 0.09) 8px,
    rgba(255, 255, 255, 0.03) 12px,
    transparent 20px
  );
  animation: flowMove 2.2s linear infinite;
}

/* Glanz oben im Segment */
.star-segment-gloss {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to bottom, rgba(160, 230, 100, 0.22) 0%, transparent 100%);
  border-radius: 2px 2px 0 0;
  pointer-events: none;
}

@keyframes segmentPulse {
  0%,
  100% {
    box-shadow: inset 0 0 4px rgba(82, 184, 48, 0.15);
  }
  50% {
    box-shadow: inset 0 0 8px rgba(82, 184, 48, 0.35);
  }
}

/* ================================================================
   GROSSE RPG-PROGRESSBAR
   ================================================================ */
.rpg-bar-wrap {
  position: relative;
  width: 100%;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
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
  font-size: 0.72rem;
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
.prestige-wrap {
  display: flex;
  flex-shrink: 0;
}
.prestige-btn {
  width: 100%;
  padding: 4px 12px;
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
