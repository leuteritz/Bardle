<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { formatNumber } from '@/config/numberFormat'
import { universes } from '@/config/universes'
import { toRoman } from '@/utils/format'
import {
  HEADER_UNIVERSE_ICON,
  MEEP_COUNTUP_STEPS,
  MEEP_COUNTUP_INTERVAL_MS,
  MEEP_RISING_HOLD_MS,
  UNIVERSE_MILESTONE_COUNT,
  UNIVERSE_MILESTONE_STEP_PERCENT,
  UNIVERSE_MILESTONE_FLASH_MS,
} from '@/config/constants'
import UniverseRescueTrack from './UniverseRescueTrack.vue'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

/** Römisch statt arabisch: die Universe-Ebene steht damit sichtbar über der
    Galaxie-Zählung und bleibt selbst bei XII kurz genug für die Kachel. */
const universeRoman = computed(() => toRoman(gameStore.currentUniverse))

const universeTitle = computed(() => {
  const name = universes[gameStore.currentUniverse - 1]?.name ?? 'Unknown'
  return `Universe ${universeRoman.value} — ${name} (${gameStore.currentUniverse}/${gameStore.totalUniverses})`
})

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
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<template>
  <div class="uni-block">
    <!-- Row 1: three stat tiles — universe, galaxy, meeps (coarse → fine) -->
    <div class="uni-stats">
      <div class="uni-tile uni-tile--universe" :title="universeTitle">
        <Icon
          :icon="HEADER_UNIVERSE_ICON"
          width="24"
          height="24"
          class="tile-icon uv-icon"
          aria-hidden="true"
        />
        <div class="tile-text">
          <span v-ink-center class="tile-label">Uni</span>
          <span v-ink-center class="tile-value uv-value">{{ universeRoman }}</span>
        </div>
      </div>

      <div class="uni-tile uni-tile--galaxy" title="Current galaxy">
        <img src="/img/galaxy-far-128.png" class="tile-icon gx-icon" alt="" aria-hidden="true" />
        <div class="tile-text">
          <span v-ink-center class="tile-label">Gal</span>
          <span v-ink-center class="tile-value gx-value">{{ galaxyStore.currentGalaxy }}</span>
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
          <span v-ink-center class="tile-label">Meep</span>
          <span v-ink-center class="tile-value meep-value">{{ formatNumber(displayMeeps) }}</span>
        </div>
      </div>
    </div>

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
   ROW 1 — stat tiles
   ================================================================ */
/* Maße wieder an --header-height statt an cqw: mit den Breiten-Caps auf
   Tree-Button (72px) und Sun-Phase (118px) und ohne die beiden Divider
   bleibt dieser Block über alle Desktop-Auflösungen bei ~290px, statt von
   Full HD zu 4K um 25px zu schrumpfen. cqw hätte die Kacheln damit mit
   steigender Auflösung KLEINER gemacht — die Header-Höhe wächst dagegen
   mit, und genau ihr folgen Icon, Label und Zahl jetzt. */
.uni-stats {
  display: flex;
  align-items: center;
  /* Die drei Gruppen sind inhaltsbreit (flex-grow 0), der Restraum wird
     zwischen ihnen gleich verteilt: die Lücke Universe↔Galaxy ist damit
     exakt so groß wie Galaxy↔Meeps, egal wie unterschiedlich lang die
     Werte gerade sind. Mit grow würde die breiteste Kachel ihren Inhalt
     zentrieren und die Lücke daneben optisch aufblähen. */
  justify-content: space-between;
  /* Untergrenze für den Fall, dass die Werte die Zeile ganz ausfüllen. */
  gap: clamp(6px, 0.5vw, 10px);
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
}

/* Rahmenlos: die Gruppen tragen sich über Icon, Label und Abstand — keine
   Platte, kein eigener Hintergrund. Der Header-Grund bleibt durchgehend. */
/* Innenabstand knapper als der Abstand ZWISCHEN den Kacheln (.uni-stats
   gap): seit die Divider weg sind, trägt allein dieses Verhältnis die
   Gruppierung — und die gesparten Pixel gehen an die Meep-Zahl, die als
   einzige nach oben offen ist. */
.uni-tile {
  display: flex;
  align-items: center;
  gap: clamp(2px, 0.2vw, 4px);
  min-width: 0;
  transition: filter 0.3s;
}

/* Kein grow: jede Gruppe ist genau so breit wie ihr Inhalt, den Rest
   verteilt space-between gleichmäßig dazwischen. Universe und Galaxy sind
   per min-content gegen Kürzung geschützt — "VIII" und dreistellige
   Galaxien sind die längsten Fälle und beide endlich. */
.uni-tile--universe,
.uni-tile--galaxy {
  flex: 0 1 auto;
  min-width: min-content;
}

/* Meeps bewusst OHNE min-content: die Zahl ist nach oben offen und würde
   die Zeile sonst über den Block hinausschieben, wo der Portal-Wrap sie
   hart clippt. Ellipsis am eigenen Wert ist der bessere Ausfall. */
.uni-tile--meep {
  flex: 0 1 auto;
  min-width: 0;
}

.uni-tile--rising {
  filter: drop-shadow(0 0 7px rgba(251, 146, 60, 0.5));
}

/* Cap bei 26px: darüber frisst das Icon genau die Breite, die "VIII" bzw.
   die Meep-Zahl daneben zum Wachsen braucht — siehe .tile-value. */
.tile-icon {
  width: min(calc(var(--header-height) * 0.3), 26px);
  height: min(calc(var(--header-height) * 0.3), 26px);
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
  gap: 2px;
  min-width: 0;
}

.tile-label {
  /* Dreibuchstabig ("Uni"/"Gal"/"Meep"): ausgeschrieben bestimmte "Universe"
     mit 45px die min-content-Breite seiner Kachel und deckelte damit die
     Zahl darunter — jetzt gibt die Zahl das Maß vor, nicht das Label. */
  font-size: min(calc(var(--header-height) * 0.13), 12px);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  color: #9b8461;
}

.tile-value {
  /* Cap 24px aus der Messung: bei ~290px Blockbreite passt "999.9M" in die
     Meep-Kachel und "XII" in die Universe-Kachel gerade noch ungekürzt —
     eine Stufe größer und beide ellipsieren. */
  font-size: min(calc(var(--header-height) * 0.28), 24px);
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

/* ── Universe ──────────────────────────────────────── */
/* Amethyst statt Gold: greift die Prestige-Palette des Buttons darunter auf,
   damit die drei Kacheln je eine eigene Farbe tragen (violett / grün / orange). */
.uv-icon {
  color: #b98cf5;
  filter: drop-shadow(0 0 5px rgba(150, 96, 235, 0.5));
}

.uni-tile--universe:hover .uv-icon {
  transform: scale(1.08) translateZ(0);
  filter: drop-shadow(0 0 10px rgba(150, 96, 235, 0.95));
}

.uv-value {
  color: #d7bcff;
  text-shadow: 0 0 10px rgba(150, 96, 235, 0.4);
  /* Römische Ziffern: etwas mehr Laufweite, sonst kleben I und I aneinander. */
  letter-spacing: 0.06em;
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

/* Balken, Button und ihr Übergang bringen ihre eigene Reduced-Motion-
   Behandlung in UniverseRescueTrack mit. */
@media (prefers-reduced-motion: reduce) {
  .meep-icon,
  .ms-pip--next,
  .ms-pip--flash,
  .ms-pip--flash::after {
    animation: none;
  }
}
</style>
