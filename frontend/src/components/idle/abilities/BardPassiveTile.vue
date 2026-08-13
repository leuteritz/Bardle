<template>
  <div
    class="ab-passive"
    :class="{ 'ab-passive--due': clicksToMeep === 0, 'ab-passive--warp': warping }"
    :style="{ '--ab-color': BARD_PASSIVE.color }"
    :aria-label="meepAria"
    @mouseenter="$emit('hover', true)"
    @mouseleave="$emit('hover', false)"
  >
    <!--
      EIN Ring, und der zählt den nächsten Meep — das ist die Frage, die der
      Spieler beim Klicken tatsächlich stellt. Gezeichnet über
      `stroke-dashoffset` einer Kreislinie, der Weg jedes Rings im Spiel; ein
      conic-gradient würde pro Änderung den Verlauf neu rechnen
      (Performance-Regel 11).

      Die Resonance hat hier bewusst keine eigene Linie mehr: zwei
      konzentrische Bänder auf 72 px lasen sich als Zierrat, und ihr Stand
      steht ohnehin im Fuß des Tooltips. Was hier dazukam, liegt deshalb ALLES
      auf derselben Linie — Verlauf, Ticks und Kopfpunkt teilen sich einen
      Radius, es gibt weiterhin genau einen Ring.
    -->
    <svg class="ab-ring" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <!-- Statischer Verlauf, einmal gerastert. Er läuft diagonal gegen die
             Richtung der Füllung: dunkel dort, wo der Bogen beginnt, hell dort,
             wo er bei fortgeschrittenem Stand endet. Ein echter Verlauf ENTLANG
             des Bogens ginge nur per conic-gradient und wäre pro Änderung eine
             Neuberechnung (Performance-Regel 11) — über 360° kann eine Gerade
             das ohnehin nicht leisten. -->
        <linearGradient id="abPassiveRingGrad" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c2410c" />
          <stop offset="55%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#fdba74" />
        </linearGradient>
      </defs>

      <circle class="ab-ring-track" cx="50" cy="50" :r="RING_R" />

      <circle
        class="ab-ring-meep"
        cx="50"
        cy="50"
        :r="RING_R"
        :stroke-dasharray="RING_C"
        :stroke-dashoffset="RING_C * (1 - meepFill)"
      />

      <!-- ÜBER der Füllung, in der Farbe des Grundes: die Marken kerben den
           Ring, statt eine vierte konzentrische Kante aufzumachen. Sie geben
           dem Auge die Viertel, ohne dass die Zahl dafür gelesen werden muss. -->
      <line
        v-for="tick in ticks"
        :key="tick.fraction"
        class="ab-ring-tick"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
      />

      <!-- Der Kopfpunkt sitzt am Ende der Füllung und wandert mit ihr: EINE
           Rotation um die Ringmitte, mit derselben Dauer wie der Nachlauf des
           Bogens. Seine Ruhelage ist 3 Uhr — dort beginnt der Bogen, und das
           `rotate(-90deg)` am SVG hebt beide gemeinsam nach oben.

           Die Glut darunter ist eine eigene Ebene mit statischem Schein, deren
           opacity atmet — kein pulsierender drop-shadow (Performance-Regel 11). -->
      <g class="ab-ring-head" :transform="`rotate(${meepFill * 360} 50 50)`">
        <circle
          class="ab-ring-head-glow"
          :cx="50 + RING_R"
          cy="50"
          :r="ABILITY_PASSIVE_RING.HEAD_RADIUS * 2.6"
        />
        <circle
          class="ab-ring-head-dot"
          :cx="50 + RING_R"
          cy="50"
          :r="ABILITY_PASSIVE_RING.HEAD_RADIUS"
        />
      </g>
    </svg>

    <span class="ab-passive-disc" aria-hidden="true"></span>

    <img
      class="ab-passive-art"
      :src="MEEP_ART_IMAGE"
      alt="Meep"
      draggable="false"
      @dragstart.prevent
    />

    <!-- Was noch zu tun ist: die Klicks bis zum nächsten Meep. Sie zählt mit
         JEDEM Klick herunter, und das ist ihr ganzer Zweck — die Frage, die der
         Spieler beim Klicken stellt, ist „wie oft noch?", nicht „wie viel habe
         ich schon?". Der Bestand steht im Header, die Ernte des Laufs im
         Tooltip und am Rettungsbalken.

         Dass sie hier einmal unbrauchbar war, lag nicht an ihr, sondern an der
         Bezugsgröße: mit der alten festen Basis stand im frischen Spielstand
         390,6 Millionen, und die Kurzform rührte sich über Millionen Klicks
         nicht. Mit dem Ratschen-Anker beginnt sie bei 100.

         Ist nichts mehr offen, steht hier NICHTS — den Zustand trägt der volle
         Ring, das Ereignis der Float darüber.

         KEINE Void-Verlustmarke an dieser Stelle: neben einer Klickzahl läse
         sich ein „−3" als drei Klicks weniger statt als drei verlorene Meeps.
         Der Frass steht am Rettungsbalken neben dem Meep-Ertrag, im Tooltip,
         im Eventlog und im Toast. -->
    <span v-if="clicksToMeep > 0" class="ab-clicks" aria-hidden="true">{{
      formatNumberCompact(clicksToMeep)
    }}</span>

    <!-- Der Gewinn steht für sich (MeepGainFloat) — die Kachel ist nur sein
         Anker. `:key` hier, nicht dort: der Bump ist es, der die Animation neu
         anstößt, und er gehört zu dem, was den Betrag liefert. -->
    <MeepGainFloat v-if="gainAmount > 0" :key="gainKey" :amount="gainAmount" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MeepGainFloat from './MeepGainFloat.vue'
import { BARD_PASSIVE } from '@/config/progression/bardAbilities'
import { ABILITY_PASSIVE_RING, MEEP_ART_IMAGE } from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'

const props = defineProps<{
  /** 0..1 — Weg zum nächsten Meep. */
  meepFill: number
  /** Klicks, die bis zum nächsten Meep noch fehlen; 0, wenn er fällig ist. */
  clicksToMeep: number
  /** Zählt die erreichten Meeps — jeder Wechsel setzt den Ring hart zurück. */
  stepKey: number
  /** Gerade gutgeschriebene Meeps; 0 = kein Float. */
  gainAmount: number
  /** Steigt mit jeder Gutschrift — stößt die Animation neu an. */
  gainKey: number
}>()

defineEmits<{ hover: [boolean] }>()

const meepAria = computed(() =>
  props.clicksToMeep > 0
    ? `${BARD_PASSIVE.name} — ${props.clicksToMeep} clicks to the next meep`
    : `${BARD_PASSIVE.name} — next meep ready`,
)

/** Radius und Umfang im 100×100-Koordinatenraum des SVG; Herleitung des Radius
 *  steht bei `ABILITY_PASSIVE_RING`. */
const RING_R = ABILITY_PASSIVE_RING.RADIUS
const RING_C = 2 * Math.PI * RING_R

/**
 * Die Tick-Marken, einmal gerechnet: Anteil → Winkel → zwei Punkte radial um
 * die Linie.
 *
 * Nullpunkt ist 3 UHR, nicht 12 — im Koordinatenraum beginnt auch der Bogen
 * dort (`stroke-dasharray` läuft ab Winkel 0). Oben landen beide erst durch das
 * `rotate(-90deg)`, das am SVG hängt und ALLES gemeinsam dreht: Track, Füllung,
 * Ticks und Kopfpunkt. Wer hier einen eigenen Versatz einrechnet, verschiebt
 * die Marken um 90° gegen die Füllung.
 */
const ticks = ABILITY_PASSIVE_RING.TICK_FRACTIONS.map((fraction) => {
  const angle = fraction * 2 * Math.PI
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const half = ABILITY_PASSIVE_RING.TICK_HALF_LENGTH
  return {
    fraction,
    x1: 50 + dx * (RING_R - half),
    y1: 50 + dy * (RING_R - half),
    x2: 50 + dx * (RING_R + half),
    y2: 50 + dy * (RING_R + half),
  }
})

/**
 * Der Schrittwechsel — und warum er eine eigene Behandlung braucht.
 *
 * Ist ein Meep erreicht, fällt `meepFill` von ~1 auf ~0. Mit Nachlauf führe das
 * dazu, dass Bogen UND Kopfpunkt den ganzen Kreis RÜCKWÄRTS fahren: eine
 * Bewegung, die das Gegenteil dessen erzählt, was gerade passiert ist. Für
 * einen Frame fallen die Übergänge deshalb weg, der Ring setzt hart zurück.
 *
 * Zwei verschachtelte rAF sind nötig, kein einzelnes: das erste feuert noch
 * bevor der Browser die neue Position gerechnet hat.
 */
const warping = ref(false)
let warpRaf = 0

watch(
  () => props.stepKey,
  () => {
    warping.value = true
    cancelAnimationFrame(warpRaf)
    warpRaf = requestAnimationFrame(() => {
      warpRaf = requestAnimationFrame(() => {
        warping.value = false
      })
    })
  },
)

onBeforeUnmount(() => cancelAnimationFrame(warpRaf))
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
   im ganzen Spiel dieselbe Farbe. Der Verlauf bleibt in dieser Familie und
   macht nur den zurückgelegten Teil des Bogens ablesbar. */
.ab-ring-meep {
  fill: none;
  stroke: url(#abPassiveRingGrad);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 260ms ease-out;
}

/* In der Farbe des Scheibengrundes: die Marke schneidet den Ring, statt eine
   eigene Linie zu sein. */
.ab-ring-tick {
  stroke: #14100a;
  stroke-width: 1.6;
  stroke-linecap: butt;
}

.ab-ring-head {
  transition: transform 260ms ease-out;
}

.ab-ring-head-dot {
  fill: #ffedd5;
}

/* Eigene Ebene, statischer Schein, animiert wird NUR die opacity — das Muster
   aus Performance-Regel 11. Ein pulsierender drop-shadow am Punkt selbst wäre
   pro Frame eine Neurasterung. */
.ab-ring-head-glow {
  fill: #fb923c;
  opacity: 0.34;
  animation: ab-ring-head-breathe 2.4s ease-in-out infinite;
}

@keyframes ab-ring-head-breathe {
  0%,
  100% {
    opacity: 0.18;
  }
  50% {
    opacity: 0.42;
  }
}

/* Ist der Meep fällig, steht der Ring voll — dann trägt er die hellere Stufe
   derselben Familie, ohne Verlauf: voll ist voll. Ein einmaliger Umschlag,
   keine laufende Animation. */
.ab-passive--due .ab-ring-meep {
  stroke: #fdba74;
}

.ab-passive--due .ab-ring-head-glow {
  opacity: 0.5;
}

/* Der eine Frame beim Schrittwechsel: ohne Nachlauf springt der Ring auf 0,
   statt rückwärts um den Kreis zu fahren. */
.ab-passive--warp .ab-ring-meep,
.ab-passive--warp .ab-ring-head {
  transition: none;
}

/* Die Scheibe unter der Figur — sie trägt den dunklen Grund, damit das Motiv
   selbst frei stehen kann. Der zweite Verlauf dunkelt ihren Fuß ab und trägt
   dort die Zahl; die hatte vorher eine eigene Platte mit Rahmen, und drei
   konzentrische Kanten auf 72 px waren zwei zu viel. */
.ab-passive-disc {
  position: absolute;
  top: 6%;
  left: 6%;
  width: 88%;
  height: 88%;
  border-radius: 50%;
  background:
    linear-gradient(to top, rgba(4, 3, 1, 0.78), rgba(4, 3, 1, 0) 34%),
    radial-gradient(circle at 50% 34%, #241708, #100e08 72%);
  box-shadow: inset 0 0 0 1px #45280f;
}

/* `contain`, nicht `cover`: die Vorlage ist eine freigestellte Figur, kein
   Splash — beschnitten blieb bei dieser Größe nur ein gelber Fleck übrig.

   Das Meep-Sprite ist hochformatig (1024×1536) und trägt oben wie unten einen
   Alpha-Rand. Die Box ist deshalb höher als breit: `contain` bindet hier an der
   HÖHE, die Breite folgt von selbst — eine breitere Box würde die Figur kein
   Stück wachsen lassen, eine höhere schiebt sie sofort an den Ring.

   Die Höhe ist gegen die beiden Nachbarn gesetzt, nicht gegen die Kachel: oben
   die Ring-INNENkante (4,5 %), unten die Oberkante der Zahl (~72 %). Die Figur
   sitzt mittig in diesem Streifen und hält zu beiden Seiten Luft. */
.ab-passive-art {
  position: absolute;
  top: 11%;
  left: 12%;
  width: 76%;
  height: 58%;
  object-fit: contain;
  image-rendering: high-quality;
  /* Statisch, nicht animiert: derselbe warme Schein wie an der Header-Kachel,
     aber ohne deren pulsierenden `drop-shadow` — der wäre pro Frame eine
     Neurasterung (Performance-Regel 2). Enger und schwächer als dort: auf
     72 px war aus dem Schein ein oranger Nebel um die ganze Figur geworden. */
  filter: drop-shadow(0 1px 4px rgba(251, 146, 60, 0.3));
}

/* Auf dem Fuß der Scheibe, damit die Zahl das Motiv nicht zerschneidet — und
   ohne Platte: den dunklen Grund liefert der Verlauf der Scheibe selbst.
   Sie steht in derselben Orange-Familie wie der Ring darüber, denn beide
   zählen dieselbe Strecke — der Ring als Anteil, die Zahl in Klicks. */
.ab-clicks {
  position: absolute;
  bottom: 7%;
  left: 50%;
  transform: translateX(-50%);
  max-width: 84%;
  /* Die Kurzform wird bis zu fünf Zeichen lang ("125Qa"). */
  font-size: calc(var(--ab-passive-size, 72px) * 0.21);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.01em;
  color: #fed7aa;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .ab-ring-meep,
  .ab-ring-head {
    transition: none;
  }

  .ab-ring-head-glow {
    animation: none;
  }
}
</style>
