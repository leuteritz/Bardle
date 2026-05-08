<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat'

const gameStore = useGameStore()

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
    <!-- ── Obere Zeile: Meep-Icon + Zahl  |  Trennlinie  |  % ── -->
    <div class="stats-row">
      <!-- Meep-Block -->
      <div class="meep-block" :class="{ 'meep-block--rising': isIncreasing }">
        <img src="/img/BardAbilities/BardMeep.png" class="meep-icon" alt="Meeps" />
        <div class="meep-text">
          <span class="meep-value" :class="{ 'meep-value--rising': isIncreasing }">
            {{ formatNumber(displayMeeps) }}
          </span>
        </div>
      </div>

      <div class="divider" aria-hidden="true" />

      <!-- Prozent-Block -->
      <div class="percent-block">
        <span class="percent-value">{{ gameStore.universeRescueProgress.toFixed(1) }}</span>
        <span class="percent-sym">%</span>
      </div>
    </div>

    <!-- ── Große RPG-Progressbar ── -->
    <div class="rpg-bar-wrap">
      <!-- Innenrahmen-Dekor -->
      <div class="rpg-bar-border" />

      <!-- Füll-Balken -->
      <div class="rpg-bar-fill" :style="{ width: gameStore.universeRescueProgress + '%' }">
        <div class="rpg-bar-flow" />
        <div class="rpg-bar-gloss" />
      </div>

      <!-- Tick-Markierungen -->
      <div class="rpg-ticks" aria-hidden="true">
        <div class="rpg-tick" style="left: 25%" />
        <div class="rpg-tick" style="left: 50%" />
        <div class="rpg-tick" style="left: 75%" />
      </div>
    </div>

    <!-- ── Prestige Button ── -->
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
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 8px 14px;
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
}

/* ── Meep-Block ────────────────────────────── */
.meep-block {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  transition: filter 0.3s;
}
.meep-block--rising {
  filter: drop-shadow(0 0 7px rgba(251, 146, 60, 0.55));
}

.meep-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 7px rgba(251, 146, 60, 0.75));
  transition:
    transform 0.2s,
    filter 0.3s;
  user-select: none;
}
.meep-icon:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 13px rgba(251, 146, 60, 1));
}

.meep-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.meep-value {
  font-size: 1.5rem;
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
    0 0 14px rgba(251, 146, 60, 0.85),
    0 0 28px rgba(251, 146, 60, 0.4);
}

/* ── Trennlinie ────────────────────────────── */
.divider {
  flex-shrink: 0;
  width: 1px;
  height: 32px;
  margin-inline: 12px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(255, 200, 80, 0.3) 25%,
    rgba(255, 200, 80, 0.3) 75%,
    transparent
  );
}

/* ── Prozent-Block ─────────────────────────── */
.percent-block {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}

.percent-value {
  font-size: 1.85rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
  letter-spacing: -0.02em;
  text-shadow:
    0 0 12px rgba(255, 200, 0, 0.6),
    0 0 28px rgba(255, 200, 0, 0.2);
}
.percent-sym {
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(232, 192, 64, 0.6);
  line-height: 1;
}

/* ================================================================
   GROSSE RPG-PROGRESSBAR
   ================================================================ */
.rpg-bar-wrap {
  position: relative;
  width: 100%;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  /* RPG-typischer vertiefter Rahmen */
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 0 0 2px rgba(255, 200, 60, 0.22),
    inset 0 2px 8px rgba(0, 0, 0, 0.65);
  background: rgba(8, 4, 0, 0.7);
}

.rpg-bar-border {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  border: 1px solid rgba(255, 200, 60, 0.28);
  pointer-events: none;
  z-index: 3;
}

/* Füll-Balken */
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

/* Fließendes Streifenmuster */
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

/* Glanz oben */
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

/* Tick-Markierungen */
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
