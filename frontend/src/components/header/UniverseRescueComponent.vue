<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { formatNumber } from '@/config/numberFormat'
import {
  MEEP_COUNTUP_STEPS,
  MEEP_COUNTUP_INTERVAL_MS,
  MEEP_RISING_HOLD_MS,
  UNIVERSE_BAR_TICK_PERCENTS,
  UNIVERSE_BAR_DARK_TEXT_FROM_PERCENT,
} from '@/config/constants'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

/** Ab diesem Füllstand liegt die rechtsbündige Zahl auf dem hellen Gold. */
const pctOnFill = computed(
  () => gameStore.universeRescueProgress >= UNIVERSE_BAR_DARK_TEXT_FROM_PERCENT,
)

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

      <div class="header-divider uni-divider" aria-hidden="true"></div>

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
        <div class="rpg-bar-gloss" />
        <!-- Ein einzelner Schräg-Schimmer, der per transform über den Balken
             wandert (GPU) — statt eines dauerhaft laufenden Streifenmusters,
             das als Paint-Animation jede Frame den Header neu zeichnen ließe. -->
        <div class="rpg-bar-sweep" />
      </div>
      <div class="rpg-segments" aria-hidden="true">
        <div
          v-for="tick in UNIVERSE_BAR_TICK_PERCENTS"
          :key="tick"
          class="rpg-segment-line"
          :style="{ left: tick + '%' }"
        />
      </div>
      <div class="rpg-bar-border" />
      <div class="rpg-bar-text">
        <span class="rpg-bar-pct" :class="{ 'rpg-bar-pct--on-fill': pctOnFill }">
          {{ gameStore.universeRescueProgress.toFixed(1) }}%
        </span>
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
  gap: clamp(6px, 0.55vw, 10px);
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

/* Beide Hälften gleich breit (flex-basis 0 + grow 1), Inhalt darin zentriert:
   der Divider steht damit exakt in der Mitte und Galaxie wie Meeps sitzen
   mittig in ihrem Feld. min-width: min-content ist die Reißleine — reicht der
   Platz für eine sehr lange Meep-Zahl nicht, rückt lieber der Divider aus der
   Mitte, als dass die Zahl abgeschnitten wird. */
.uni-tile--galaxy,
.uni-tile--meep {
  flex: 1 1 0;
  justify-content: center;
  min-width: min-content;
}

/* Übernimmt Verlauf und Schimmer von .header-divider (global), nur die
   feste Höhe dort passt nicht: sie ist an die volle Header-Höhe gerechnet
   und würde aus der Kachelzeile in den Balken ragen. */
.uni-divider {
  height: 72%;
  margin-inline: 0;
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
  /* Label über der Zahl zentriert: sonst zieht das breitere Wort die Zahl
     aus der Mitte ihrer Hälfte. */
  align-items: center;
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
  /* Cap bei 26px: bei zwei exakt gleich breiten Hälften ist die Meep-Zahl
     der Engpass — auf 4K bleiben ihr rund 120px, mit 28px liefe sie an. */
  font-size: min(calc(var(--header-height) * 0.28), 26px);
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
  color: var(--rpg-green-border, #6ec040);
  text-shadow: 0 0 10px rgba(110, 192, 64, 0.35);
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
   ROW 2 — Fortschrittsbalken ohne Beschriftung: nur der Prozentwert.
   Was der Balken misst, sagt der Tooltip — im Header zählt die Zahl.
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
    0 0 0 1px rgba(0, 0, 0, 0.65),
    inset 0 1px 5px rgba(0, 0, 0, 0.8);
  background: #0d0904;
  transition: box-shadow 0.25s ease;
}

.rpg-bar-wrap--glow {
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.65),
    0 0 14px rgba(255, 200, 60, 0.5),
    inset 0 1px 5px rgba(0, 0, 0, 0.8);
}

.rpg-bar-border {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  border: 1px solid rgba(200, 144, 64, 0.42);
  pointer-events: none;
  z-index: 3;
}

/* Verlauf jetzt waagerecht in Laufrichtung statt als gewölbte Röhre —
   flacher, ruhiger, und der Balken liest sich als eine Bewegung. */
.rpg-bar-fill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  min-width: 5px;
  border-radius: 3px;
  background: linear-gradient(to right, #b8791c 0%, #e0a828 55%, #f5d666 100%);
  transition: width 1.1s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 1;
}

/* Helle Fortschrittskante: markiert den Stand punktgenau, auch wenn der
   Balken selbst durch die Segmente läuft. */
.rpg-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 2px;
  background: #fff4c8;
  box-shadow: 0 0 8px rgba(255, 230, 140, 0.9);
}

.rpg-bar-gloss {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 42%;
  background: linear-gradient(to bottom, rgba(255, 250, 210, 0.22) 0%, transparent 100%);
  pointer-events: none;
}

.rpg-bar-sweep {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 32%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.28) 50%,
    transparent 100%
  );
  animation: barSweep 4.5s ease-in-out infinite;
  pointer-events: none;
}

/* Zehn gleiche Segmente statt vier Skalenstriche: die Trennlinien liegen
   über dem Füller und geben ihm eine ablesbare Rasterung. */
.rpg-segments {
  position: absolute;
  inset: 2px;
  pointer-events: none;
  z-index: 2;
}

.rpg-segment-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.45);
}

/* Beschriftung als eigene Zeile IM Balken: Name links, Prozent rechts.
   Kein Glow hinter der Schrift — auf dem hellen Goldfüller trägt allein
   der harte dunkle Schlagschatten die Lesbarkeit. */
.rpg-bar-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 clamp(6px, 0.55vw, 10px);
  z-index: 5;
  pointer-events: none;
}

/* Einziger Text im Balken. Ohne Namen daneben darf die Zahl größer stehen —
   sie ist jetzt die Beschriftung. */
.rpg-bar-pct {
  font-size: clamp(11px, calc(var(--header-height) * 0.17), 19px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    color 0.3s ease,
    text-shadow 0.3s ease;
}

/* Auf dem hellen Goldfüller kippt die Schrift ins Dunkle — dieselbe Lösung
   wie beim Forge-Badge im Header, statt Weiß mit Schlagschatten. */
.rpg-bar-pct--on-fill {
  color: #2a1608;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.55);
}

/* Weg in Prozent der EIGENEN Breite (32% des Füllers): von left:-40% bis
   hinter die rechte Kante sind das 140/32 ≈ 437% — so bleibt der Lauf bei
   jedem Füllstand und jeder Auflösung derselbe, ohne px-Annahme. */
@keyframes barSweep {
  0% {
    transform: translateX(0);
  }
  55%,
  100% {
    transform: translateX(437%);
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
  .rpg-bar-sweep,
  .prestige-btn {
    animation: none;
  }
}
</style>
