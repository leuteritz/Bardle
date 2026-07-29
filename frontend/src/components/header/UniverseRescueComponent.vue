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
  UNIVERSE_BAR_TICK_PERCENTS,
  UNIVERSE_BAR_FILL_INSET_PX,
  UNIVERSE_MILESTONE_COUNT,
  UNIVERSE_MILESTONE_STEP_PERCENT,
  UNIVERSE_MILESTONE_FLASH_MS,
} from '@/config/constants'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

/** Römisch statt arabisch: die Universe-Ebene steht damit sichtbar über der
    Galaxie-Zählung und bleibt selbst bei XII kurz genug für die Kachel. */
const universeRoman = computed(() => toRoman(gameStore.currentUniverse))

const universeTitle = computed(() => {
  const name = universes[gameStore.currentUniverse - 1]?.name ?? 'Unknown'
  return `Universe ${universeRoman.value} — ${name} (${gameStore.currentUniverse}/${gameStore.totalUniverses})`
})

const pctText = computed(() => `${gameStore.universeRescueProgress.toFixed(1)}%`)

/* Die Zahl steht mittig im Balken und wird beim Füllen von der Goldkante
   überlaufen — eine einzelne Textfarbe ist dann zwangsläufig irgendwann
   falsch. Statt einer Umschaltschwelle liegen zwei identisch positionierte
   Ebenen übereinander: hell für den dunklen Track, dunkel für den Füller.
   Die dunkle wird exakt an der Füllkante abgeschnitten, sodass jedes Zeichen
   — und bei halb überlaufener Zahl jede Zeichenhälfte — die Farbe trägt, die
   auf ihrem Untergrund lesbar ist. */
const fillClipStyle = computed(() => ({
  clipPath: `inset(0 max(0px, calc(100% - ${gameStore.universeRescueProgress}% - ${UNIVERSE_BAR_FILL_INSET_PX}px)) 0 0)`,
}))

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
      :class="{ 'rescue-row--glow': isMeepHovered || isUniverseBarHovered }"
      :title="rescueTitle"
      @mouseenter="isUniverseBarHovered = true"
      @mouseleave="isUniverseBarHovered = false"
    >
      <!-- Balken und Prestige-Button teilen sich EIN Feld: gleiche Maße und
           Position ergeben sich damit aus der Struktur, statt am Button
           nachgerechnet zu werden. -->
      <div class="rescue-slot">
        <Transition name="prestige-reveal">
          <div v-if="!gameStore.prestigeAvailable" key="bar" class="rpg-bar-wrap">
            <div class="rpg-bar-fill" :style="{ width: gameStore.universeRescueProgress + '%' }">
              <div class="rpg-bar-gloss" />
              <!-- Ein einzelner Schräg-Schimmer, der per transform über den
                   Balken wandert (GPU) — statt eines dauerhaft laufenden
                   Streifenmusters, das als Paint-Animation jede Frame den
                   Header neu zeichnen ließe. -->
              <div class="rpg-bar-sweep" />
            </div>
            <div class="rpg-segments" aria-hidden="true">
              <div
                v-for="tick in UNIVERSE_BAR_TICK_PERCENTS"
                :key="tick"
                class="rpg-segment-line"
                :class="{ 'rpg-segment-line--passed': gameStore.universeRescueProgress >= tick }"
                :style="{ left: tick + '%' }"
              />
            </div>
            <div class="rpg-bar-border" />
            <div class="rpg-bar-text">
              <span v-ink-center.x.y class="rpg-bar-pct">{{ pctText }}</span>
            </div>
            <!-- Deckungsgleiche zweite Ebene in Dunkel, an der Füllkante
                 abgeschnitten — siehe fillClipStyle. -->
            <div
              class="rpg-bar-text rpg-bar-text--on-fill"
              :style="fillClipStyle"
              aria-hidden="true"
            >
              <span v-ink-center.x.y class="rpg-bar-pct rpg-bar-pct--dark">{{ pctText }}</span>
            </div>
          </div>

          <button
            v-else
            key="prestige"
            class="prestige-btn"
            title="Universe rescued — prestige into the next universe"
            @click.stop="gameStore.openPrestigeModal()"
          >
            <span class="prestige-shine" aria-hidden="true" />
            <span class="prestige-star" aria-hidden="true">✦</span>
            <span v-ink-center.x.y class="prestige-label">Prestige</span>
            <span class="prestige-star" aria-hidden="true">✦</span>
          </button>
        </Transition>
      </div>

      <!-- Meilenstein-Marker: eine Raute auf jeder inneren 10%-Grenze, in
           einer eigenen Zeile unter dem Balken. -->
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
   ROW 2 — Fortschrittsbalken ohne Beschriftung: nur der Prozentwert.
   Was der Balken misst, sagt der Tooltip — im Header zählt die Zahl.
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

/* Das gemeinsame Feld von Balken und Prestige-Button. Beide liegen darin
   absolut auf inset: 0 — identische Maße und Position ohne eine einzige
   nachgerechnete Höhe, und beim Umschalten kann nichts springen. */
.rescue-slot {
  position: relative;
  width: 100%;
  min-width: 0;
  height: var(--rescue-track-h);
  flex-shrink: 0;
}

.rpg-bar-wrap {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.65),
    inset 0 1px 5px rgba(0, 0, 0, 0.8);
  background: #0d0904;
  transition: box-shadow 0.25s ease;
}

.rescue-row--glow .rpg-bar-wrap {
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
  transition:
    background 0.4s ease,
    box-shadow 0.4s ease;
}

/* Überschrittene Trennlinie: bleibt dunkel (sonst verschwindet sie im hellen
   Gold), bekommt aber einen warmen Schein — der Balken zeigt damit selbst,
   welche Abschnitte versiegelt sind. */
.rpg-segment-line--passed {
  background: rgba(58, 26, 0, 0.8);
  box-shadow: 0 0 6px rgba(255, 216, 120, 0.55);
}

/* Die Prozentzahl steht auf beiden Achsen mittig im Balken. Kein Glow
   hinter der Schrift — auf dem hellen Goldfüller trägt allein der harte
   dunkle Schlagschatten die Lesbarkeit. */
.rpg-bar-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
}

/* Nur bis zur Füllkante sichtbar. Dieselbe Dauer und Kurve wie die Breite
   des Füllers, sonst läuft der Farbwechsel dem Gold hinterher. */
.rpg-bar-text--on-fill {
  z-index: 6;
  transition: clip-path 1.1s cubic-bezier(0.4, 0, 0.2, 1);
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
}

/* Die Ebene auf dem hellen Goldfüller — dieselbe Lösung wie beim
   Forge-Badge im Header, statt Weiß mit Schlagschatten. */
.rpg-bar-pct--dark {
  color: #2a1608;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.55);
}

/* ================================================================
   MILESTONE MARKS — zehn Rauten auf der unteren Balkenkante, je eine
   pro 10%-Abschnitt und exakt dort, wo im Balken die Segmenttrennlinie
   steht: Meilenstein n = Segment n versiegelt. Die Verbindungslinie
   ist der Balken selbst, eine eigene Schiene darunter entfällt.
   ================================================================ */
.ms-marks {
  position: absolute;
  /* Deckungsgleich mit .rpg-segments (inset 2px), damit Raute und
     Trennlinie auf derselben Achse sitzen. */
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
   PRESTIGE BUTTON — liegt auf demselben Feld wie der Balken und trägt
   dessen Formensprache weiter: gleiche Rundung, gleiche Goldkontur,
   gleicher Gloss oben. Nur die Farbe wechselt vom Gold des Fortschritts
   ins Amethyst der Universe-Kachel — der Balken ist voll, jetzt zählt
   die Ebene darüber.
   ================================================================ */
.prestige-btn {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(6px, 0.6vw, 12px);
  padding: 0 8px;
  font-size: clamp(11px, calc(var(--header-height) * 0.17), 19px);
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  /* Zwei Ebenen in einem Wert: der Gloss der oberen Hälfte liegt über dem
     Grundverlauf, wie beim Balken darunter — nur ohne Extra-Element. */
  background:
    linear-gradient(to bottom, rgba(255, 250, 210, 0.18) 0%, transparent 42%),
    linear-gradient(to bottom, #5a2ea8 0%, #3d1b78 55%, #2b1256 100%);
  color: #ffe9b0;
  border: 1px solid rgba(232, 192, 64, 0.55);
  border-radius: 4px;
  cursor: pointer;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.65),
    inset 0 -6px 12px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.25s ease,
    filter 0.18s ease;
}

/* Der atmende Schein liegt auf einer eigenen Ebene und variiert nur seine
   opacity: eine box-shadow-Keyframe-Animation wäre eine Paint-Animation
   und ließe den halben Header jede Frame neu zeichnen (dasselbe Muster
   wie bei den Notification-Badges im Header). */
.prestige-btn::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 4px;
  pointer-events: none;
  box-shadow:
    0 0 12px rgba(168, 108, 246, 0.75),
    0 0 26px rgba(232, 192, 64, 0.35);
  opacity: 0;
  animation: prestigePulse 2.6s ease-in-out infinite;
}

/* Eigene Ebene nur fürs Clipping des Schimmers — läge overflow: hidden auf
   dem Button selbst, würde es seinen Glow gleich mit abschneiden. */
.prestige-shine {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 4px;
  pointer-events: none;
}

/* Derselbe wandernde Schräg-Schimmer wie im Balken (transform, GPU) — er
   nimmt die Laufrichtung auf, in der sich der Balken gefüllt hat. */
.prestige-shine::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 30%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 245, 205, 0.42) 50%,
    transparent 100%
  );
  animation: prestigeSweep 3.4s ease-in-out infinite;
}

.prestige-label {
  position: relative;
  line-height: 1;
  white-space: nowrap;
}

.prestige-star {
  position: relative;
  color: #f5d666;
  line-height: 1;
  text-shadow: 0 0 8px rgba(245, 214, 102, 0.7);
}

.prestige-btn:hover {
  transform: scale(1.02);
  border-color: rgba(255, 224, 128, 0.9);
  filter: brightness(1.12);
}

.prestige-btn:active {
  transform: scale(0.97);
}

.rescue-row--glow .prestige-btn {
  border-color: rgba(255, 224, 128, 0.9);
}

@keyframes prestigePulse {
  0%,
  100% {
    opacity: 0.15;
  }
  50% {
    opacity: 1;
  }
}

/* Weg in Prozent der EIGENEN Breite, gleiche Rechnung wie bei barSweep:
   von left: -40% bis hinter die rechte Kante sind das 140/30 ≈ 467%. */
@keyframes prestigeSweep {
  0% {
    transform: translateX(0);
  }
  60%,
  100% {
    transform: translateX(467%);
  }
}

/* ================================================================
   ÜBERGANG BALKEN → BUTTON
   Der Button wischt in derselben Richtung herein, in der sich der
   Balken gefüllt hat — links nach rechts. Der volle Goldbalken bleibt
   darunter stehen und blendet erst aus, wenn der Wisch über ihm ist;
   damit liest sich der Wechsel als Fortsetzung des Füllens, nicht als
   Austausch zweier Elemente.
   ================================================================ */
.prestige-reveal-enter-active {
  transition:
    clip-path 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;
  z-index: 2;
}

.prestige-reveal-enter-from {
  clip-path: inset(0 100% 0 0);
  opacity: 0.35;
}

.prestige-reveal-enter-to {
  clip-path: inset(0 0 0 0);
}

/* Rückweg (Prestige ausgeführt): der Balken darf einfach aufblenden. */
.prestige-reveal-leave-active {
  transition: opacity 0.4s ease 0.12s;
}

.prestige-reveal-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .meep-icon,
  .rpg-bar-sweep,
  .prestige-btn::after,
  .prestige-shine::after,
  .ms-pip--next,
  .ms-pip--flash,
  .ms-pip--flash::after {
    animation: none;
  }

  /* Ohne Puls bleibt der Schein sichtbar, statt ganz zu verschwinden. */
  .prestige-btn::after {
    opacity: 0.6;
  }

  .prestige-reveal-enter-active {
    transition: opacity 0.22s ease;
  }

  .prestige-reveal-enter-from {
    clip-path: none;
    opacity: 0;
  }
}
</style>
