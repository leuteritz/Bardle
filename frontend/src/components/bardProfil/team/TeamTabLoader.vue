<script setup lang="ts">
/**
 * Der Ladeschleier des Team-Tabs. Er hat drei Reichweiten:
 *
 *   `rail`  nur die Schiene rechts — die Detailseite geht auf, während das Board
 *           schon steht. Er liegt IM Flex-Fluss und ist exakt so breit wie die
 *           Seite, die gleich kommt: das Board rechnet seine Kamera vom ersten
 *           Frame an mit dem endgültigen Layout.
 *   `tab`   der ganze Tab — der Weg über eine Rollenkarte im Command Panel, bei
 *           dem Board UND Seite gleichzeitig neu entstehen. Hier deckt er alles
 *           ab und liegt absolut darüber; die Umbrüche des Layouts fallen damit
 *           hinter die deckende Fläche.
 *   `board` der ganze Tab, aber nur mit dem Sigil-Skelett — der Weg über die
 *           Tab-Leiste des Bard-Profils, bei dem keine Rolle gewählt ist. Es
 *           entsteht nur das Board, also zeigt der Schleier auch nur das, trägt
 *           das Gold des Sigils statt einer Rollenfarbe und steht kürzer
 *           (SIGIL_BOARD_LOADER_MIN_MS).
 *
 * Warum `tab` nichts kostet: gewartet wird in diesem Fall ohnehin, denn die
 * Detailseite braucht ihre Zeit (SIGIL_DETAILS_LOADER_MIN_MS). Ohne den
 * Board-Teil sähe man daneben das Sigil in vier Stufen zusammenwachsen —
 * gemessen 125 ms längster Frame und 414 ms verlorene Zeit — während rechts eine
 * saubere Ladeanzeige steht. Ein Aufbau, zwei Anmutungen. Mit `tab` ist es ein
 * einziger Ladevorgang, der etwas Fertiges freigibt.
 *
 * Unter der Karte liegt ein Skelett im Zuschnitt dessen, was gleich erscheint —
 * links die Sigil-Runde, rechts Rosterzeile, Portraitspalte und Werte. Nicht als
 * Spielerei: leere Fläche liest sich als kaputt, und wenn die Blöcke schon dort
 * stehen, wo gleich Inhalt steht, ist das Aufdecken ein Schärferwerden statt ein
 * Sprung. Die Maße der tragenden Spalten kommen aus denselben Konstanten wie die
 * der Seite, damit beides zusammenbleibt.
 */
import { computed } from 'vue'
import {
  ROLES,
  ALLIES_PER_ROLE,
  SWORN_ALLY_COUNT,
  SIGIL_SKELETON_NODE_RADIUS_PCT,
  SIGIL_LOADER_NEUTRAL_ACCENT,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_DETAILS_LEFT_WIDTH,
  TEAM_SIGIL_MAIN_CHIP_WIDTH,
} from '@/config/constants'
import LoadingBeacon from '@/components/ui/LoadingBeacon.vue'

const props = defineProps<{
  /** Rolle, deren Seite gleich erscheint — Farbe, Kürzel und Wappen kommen
   *  daher. `null`, wenn der Tab ohne gewählte Rolle aufgeht. */
  roleIndex: number | null
  /** `performance.now()` beim Aufziehen des Schleiers — Basis der Zeitangabe. */
  startedAt: number
  /** Wie weit er deckt — siehe Kopfkommentar. */
  cover: 'rail' | 'tab' | 'board'
}>()

const roleDef = computed(() => (props.roleIndex === null ? null : ROLES[props.roleIndex]))

/** Das Board zeigt er überall außer in der Schiene, die Seite überall außer im
 *  Board-Fall — beides folgt direkt aus dem, was gerade wirklich entsteht. */
const showBoard = computed(() => props.cover !== 'rail')
const showPage = computed(() => props.cover !== 'board')

/**
 * Ohne Rolle steht das Sigil selbst im Mittelpunkt: sein Wappen, sein Gold und
 * sein Name — dasselbe Motiv, das die Mitte des Boards trägt.
 */
const accent = computed(() => roleDef.value?.color ?? SIGIL_LOADER_NEUTRAL_ACCENT)
const beaconIcon = computed(() => roleDef.value?.icon ?? 'game-icons:crenel-crown')
const beaconTitle = computed(() => roleDef.value?.short ?? 'Battle Sigil')
const beaconCaption = computed(() =>
  roleDef.value ? 'Assembling role details' : 'Assembling the battle sigil',
)

/**
 * Die Breiten kommen aus denselben Konstanten wie die der echten Seite, den
 * Maßstab der Team-Panels rechnen sie selbst ein.
 *
 * Bewusst KEIN `zoom` wie bei den Panels: der Schleier wird beim Verschwinden
 * absolut positioniert, damit die Detailseite im selben Frame seinen Platz im
 * Fluss einnehmen kann — und `zoom` zusammen mit `inset` ergibt eine Box, die
 * über ihren Container hinausläuft. Alles, was nicht Breite ist, steht deshalb
 * relativ (Anteile statt fixer Höhen) und braucht den Faktor gar nicht.
 */
const scaled = (px: number) => `calc(${px}px * var(--team-ui-scale, 1))`
const railPx = computed(() => scaled(TEAM_SIGIL_DETAILS_PANEL_WIDTH))
const leftColPx = computed(() => scaled(TEAM_SIGIL_DETAILS_LEFT_WIDTH))
const mainChipPx = computed(() => scaled(TEAM_SIGIL_MAIN_CHIP_WIDTH))

/** Die Rosterzeile: Sworn-Paar oben (breiter), der Rest der Bank darunter — die
 *  Aufteilung, die die Seite selbst hat, aus denselben Zahlen abgeleitet. */
const SWORN_CHIPS = SWORN_ALLY_COUNT
const BENCH_CHIPS = ALLIES_PER_ROLE - SWORN_ALLY_COUNT
/** Vier Wertekacheln, drei Perk-Karten — der Zuschnitt der rechten Spalte. */
const STAT_TILES = 4
const PERK_CARDS = 3

/**
 * Die Rollenknoten des Board-Skeletts, gleichmäßig auf dem Kreis verteilt und
 * bei 12 Uhr beginnend — dieselbe Anordnung, die das Sigil selbst hat, nur ohne
 * dessen Geometrie nachzubauen. Prozentwerte, damit es in jeder Boardbreite
 * mittig bleibt.
 */
const skeletonNodes = computed(() =>
  ROLES.map((_, i) => {
    const rad = ((-90 + (360 / ROLES.length) * i) * Math.PI) / 180
    return {
      left: `${50 + SIGIL_SKELETON_NODE_RADIUS_PCT * Math.cos(rad)}%`,
      top: `${50 + SIGIL_SKELETON_NODE_RADIUS_PCT * Math.sin(rad)}%`,
    }
  }),
)
</script>

<template>
  <div class="ttl" :class="`ttl--${cover}`" :style="{ '--rc': accent }">
    <!-- ══ Board-Skelett — überall außer in der reinen Schienen-Variante ══ -->
    <div v-if="showBoard" class="ttl-board" aria-hidden="true">
      <div class="ttl-sigil">
        <span class="ttl-sigil-ring" />
        <span class="ttl-sigil-crest" />
        <span
          v-for="(node, i) in skeletonNodes"
          :key="`node-${i}`"
          class="ttl-sigil-node"
          :style="node"
        />
      </div>
    </div>

    <!-- ══ Skelett der Detailseite — entfällt, wenn keine Rolle offen ist ══ -->
    <div v-if="showPage" class="ttl-page" aria-hidden="true">
      <div class="ttl-roster">
        <span class="ttl-block ttl-block--main" />
        <div class="ttl-bench">
          <span v-for="i in SWORN_CHIPS" :key="`sworn-${i}`" class="ttl-block ttl-block--sworn" />
          <span v-for="i in BENCH_CHIPS" :key="`ally-${i}`" class="ttl-block ttl-block--ally" />
        </div>
      </div>

      <div class="ttl-cols">
        <div class="ttl-col ttl-col--left">
          <span class="ttl-block ttl-block--splash" />
          <span class="ttl-block ttl-block--line" />
          <span class="ttl-block ttl-block--action" />
        </div>
        <div class="ttl-col ttl-col--right">
          <div class="ttl-pair ttl-pair--skins">
            <span class="ttl-block ttl-block--skin" />
            <span class="ttl-block ttl-block--skin" />
          </div>
          <div class="ttl-grid">
            <span v-for="i in STAT_TILES" :key="`stat-${i}`" class="ttl-block ttl-block--stat" />
          </div>
          <div class="ttl-pair ttl-pair--perks">
            <span v-for="i in PERK_CARDS" :key="`perk-${i}`" class="ttl-block ttl-block--perk" />
          </div>
        </div>
      </div>
    </div>

    <!-- Ein einziger wandernder Glanz über allem: eine Fläche, die verschoben
         wird — kein Verlauf, der pro Frame neu entsteht. -->
    <span class="ttl-sheen" aria-hidden="true" />

    <LoadingBeacon
      class="ttl-beacon"
      :accent="accent"
      :icon="beaconIcon"
      :title="beaconTitle"
      :caption="beaconCaption"
      :started-at="startedAt"
    />
  </div>
</template>

<style scoped>
/* Dieselbe Fläche wie jede andere Schiene — flaches Tiefdunkel, linke Kante,
   eigener Stapelplatz. Das Sternenfeld des Tabs (.cosmic-stage-bg) liegt
   absolut auf z-index 0 und malt sonst über jedes statische Geschwister,
   egal wie deckend dessen Hintergrund ist (siehe .tsps-panel). */
.ttl {
  display: flex;
  min-height: 0;
  overflow: hidden;
  background: var(--rpg-bg-deep, #111008);
}
.ttl--rail {
  position: relative;
  z-index: 3;
  width: v-bind(railPx);
  flex-shrink: 0;
  border-left: 2px solid #5c3310;
}
/* Decken den ganzen Tab: liegen über Board UND Schiene, damit die Umbrüche beim
   Aufdecken (Board wird schmaler, Seite nimmt ihren Platz) unsichtbar bleiben. */
.ttl--tab,
.ttl--board {
  position: absolute;
  inset: 0;
  z-index: 5;
}

/* ══ Board-Skelett ══ */
.ttl-board {
  flex: 1;
  min-width: 0;
  position: relative;
}
.ttl-sigil {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  height: 62%;
  aspect-ratio: 1;
  opacity: 0.5;
}
.ttl-sigil-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px dashed #3a2c1a;
}
.ttl-sigil-crest {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 21%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #17150e;
  border: 1px solid #3a2c1a;
}
.ttl-sigil-node {
  position: absolute;
  width: 13%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: color-mix(in srgb, var(--rc) 7%, #17150e);
  border: 1px solid color-mix(in srgb, var(--rc) 26%, #2c2216);
}

/* ══ Skelett der Detailseite ══ */
.ttl-page {
  flex: 0 0 v-bind(railPx);
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  overflow: hidden;
  opacity: 0.55;
}
/* In der Schienen-Variante trägt der Wrapper die Breite schon — das Skelett
   füllt ihn nur noch aus, statt sie ein zweites Mal zu setzen. */
.ttl--rail .ttl-page {
  flex: 1;
}
.ttl-block {
  display: block;
  border-radius: 4px;
  background: #17150e;
  border: 1px solid #241d13;
}
.ttl-roster {
  flex: 0 0 18%;
  min-height: 0;
  display: flex;
  gap: 8px;
}
.ttl-block--main {
  flex: 0 0 v-bind(mainChipPx);
  /* die Hauptkarte trägt als einzige die Rollenfarbe — sie ist der Anker, an
     dem das Auge die Seite später wiederfindet */
  border-color: color-mix(in srgb, var(--rc) 34%, #241d13);
  background: color-mix(in srgb, var(--rc) 7%, #17150e);
}
/* Sechs Spuren, damit beide Reihen ohne gemeinsamen Teiler nebeneinander
   aufgehen: das Sworn-Paar nimmt je drei, die drei Bankplätze je zwei. */
.ttl-bench {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 1fr;
  gap: 8px;
}
.ttl-block--sworn {
  grid-column: span 3;
  min-width: 0;
}
.ttl-block--ally {
  grid-column: span 2;
  min-width: 0;
}
.ttl-cols {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 10px;
}
.ttl-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ttl-col--left {
  flex: 0 0 v-bind(leftColPx);
}
.ttl-col--right {
  flex: 1;
}
/* Anteile statt fixer Höhen: so trifft das Skelett den Zuschnitt der Seite auf
   jeder Auflösung und in jedem Maßstab, ohne den Faktor selbst zu kennen. */
.ttl-block--splash {
  flex: 1;
  min-height: 0;
}
.ttl-block--line {
  flex: 0 0 6%;
}
.ttl-block--action {
  flex: 0 0 9%;
}
.ttl-pair {
  display: flex;
  gap: 8px;
  min-height: 0;
}
.ttl-pair--skins {
  flex: 0 0 22%;
}
.ttl-pair--perks {
  flex: 0 0 15%;
}
.ttl-block--skin,
.ttl-block--perk {
  flex: 1;
  min-width: 0;
}
.ttl-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 1fr;
  gap: 8px;
}
.ttl-block--stat {
  min-height: 0;
}
.ttl-sheen {
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
  animation: ttl-sheen 2.1s ease-in-out infinite;
}

/* Die Karte sitzt mittig auf dem, was der Schleier deckt — in der Schiene über
   der Seite, über dem ganzen Tab entsprechend mittig über beidem. */
.ttl-beacon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

@keyframes ttl-sheen {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ttl-sheen {
    animation: none !important;
    opacity: 0;
  }
}
</style>
