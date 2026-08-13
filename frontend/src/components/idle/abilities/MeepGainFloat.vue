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
  /* NULLBREIT plus `justify-content: center` — der Float ist keine Box, die
     zentriert wird, sondern eine ACHSE, an der ausgerichtet wird. `left: 50%`
     legt sie auf die Kachelmitte; bei nullbreitem Container ist der freie Raum
     negativ (`0 − Inhaltsbreite`), und `center` verteilt ihn gleichmäßig auf
     beide Seiten. Die Gruppe läuft also um exakt ihre halbe Breite nach links
     und rechts über die Achse und steht damit mittig.

     Warum nicht wieder `width: max-content` + `translateX(-50%)`, was dasselbe
     Ziel hatte: weil das die Position an die SELBST GEMESSENE Breite hängt, und
     die ist keine Konstante —
       · das Bild hatte vor seinem `load` mit `width: auto` gar keine (der Float
         zeigte dann kurz nur die Zahl und sprang beim Laden, gemessen; siehe
         `.mg-art`),
       · „+1" ist schmaler als „+1.2K",
       · und vor dem Font-Swap misst die Fallback-Schrift.
     Die Flex-Verteilung kennt diese Zeitpunkte nicht: sie rechnet bei jedem
     Layout neu, statt einen Prozentsatz auf eine einmal gemessene Breite
     anzuwenden.

     (Davor stand hier `width: max-content` gegen einen noch ÄLTEREN Versatz:
     ein absolut gesetztes Element mit `left: 50%` bekommt als
     Shrink-to-fit-Breite nur, was RECHTS davon im Containing Block liegt — bei
     72px Kachel also 36px, Ergebnis waren 12px daneben. Die Zeile heilte das
     Symptom; die Wurzel war schon damals, überhaupt anhand der eigenen Breite
     zu zentrieren.) */
  width: 0;
  justify-content: center;
  white-space: nowrap;
  pointer-events: none;
  animation: mg-rise var(--mg-float-ms, 1400ms) cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Bei nullbreitem Container darf nichts schrumpfen — sonst quetschte der
   Flex-Algorithmus die Kinder auf ihre automatische Mindestgröße. */
.mg-art,
.mg-value {
  flex: 0 0 auto;
}

/* Die Höhe der BOX, aus der die Breite folgt. Das ergibt 45px auf Full HD,
   55px ab 2400 und 67px ab 3400 — die Breakpoints der Leiste tragen das von
   selbst, weil sie `--ab-passive-size` setzen.

   Die Box ist höher als die halbe Kachel, weil das Sprite oben und unten
   durchsichtigen Rand trägt (gemessen 11,7 % und 12,5 %): sichtbar bleiben
   damit rund 34px, also genau die Höhe der Ziffern daneben. */
.mg-art {
  --mg-art-h: calc(var(--ab-passive-size, 72px) * 0.62);
  /* Die Breite EXPLIZIT, nicht `auto`: ein noch nicht dekodiertes Bild hat kein
     Seitenverhältnis, und `auto` ergibt dann eine Box, die nichts mit der
     späteren zu tun hat. Das Sprite misst 85×128 (verifiziert), das Verhältnis
     ist also fest bekannt — damit stimmt die Box ab dem ERSTEN Frame, auch beim
     kalten Cache. */
  --mg-art-w: calc(var(--mg-art-h) * 0.664);
  height: var(--mg-art-h);
  width: var(--mg-art-w);
  /* Pflicht, sobald der Anker nullbreit ist: Tailwinds Preflight setzt allen
     Bildern `max-width: 100%`, und 100 % des Containers sind hier NULL — das
     Sprite wurde damit auf 0 gequetscht (gemessen: Bildbreite 0, die Zahl
     rutschte um die volle Figurbreite nach links). */
  max-width: none;
  object-fit: contain;
  image-rendering: high-quality;
  /* Das Sprite trägt seitlich 18,8 % Alpha-Rand links und 21,2 % rechts
     (gemessen). Die negativen Margins holen ihn aus dem Layout, womit sich die
     Layout-Box mit der SICHTBAREN Figur deckt.

     Das ist die Voraussetzung dafür, dass „mittig" überhaupt stimmt: sonst
     zentriert die Flex-Verteilung des Elternteils den durchsichtigen Rand mit,
     und weil er links und rechts verschieden breit ist, säße die Gruppe schief.
     Beide Werte sind rechnerisch dieselben wie in der Fassung davor (−0,125
     bzw. −0,141 der HÖHE), nur über die Breite ausgedrückt statt über die Höhe. */
  margin-left: calc(var(--mg-art-w) * -0.188);
  margin-right: calc(var(--mg-art-w) * -0.212);
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
   ein, und ein Einblenden liest sich als Zustand, nicht als Ereignis.

   Kein `translateX(-50%)` mehr in den Keyframes: die Waagerechte macht das
   Layout (nullbreiter Anker + negatives Margin), die Animation nur noch Höhe
   und Größe. Das ist auch der Grund, warum der Anschlag jetzt sauber wirkt —
   `transform-origin` liegt bei `width: 0` AUF der Achse, der Überschwung
   pivotiert also genau auf dem Meep statt auf einer Gruppenmitte, die je nach
   Betrag woanders lag. */
@keyframes mg-rise {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.68);
  }
  16% {
    opacity: 1;
    transform: translateY(-2px) scale(1.1);
  }
  30% {
    opacity: 1;
    transform: translateY(-8px) scale(1);
  }
  70% {
    opacity: 1;
    transform: translateY(-26px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-48px) scale(0.92);
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
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mg-float {
    animation-name: mg-hold;
  }
}
</style>
