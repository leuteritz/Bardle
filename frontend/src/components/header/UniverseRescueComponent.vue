<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { formatNumber } from '@/config/numberFormat'
import {
  MEEP_COUNTUP_STEPS,
  MEEP_COUNTUP_INTERVAL_MS,
  MEEP_RISING_HOLD_MS,
  UNIVERSE_BAR_TICK_PERCENTS,
} from '@/config/constants'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

const isMeepHovered = ref(false)
const isUniverseBarHovered = ref(false)

const displayMeeps = ref(gameStore.meeps)
const isIncreasing = ref(false)

// Ein einziger laufender Tween: ohne das Aufräumen stapeln sich bei mehreren
// Meep-Gewinnen kurz hintereinander die Intervalle und zählen gegeneinander.
let countUpTimer: ReturnType<typeof setInterval> | null = null
let risingTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => gameStore.meeps,
  (newVal, oldVal) => {
    if (countUpTimer) clearInterval(countUpTimer)
    if (risingTimer) clearTimeout(risingTimer)
    isIncreasing.value = newVal > oldVal
    const stepSize = (newVal - oldVal) / MEEP_COUNTUP_STEPS
    let current = oldVal
    let i = 0
    countUpTimer = setInterval(() => {
      i++
      current += stepSize
      displayMeeps.value = Math.round(i < MEEP_COUNTUP_STEPS ? current : newVal)
      if (i >= MEEP_COUNTUP_STEPS) {
        if (countUpTimer) clearInterval(countUpTimer)
        countUpTimer = null
        risingTimer = setTimeout(() => (isIncreasing.value = false), MEEP_RISING_HOLD_MS)
      }
    }, MEEP_COUNTUP_INTERVAL_MS)
  },
)

onUnmounted(() => {
  if (countUpTimer) clearInterval(countUpTimer)
  if (risingTimer) clearTimeout(risingTimer)
})
</script>

<template>
  <div class="uni-block">
    <!-- Row 1: two stat tiles — galaxy (fixed) and meeps (fills the rest) -->
    <div class="uni-stats">
      <div class="uni-tile uni-tile--galaxy" title="Current galaxy">
        <img src="/img/galaxy-far.png" class="tile-icon gx-icon" alt="" aria-hidden="true" />
        <div class="tile-text">
          <span class="tile-label">Galaxy</span>
          <span class="tile-value gx-value">{{ galaxyStore.currentGalaxy }}</span>
        </div>
      </div>

      <div
        class="uni-tile uni-tile--meep"
        :class="{ 'uni-tile--rising': isIncreasing, 'uni-tile--lit': isUniverseBarHovered }"
        title="Meeps — spend them in the Skill Tree"
        @mouseenter="isMeepHovered = true"
        @mouseleave="isMeepHovered = false"
      >
        <img
          src="/img/BardAbilities/BardMeep.png"
          class="tile-icon meep-icon"
          alt=""
          aria-hidden="true"
        />
        <div class="tile-text">
          <span class="tile-label">Meeps</span>
          <span class="tile-value meep-value">{{ formatNumber(displayMeeps) }}</span>
        </div>
      </div>
    </div>

    <!-- Row 2: Universe rescue bar (or prestige button) -->
    <div
      v-if="!gameStore.prestigeAvailable"
      class="rpg-bar-wrap"
      :class="{ 'rpg-bar-wrap--glow': isMeepHovered || isUniverseBarHovered }"
      :title="`Universe rescue progress: ${gameStore.universeRescueProgress.toFixed(1)}%`"
      @mouseenter="isUniverseBarHovered = true"
      @mouseleave="isUniverseBarHovered = false"
    >
      <div class="rpg-bar-fill" :style="{ width: gameStore.universeRescueProgress + '%' }">
        <div class="rpg-bar-flow" />
        <div class="rpg-bar-gloss" />
      </div>
      <!-- Pulsierender Schein als eigene Ebene NEBEN dem Füllbalken: als Kind
           würde ihn dessen overflow:hidden abschneiden, und als animiertes
           box-shadow am Balken selbst wäre es eine Paint-Animation, die jede
           Frame die ganze Seite neu zeichnen lässt. Hier atmet nur opacity.
           Steht nach dem Balken, damit auch der innere Schimmer auf ihm liegt;
           die Skalenstriche (z-index 2) bleiben darüber. -->
      <div
        class="rpg-bar-glow"
        aria-hidden="true"
        :style="{ width: gameStore.universeRescueProgress + '%' }"
      />
      <div class="rpg-ticks" aria-hidden="true">
        <div
          v-for="tick in UNIVERSE_BAR_TICK_PERCENTS"
          :key="tick"
          class="rpg-tick"
          :style="{ left: tick + '%' }"
        />
      </div>
      <div class="rpg-bar-border" />
      <div class="rpg-bar-text">
        <span class="rpg-bar-name">Universe Rescue</span>
        <span class="rpg-bar-pct">{{ gameStore.universeRescueProgress.toFixed(1) }}%</span>
      </div>
    </div>
    <button v-else class="prestige-btn" @click.stop="gameStore.openPrestigeModal()">
      <span class="prestige-star">✦</span>
      Prestige
      <span class="prestige-star">✦</span>
    </button>
  </div>
</template>

<style scoped>
/* ================================================================
   ROOT — two stat tiles over the universe rescue bar.
   Alle Maße hängen an --header-height (wie SunPhaseIndicator): der
   Header ist höhengetrieben, seine Breite deckelt bei 1400px. So
   wachsen Zahlen und Balken von Full HD bis 4K sichtbar mit.
   ================================================================ */
.uni-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(3px, 0.35vw, 7px);
  width: 100%;
  height: var(--header-height);
  padding: clamp(3px, 0.3vw, 6px) 2px clamp(4px, 0.4vw, 7px);
  box-sizing: border-box;
  min-width: 0;
}

/* ================================================================
   ROW 1 — stat tiles
   ================================================================ */
.uni-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(8px, 0.8vw, 16px);
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
}

/* Rahmenlos: die Gruppen tragen sich über Icon, Label und Abstand — keine
   Platte, kein eigener Hintergrund. Der Header-Grund bleibt durchgehend. */
.uni-tile {
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.4vw, 7px);
  min-width: 0;
  transition: filter 0.3s;
}

/* Galaxie links, Meeps rechtsbündig an der Balkenkante — der Abstand
   dazwischen trennt die beiden Werte, statt eines Rahmens. */
.uni-tile--galaxy,
.uni-tile--meep {
  flex: 0 1 auto;
}

.uni-tile--rising {
  filter: drop-shadow(0 0 7px rgba(251, 146, 60, 0.5));
}

.tile-icon {
  width: min(calc(var(--header-height) * 0.36), 40px);
  height: min(calc(var(--header-height) * 0.36), 40px);
  min-width: 22px;
  min-height: 22px;
  object-fit: contain;
  flex-shrink: 0;
  user-select: none;
  transform: translateZ(0);
  will-change: transform;
  transition:
    transform 0.2s,
    filter 0.3s;
}

.tile-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1px;
  min-width: 0;
}

.tile-label {
  font-size: clamp(9px, calc(var(--header-height) * 0.125), 12px);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  color: #9b8461;
}

.tile-value {
  /* Ohne Kachelrahmen ist Breite frei — die Zahlen dürfen entsprechend
     größer stehen, ohne dass die Meep-Zahl auf 4K anstößt. */
  font-size: min(calc(var(--header-height) * 0.28), 28px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition:
    color 0.3s,
    text-shadow 0.3s;
}

/* ── Galaxy ────────────────────────────────────────── */
.gx-icon {
  filter: drop-shadow(0 0 5px rgba(138, 100, 220, 0.45));
}

.uni-tile--galaxy:hover .gx-icon {
  transform: scale(1.08) translateZ(0);
  filter: drop-shadow(0 0 10px rgba(138, 100, 220, 0.9));
}

.gx-value {
  color: #c9b6ff;
  text-shadow: 0 0 10px rgba(138, 100, 220, 0.45);
}

/* ── Meeps ─────────────────────────────────────────── */
.meep-icon {
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.7));
  animation: meep-pulse 3s ease-in-out infinite;
}

.uni-tile--meep:hover .meep-icon {
  transform: scale(1.08) translateZ(0);
  filter: drop-shadow(0 0 12px rgba(251, 146, 60, 1));
}

.meep-value {
  color: #fed7aa;
  text-shadow: 0 0 8px rgba(251, 146, 60, 0.35);
}

.uni-tile--rising .meep-value,
.uni-tile--lit .meep-value {
  color: #fdba74;
  text-shadow:
    0 0 12px rgba(251, 146, 60, 0.85),
    0 0 24px rgba(251, 146, 60, 0.4);
}

.uni-tile--lit .meep-icon {
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.9));
  transform: scale(1.04) translateZ(0);
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
   ROW 2 — RPG progress bar, Beschriftung links / Prozent rechts
   ================================================================ */
.rpg-bar-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  height: min(calc(var(--header-height) * 0.26), 30px);
  min-height: 16px;
  /* Ohne das Shrink-Verbot staucht der Flex-Container den Balken auf Full HD
     um die letzten Pixel zusammen, statt die Kachelzeile atmen zu lassen. */
  flex-shrink: 0;
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
  border-radius: 4px;
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
  box-shadow:
    0 0 8px rgba(255, 215, 0, 0.35),
    inset 0 0 6px rgba(255, 215, 0, 0.1);
  overflow: hidden;
  z-index: 1;
}

/* Deckungsgleich mit .rpg-bar-fill, trägt aber nur den hellen Puls-Zustand */
.rpg-bar-glow {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  min-width: 6px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 1;
  transition: width 1.1s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 0 20px rgba(255, 215, 0, 0.6),
    inset 0 0 10px rgba(255, 215, 0, 0.2);
  opacity: 0;
  animation: barPulse 3.5s ease-in-out infinite;
}

/* Der Streifenlauf wandert per transform statt per background-position:
   background-position ist eine Paint-Property, transform läuft auf der GPU.
   Das Element ragt um eine Musterlänge (72px) nach links über den Balken,
   overflow:hidden am Balken schneidet den Überstand sauber ab. */
.rpg-bar-flow {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -72px;
  right: 0;
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
  top: 22%;
  bottom: 22%;
  width: 1px;
  background: rgba(255, 215, 0, 0.2);
}

/* Beschriftung als eigene Zeile IM Balken: Name links, Prozent rechts.
   Kein Glow hinter der Schrift — auf dem hellen Goldfüller trägt allein
   der harte dunkle Schlagschatten die Lesbarkeit. */
.rpg-bar-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 clamp(5px, 0.5vw, 9px);
  z-index: 5;
  pointer-events: none;
}

.rpg-bar-name {
  font-size: clamp(9px, calc(var(--header-height) * 0.13), 14px);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.rpg-bar-pct {
  font-size: clamp(10px, calc(var(--header-height) * 0.155), 17px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  flex-shrink: 0;
}

@keyframes barPulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@keyframes flowMove {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(72px);
  }
}

/* ================================================================
   PRESTIGE BUTTON — belegt exakt die Balkenzeile, damit das Layout
   beim Umschalten nicht springt.
   ================================================================ */
.prestige-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(5px, 0.5vw, 10px);
  width: 100%;
  height: min(calc(var(--header-height) * 0.26), 30px);
  min-height: 16px;
  flex-shrink: 0;
  padding: 0 8px;
  font-size: clamp(10px, calc(var(--header-height) * 0.145), 16px);
  font-weight: 800;
  letter-spacing: 0.16em;
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

.prestige-star {
  color: #ffd980;
  line-height: 1;
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

@media (prefers-reduced-motion: reduce) {
  .meep-icon,
  .rpg-bar-glow,
  .rpg-bar-flow,
  .prestige-btn {
    animation: none;
  }
}
</style>
