<script setup lang="ts">
/**
 * Der Ladeschleier des Battle-Tabs.
 *
 * Er deckt das Rift-Board, während es entsteht — der Weg über das
 * Bottom-Scoreboard führt mitten in einen laufenden Kampf, und was dabei in
 * einem Frame aufgebaut wird (Score-Leiste, Minimap, zwei Team-Spalten,
 * Meta-Platten, Kill-Feed) reißt das Layout sichtbar auseinander. Die Zahlen
 * dazu stehen bei BATTLE_TAB_LOADER_MIN_MS.
 *
 * Zwei Dinge machen ihn maßhaltig, und beide sind Bedingung dafür, dass das
 * Aufdecken ein Schärferwerden statt eines Sprungs ist:
 *
 *   • Er ist selbst ein Size-Container und rechnet mit DENSELBEN cq-Formeln wie
 *     das Board (Leistenhöhen, `--hud-w`, Meta-Platten). Das Skelett sitzt damit
 *     auf jeder Desktop-Auflösung dort, wo gleich der Inhalt sitzt — statt auf
 *     Maßen, die nur auf Full HD stimmen.
 *   • Die Karte in der Mitte ist wie im Board ein Quadrat aus `min(Breite,
 *     Höhe)`: auf flachen Viewports schrumpft sie und die Seitenspalten werden
 *     breiter, auf hohen umgekehrt.
 *
 * Für die Framerate gilt dasselbe wie bei den anderen Schleiern: er steht per
 * Definition in den Frames, in denen der Hauptthread blockiert ist. Bewegt wird
 * deshalb ausschließlich `transform` (der wandernde Glanz) — das läuft im
 * Compositor weiter, während der Hauptthread rechnet.
 */
import { computed } from 'vue'
import { BATTLE_PHASES } from '@/config/constants'
import type { BattlePhaseKey } from '@/types'
import LoadingBeacon from '@/components/ui/LoadingBeacon.vue'

const props = defineProps<{
  /** Phase, deren Bild gleich erscheint — Farbe und Wappen kommen von dort. */
  phaseKey: BattlePhaseKey
  /** `performance.now()` beim Aufziehen des Schleiers — Basis der Zeitangabe. */
  startedAt: number
}>()

/**
 * Farbe und Wappen kommen aus der Phasen-Registry, nicht aus eigenen Werten:
 * der Schleier trägt damit automatisch die Sprache der Phase, die hinter ihm
 * aufgeht — und eine neue Phase bleibt ein einziger Registry-Eintrag.
 */
const phase = computed(() => BATTLE_PHASES[props.phaseKey] ?? BATTLE_PHASES.battle)

/** Die Ehrung zählt aus, der Kampf schaltet sich zu — zwei Bilder, ein Aufbau. */
const beaconTitle = computed(() => (props.phaseKey === 'honor' ? 'Honors' : 'The Rift'))
const beaconCaption = computed(() =>
  props.phaseKey === 'honor' ? 'Tallying the result' : 'Tuning in to the live match',
)

/** Fünf Plätze je Seite — dieselbe Aufstellung, die die Team-Spalten zeigen. */
const TEAM_SEATS = 5
/** Vier Kacheln in der Score-Leiste je Seite (Türme, Inhibitoren, Drakes, Gold). */
const SCORE_TILES = 4
</script>

<template>
  <div class="btl" :style="{ '--acc': phase.color }" role="status" aria-live="polite">
    <!-- ══ Score-Leiste ══ -->
    <div class="btl-score" aria-hidden="true">
      <div class="btl-score-side">
        <span v-for="i in SCORE_TILES" :key="`b-${i}`" class="btl-chip" />
      </div>
      <span class="btl-score-center" />
      <div class="btl-score-side btl-score-side--right">
        <span v-for="i in SCORE_TILES" :key="`r-${i}`" class="btl-chip" />
      </div>
    </div>

    <!-- ══ Momentum-Leiste ══
         Sie ist das zweite Wurzelelement der Score-Leiste und steht im Fluss:
         ohne sie säßen Karte und Spalten 27 px zu hoch, und das Aufdecken wäre
         ein Sprung statt eines Schärferwerdens. -->
    <div class="btl-momentum" aria-hidden="true">
      <span class="btl-momentum-pct" />
      <span class="btl-momentum-track" />
      <span class="btl-momentum-pct" />
    </div>

    <!-- ══ Mitte: quadratische Karte, zwei Spalten, zwei Meta-Platten ══ -->
    <div class="btl-middle" aria-hidden="true">
      <div class="btl-map">
        <span class="btl-map-lane btl-map-lane--top" />
        <span class="btl-map-lane btl-map-lane--mid" />
        <span class="btl-map-lane btl-map-lane--bot" />
        <span class="btl-map-core" />
      </div>

      <div class="btl-hud btl-hud--left">
        <span v-for="i in TEAM_SEATS" :key="`hl-${i}`" class="btl-seat" />
      </div>
      <div class="btl-hud btl-hud--right">
        <span v-for="i in TEAM_SEATS" :key="`hr-${i}`" class="btl-seat" />
      </div>

      <span class="btl-meta btl-meta--left" />
      <span class="btl-meta btl-meta--right" />
    </div>

    <!-- ══ Kill-Feed ══ -->
    <div class="btl-feed" aria-hidden="true" />

    <!-- Ein einziger wandernder Glanz über allem — eine Fläche, die verschoben
         wird, kein Verlauf, der pro Frame neu entsteht. -->
    <span class="btl-sheen" aria-hidden="true" />

    <LoadingBeacon
      class="btl-beacon"
      :accent="phase.color"
      :icon="phase.icon"
      :title="beaconTitle"
      :caption="beaconCaption"
      :started-at="startedAt"
    />
  </div>
</template>

<style scoped>
/* Deckt den ganzen Tab-Layer und liegt über dem Board (dessen .rift-board steht
   auf z-index 10). Deckend ab dem ersten Frame — eine Einblendung hieße, genau
   das durchscheinen zu lassen, was verdeckt werden soll. */
.btl {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #111008;
  /* Derselbe Size-Container wie .rift-board — nur so treffen die cq-Maße
     darunter dieselben Pixel wie im echten Board. */
  container-type: size;
  --hud-w: clamp(180px, min(20cqw, 40cqh), 420px);
}

/* ══ Score-Leiste ══ Maße wie .score-bar */
.btl-score {
  height: clamp(36px, 6cqh, 48px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.5cqw, 18px);
  padding: 0 clamp(10px, 1.5cqw, 18px);
  border-bottom: 2px solid #3e200a;
  background: #0d0c08;
}
.btl-score-side {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(8px, 1.2cqw, 14px);
}
.btl-score-side--right {
  justify-content: flex-start;
}
.btl-chip {
  width: clamp(26px, 2.6cqw, 40px);
  height: 42%;
  border-radius: 4px;
  background: #17150e;
  border: 1px solid #241d13;
}
/* Der Kill-Block in der Mitte trägt als einziger die Phasenfarbe — er ist der
   Anker, an dem das Auge die Leiste später wiederfindet. */
.btl-score-center {
  width: clamp(64px, 7cqw, 104px);
  height: 58%;
  border-radius: 4px;
  background: color-mix(in srgb, var(--acc) 8%, #17150e);
  border: 1px solid color-mix(in srgb, var(--acc) 32%, #241d13);
}

/* ══ Momentum-Leiste ══ Maße wie .momentum-meter / .momentum-track */
.btl-momentum {
  height: clamp(22px, 4cqh, 30px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 clamp(10px, 1.2cqw, 14px);
  border-bottom: 2px solid #3e200a;
  background: #0d0c08;
}
.btl-momentum-pct {
  width: clamp(38px, 6.6cqh, 50px);
  flex-shrink: 0;
  height: 46%;
  border-radius: 4px;
  background: #17150e;
}
.btl-momentum-track {
  flex: 1;
  height: clamp(12px, 2.4cqh, 16px);
  border-radius: 4px;
  border: 1px solid #3e200a;
  background: #16140e;
}

/* ══ Mitte ══ */
.btl-middle {
  flex: 1;
  position: relative;
  min-height: 0;
}

/* Die Karte ist im Board ein zentriertes Quadrat aus min(Breite, Höhe).
   `inset: 0` + `margin: auto` + `aspect-ratio` ergibt genau das und zentriert in
   beiden Achsen — anders als eine feste Höhe, die auf breiten Viewports aus dem
   Container liefe. Die 98 % sind der Rand, den die Karte im Board zur Leiste und
   zum Kill-Feed hält (gemessen: .map-square 555 px in 567 px Mitte). */
.btl-map {
  position: absolute;
  inset: 0;
  margin: auto;
  aspect-ratio: 1;
  max-width: 100%;
  max-height: 98%;
  border: 1px solid #241d13;
  background: #131109;
}
.btl-map-lane {
  position: absolute;
  background: #221d13;
}
/* Drei Bahnen von Ecke zu Ecke: zwei am Rand, eine über die Diagonale. */
.btl-map-lane--top {
  left: 12%;
  right: 62%;
  top: 12%;
  bottom: 12%;
  border-radius: 4px;
}
.btl-map-lane--bot {
  left: 12%;
  right: 12%;
  top: 62%;
  bottom: 12%;
  border-radius: 4px;
}
.btl-map-lane--mid {
  left: 18%;
  right: 18%;
  top: 49%;
  height: 3%;
  transform: rotate(-45deg);
  border-radius: 4px;
}
.btl-map-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 13%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: color-mix(in srgb, var(--acc) 7%, #17150e);
  border: 1px solid color-mix(in srgb, var(--acc) 26%, #2c2216);
}

/* ══ Team-Spalten ══ Breite, Rand und Höhe wie .hud */
/* Fünf Karten übereinander, vertikal zentriert wie .hud — die Höhe ist die der
   fünf echten Champion-Karten (gemessen: .team-col 406 px in 567 px Mitte),
   nicht der 92-%-Deckel: der ist eine Obergrenze, keine Größe. */
.btl-hud {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: var(--hud-w);
  max-height: 92%;
  height: 72%;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.9cqh, 10px);
}
.btl-hud--left {
  left: 8px;
}
.btl-hud--right {
  right: 8px;
}
.btl-seat {
  flex: 1;
  min-height: 0;
  border-radius: 4px;
  background: #17150e;
  border: 1px solid #241d13;
}

/* ══ Meta-Platten ══ Maße wie .meta */
.btl-meta {
  position: absolute;
  bottom: clamp(12px, 2cqh, 20px);
  width: var(--hud-w);
  height: clamp(56px, 8.7cqh, 150px);
  border-radius: 4px;
  background: #17150e;
  border: 1px solid #241d13;
}
.btl-meta--left {
  left: 8px;
}
.btl-meta--right {
  right: 8px;
}

/* ══ Kill-Feed ══ Höhe wie .ticker-root */
.btl-feed {
  height: clamp(22px, 3.8cqh, 28px);
  flex-shrink: 0;
  border-top: 2px solid #3e200a;
  background: #0d0c08;
}

.btl-sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 34%;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(232, 192, 64, 0),
    rgba(232, 192, 64, 0.05),
    rgba(232, 192, 64, 0)
  );
  animation: btl-sheen 2.1s ease-in-out infinite;
}

.btl-beacon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

@keyframes btl-sheen {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btl-sheen {
    animation: none !important;
    opacity: 0;
  }
}
</style>
