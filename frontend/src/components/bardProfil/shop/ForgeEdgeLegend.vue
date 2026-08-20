<template>
  <!-- `.stop`, damit ein Klick auf die Legende die Anheftung nicht abräumt:
       sie liegt im Viewport der Bühne, und dort räumt jeder Klick ins Leere
       den angehefteten Knoten ab. Dieselbe Vorsichtsmassnahme wie an der
       Zoom-Leiste. -->
  <div class="tree-legend" @click.stop>
    <ul class="fl-rows">
      <li v-for="row in rows" :key="row.id" class="fl-row">
        <svg
          class="fl-swatch"
          :class="`fl-swatch--${row.id}`"
          :viewBox="`0 0 ${FORGE_EDGE_LEGEND_SWATCH_W} 6`"
          :width="FORGE_EDGE_LEGEND_SWATCH_W"
          height="6"
          aria-hidden="true"
        >
          <line
            x1="1" y1="3" :x2="FORGE_EDGE_LEGEND_SWATCH_W - 1" y2="3"
            :class="row.cls" :stroke-width="row.width"
            stroke-linecap="round"
          />
        </svg>
        <span class="fl-label">{{ row.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * Die Legende zur Kantensprache der Star-Forge-Bühne.
 *
 * Sie zeigt keine Farbquadrate mit Namen daneben, sondern die STRICHE SELBST:
 * jede Probe ist eine SVG-Linie, die dieselbe CSS-Klasse trägt wie die Kante,
 * die sie erklärt. Wer die Zeile ansieht, hat das Bild schon gesehen. Genau
 * daran ist die erste Fassung des Ertrags-Kopfs gescheitert (er ist inzwischen
 * ganz gefallen) — eine Probe, die
 * anders aussieht als die Sache, die sie erklärt, muss selbst erst erklärt
 * werden.
 *
 * Deshalb liegt die Optik der Kanten GLOBAL in `assets/rpg-theme.css`
 * (Abschnitt „die KANTENSPRACHE") und nicht im scoped Block der Bühne: eine
 * eigene Komponente erbt fremde scoped-Regeln nicht, und die Farben hier ein
 * zweites Mal zu führen wäre die zweite Quelle für genau die Form, die Bühne
 * und Legende zusammenhält. Dasselbe Rezept wie bei `.fc-archive` und
 * `.fc-cost*`. Scoped bleibt nur, was nirgends geteilt ist: die Kartusche und
 * das Zeilen-Layout.
 *
 * Sie trägt WEDER Titel NOCH Schaltzeile. Beides stand einmal da und ist
 * gefallen, als die Legende anfing, sich auf das Vorhandene zu kürzen — im
 * frischen Spielstand sind es vier Zeilen, und ein Bedienelement für sechzig
 * Pixel ist mehr Bedienung als Auskunft.
 */
import { FORGE_EDGE_LEGEND_SWATCH_W } from '@/config/constants'
import type { ForgeEdgeLegendRow } from '@/config/constants'

defineProps<{
  /**
   * Nur die Zeilen, für die auf der Bühne gerade mindestens eine Kante steht.
   *
   * GEFILTERT wird beim Aufrufer, nicht hier: die Zähler dafür sind die
   * Kanten-Töpfe der Bühne, und eine Legende, die sich ihre Zustände selbst aus
   * `useForgeUpgrades()` holte, schriebe die Zustandsleiter ein zweites Mal
   * aus. Hier steht nur, wie aus Zeilen ein Block wird.
   */
  rows: readonly ForgeEdgeLegendRow[]
}>()
</script>

<style scoped>
/* Dieselbe Kartusche wie Zoom-Leiste und Kompass — es ist dasselbe Chrome und
   soll als dasselbe gelesen werden.

   `z-index: 12` liegt bewusst UNTER dem Kompass (15). Der weicht nur der
   Zoom-Ecke aus (`forgeSpotlightView.ts`) und kann jederzeit hier stehen.
   Statt eine zweite Sperrfläche samt Spec zu bauen, gilt die Rangfolge: der
   Zeiger ist die Antwort auf eine gerade gestellte Frage, die Legende ist
   Dauerauskunft. Er läuft über sie, nicht dahinter.

   `bottom: 14px` ist dieselbe Zahl, die Zoom-Leiste und Admin-Knopf an ihren
   Ecken tragen — eine eigene wäre eine zweite Quelle für denselben Rand. */
.tree-legend {
  position: absolute;
  bottom: 14px;
  left: 14px;
  z-index: 12;
  border: 1px solid #4a3010;
  border-radius: 4px;
  background: #16110a;
  user-select: none;
}

.fl-rows {
  margin: 0;
  padding: 7px 9px;
  list-style: none;
}

.fl-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 1.5px 0;
}

.fl-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(232, 220, 192, 0.62);
}

/* Die PROBE. Farbe und Strichbild erbt sie von der globalen Klasse der Kante —
   deshalb steht hier nichts davon, und deshalb können Bühne und Legende nicht
   auseinanderlaufen.

   Die DECKKRAFT erbt sie bewusst nicht: 155 Linien über der ganzen Bühne
   brauchen Zurückhaltung, eine 44-px-Probe in einer Kartusche nicht. Bei 0,28
   wäre die `sealed`-Zeile schlicht leer. Dass diese Regel gewinnt, ist keine
   Reihenfolge, sondern Spezifität — scoped hängt ein `[data-v-*]` an
   `.fl-swatch` und schlägt damit die einfache Klasse im globalen Blatt. */
.fl-swatch {
  flex-shrink: 0;
  display: block;
  overflow: visible;
}

.fl-swatch line {
  opacity: 1;
}

/* Die drei Zustände, die auf der Bühne die KNOTENfarbe tragen, haben hier
   keinen Ton zu erben — sie stehen stellvertretend in Forge-Gold. Ihre Aussage
   ist ohnehin die Breite: derselbe Weg, nur weiter gegangen. Dasselbe gilt für
   die Brücke, die dort die Farbe ihrer Zielzone trägt.

   `ready` ist der dritte davon. Ihn hier in Grün zu zeigen wäre bequem und
   falsch: auf der Bühne ist keine einzige Kaufbar-Ader grün, und eine Legende,
   die eine Farbe nennt, die nirgends vorkommt, führt genau dorthin, wo man
   nicht suchen muss. */
.fl-swatch--grown line,
.fl-swatch--ready line,
.fl-swatch--maxed line {
  stroke: #c89040;
}

.fl-swatch--bridge line {
  stroke: #8fa8ff;
}

/* Die Rinne ist der dunkelste Ton des Netzes und stünde auf der Kartusche fast
   unsichtbar. Sie wird hier eine Spur aufgehellt — die Zeile soll zeigen, DASS
   dort eine Verbindung liegt, und genau das ist ihre Aussage. */
.fl-swatch--sealed line {
  stroke: #4a3f2c;
}

@media (max-height: 1100px) {
  .fl-row {
    padding: 0.5px 0;
  }

  .fl-rows {
    padding: 5px 9px;
  }
}
</style>
