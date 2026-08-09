<script setup lang="ts">
/**
 * Eine Flyby-Karte im Pause-Overlay: EIN Resource-Star, der während der Pause
 * weiterläuft.
 *
 * Vorher stand hier eine Pille mit drei Punkten und einer Sekundenzahl — sie
 * las sich wie eine Fußnote neben den Statistik-Kacheln, obwohl sie das
 * einzige Element im Panel ist, das gerade abläuft. Jetzt trägt die Karte
 *
 *   • ein Zifferblatt, dessen Bogen mit der Restzeit abbrennt (stroke-dashoffset,
 *     einmal je Sekunde geschrieben — kein Per-Frame-Wert),
 *   • die ECHTE Planetenkunst der Slots statt abstrakter Punkte: was der Spieler
 *     draußen im Orbit sucht, steht hier als dasselbe Motiv,
 *   • die eigene Spektralfarbe des Sterns (StarGroup.starColor) als Akzent —
 *     zwei gleichzeitige Flybys sind dadurch auseinanderzuhalten.
 *
 * Animiert wird ausschließlich Opazität, und auch das nur, wenn die Zeit knapp
 * wird — drei ruhige Karten kosten den Compositor nichts.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import PlanetGlyph from '@/components/ui/PlanetGlyph.vue'
import {
  PAUSE_STAR_CARD_WIDTH,
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_DIAL_PX,
  PAUSE_STAR_RING_RADIUS,
  PAUSE_STAR_RING_STROKE,
  PAUSE_STAR_RING_CIRCUMFERENCE,
  PAUSE_STAR_URGENT_SECS,
  PAUSE_STAR_PLANET_GLYPH_PX,
  PAUSE_STAR_PLANET_CELL_PX,
  PAUSE_STAR_PLANET_GAP_PX,
  PAUSE_STAR_PLANET_ROW_WIDTH,
  PLANET_GLYPH_RADIUS,
  PLANET_GLYPH_VIEW_H,
} from '@/config/constants'
import type { PlanetType } from '@/types'

const props = defineProps<{
  /** Restsekunden bis zum Despawn. */
  secs: number
  /** Restanteil der Despawn-Zeit (1 = frisch gespawnt) — treibt den Bogen. */
  progress: number
  /** Spektralfarbe des Sterns als fertiger CSS-Wert. */
  color: string
  planets: { id: string; type: PlanetType; cleared: boolean }[]
}>()

const isUrgent = computed(() => props.secs <= PAUSE_STAR_URGENT_SECS)
const remaining = computed(() => props.planets.filter((p) => !p.cleared).length)
/** Der Bogen läuft von voll (offset 0) auf leer (offset = Umfang). */
const dashOffset = computed(
  () => PAUSE_STAR_RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, props.progress))),
)

/**
 * Zellbreite der Planetenreihe. Die Regel-Anzahl (RESOURCE_STAR_PLANET_COUNT)
 * passt in voller Größe; trägt ein Stern mehr Slots, rücken die Zellen
 * zusammen, bis die Reihe wieder in die Spalte passt.
 */
const cellPx = computed(() => {
  const n = Math.max(1, props.planets.length)
  const free = PAUSE_STAR_PLANET_ROW_WIDTH - (n - 1) * PAUSE_STAR_PLANET_GAP_PX
  return Math.min(PAUSE_STAR_PLANET_CELL_PX, free / n)
})

/**
 * Der Planetenkörper füllt nur `2 × RADIUS / VIEW_H` der Glyphhöhe — der Rest
 * des Viewports ist Luft für die Ringe eines Ringed-Planeten. Sobald die Zelle
 * schmaler wird als der Körper, schrumpft der Glyph mit, damit sich zwei Welten
 * nie überdecken.
 */
const GLYPH_BODY_RATIO = (2 * PLANET_GLYPH_RADIUS) / PLANET_GLYPH_VIEW_H
const glyphPx = computed(() =>
  Math.min(PAUSE_STAR_PLANET_GLYPH_PX, cellPx.value / GLYPH_BODY_RATIO),
)
</script>

<template>
  <div
    class="star-card"
    :class="{ 'star-card--urgent': isUrgent }"
    :style="{
      '--star-color': color,
      '--planet-cell': `${cellPx}px`,
      '--planet-gap': `${PAUSE_STAR_PLANET_GAP_PX}px`,
      '--planet-row-w': `${PAUSE_STAR_PLANET_ROW_WIDTH}px`,
      '--dial-px': `${PAUSE_STAR_DIAL_PX}px`,
      '--ring-stroke': PAUSE_STAR_RING_STROKE,
      width: `${PAUSE_STAR_CARD_WIDTH}px`,
      height: `${PAUSE_STAR_CARD_HEIGHT}px`,
    }"
    role="img"
    :aria-label="`Resource star flyby — ${secs} seconds left, ${remaining} of ${planets.length} planets still held`"
  >
    <!-- Alarm-Schein auf eigener Ebene: statischer Schatten, animiert wird nur
         seine Opazität (siehe „Performance" Regel 11). -->
    <span class="star-card__alarm" aria-hidden="true" />

    <div class="star-card__dial">
      <svg class="dial-svg" viewBox="0 0 56 56" aria-hidden="true">
        <circle class="dial-track" cx="28" cy="28" :r="PAUSE_STAR_RING_RADIUS" />
        <circle
          class="dial-arc"
          cx="28"
          cy="28"
          :r="PAUSE_STAR_RING_RADIUS"
          :stroke-dasharray="PAUSE_STAR_RING_CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <!-- `.y` gleicht das Seitenlager der MedievalSharp-Ziffern aus: sie sitzen
           mit Ascent 17,2 px gegen Descent 0,8 px fast vollständig über der
           Baseline, und eine bloß zentrierte Zeilenbox stellt sie damit sichtbar
           zu hoch in den Ring (gemessen 3,7 px bei 21,6 px Schrift). -->
      <span v-ink-center.y class="dial-value"
        >{{ secs }}<span class="dial-unit">s</span></span
      >
    </div>

    <div class="star-card__body">
      <span class="star-card__eyebrow">
        <Icon
          icon="game-icons:star-satellites"
          width="14"
          height="14"
          class="star-card__mark"
          aria-hidden="true"
        />
        Flyby
      </span>
      <!-- Ein Planet je Slot, in seiner echten Gestalt. Befreite Welten bleiben
           stehen und dimmen nur ab — die Karte behält ihre Breite über die
           ganze Lebensdauer des Sterns. -->
      <div class="star-card__planets">
        <span
          v-for="p in planets"
          :key="p.id"
          class="planet-chip"
          :class="{ 'planet-chip--cleared': p.cleared }"
        >
          <PlanetGlyph :type="p.type" :size="glyphPx" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.star-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  /* Maße kommen inline aus PAUSE_STAR_CARD_* — dieselbe Quelle, aus der das
     Overlay die Höhe seiner Reihe reserviert. */
  padding: 0 10px;
  overflow: hidden;
  /* 12px wie alle anderen Blöcke im Pause-Panel (Kacheln, Battle-Leiste,
     Resume-Knopf) — ein kleinerer Radius stünde hier allein. */
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--star-color) 42%, transparent);
  background:
    radial-gradient(
      circle at 16% 50%,
      color-mix(in srgb, var(--star-color) 16%, transparent),
      transparent 64%
    ),
    linear-gradient(140deg, rgba(255, 200, 80, 0.05), rgba(6, 4, 0, 0.35));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--star-color) 10%, transparent);
}
.star-card__alarm {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 1px rgba(255, 122, 106, 0.55),
    0 0 20px rgba(255, 122, 106, 0.3);
  opacity: 0;
  pointer-events: none;
}
.star-card--urgent .star-card__alarm {
  animation: star-alarm 1.1s ease-in-out infinite;
}
@keyframes star-alarm {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* ── Zifferblatt ──────────────────────────────────────── */
/* Maß kommt inline aus PAUSE_STAR_DIAL_PX — dieselbe Quelle, aus der sich die
   Breite der Planetenspalte ableitet. */
.star-card__dial {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--dial-px);
  height: var(--dial-px);
  flex-shrink: 0;
}
.dial-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Start oben statt rechts: die Zeit läuft ab wie auf einer Uhr. */
  transform: rotate(-90deg);
  overflow: visible;
}
.dial-track {
  fill: none;
  stroke: rgba(122, 78, 32, 0.5);
  stroke-width: var(--ring-stroke);
}
.dial-arc {
  fill: none;
  stroke: var(--star-color);
  stroke-width: var(--ring-stroke);
  stroke-linecap: round;
  /* Weicher Nachlauf beim Sekundensprung — 1×/s, kein Dauerläufer. */
  transition:
    stroke-dashoffset 700ms linear,
    stroke 300ms ease;
}
.star-card--urgent .dial-arc {
  stroke: #ff7a6a;
}
.dial-value {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
  color: var(--star-color);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px color-mix(in srgb, var(--star-color) 45%, transparent);
  transition: color 300ms ease;
}
.star-card--urgent .dial-value {
  color: #ff8a7a;
}
/* Die Einheit belegt KEINE Breite: sonst wäre nicht die Zahl mittig im Ring,
   sondern die Gruppe aus Zahl und „s" — und die Ziffern stünden um deren halbe
   Breite links der Achse (gemessen 3,8 px von 38,5 px Innenkreis). Mit
   `width: 0` zentriert das Grid des Zifferblatts allein die Ziffern, das „s"
   ragt nach rechts aus seiner leeren Box. Es bleibt Flex-Item und behält damit
   die Baseline der Ziffern, ohne dass sie irgendwo nachgerechnet werden müsste;
   `min-width: 0` ist Pflicht, weil Flex-Items sonst auf ihre Inhaltsbreite
   aufgehen. */
.dial-unit {
  width: 0;
  min-width: 0;
  font-size: 0.5em;
  font-weight: 700;
  opacity: 0.6;
}

/* ── Textspalte ───────────────────────────────────────── */
/* Feste Spaltenbreite statt Inhaltsbreite: die Reihe der Welten ist je nach
   Zahl der Slots unterschiedlich breit — ohne feste Spalte säße die
   Beschriftung bei zwei Welten woanders als bei drei, und zwei nebeneinander
   stehende Karten fluchteten nicht mehr. */
.star-card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: var(--planet-row-w);
  flex-shrink: 0;
}
.star-card__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--star-color) 40%, #f2ead0);
  white-space: nowrap;
}
.star-card__mark {
  flex-shrink: 0;
  color: var(--star-color);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--star-color) 70%, transparent));
}
.star-card__planets {
  display: flex;
  align-items: center;
  gap: var(--planet-gap);
}
/* Zelle schmaler als der Glyph (PAUSE_STAR_PLANET_CELL_PX gegen
   _GLYPH_PX): der Planet steht seitlich über, wodurch sich nur die leeren
   Ränder der Nachbarn überlappen. Dadurch passt eine Reihe aus drei Welten in
   die Spalte, ohne dass die Körper schrumpfen müssen.
   Der Hauch Sternfarbe dahinter setzt eine noch besetzte Welt von ihrem
   befreiten Nachbarn ab — statisch, nichts pulst hier. */
.planet-chip {
  position: relative;
  display: flex;
  justify-content: center;
  width: var(--planet-cell);
  flex-shrink: 0;
  line-height: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--star-color) 22%, transparent) 0%,
    transparent 62%
  );
}
.planet-chip--cleared {
  background: none;
  opacity: 0.26;
  filter: grayscale(80%);
}

@media (prefers-reduced-motion: reduce) {
  .star-card--urgent .star-card__alarm {
    animation: none;
    opacity: 0.7;
  }
  .dial-arc,
  .dial-value {
    transition: none;
  }
}
</style>
