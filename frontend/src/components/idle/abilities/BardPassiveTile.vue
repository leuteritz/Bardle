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
      EIN Ring, und der zählt den nächsten Meep — das ist die Frage, die der
      Spieler beim Klicken tatsächlich stellt. Gezeichnet über
      `stroke-dashoffset` einer Kreislinie, der Weg jedes Rings im Spiel; ein
      conic-gradient würde pro Änderung den Verlauf neu rechnen
      (Performance-Regel 11).

      Die Resonance hat hier bewusst keine eigene Linie mehr: zwei
      konzentrische Bänder auf 72 px lasen sich als Zierrat, und ihr Stand
      steht ohnehin im Fuß des Tooltips.
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
         stehen im Header und im Tooltip. Hier zählt die offene Strecke.

         Ist nichts mehr offen, steht hier NICHTS. Vorher trug die Stelle ein
         `✦` — ein Zeichen ohne Aussage, das rund 100ms stand und dann von der
         nächsten Zahl abgelöst wurde. Den Zustand trägt jetzt der volle Ring
         allein, und das Ereignis selbst meldet der Float darüber. -->
    <span v-if="clicksToMeep > 0" class="ab-clicks" aria-hidden="true">{{
      formatNumberCompact(clicksToMeep)
    }}</span>

    <!--
      Der Gewinn. Die ganze Klickstrecke zielt auf diesen Moment, und er lief
      bisher stumm ab — die Zahl sprang einfach auf einen neuen Wert.

      `:key` statt einer Liste: es steht immer nur einer gleichzeitig, und der
      Key-Bump ist es, der die CSS-Animation neu anstößt (dasselbe Muster wie
      `.chime-popup` am Sonnenklick). Der Betrag kommt aus dem tatsächlichen
      Zuwachs, nicht als feste 1 — gibt es später mehr als einen Meep je
      Auslösung, steht hier von selbst „+3".

      `aria-hidden`, weil die laufende Produktion ebenfalls Meeps abwirft: ein
      Screenreader bekäme sonst im Sekundentakt dieselbe Zeile vorgelesen. Der
      Bestand steht im Header.
    -->
    <div
      v-if="gainAmount > 0"
      :key="gainKey"
      class="ab-meep-gain"
      :style="{ '--ab-meep-float-ms': `${ABILITY_MEEP_GAIN_FLOAT_MS}ms` }"
      aria-hidden="true"
    >
      <img class="ab-meep-gain-art" :src="MEEP_ART_IMAGE_SM" alt="" draggable="false" />
      <span class="ab-meep-gain-value">+{{ formatNumberCompact(gainAmount) }}</span>
      <span class="ab-meep-gain-label">{{ gainAmount === 1 ? 'MEEP' : 'MEEPS' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BARD_PASSIVE } from '@/config/progression/bardAbilities'
import {
  ABILITY_MEEP_GAIN_FLOAT_MS,
  MEEP_ART_IMAGE,
  MEEP_ART_IMAGE_SM,
} from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'

const props = defineProps<{
  /** 0..1 — Weg zum nächsten Meep. */
  meepFill: number
  /** Klicks, die bis zum nächsten Meep noch fehlen; 0, wenn er fällig ist. */
  clicksToMeep: number
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

/**
 * Radius und Umfang der Kreislinie im 100×100-Koordinatenraum des SVG. Der
 * Radius zieht mit der halben Strichstärke nach außen, damit die ÄUSSERE Kante
 * bei 48,5 bleibt: die Kachel behält ihren Umriss, dünner wird die Linie nach
 * innen. Zur Strichstärke 3 (siehe `.ab-ring-*`) gehört damit 48,5 − 1,5 = 47.
 */
const RING_R = 47
const RING_C = 2 * Math.PI * RING_R
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

/* Ist der Meep fällig, steht der Ring voll — dann trägt er die hellere Stufe
   derselben Familie. Ein einmaliger Umschlag, keine laufende Animation. */
.ab-passive--due .ab-ring-meep {
  stroke: #fdba74;
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

/* ── Der Gewinn ───────────────────────────────────────────────────────────
   Steht ÜBER der Kachel, nicht in ihr: die Kachel zeigt eine offene Strecke,
   der Float ein abgeschlossenes Ereignis — zwei verschiedene Aussagen, die
   sich nicht überlagern dürfen. Die Kachel hat kein `overflow: hidden`, das
   Element darf also frei über ihren Rand hinausragen.

   `pointer-events: none` ist Pflicht und kein Detail: die Leiste lässt die
   Lücken zwischen ihren Kacheln bewusst zur Sonne durch, und ein Float, das
   1,4s lang über ihr steht, würde dort sonst jeden Klick schlucken. */
.ab-meep-gain {
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 7px;
  background: linear-gradient(to bottom, #1e1409, #14120c);
  border: 2px solid #7a4e20;
  border-radius: 4px;
  /* Alles statisch — die Animation fasst nur `transform` und `opacity` an, der
     Kasten wird also EINMAL gerastert und danach nur noch geblendet
     (Performance-Regel 2). Der warme Schein trägt den Gewinn über den dunklen
     Grund des Orbits hinaus; ohne ihn ging der Kasten zwischen den Kacheln
     unter, deren Rahmen dieselbe Farbe hat. */
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 20px rgba(251, 146, 60, 0.3),
    0 6px 18px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  pointer-events: none;
  animation: ab-meep-rise var(--ab-meep-float-ms, 1400ms) cubic-bezier(0.22, 1, 0.36, 1)
    forwards;
}

/* Dieselbe Linie, die der Tooltip der Leiste trägt (`.ab-tip::before`) — nur
   hier in Meep-Orange statt in der Leitfarbe einer Fähigkeit. Sie bindet den
   Float an die Leiste, statt ihn wie eine fremde Meldung wirken zu lassen. */
.ab-meep-gain::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(to right, #7c2d12, #fb923c 35%, #fed7aa 50%, #fb923c 65%, #7c2d12);
}

/* Die 128er-Stufe, nicht das volle Artwork: hier misst die Figur 24–37px,
   siehe MEEP_ART_IMAGE_SM. */
.ab-meep-gain-art {
  width: calc(var(--ab-passive-size, 72px) * 0.34);
  height: calc(var(--ab-passive-size, 72px) * 0.34);
  object-fit: contain;
  image-rendering: high-quality;
  filter: drop-shadow(0 1px 3px rgba(251, 146, 60, 0.45));
}

/* Der Betrag ist die Antwort, das Wort daneben nur die Frage dazu — deshalb
   trägt er das Gewicht und die hellere Stufe des Meep-Orange, dieselbe, die
   der Ring im fälligen Zustand zeigt. */
.ab-meep-gain-value {
  font-size: calc(var(--ab-passive-size, 72px) * 0.36);
  font-weight: 900;
  line-height: 1;
  color: #fdba74;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 10px rgba(251, 146, 60, 0.5);
  font-variant-numeric: tabular-nums;
}

.ab-meep-gain-label {
  font-size: calc(var(--ab-passive-size, 72px) * 0.17);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.09em;
  color: #fed7aa;
  opacity: 0.82;
}

/* Der Überschwung bei 16% ist das Anschlagen — ohne ihn blendet der Gewinn
   nur ein, und ein Einblenden liest sich als Zustand, nicht als Ereignis. */
@keyframes ab-meep-rise {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(8px) scale(0.7);
  }
  16% {
    opacity: 1;
    transform: translateX(-50%) translateY(-2px) scale(1.08);
  }
  30% {
    opacity: 1;
    transform: translateX(-50%) translateY(-7px) scale(1);
  }
  72% {
    opacity: 1;
    transform: translateX(-50%) translateY(-22px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-40px) scale(0.94);
  }
}

/* Ohne Fahrt: der Gewinn steht still an seinem Platz und blendet aus. Die
   Keyframes stehen bewusst AUSSERHALB der Media-Query — verschachtelt hinge
   ihr Scope-Suffix davon ab, dass das Scoped-Plugin auch in @media hineinsieht,
   und ein nicht suffigierter Name findet seine Keyframes nie. */
@keyframes ab-meep-hold {
  0%,
  72% {
    opacity: 1;
    transform: translateX(-50%);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ab-ring-meep {
    transition: none;
  }

  .ab-meep-gain {
    animation-name: ab-meep-hold;
  }
}
</style>
