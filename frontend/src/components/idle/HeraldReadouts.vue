<script setup lang="ts">
/**
 * Die Ablesungsspalte einer Zeremonie — zwei Zahlen mit Richtung.
 *
 * Sie füllt den `meta`-Schlitz des Banners, genau so wie `HeraldReceiptCard`
 * ihn mit Zähler und Zahlenfeld füllt. Kein eigener Rahmen, keine eigene Fläche
 * und keine eigene Schriftskala: alle Maße hängen an denselben `--hb-*`, die
 * das Banner setzt — deshalb braucht diese Spalte KEINE eigenen Breakpoints und
 * kann von der Karte nicht abdriften.
 *
 * Die Gestalt ist die des Angebotsportals (`FirmamentOfferTip`): der WERT steht
 * über seiner Beschriftung und groß — „+145 %" ist die Antwort, „Champion DPS"
 * nur die Frage dazu —, und der Pfeil trägt dieselbe Aussage wie die Farbe,
 * weil er als einziger auch ohne Farbsehen ankommt. Wer im Firmament ein Portal
 * überfahren und dann geklickt hat, sieht hier dieselben zwei Blöcke wieder.
 */
import type { HeraldReadout } from '@/composables/ui/useHerald'

/* `readonly`, weil der Herold seinen Zustand als DeepReadonly herausgibt —
   dieselbe Behandlung, die `HeraldReceiptView` fuer die Quittung traegt. */
defineProps<{ readouts: readonly HeraldReadout[] }>()
</script>

<template>
  <div class="hro">
    <div
      v-for="(line, i) in readouts"
      :key="i"
      class="hro-line"
      :class="line.positive ? 'hro-line--up' : 'hro-line--down'"
    >
      <span class="hro-value">
        <span class="hro-arrow">{{ line.positive ? '▲' : '▼' }}</span>
        {{ line.value }}
      </span>
      <span class="hro-label">{{ line.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.hro {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: calc(var(--hb-gap) * 0.32);
  align-items: stretch;
}

/* Die Richtung sitzt als KANTE, nicht als Fläche: das Banner trägt oben und
   unten schon eine Akzentlinie und seitlich seinen Schein — zwei farbige
   Kästen darin wären der dritte Farbträger auf derselben Karte. */
.hro-line {
  padding: calc(var(--hb-gap) * 0.16) calc(var(--hb-gap) * 0.3);
  background: rgba(0, 0, 0, 0.32);
  border-left: 3px solid;
  border-radius: 4px;
}

.hro-line--up {
  border-left-color: #52b830;
}

.hro-line--down {
  border-left-color: #cc6050;
}

/* Tabellenziffern greifen in MedievalSharp nicht — die Zahl steht hier aber
   still, sie wird nie hochgezählt. */
.hro-value {
  display: block;
  font-size: calc(var(--hb-headline) * 0.5);
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
}

/* Klein gesetzt, damit er den Wert nicht verdrängt: gelesen wird die Zahl, der
   Pfeil ordnet sie nur ein. */
.hro-arrow {
  font-size: 0.62em;
  vertical-align: 0.16em;
  opacity: 0.85;
}

.hro-line--up .hro-value {
  color: #7fc95e;
}

.hro-line--down .hro-value {
  color: #d9755f;
}

.hro-label {
  display: block;
  margin-top: 1px;
  font-size: calc(var(--hb-sub) * 0.72);
  line-height: 1.15;
  color: #8a7a5c;
  white-space: nowrap;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
