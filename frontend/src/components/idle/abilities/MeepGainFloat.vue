<template>
  <!--
    Der Gewinn. Die ganze Klickstrecke der Passiv-Kachel zielt auf diesen
    Moment, und er lief bisher stumm ab — die Zahl darunter sprang einfach auf
    einen neuen Wert.

    Freistehend, ohne Kasten: ein Rahmen samt Grund machte daraus ein zweites
    HUD-Element über dem HUD, und über der Kachel soll nur eine Zahl aufsteigen.
    Das Wort „MEEP" ist aus demselben Grund weg — es sagte, was das Bild daneben
    bereits zeigt.

    Ohne Zustand: `v-if` und `:key` liegen beim Aufrufer. Die Komponente wird
    gemountet, spielt ihre Animation und wird entsorgt; der Key-Bump dort ist
    es, der sie neu anstößt (dasselbe Muster wie `.chime-popup` am Sonnenklick).

    `aria-hidden`, weil die laufende Produktion ebenfalls Meeps abwirft: ein
    Screenreader bekäme sonst im Sekundentakt dieselbe Zeile vorgelesen. Der
    Bestand steht im Header.
  -->
  <div
    class="mg-float"
    :style="{ '--mg-float-ms': `${ABILITY_MEEP_GAIN_FLOAT_MS}ms` }"
    aria-hidden="true"
  >
    <img class="mg-art" :src="MEEP_ART_IMAGE_SM" alt="" draggable="false" @dragstart.prevent />
    <span class="mg-value">+{{ formatNumberCompact(amount) }}</span>
  </div>
</template>

<script setup lang="ts">
import { ABILITY_MEEP_GAIN_FLOAT_MS, MEEP_ART_IMAGE_SM } from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'

defineProps<{
  /** Gerade gutgeschriebene Meeps. Kommt aus dem tatsächlichen Zuwachs, nicht
   *  als feste 1 — gibt es später mehr je Auslösung, steht hier „+3". */
  amount: number
}>()
</script>

<style scoped>
/* Hängt an der `position: relative` der Passiv-Kachel und braucht deshalb
   keinen eigenen Wrapper. Kein Grund, kein Rahmen, kein Schatten am Kasten —
   es GIBT keinen Kasten.

   `pointer-events: none` ist Pflicht und kein Detail: die Fähigkeitenleiste
   lässt die Lücken zwischen ihren Kacheln bewusst zur Sonne durch, und der
   Float steht gut eine Sekunde über ihr. */
.mg-float {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  /* Relativ, nicht fest: die negativen Margins der Bildbox zehren einen Teil
     der Lücke auf, und ein fester Wert wäre auf 4K wieder ein Kleben. */
  gap: calc(var(--ab-passive-size, 72px) * 0.13);
  /* `max-content` ist Pflicht, nicht Geschmack: ein absolut gesetztes Element
     mit `left: 50%` bekommt als Shrink-to-fit-Breite nur, was RECHTS davon im
     Containing Block liegt — bei einer 72px-Kachel also 36px. Ohne diese Zeile
     wurde der Float auf 48px gequetscht, seine Kinder liefen nach rechts über,
     und `translateX(-50%)` zog um die halbe FALSCHE Breite zurück. Ergebnis
     war eine Gruppe, die rund 12px rechts der Kachelmitte stand. */
  width: max-content;
  white-space: nowrap;
  pointer-events: none;
  /* Auch als Basis-Transform, nicht nur in den Keyframes — sonst steht der
     Float bei jedem `animation: none` (reduzierte Bewegung ist davon nicht
     betroffen, aber jede Messung und jedes Debugging) um seine halbe Breite
     daneben. */
  transform: translateX(-50%);
  animation: mg-rise var(--mg-float-ms, 1400ms) cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Die Höhe der BOX; die Breite folgt dem Seitenverhältnis. Das ergibt 45px auf
   Full HD, 55px ab 2400 und 67px ab 3400 — die Breakpoints der Leiste tragen
   das von selbst, weil sie `--ab-passive-size` setzen.

   Die Box ist höher als die halbe Kachel, weil das Sprite oben und unten
   durchsichtigen Rand trägt (gemessen 11,7 % und 12,5 %): sichtbar bleiben
   damit rund 34px, also genau die Höhe der Ziffern daneben. */
.mg-art {
  --mg-art-h: calc(var(--ab-passive-size, 72px) * 0.62);
  height: var(--mg-art-h);
  width: auto;
  object-fit: contain;
  image-rendering: high-quality;
  /* Denselben Rand trägt das Sprite auch seitlich — gemessen 18,8 % links und
     21,2 % rechts der 85×128-Stufe. Ohne diese Korrektur steht neben der Figur
     Luft, die in der Gruppe als Versatz nach rechts liest; die Box umschließt
     so nur noch die Figur selbst. Faktor = Rand-Anteil × Seitenverhältnis
     (85/128 = 0,664). */
  margin-left: calc(var(--mg-art-h) * -0.125);
  margin-right: calc(var(--mg-art-h) * -0.141);
  /* Statisch — die Animation fasst nur `transform` und `opacity` an, das
     Element wird einmal gerastert und danach nur geblendet
     (Performance-Regel 2). */
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.7));
}

/* Ohne Kasten muss die Zahl ihre Lesbarkeit selbst mitbringen: unter ihr liegt
   der Orbit, und dort kann alles stehen — Sonne, Stern, heller Nebel. Dasselbe
   Mittel wie bei den Schadenszahlen der Boss-Arena; `paint-order` ist dabei
   Pflicht, sonst frisst die Kontur die Glyphe von innen auf. */
.mg-value {
  font-size: calc(var(--ab-passive-size, 72px) * 0.5);
  font-weight: 900;
  line-height: 1;
  color: #fdba74;
  font-variant-numeric: tabular-nums;
  -webkit-text-stroke: 3px #16100a;
  paint-order: stroke fill;
  text-shadow:
    0 2px 6px rgba(0, 0, 0, 0.85),
    0 0 14px rgba(251, 146, 60, 0.45);
}

/* Der Überschwung bei 16% ist das Anschlagen — ohne ihn blendet der Gewinn nur
   ein, und ein Einblenden liest sich als Zustand, nicht als Ereignis. */
@keyframes mg-rise {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(10px) scale(0.68);
  }
  16% {
    opacity: 1;
    transform: translateX(-50%) translateY(-2px) scale(1.1);
  }
  30% {
    opacity: 1;
    transform: translateX(-50%) translateY(-8px) scale(1);
  }
  70% {
    opacity: 1;
    transform: translateX(-50%) translateY(-26px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-48px) scale(0.92);
  }
}

/* Ohne Fahrt: der Gewinn steht still an seinem Platz und blendet aus. Die
   Keyframes stehen bewusst AUSSERHALB der Media-Query — verschachtelt hinge
   ihr Scope-Suffix davon ab, dass das Scoped-Plugin auch in @media hineinsieht,
   und ein nicht suffigierter Name findet seine Keyframes nie. */
@keyframes mg-hold {
  0%,
  70% {
    opacity: 1;
    transform: translateX(-50%);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mg-float {
    animation-name: mg-hold;
  }
}
</style>
