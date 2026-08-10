<script setup lang="ts">
/**
 * Eine Karte im Pause-Overlay: EIN Resource-Star, der während der Pause
 * weiterläuft.
 *
 * Die Karte trägt genau zwei Dinge, und beide laufen ab:
 *
 *   • links das Zifferblatt der Restzeit — der Bogen brennt STETIG ab, nicht in
 *     Sekundensprüngen (siehe „Der Bogen läuft als Animation" unten),
 *   • rechts die Welten des Sterns in ihrer echten Gestalt, jede mit dem
 *     Lebensbalken ihres Bosses darunter — dasselbe Bild, das der Spieler
 *     draußen im Orbit sieht.
 *
 * Was hier bewusst NICHT mehr steht: die Zeile „Flyby" samt Sternsymbol. Sie
 * benannte, was die Karte ohnehin zeigt, und kostete die Höhe, aus der die
 * Welten jetzt ihre Größe ziehen (Körper 21 → 26 px).
 *
 * Der Akzent ist die eigene Spektralfarbe des Sterns (StarGroup.starColor) —
 * zwei gleichzeitige Flybys sind dadurch auseinanderzuhalten.
 */
import { computed, ref, watch, onMounted } from 'vue'
import PlanetGlyph from '@/components/ui/PlanetGlyph.vue'
import { hpStageClass } from '@/utils/ui/format'
import {
  PAUSE_STAR_CARD_WIDTH,
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_PAD_X,
  PAUSE_STAR_DIAL_PX,
  PAUSE_STAR_DIAL_GAP_PX,
  PAUSE_STAR_RING_RADIUS,
  PAUSE_STAR_RING_STROKE,
  PAUSE_STAR_RING_CIRCUMFERENCE,
  PAUSE_STAR_URGENT_SECS,
  PAUSE_STAR_PLANET_GLYPH_MAX_PX,
  PAUSE_STAR_PLANET_CELL_MAX_PX,
  PAUSE_STAR_PLANET_GAP_PX,
  PAUSE_STAR_PLANET_BODY_CLEARANCE_PX,
  PAUSE_STAR_PLANET_HP_H,
  PAUSE_STAR_PLANET_HP_GAP,
  PAUSE_STAR_PLANET_ROW_WIDTH,
  PLANET_GLYPH_RADIUS,
  PLANET_GLYPH_VIEW_H,
} from '@/config/constants'
import type { PlanetType } from '@/types'

const props = defineProps<{
  /** Restsekunden bis zum Despawn — die Zahl im Ring. */
  secs: number
  /** ABSOLUTER Zeitpunkt, an dem der Stern verschwindet (Wanduhr, ms). */
  endsAt: number
  /** Gesamtlaufzeit derselben Uhr in ms — der Nenner des Bogens. */
  durationMs: number
  /** Spektralfarbe des Sterns als fertiger CSS-Wert. */
  color: string
  /** Slots des Sterns: Gestalt, Zustand und HP-Anteil (0..1) ihres Bosses. */
  planets: { id: string; type: PlanetType; cleared: boolean; hp: number }[]
}>()

const isUrgent = computed(() => props.secs <= PAUSE_STAR_URGENT_SECS)
const remaining = computed(() => props.planets.filter((p) => !p.cleared).length)

/**
 * ── Der Bogen läuft als Animation, nicht als Wertfolge ──────────────────────
 *
 * Vorher hing `stroke-dashoffset` an einem Wert, den der Schnappschuss des
 * Overlays lieferte — und der ändert sich nur, wenn die SEKUNDE umspringt. Mit
 * einer 700-ms-Transition darauf lief der Bogen 700 ms und stand 300 ms: ein
 * sichtbares Stocken im Sekundentakt.
 *
 * Jetzt kennt die Karte den Endzeitpunkt und lässt den Bogen in EINEM Zug
 * durchlaufen: eine lineare Animation über die volle Laufzeit, per NEGATIVER
 * Verzögerung an die bereits verstrichene Zeit gesetzt. Damit hängt die
 * Anzeige an der Uhr des Browsers statt am Abtasttakt des Overlays — sie ist
 * exakt, egal wie grob abgetastet wird, und sie kostet kein einziges
 * Vue-Update.
 *
 * Neu angesetzt wird nur, wenn sich die UHR ändert (ein Boss fällt, die
 * maßgebliche Frist wechselt) — deshalb der absolute Zeitstempel als Prop:
 * aus `now + Restzeit` zurückgerechnet wackelte er um Millisekunden und jeder
 * Takt setzte die Animation zurück.
 *
 * Zum Aufwand: ein animiertes `stroke-dashoffset` wird pro Frame auf dem
 * Hauptthread gezeichnet. Das ist hier vertretbar — es sind höchstens
 * RESOURCE_STAR_MAX_CONCURRENT Kreislinien von 60 px, und sie laufen
 * ausschließlich bei offenem Pause-Overlay, hinter dem der gesamte Idle-Layer
 * samt seiner Deko ruht (useRenderingPaused).
 */
const arcEl = ref<SVGCircleElement | null>(null)

function armDial(): void {
  const el = arcEl.value
  if (!el) return
  const total = Math.max(1, props.durationMs)
  const elapsed = Math.min(total, Math.max(0, total - (props.endsAt - Date.now())))
  // Ohne Zurücksetzen samt erzwungenem Reflow übernimmt der Browser die
  // laufende Animation gleichen Namens mitsamt ihrer alten Phase.
  el.style.animationName = 'none'
  void el.getBoundingClientRect()
  el.style.animationDuration = `${total}ms`
  el.style.animationDelay = `${-elapsed}ms`
  // Leeren statt setzen: der Name steht in der Klasse. Vue hängt scoped
  // Keyframes einen Scope-Suffix an — ein hier geschriebener Name träfe sie
  // nicht mehr.
  el.style.animationName = ''
}

onMounted(armDial)
watch([() => props.endsAt, () => props.durationMs], armDial)

/**
 * Statischer Rückfall für `prefers-reduced-motion` (dort schaltet die CSS-Regel
 * die Animation ab) — und damit der Bogen schon im ersten Frame richtig steht.
 * `secs` ist die Abhängigkeit, die den Wert im Sekundentakt nachführt.
 */
const dashOffset = computed(() => {
  void props.secs
  const total = Math.max(1, props.durationMs)
  const left = Math.min(1, Math.max(0, (props.endsAt - Date.now()) / total))
  return PAUSE_STAR_RING_CIRCUMFERENCE * (1 - left)
})

/**
 * Zellbreite der Planetenreihe: die Reihe wird schlicht durch die Zahl der
 * Slots geteilt. Drei Welten (RESOURCE_STAR_PLANET_COUNT) landen damit knapp
 * unter der Obergrenze, weniger Slots nutzen den frei bleibenden Platz, mehr
 * rücken zusammen — statt aus der Karte zu laufen.
 */
const cellPx = computed(() => {
  const n = Math.max(1, props.planets.length)
  const free = PAUSE_STAR_PLANET_ROW_WIDTH - (n - 1) * PAUSE_STAR_PLANET_GAP_PX
  return Math.min(PAUSE_STAR_PLANET_CELL_MAX_PX, free / n)
})

/**
 * Der Planetenkörper füllt nur `2 × RADIUS / VIEW_H` der Glyphhöhe — der Rest
 * des Viewports ist Luft für die Ringe eines Ringed-Planeten. Der Glyph wird
 * deshalb aus der Zelle zurückgerechnet: so groß, dass der KÖRPER die Zelle
 * abzüglich seiner Luft füllt. Die Obergrenze setzt die Kartenhöhe.
 */
const GLYPH_BODY_RATIO = (2 * PLANET_GLYPH_RADIUS) / PLANET_GLYPH_VIEW_H
const glyphPx = computed(() =>
  Math.min(
    PAUSE_STAR_PLANET_GLYPH_MAX_PX,
    Math.max(0, cellPx.value - PAUSE_STAR_PLANET_BODY_CLEARANCE_PX) / GLYPH_BODY_RATIO,
  ),
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
      '--planet-hp-h': `${PAUSE_STAR_PLANET_HP_H}px`,
      '--planet-hp-gap': `${PAUSE_STAR_PLANET_HP_GAP}px`,
      '--dial-px': `${PAUSE_STAR_DIAL_PX}px`,
      '--dial-gap': `${PAUSE_STAR_DIAL_GAP_PX}px`,
      '--ring-stroke': PAUSE_STAR_RING_STROKE,
      '--ring-c': PAUSE_STAR_RING_CIRCUMFERENCE,
      width: `${PAUSE_STAR_CARD_WIDTH}px`,
      height: `${PAUSE_STAR_CARD_HEIGHT}px`,
      padding: `0 ${PAUSE_STAR_CARD_PAD_X}px`,
    }"
    role="img"
    :aria-label="`Resource star — ${secs} seconds left, ${remaining} of ${planets.length} planets still held`"
  >
    <!-- Alarm-Schein auf eigener Ebene: statischer Schatten, animiert wird nur
         seine Opazität (siehe „Performance" Regel 11). -->
    <span class="star-card__alarm" aria-hidden="true" />

    <div class="star-card__dial">
      <svg class="dial-svg" viewBox="0 0 56 56" aria-hidden="true">
        <circle class="dial-track" cx="28" cy="28" :r="PAUSE_STAR_RING_RADIUS" />
        <circle
          ref="arcEl"
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

    <!-- Ein Planet je Slot, in seiner echten Gestalt, mit dem Lebensbalken
         seines Bosses darunter. Befreite Welten bleiben stehen und dimmen nur
         ab — die Karte behält ihre Breite über die ganze Lebensdauer des
         Sterns. -->
    <div class="star-card__planets">
      <span
        v-for="p in planets"
        :key="p.id"
        class="planet-cell"
        :class="{ 'planet-cell--cleared': p.cleared }"
      >
        <span class="planet-cell__body">
          <PlanetGlyph :type="p.type" :size="glyphPx" />
        </span>
        <span class="planet-hp" :class="hpStageClass(p.hp * 100)">
          <!-- Pro-Wert gesetzter Transform steht inline am Balken selbst, nicht
               als Variable am Container (siehe „Performance" Regel 3). -->
          <span class="planet-hp__fill" :style="{ transform: `scaleX(${p.hp})` }" />
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.star-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--dial-gap);
  flex-shrink: 0;
  /* Maße und Innenabstand kommen inline aus PAUSE_STAR_* — dieselbe Quelle, aus
     der das Overlay die Höhe seiner Reihe und die Karte die Breite ihrer
     Planetenreihe ableitet. */
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
  /* Über der Planetenreihe: der Glyph-Viewport der ersten Welt ragt über seine
     Zelle hinaus, und die Ringe eines Ringed-Planeten reichen bis an das
     Zifferblatt. Sie laufen dann HINTER dem Bogen durch statt über ihn. */
  z-index: 1;
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
/* Der Bogen brennt stetig ab: Dauer und (negative) Verzögerung schreibt
   `armDial` inline, der Name steht hier, damit Vues Scope-Suffix an den
   Keyframes greift. Kein `transition` auf stroke-dashoffset — die Animation
   führt den Wert selbst, beides zusammen zöge gegeneinander. */
.dial-arc {
  fill: none;
  stroke: var(--star-color);
  stroke-width: var(--ring-stroke);
  stroke-linecap: round;
  animation-name: dial-drain;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  transition: stroke 300ms ease;
}
@keyframes dial-drain {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: var(--ring-c);
  }
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

/* ── Welten ───────────────────────────────────────────── */
/* Feste Spaltenbreite statt Inhaltsbreite: die Reihe ist je nach Zahl der Slots
   unterschiedlich breit — ohne feste Spalte fluchteten zwei nebeneinander
   stehende Karten nicht mehr. */
.star-card__planets {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--planet-gap);
  width: var(--planet-row-w);
  flex-shrink: 0;
}
/* Zelle schmaler als der Glyph (PAUSE_STAR_PLANET_CELL_PX gegen _GLYPH_PX):
   der Planet steht seitlich über, wodurch sich nur die leeren Ränder der
   Nachbarn überlappen. Dadurch passt eine Reihe aus drei Welten in die Spalte,
   ohne dass die Körper schrumpfen müssen. */
.planet-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--planet-hp-gap);
  width: var(--planet-cell);
  flex-shrink: 0;
}
/* Der Hauch Sternfarbe hinter dem Körper setzt eine noch besetzte Welt von
   ihrem befreiten Nachbarn ab — statisch, nichts pulst hier. */
.planet-cell__body {
  display: flex;
  justify-content: center;
  width: 100%;
  line-height: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--star-color) 22%, transparent) 0%,
    transparent 62%
  );
}
.planet-cell--cleared .planet-cell__body {
  background: none;
  opacity: 0.26;
  filter: grayscale(80%);
}

/* Lebensbalken einer Welt: dieselbe Sprache wie die Vitalitäts-Leiste des
   Panels — grün / gelb / rot über hpStageClass, damit derselbe Füllstand oben
   und hier dieselbe Farbe hat. Gefüllt wird über scaleX, nicht über die
   Breite: eine Breitenänderung je Treffer wäre Layout, siehe „Performance"
   Regel 10. */
.planet-hp {
  position: relative;
  width: 100%;
  height: var(--planet-hp-h);
  overflow: hidden;
  border-radius: 2px;
  background: rgba(6, 4, 0, 0.72);
  box-shadow: inset 0 0 0 1px rgba(122, 78, 32, 0.65);
}
.planet-hp__fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--hp-hi), var(--hp-lo));
  /* Passivschaden fällt im Sekundentakt an — der Balken rutscht ihm nach,
     statt zu springen. Dieselbe Kurve wie die Vitalitäts-Leiste im Panel.
     Als Variable, weil die Ausnahme unten sie ein zweites Mal setzen muss. */
  --hp-slide: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  transition: var(--hp-slide);
}
.planet-hp.hp--high {
  --hp-hi: #74d448;
  --hp-lo: #2e7a1a;
}
.planet-hp.hp--mid {
  --hp-hi: #f5d84a;
  --hp-lo: #a8760e;
}
.planet-hp.hp--low {
  --hp-hi: #ff7a6a;
  --hp-lo: #8e2a20;
}
/* Befreit: kein Boss, also kein Leben — die leere Rinne bleibt als Platzhalter
   stehen, damit die Reihe ihre Grundlinie behält. */
.planet-cell--cleared .planet-hp {
  opacity: 0.3;
}

/* ── Ausnahme vom Pausen-Freeze ───────────────────────────
   Diese Karte ist ausschließlich sichtbar, während App.vue per
   `.rendering-paused` ALLE Animationen und Transitions anhält — die Regel dort
   zielt auf die eingefrorene Spielwelt unter dem Overlay, und für dessen Deko
   ist das Anhalten auch richtig.

   Die Karte zeigt jedoch einen LAUFENDEN Vorgang: der Stern verschwindet
   weiter, seine Bosse nehmen weiter Schaden. Ohne diese Ausnahme stünde der
   Zeitbogen still und ruckte einmal je Sekunde auf den nächsten gebundenen
   Wert — genau das Stocken, das die Animation abschaffen soll.

   Es sind höchstens RESOURCE_STAR_MAX_CONCURRENT Karten, und der Rest des
   Panels bleibt eingefroren. */
.rendering-paused .star-card .dial-arc,
.rendering-paused .star-card--urgent .star-card__alarm {
  animation-play-state: running !important;
}
.rendering-paused .star-card .planet-hp__fill {
  transition: var(--hp-slide) !important;
}

@media (prefers-reduced-motion: reduce) {
  .star-card--urgent .star-card__alarm {
    animation: none;
    opacity: 0.7;
  }
  /* Statt des stetigen Abbrennens greift der im Sekundentakt gebundene
     Attributwert — der Bogen steht dann still und rückt einmal je Sekunde. */
  .dial-arc {
    animation: none !important;
  }
  .dial-arc,
  .dial-value,
  .planet-hp__fill {
    transition: none;
  }
}
</style>
