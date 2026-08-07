<script setup lang="ts">
/**
 * Der Ladeschleier des Battle-Tabs — zwei Skelette, ein Aufbau.
 *
 * Er deckt, was beim Öffnen des Tabs entsteht. Das ist je nach Spielstand ein
 * anderes Bild, und beide sind teuer genug für einen Schleier:
 *
 *   • `rift`    das laufende Board. Der Weg über das Bottom-Scoreboard führt
 *               mitten in einen laufenden Kampf, und was dabei in einem Frame
 *               aufgebaut wird (Score-Leiste, Minimap, zwei Team-Spalten,
 *               Meta-Platten, Kill-Feed) reißt das Layout sichtbar auseinander.
 *   • `landing` der Einstieg ins Auto-Battle: Rangband mit Emblem, LP-Leiste und
 *               Tier-Leiter, fünf Kader-Karten samt Rahmen und Kronen, der
 *               Startknopf.
 *
 * Zwei Skelette statt eines allgemeinen, weil ein Platzhalter ohne die Maße
 * dessen, was kommt, den Ruckler nur durch einen Sprung ersetzt. Die Zahlen
 * stehen bei BATTLE_TAB_LOADER_MIN_MS.
 *
 * Zwei Dinge machen ihn maßhaltig, und beide sind Bedingung dafür, dass das
 * Aufdecken ein Schärferwerden statt eines Sprungs ist:
 *
 *   • Er ist selbst ein Size-Container und rechnet mit DENSELBEN cq-Formeln wie
 *     das Board bzw. der Landing-Screen (Leistenhöhen, `--hud-w`, Meta-Platten;
 *     Rangband-Flanken, Roster-Höhe samt Kronenraum, Knopfbreite). Das Skelett
 *     sitzt damit auf jeder Desktop-Auflösung dort, wo gleich der Inhalt sitzt —
 *     statt auf Maßen, die nur auf Full HD stimmen.
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
import { BATTLE_PHASES, RANK_FRAME_CROWN_HEADROOM } from '@/config/constants'
import type { BattlePhaseKey } from '@/types'
import LoadingBeacon from '@/components/ui/LoadingBeacon.vue'

const props = defineProps<{
  /** Phase, deren Bild gleich erscheint — Farbe und Wappen kommen von dort. */
  phaseKey: BattlePhaseKey
  /** `performance.now()` beim Aufziehen des Schleiers — Basis der Zeitangabe. */
  startedAt: number
  /**
   * Welches Bild entsteht dahinter:
   *   `rift`    das laufende Board (Leiste, Karte, Team-Spalten, Kill-Feed)
   *   `landing` der Einstieg ins Auto-Battle (Rangband, Kader, Startknopf)
   * Zwei Skelette statt eines allgemeinen: ein Platzhalter, der nicht die Maße
   * dessen hat, was kommt, ersetzt den Ruckler nur durch einen Sprung.
   */
  variant: 'rift' | 'landing'
}>()

/**
 * Farbe und Wappen kommen aus der Phasen-Registry, nicht aus eigenen Werten:
 * der Schleier trägt damit automatisch die Sprache der Phase, die hinter ihm
 * aufgeht — und eine neue Phase bleibt ein einziger Registry-Eintrag.
 */
const phase = computed(() => BATTLE_PHASES[props.phaseKey] ?? BATTLE_PHASES.battle)

/**
 * Der Landing-Screen hat in der Registry kein Wappen (`icon: null`) — er ist
 * kein Kampfzustand, sondern die Leiter davor. Er bekommt deshalb sein eigenes
 * Motiv und behält nur die Farbe der Registry.
 */
const accent = computed(() => (props.variant === 'landing' ? BATTLE_PHASES.landing.color : phase.value.color))
const beaconIcon = computed(() =>
  props.variant === 'landing' ? 'game-icons:podium' : (phase.value.icon ?? 'game-icons:broadsword'),
)

/** Ein Satz je Bild: die Leiter geht auf, der Kampf schaltet sich zu, die
 *  Ehrung zählt aus. */
const beaconTitle = computed(() => {
  if (props.variant === 'landing') return 'Ranked'
  return props.phaseKey === 'honor' ? 'Honors' : 'The Rift'
})
const beaconCaption = computed(() => {
  if (props.variant === 'landing') return 'Opening the ladder'
  return props.phaseKey === 'honor' ? 'Tallying the result' : 'Tuning in to the live match'
})

/** Fünf Plätze je Seite — dieselbe Aufstellung, die die Team-Spalten zeigen. */
const TEAM_SEATS = 5
/** Vier Kacheln in der Score-Leiste je Seite (Türme, Inhibitoren, Drakes, Gold). */
const SCORE_TILES = 4
/** Fünf Zeilen je Flanke des Rangbands (RankStatColumn: LADDER bzw. LEGEND). */
const LANDING_BAND_STATS = 5
/** Fünf Rollenkarten im Kader — dieselbe Reihe, die TeamRosterPanel zeigt. */
const LANDING_ROSTER_CARDS = 5
/** Zehn Stufen der Tier-Leiter unter dem LP-Balken (Iron … Challenger). */
const LANDING_LADDER_STEPS = 10

/**
 * Der Kronenraum über den Kader-Karten. Er gehört zur Höhe der Roster-Zeile,
 * ohne selbst Karte zu sein — ohne ihn säßen die Platzhalter genau um diesen
 * Betrag zu hoch. `--frame-scale` stellen die Container-Queries unten, exakt wie
 * im TeamRosterPanel.
 */
const crownSpaceStyle = { '--crown-headroom': `${RANK_FRAME_CROWN_HEADROOM}px` }
</script>

<template>
  <div
    class="btl"
    :class="`btl--${variant}`"
    :style="[{ '--acc': accent }, crownSpaceStyle]"
    role="status"
    aria-live="polite"
  >
    <!-- ══════ Einstieg ins Auto-Battle: Rangband, Kader, Startknopf ══════ -->
    <div v-if="variant === 'landing'" class="btl-landing" aria-hidden="true">
      <!-- Rangband: Emblem-Spalte mittig, flankiert von den Zahlengruppen,
           darunter über die volle Breite die Tier-Leiter -->
      <div class="btl-band">
        <div class="btl-band-main">
          <div class="btl-band-group">
            <span class="btl-band-head" />
            <div class="btl-band-rows">
              <span v-for="i in LANDING_BAND_STATS" :key="`bl-${i}`" class="btl-band-row" />
            </div>
          </div>

          <div class="btl-band-core">
            <div class="btl-band-crest">
              <span class="btl-band-emblem" />
              <span class="btl-band-name" />
            </div>
            <div class="btl-band-lp">
              <span class="btl-band-lp-track" />
              <span class="btl-band-lp-readout" />
            </div>
          </div>

          <div class="btl-band-group btl-band-group--right">
            <span class="btl-band-head" />
            <div class="btl-band-rows">
              <span v-for="i in LANDING_BAND_STATS" :key="`br-${i}`" class="btl-band-row" />
            </div>
          </div>
        </div>

        <!-- Tier-Leiter: zehn Stufen auf einer Schiene, Wappen über Beschriftung -->
        <div class="btl-band-ladder">
          <span v-for="i in LANDING_LADDER_STEPS" :key="`ls-${i}`" class="btl-band-step">
            <span class="btl-band-pip" />
            <span class="btl-band-cap" />
          </span>
        </div>
      </div>

      <!-- Kader: Titelzeile über fünf Rollenkarten, volle Breite -->
      <div class="btl-roster">
        <div class="btl-roster-head"><span class="btl-roster-title" /></div>
        <div class="btl-roster-cards">
          <span v-for="i in LANDING_ROSTER_CARDS" :key="`rc-${i}`" class="btl-roster-card" />
        </div>
      </div>

      <!-- Startknopf zwischen zwei Zierlinien -->
      <div class="btl-action">
        <span class="btl-action-rule" />
        <span class="btl-action-btn" />
        <span class="btl-action-rule" />
      </div>
    </div>

    <!-- ══════ Laufendes Rift-Board ══════ -->
    <template v-else>
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
    </template>

    <!-- Ein einziger wandernder Glanz über allem — eine Fläche, die verschoben
         wird, kein Verlauf, der pro Frame neu entsteht. Er steht außerhalb
         beider Bilder: der Glanz gehört dem Schleier, nicht dem Skelett. -->
    <span class="btl-sheen" aria-hidden="true" />

    <LoadingBeacon
      class="btl-beacon"
      :accent="accent"
      :icon="beaconIcon"
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

/* Der Landing-Screen steht auf einem eigenen Grundton (.landing-root), den der
   Schleier übernimmt — sonst wäre das Aufdecken ein Farbwechsel. */
.btl--landing {
  background: #0a0906;
}

/* ══════════════ Landing-Skelett ══════════════
   Jede Zeile hier spiegelt ein Maß aus BattleLandingScreen (.landing-screen),
   RankBandPanel (.rank-hero / .hero-main) oder TeamRosterPanel (.roster-panel).
   Läuft eines davon weg, wandert der Inhalt beim Aufdecken. */
.btl-landing {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.1cqh, 14px);
  padding: clamp(8px, 1.5cqh, 18px) clamp(14px, 1.4vw, 26px);
}

/* ── Rangband ── Aufbau und Maße wie .rank-hero ──
   Drei Ebenen wie im Original: die Zahlenflanken stehen über die ganze Höhe der
   Hauptzeile (nicht mittig — sie strecken sich, siehe .hero-main), die
   Emblem-Spalte sitzt zentriert dazwischen, und die Tier-Leiter läuft UNTER dem
   Ganzen über die volle Bandbreite. */
.btl-band {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.5cqh, 20px);
  padding: clamp(8px, 2cqh, 24px) clamp(18px, 2vw, 34px) clamp(8px, 1.7cqh, 20px);
  border: 1px solid #241d13;
  border-radius: 5px;
  background: rgba(14, 12, 7, 0.42);
}
.btl-band-main {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: clamp(14px, 1.6vw, 30px);
}

/* Die beiden Zahlenflanken (LADDER · LEGEND) — Breite wie .hero-flank,
   innerer Aufbau wie .stat-column: Überschrift oben, Zeilen mittig darunter. */
.btl-band-group {
  flex: 0 0 clamp(126px, 10.5vw, 200px);
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(5px, 0.9cqh, 11px);
}
.btl-band-group--right {
  align-items: flex-end;
}
.btl-band-head {
  flex-shrink: 0;
  width: 62%;
  height: clamp(15px, 2.6cqh, 26px);
  border-radius: 4px;
  background: #17150e;
}
.btl-band-rows {
  flex: 1;
  min-height: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(3px, 1.1cqh, 16px);
}
.btl-band-row {
  height: clamp(13px, 2.7cqh, 30px);
  border-radius: 4px;
  background: #17150e;
}

/* Mitte: Emblem und Rangname über der LP-Leiste — wie .hero-column */
.btl-band-core {
  flex: 1;
  min-width: 0;
  max-width: clamp(420px, 56vw, 980px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(5px, 1.3cqh, 16px);
}
.btl-band-crest {
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: clamp(14px, 1.6vw, 26px);
}
/* Als einzige Fläche im Skelett trägt das Emblem die Farbe — es ist der Anker,
   an dem das Auge den Rang später wiederfindet. */
.btl-band-emblem {
  width: clamp(52px, 9.3cqh, 132px);
  height: clamp(52px, 9.3cqh, 132px);
  flex-shrink: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--acc) 7%, #17150e);
  border: 1px solid color-mix(in srgb, var(--acc) 30%, #2c2216);
}
.btl-band-name {
  width: clamp(90px, 10cqw, 220px);
  height: clamp(20px, 3.8cqh, 46px);
  border-radius: 4px;
  background: #17150e;
}
.btl-band-lp {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.7cqh, 8px);
}
.btl-band-lp-track {
  height: clamp(26px, 5.1cqh, 60px);
  border-radius: 4px;
  border: 1px solid #3e200a;
  background: #16140e;
}
.btl-band-lp-readout {
  height: clamp(30px, 6.3cqh, 74px);
  border-radius: 4px;
  background: #14120c;
}

/* Tier-Leiter — Maße wie .tier-ladder: zehn gleich breite Stufen, jede ein
   Wappen über seiner Beschriftung, alle auf einer gemeinsamen Kante. */
.btl-band-ladder {
  --pip: clamp(30px, 5.6cqh, 92px);
  --pip-head: clamp(6px, 1.2cqh, 22px);
  flex-shrink: 0;
  width: 100%;
  display: flex;
  align-items: flex-start;
  padding-top: var(--pip-head);
  border-top: 1px solid #2b2312;
}
.btl-band-step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 2.4cqh, 26px);
}
.btl-band-pip {
  width: var(--pip);
  height: var(--pip);
  border-radius: 50%;
  background: #17150e;
}
.btl-band-cap {
  width: 60%;
  height: clamp(14px, 3.6cqh, 34px);
  border-radius: 4px;
  background: #14120c;
}

/* ── Kader ── Höhe wie .roster-slot, Aufbau wie .roster-panel ──
   Der Kronenraum gehört zur Höhe, ohne selbst Karte zu sein: ohne ihn säßen die
   Platzhalter genau um diesen Betrag zu hoch. */
.btl-roster {
  --frame-scale: 1;
  --crown-space: calc(var(--crown-headroom) * var(--frame-scale));
  flex: 0 0 auto;
  min-width: 0;
  height: calc(clamp(160px, 38cqh, 330px) + var(--crown-space));
  display: flex;
  flex-direction: column;
  gap: clamp(2px, 0.4cqh, 6px);
}
.btl-roster-head {
  flex-shrink: 0;
  height: clamp(17px, 2.4cqh, 30px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btl-roster-title {
  width: clamp(140px, 16cqw, 260px);
  height: 62%;
  border-radius: 4px;
  background: #17150e;
}
.btl-roster-cards {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(8px, 0.9vw, 16px);
  padding-top: var(--crown-space);
}
.btl-roster-card {
  min-height: 0;
  border-radius: 5px;
  background: #0d0b06;
  border: 1px solid #241d13;
}

/* ── Startknopf zwischen zwei Zierlinien ── Maße wie .action-bar ──
   Der Knopf bleibt bewusst gedämpft: ein leuchtend grüner Platzhalter läse sich
   als anklickbar, obwohl darunter noch gebaut wird. */
.btl-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(14px, 1.6vw, 26px);
}
.btl-action-rule {
  flex: 1;
  height: 2px;
}
.btl-action-rule:first-child {
  background: linear-gradient(to right, transparent, #3e2410 60%, #6a4a1c);
}
.btl-action-rule:last-child {
  background: linear-gradient(to left, transparent, #3e2410 60%, #6a4a1c);
}
.btl-action-btn {
  flex-shrink: 0;
  min-width: clamp(270px, 23vw, 420px);
  height: calc(clamp(15px, 2.1cqh, 25px) * 1.1 + var(--btn-pad, clamp(8px, 1.5cqh, 17px)) * 2 + 4px);
  border-radius: 5px;
  border: 2px solid #2e5418;
  background: linear-gradient(to bottom, #1a2a0c 0%, #121e07 52%, #0d1705 100%);
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

/* ══ Höhenstufen des Landing-Skeletts ══
   Dieselben Schwellen wie im Landing-Screen selbst (dort `@container landing`;
   hier ohne Namen, weil .btl der nächstliegende Size-Container ist). Sie
   entscheiden über Rhythmus und Kronenraum — laufen sie auseinander, springt
   das Bild beim Aufdecken genau auf einer Auflösung. */
@container (max-height: 780px) {
  .btl-landing {
    gap: 7px;
    padding: 8px 16px;
  }
  .btl-action-btn {
    --btn-pad: 7px;
  }
}
@container (max-height: 620px) {
  .btl-landing {
    gap: 6px;
    padding: 7px 14px;
  }
  .btl-action-btn {
    --btn-pad: 6px;
  }
}
/* Kronenraum: der Rahmen wächst auf hohen Stufen mit den Karten mit */
@container (min-height: 890px) {
  .btl-roster {
    --frame-scale: 1.25;
  }
}
@container (max-height: 630px) {
  .btl-roster {
    --frame-scale: 0.85;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btl-sheen {
    animation: none !important;
    opacity: 0;
  }
}
</style>
