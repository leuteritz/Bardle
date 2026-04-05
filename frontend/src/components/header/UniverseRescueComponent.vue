<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat'

const gameStore = useGameStore()

// Animierter Meep-Zähler (aus MeepIndicatorComponent übernommen)
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
    <!-- ── Obere Info-Zeile: Meep links | Prozent rechts ── -->
    <div class="panel-top">
      <!-- Meep-Block -->
      <div class="meep-block" :class="{ 'meep-block--rising': isIncreasing }">
        <div class="meep-icon-wrap" aria-hidden="true">
          <div class="meep-halo" />
          <img src="/img/BardAbilities/BardMeep.png" class="meep-icon" alt="Meeps" />
        </div>
        <span class="meep-value" :class="{ 'meep-value--rising': isIncreasing }">
          {{ formatNumber(displayMeeps) }}
        </span>
      </div>

      <!-- Trennlinie Mitte -->
      <div class="top-divider" aria-hidden="true" />

      <!-- Prozent-Block -->
      <div class="percent-block">
        <span class="percent-label">Universe</span>
        <span class="portal-percent">{{ gameStore.universeRescueProgress.toFixed(1) }}%</span>
      </div>
    </div>

    <!-- ── Progress Tube ── -->
    <div class="portal-tube">
      <div class="tube-bg" />
      <div class="tube-fill" :style="{ width: gameStore.universeRescueProgress + '%' }"></div>
      <div class="tube-shimmer" :style="{ width: gameStore.universeRescueProgress + '%' }" />
      <div class="tube-highlight" />
      <div class="tube-track-marks">
        <div class="track-mark" style="left: 25%" />
        <div class="track-mark" style="left: 50%" />
        <div class="track-mark" style="left: 75%" />
      </div>
    </div>

    <!-- ── Prestige Button ── -->
    <div v-if="gameStore.prestigeAvailable" class="prestige-wrap">
      <button class="prestige-btn-sm" @click.stop="gameStore.openPrestigeModal()">
        ✦ PRESTIGE ✦
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ================================================================
   PANEL – Wrapper, füllt die volle Header-Höhe des Containers
   ================================================================ */
.universe-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 7px 11px 8px;
  /* kein background, border, border-radius, box-shadow – der Header übernimmt das */
}

/* ================================================================
   OBERE INFO-ZEILE
   ================================================================ */
.panel-top {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
}

/* ── Meep-Block (links) ─────────────────────────── */
.meep-block {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  transition: filter 0.3s;
}

.meep-block--rising {
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.45));
}

.meep-icon-wrap {
  position: relative;
  flex-shrink: 0;
}

.meep-halo {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.22) 0%, transparent 70%);
  pointer-events: none;
}

.meep-icon {
  position: relative;
  display: block;
  width: 34px;
  height: 34px;
  object-fit: contain;
  user-select: none;
  filter: drop-shadow(0 0 7px rgba(251, 146, 60, 0.7));
  transition:
    transform 0.2s,
    filter 0.3s;
  z-index: 1;
}

.meep-icon:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 11px rgba(251, 146, 60, 0.95));
}

.meep-value {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fed7aa;
  text-shadow: 0 0 6px rgba(251, 146, 60, 0.28);
  transition:
    color 0.3s,
    text-shadow 0.3s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meep-value--rising {
  color: #fdba74;
  text-shadow:
    0 0 12px rgba(251, 146, 60, 0.8),
    0 0 24px rgba(251, 146, 60, 0.35);
}

/* ── Trennlinie Mitte ───────────────────────────── */
.top-divider {
  flex-shrink: 0;
  width: 1px;
  height: 22px;
  margin-inline: 8px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(255, 200, 80, 0.25) 30%,
    rgba(255, 200, 80, 0.25) 70%,
    transparent
  );
  border-radius: 1px;
}

/* ── Prozent-Block (rechts) ─────────────────────── */
.percent-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
}

.percent-label {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(232, 192, 64, 0.5);
  line-height: 1;
}

.portal-percent {
  font-size: 1.05rem;
  font-weight: 700;
  color: #e8c040;
  line-height: 1;
  text-shadow: 0 0 10px rgba(255, 200, 0, 0.55);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ================================================================
   PROGRESS TUBE
   ================================================================ */
.portal-tube {
  position: relative;
  width: 100%;
  height: 18px;
  border-radius: 5px;
  overflow: hidden;
  flex-shrink: 0;
}

.tube-bg {
  position: absolute;
  inset: 0;
  background: rgba(10, 5, 0, 0.55);
  border: 1px solid rgba(255, 215, 0, 0.22);
  border-radius: 5px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
}

.tube-fill {
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  min-width: 4px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 235, 120, 0.7) 0%,
    rgba(255, 195, 20, 0.95) 30%,
    rgba(210, 140, 0, 1) 55%,
    rgba(255, 195, 20, 0.95) 75%,
    rgba(255, 235, 120, 0.65) 100%
  );
  box-shadow:
    0 0 12px rgba(255, 215, 0, 0.55),
    inset 0 0 6px rgba(255, 215, 0, 0.2);
  transition: width 1s ease;
  animation: tubePulse 3s ease-in-out infinite;
  overflow: hidden;
}

.tube-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(255, 215, 0, 0.12) 12px,
    rgba(255, 215, 0, 0.05) 20px,
    transparent 32px
  );
  animation: tubeFlow 2.5s linear infinite;
}

.tube-shimmer {
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  border-radius: 0 3px 3px 0;
  transition: width 0.7s ease;
  background: linear-gradient(to right, rgba(255, 200, 0, 0.04), rgba(255, 230, 80, 0.2));
  pointer-events: none;
}

.tube-highlight {
  position: absolute;
  left: 1px;
  right: 1px;
  top: 1px;
  height: 40%;
  background: linear-gradient(to bottom, rgba(255, 230, 130, 0.1) 0%, transparent 100%);
  border-radius: 4px 4px 0 0;
  pointer-events: none;
}

.tube-track-marks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.track-mark {
  position: absolute;
  top: 18%;
  bottom: 18%;
  width: 1px;
  background: rgba(255, 215, 0, 0.14);
}

@keyframes tubePulse {
  0%,
  100% {
    box-shadow:
      0 0 10px rgba(255, 215, 0, 0.4),
      inset 0 0 6px rgba(255, 215, 0, 0.12);
    opacity: 0.88;
  }
  50% {
    box-shadow:
      0 0 22px rgba(255, 215, 0, 0.65),
      inset 0 0 12px rgba(255, 215, 0, 0.25);
    opacity: 1;
  }
}

@keyframes tubeFlow {
  from {
    background-position-x: 0px;
  }
  to {
    background-position-x: 64px;
  }
}

/* ================================================================
   PRESTIGE BUTTON
   ================================================================ */
.prestige-wrap {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.prestige-btn-sm {
  padding: 3px 12px;
  width: 100%;
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #3a1870 0%, #5e2fa0 40%, #c08030 100%);
  color: #fff;
  border: 1px solid rgba(200, 150, 60, 0.65);
  border-radius: 4px;
  cursor: pointer;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  animation: prestigeGlow 2.5s ease-in-out infinite;
}

.prestige-btn-sm:hover {
  transform: scale(1.03);
}
.prestige-btn-sm:active {
  transform: scale(0.96);
}

@keyframes prestigeGlow {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(200, 144, 64, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(200, 144, 64, 0.7);
  }
}
</style>
