<template>
  <div
    class="ab-passive"
    :class="{ 'ab-passive--due': clicksToMeep === 0 }"
    :style="{ '--ab-color': BARD_PASSIVE.color }"
    :aria-label="meepAria"
    @mouseenter="$emit('hover', true)"
    @mouseleave="$emit('hover', false)"
  >
    <!--
      Zwei konzentrische Kreislinien über `stroke-dashoffset` — der Weg, den
      jeder Ring im Spiel geht. Ein conic-gradient würde pro Änderung den
      Verlauf neu rechnen (Performance-Regel 11).

      AUSSEN läuft der nächste Meep: das ist die Frage, die der Spieler beim
      Klicken tatsächlich stellt („wie weit noch?"), und sie ändert sich mit
      jedem Klick UND mit jedem Takt der Produktion.
      INNEN, als Haarreif, die laufende Resonance-Stufe. Sie bleibt sichtbar,
      weil sie die Kraft der vier Slots daneben trägt — aber sie ist die
      Nebeninformation und trägt deshalb die dünnere Linie.
    -->
    <svg class="ab-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="ab-ring-track" cx="50" cy="50" :r="RING_R" />
      <circle
        class="ab-ring-meep"
        cx="50"
        cy="50"
        :r="RING_R"
        :stroke-dasharray="RING_C"
        :stroke-dashoffset="RING_C * (1 - meepFill)"
      />
      <circle class="ab-res-track" cx="50" cy="50" :r="RES_R" />
      <circle
        class="ab-res-fill"
        cx="50"
        cy="50"
        :r="RES_R"
        :stroke-dasharray="RES_C"
        :stroke-dashoffset="RES_C * (1 - resonanceFill)"
      />
    </svg>

    <span class="ab-passive-disc" aria-hidden="true"></span>

    <img
      class="ab-passive-art"
      :src="MEEP_ART_IMAGE"
      alt="Meep"
      draggable="false"
      @dragstart.prevent
    />

    <!-- Was noch zu tun ist, nicht was schon da ist: die gehaltenen Meeps
         stehen im Header und im Tooltip. Hier zählt die offene Strecke. -->
    <span class="ab-clicks" aria-hidden="true">
      <template v-if="clicksToMeep > 0">
        <Icon class="ab-clicks-icon" icon="ph:cursor-click-fill" width="12" height="12" />
        <span class="ab-clicks-n">{{ formatNumberCompact(clicksToMeep) }}</span>
      </template>
      <span v-else class="ab-clicks-n">✦</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { BARD_PASSIVE } from '@/config/progression/bardAbilities'
import { MEEP_ART_IMAGE } from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'

const props = defineProps<{
  /** Erreichte Resonance-Stufen — für die Vorlesehilfe. */
  resonance: number
  /** 0..1 — Anteil der laufenden Resonance-Stufe (innerer Haarreif). */
  resonanceFill: number
  /** 0..1 — Weg zum nächsten Meep (äußerer Ring). */
  meepFill: number
  /** Klicks, die bis zum nächsten Meep noch fehlen; 0, wenn er fällig ist. */
  clicksToMeep: number
}>()

defineEmits<{ hover: [boolean] }>()

const meepAria = computed(() =>
  props.clicksToMeep > 0
    ? `${BARD_PASSIVE.name} — ${props.clicksToMeep} clicks to the next meep, resonance ${props.resonance}`
    : `${BARD_PASSIVE.name} — next meep ready, resonance ${props.resonance}`,
)

/**
 * Radien und Umfänge im 100×100-Koordinatenraum des SVG. Beide Radien ziehen
 * mit der halben Strichstärke nach innen, damit die ÄUSSERE Kante des jeweiligen
 * Bandes glatt liegt: außen bei 48,5 (der Umriss der Kachel), innen bei 40,75.
 * Zwischen den Bändern bleiben knapp 5 Einheiten Luft — auf 72 px sind das
 * 3,4 px, gerade genug, dass zwei Linien nicht als eine gelesen werden.
 */
const RING_R = 47
const RING_C = 2 * Math.PI * RING_R
const RES_R = 40
const RES_C = 2 * Math.PI * RES_R
</script>

<style scoped>
/* Rund und kleiner als die vier Slots: die Passive ist kein Knopf, sondern ein
   Zustand — sie soll die Zeile anführen, ohne mit ihr um Aufmerksamkeit zu
   ringen. */
.ab-passive {
  position: relative;
  width: var(--ab-passive-size, 72px);
  height: var(--ab-passive-size, 72px);
  flex: 0 0 auto;
  pointer-events: auto;
  user-select: none;
}

.ab-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Nullpunkt oben statt rechts */
  transform: rotate(-90deg);
  overflow: visible;
}

.ab-ring-track {
  fill: none;
  stroke: #3a2210;
  stroke-width: 3;
}

/* Meep-Orange wie im Header und in der Materialleiste — dieselbe Sache trägt
   im ganzen Spiel dieselbe Farbe. */
.ab-ring-meep {
  fill: none;
  stroke: #fb923c;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 260ms ease-out;
}

/* Haarlinie: die Resonance ist eine Nebeninformation und darf die Kachel nicht
   ein zweites Mal umgürten. */
.ab-res-track {
  fill: none;
  stroke: #2a1c0c;
  stroke-width: 1.5;
}

.ab-res-fill {
  fill: none;
  stroke: var(--ab-color, #f0d890);
  stroke-width: 1.5;
  stroke-linecap: round;
  opacity: 0.85;
  transition: stroke-dashoffset 260ms ease-out;
}

/* Ist der Meep fällig, steht der Ring voll — dann trägt er die hellere Stufe
   derselben Familie. Ein einmaliger Umschlag, keine laufende Animation. */
.ab-passive--due .ab-ring-meep {
  stroke: #fdba74;
}

/* Die Scheibe unter der Figur — sie trägt den dunklen Grund, damit das Motiv
   selbst frei stehen kann. Der zweite Verlauf dunkelt ihren Fuß ab und trägt
   dort die Ablesung; die hatte vorher eine eigene Platte mit Rahmen, und drei
   konzentrische Kanten auf 72 px waren zwei zu viel.

   Radius 38 von 50: sie endet innerhalb des Haarreifs (39,25), sonst schnitte
   ihre Kante die Resonance-Linie. Und OHNE eigene Kante: der Haarreif zeichnet
   den inneren Abschluss bereits: eine zweite Linie 1,5 Einheiten daneben wäre
   die dritte konzentrische Kante auf 72 px und damit eine zu viel. */
.ab-passive-disc {
  position: absolute;
  top: 12%;
  left: 12%;
  width: 76%;
  height: 76%;
  border-radius: 50%;
  background:
    linear-gradient(to top, rgba(4, 3, 1, 0.82), rgba(4, 3, 1, 0) 38%),
    radial-gradient(circle at 50% 34%, #241708, #100e08 72%);
}

/* `contain`, nicht `cover`: die Vorlage ist eine freigestellte Figur, kein
   Splash — beschnitten blieb bei dieser Größe nur ein gelber Fleck übrig.

   Das Meep-Sprite ist hochformatig (1024×1536) und trägt oben wie unten einen
   Alpha-Rand. Die Box ist deshalb höher als breit: `contain` bindet hier an der
   HÖHE, die Breite folgt von selbst — eine breitere Box würde die Figur kein
   Stück wachsen lassen, eine höhere schiebt sie sofort an den Ring.

   Die Höhe ist gegen die beiden Nachbarn gesetzt, nicht gegen die Kachel: oben
   die Innenkante des Haarreifs, unten die Oberkante der Ablesung (~68 %). Der
   zweite Ring hat der Figur rund ein Achtel Höhe genommen — das ist der Preis
   dafür, dass zwei Fortschritte auf derselben Kachel stehen. */
.ab-passive-art {
  position: absolute;
  top: 14%;
  left: 17%;
  width: 66%;
  height: 50%;
  object-fit: contain;
  image-rendering: high-quality;
  /* Statisch, nicht animiert: derselbe warme Schein wie an der Header-Kachel,
     aber ohne deren pulsierenden `drop-shadow` — der wäre pro Frame eine
     Neurasterung (Performance-Regel 2). */
  filter: drop-shadow(0 1px 4px rgba(251, 146, 60, 0.3));
}

/* Auf dem Fuß der Scheibe, damit die Ablesung das Motiv nicht zerschneidet —
   und ohne Platte: den dunklen Grund liefert der Verlauf der Scheibe selbst.
   Das Glyph nimmt der Zahl die Frage ab, WAS sie zählt; ohne es stünde dort
   eine nackte Zahl, die man ebenso für gehaltene Meeps halten könnte. */
/* 12 % statt am Fuß der Kachel: die Zeile muss ganz auf der Scheibe stehen
   (deren Unterkante liegt bei 88 %), sonst fällt die Unterlänge der Ziffern auf
   den durchsichtigen Grund und steht ohne Kontrast über dem Orbit. */
.ab-clicks {
  position: absolute;
  bottom: 12%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.18em;
  transform: translateX(-50%);
  max-width: 84%;
  font-size: calc(var(--ab-passive-size, 72px) * 0.2);
  line-height: 1;
  pointer-events: none;
}

.ab-clicks-icon {
  flex-shrink: 0;
  /* CSS schlägt das Attribut — die Größe muss mit der Kachel wachsen. */
  width: 0.72em;
  height: 0.72em;
  color: #fb923c;
}

.ab-clicks-n {
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #fed7aa;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ab-passive--due .ab-clicks-n {
  color: #fdba74;
}

@media (prefers-reduced-motion: reduce) {
  .ab-ring-meep,
  .ab-res-fill {
    transition: none;
  }
}
</style>
