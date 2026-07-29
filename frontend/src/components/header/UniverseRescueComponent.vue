<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import {
  UNIVERSE_MILESTONE_COUNT,
  UNIVERSE_MILESTONE_STEP_PERCENT,
  UNIVERSE_MILESTONE_FLASH_MS,
} from '@/config/constants'
import UniverseStatsRow from './UniverseStatsRow.vue'
import UniverseRescueTrack from './UniverseRescueTrack.vue'

const gameStore = useGameStore()

/** Wie viele 10%-Abschnitte komplett sind — 0 bis 10. */
const reachedMilestones = computed(() =>
  Math.floor(gameStore.universeRescueProgress / UNIVERSE_MILESTONE_STEP_PERCENT),
)

/* Pip n sitzt auf der Segmentgrenze bei n × 10% — dort, wo auch die
   Trennlinie im Balken steht. Meilenstein und Segmentende sind damit
   dasselbe Ereignis, und der Balken selbst ist die Verbindungslinie. */
const milestoneLeft = (m: number) => `${m * UNIVERSE_MILESTONE_STEP_PERCENT}%`

/** Nur die INNEREN Grenzen tragen eine Raute: bei 0% steht keine, also
    steht auch bei 100% keine — das Balkenende ist der zehnte Meilenstein. */
const milestoneMarkCount = UNIVERSE_MILESTONE_COUNT - 1

const rescueTitle = computed(() =>
  gameStore.prestigeAvailable
    ? 'Universe rescued — prestige into the next universe'
    : `Universe rescue: ${gameStore.universeRescueProgress.toFixed(1)}% — ${reachedMilestones.value}/${UNIVERSE_MILESTONE_COUNT} milestones`,
)

/** Frisch überschrittener Meilenstein — trägt kurz die Burst-Animation. */
const flashMilestone = ref(0)
let flashTimer: ReturnType<typeof setTimeout> | null = null

watch(reachedMilestones, (newVal, oldVal) => {
  if (newVal <= oldVal) return
  if (flashTimer) clearTimeout(flashTimer)
  flashMilestone.value = newVal
  flashTimer = setTimeout(() => (flashMilestone.value = 0), UNIVERSE_MILESTONE_FLASH_MS)
})

const isMeepHovered = ref(false)
const isUniverseBarHovered = ref(false)

/** Meep-Kachel und Fortschrittszeile leuchten gemeinsam auf: der Balken
    zahlt auf die Meeps ein, also zeigt das Hovern der einen die andere mit. */
const isRowGlowing = computed(() => isMeepHovered.value || isUniverseBarHovered.value)

onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<template>
  <div class="uni-block">
    <!-- Row 1: three stat tiles — universe, galaxy, meeps (coarse → fine) -->
    <UniverseStatsRow :lit="isUniverseBarHovered" @meep-hover="isMeepHovered = $event" />

    <!-- Row 2: Universe rescue bar (or prestige button) + milestone marks -->
    <div
      class="rescue-row"
      :class="{ 'rescue-row--glow': isRowGlowing }"
      :title="rescueTitle"
      @mouseenter="isUniverseBarHovered = true"
      @mouseleave="isUniverseBarHovered = false"
    >
      <UniverseRescueTrack :glow="isRowGlowing" />

      <!-- Meilenstein-Marker: eine Raute auf jeder inneren 10%-Grenze, in
           einer eigenen Zeile unter dem Balken. Sie bleiben stehen, wenn der
           Prestige-Button den Balken ablöst — deshalb liegen sie außerhalb
           von UniverseRescueTrack. -->
      <div class="ms-marks" aria-hidden="true">
        <span
          v-for="m in milestoneMarkCount"
          :key="m"
          class="ms-pip"
          :class="{
            'ms-pip--reached': m <= reachedMilestones,
            'ms-pip--next': m === reachedMilestones + 1,
            'ms-pip--flash': m === flashMilestone,
          }"
          :style="{ left: milestoneLeft(m) }"
        />
      </div>
    </div>
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
  /* Ein Maßsatz für Zeile 2 — Balken und Meilenstein-Rauten. Die Rauten
     sitzen mittig auf der Balken-Unterkante, Zeile 2 ist also nur um ihre
     halbe Diagonale höher als der Balken. Der Prestige-Button rechnet
     daraus dieselbe Gesamthöhe, damit beim Umschalten nichts springt. */
  --rescue-track-h: max(16px, min(calc(var(--header-height) * 0.26), 30px));
  /* Eine Stufe kleiner, seit die Rauten ganz unter dem Balken sitzen: sie
     kosten jetzt ihre VOLLE Diagonale an Höhe statt der halben. */
  --ms-pip-size: max(6px, min(calc(var(--header-height) * 0.07), 9px));
  /* Halbe Diagonale der um 45° gedrehten Raute: size × √2 / 2. */
  --ms-pip-half: calc(var(--ms-pip-size) * 0.71);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(2px, 0.25vw, 6px);
  width: 100%;
  height: var(--header-height);
  /* Seitlich die halbe Rautendiagonale: der Marker bei 100% sitzt auf der
     rechten Balkenkante und ragt sonst in den (clippenden) Portal-Wrap. */
  padding: clamp(3px, 0.28vw, 6px) var(--ms-pip-half) clamp(3px, 0.3vw, 6px);
  box-sizing: border-box;
  min-width: 0;
}

/* ================================================================
   ROW 2 — Fortschrittszeile: das Feld für Balken bzw. Prestige-Button
   (UniverseRescueTrack) plus die Meilenstein-Rauten darunter. Was der
   Balken misst, sagt der Tooltip dieser Zeile.
   ================================================================ */
.rescue-row {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  /* Platz für die Meilenstein-Rauten unter dem Balken — die einzige Höhe,
     die Zeile 2 über den Balken hinaus noch braucht. */
  padding-bottom: calc(var(--ms-pip-half) * 2);
  /* Ohne das Shrink-Verbot staucht der Flex-Container den Balken auf Full HD
     um die letzten Pixel zusammen, statt die Kachelzeile atmen zu lassen. */
  flex-shrink: 0;
}

/* ================================================================
   MILESTONE MARKS — zehn Rauten auf der unteren Balkenkante, je eine
   pro 10%-Abschnitt und exakt dort, wo im Balken die Segmenttrennlinie
   steht: Meilenstein n = Segment n versiegelt. Die Verbindungslinie
   ist der Balken selbst, eine eigene Schiene darunter entfällt.
   ================================================================ */
.ms-marks {
  position: absolute;
  /* Deckungsgleich mit den Segmentlinien im Balken (dort inset: 2px),
     damit Raute und Trennlinie auf derselben Achse sitzen. */
  left: 2px;
  right: 2px;
  /* Um die halbe Diagonale unter die Balkenkante: die Rauten sitzen damit
     vollständig UNTER dem Balken und lassen seine Innenfläche frei für die
     mittige Prozentzahl, statt ihr von unten in die Zeile zu ragen. */
  top: calc(var(--rescue-track-h) + var(--ms-pip-half));
  height: 0;
  z-index: 6;
  pointer-events: none;
}

/* Raute statt Punkt: greift die Rahmen-Nieten des Headers auf und bleibt
   auch bei 7px noch als Form erkennbar. */
.ms-pip {
  position: absolute;
  top: 0;
  width: var(--ms-pip-size);
  height: var(--ms-pip-size);
  border-radius: 1px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: #14100a;
  border: 1px solid rgba(200, 144, 64, 0.42);
  box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.9);
  transition:
    background 0.35s ease,
    border-color 0.35s ease,
    box-shadow 0.35s ease,
    transform 0.35s ease;
}

.ms-pip--reached {
  background: linear-gradient(135deg, #f7dd82 0%, #e0a828 45%, #a86c14 100%);
  border-color: #ffedb0;
  box-shadow:
    0 0 7px rgba(245, 214, 102, 0.65),
    inset 0 0 2px rgba(255, 255, 255, 0.8);
}

/* Der Pip, auf den gerade hingearbeitet wird, atmet leise — er zeigt das
   nächste Ziel, ohne mit den erreichten zu konkurrieren. */
.ms-pip--next {
  border-color: rgba(232, 192, 64, 0.75);
  animation: msNextBreathe 2.6s ease-in-out infinite;
}

.rescue-row--glow .ms-pip--reached {
  box-shadow:
    0 0 11px rgba(255, 226, 130, 0.9),
    inset 0 0 2px rgba(255, 255, 255, 0.85);
}

/* Frisch erreicht: ein einmaliger Puls plus aufgehender Ring — der Moment
   soll im Augenwinkel auffallen, ohne den Header dauerhaft zu animieren. */
.ms-pip--flash {
  animation: msPop 1.6s ease-out 1;
}

.ms-pip--flash::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 2px;
  border: 1px solid rgba(255, 232, 150, 0.9);
  animation: msRing 1.6s ease-out 1 forwards;
  pointer-events: none;
}

@keyframes msNextBreathe {
  0%,
  100% {
    box-shadow:
      0 0 3px rgba(232, 192, 64, 0.25),
      inset 0 0 3px rgba(0, 0, 0, 0.9);
  }
  50% {
    box-shadow:
      0 0 8px rgba(232, 192, 64, 0.6),
      inset 0 0 3px rgba(0, 0, 0, 0.9);
  }
}

@keyframes msPop {
  0% {
    transform: translate(-50%, -50%) rotate(45deg) scale(1);
  }
  25% {
    transform: translate(-50%, -50%) rotate(45deg) scale(1.55);
  }
  60% {
    transform: translate(-50%, -50%) rotate(45deg) scale(1.1);
  }
  100% {
    transform: translate(-50%, -50%) rotate(45deg) scale(1);
  }
}

@keyframes msRing {
  0% {
    transform: scale(1);
    opacity: 0.95;
  }
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
}

/* Kachelzeile, Balken und Button bringen ihre eigene Reduced-Motion-
   Behandlung in UniverseStatsRow bzw. UniverseRescueTrack mit. */
@media (prefers-reduced-motion: reduce) {
  .ms-pip--next,
  .ms-pip--flash,
  .ms-pip--flash::after {
    animation: none;
  }
}
</style>
