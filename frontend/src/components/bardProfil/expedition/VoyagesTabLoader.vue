<script setup lang="ts">
/**
 * Der Ladeschleier des Voyages-Reiters.
 *
 * Warum ausgerechnet dieser Reiter einen bekommt, obwohl `docs/performance.md`
 * (Regel 9) für alle übrigen abrät: gemessen am Produktionsbuild, Full HD,
 * frische Sitzung, zwanzig befreite Galaxien und voller Kader — das ERSTE
 * Öffnen kostet **472 ms längsten Einzelframe** und 589 ms verlorene Zeit. Das
 * ist teurer als der Shop-Tab (392 ms), also die teuerste Fläche des Spiels,
 * und weit über dem 72–136-ms-Band, für das sich ein Schleier nicht lohnt.
 *
 * Alles danach ist billig und braucht ihn nicht: ein Galaxiewechsel malt die
 * ganze Platte in 14–34 ms neu, ein Wiedereinblenden kostet 28 ms. Deshalb
 * läuft er GENAU EINMAL je Sitzung (`atlasBuilt` in `ExpeditionTabComponent`).
 *
 * Das Skelett zeigt, was kommt: rechts die Zielliste in ihrer echten Breite
 * SAMT Griffleiste, links der Kasten im Seitenverhältnis der Fit-Box mit ein
 * paar Häfen darauf und an dessen Unterkante das Datenband. Ein Platzhalter,
 * der etwas anderes verspricht als das, was kommt, hat den Ruckler nur gegen
 * einen Sprung getauscht.
 *
 * Der Griff steht mit, weil die Liste OFFEN startet — er ist ab Frame 1 im
 * Bild. (Das Skelett des Skill-Tree-Reiters zeigt nur ihn, weil dessen Spalte
 * zugeklappt startet: dieselbe Regel, andere Voraussetzung.)
 *
 * Bewegt wird ausschliesslich `transform` — der Schleier steht per Definition
 * in den Frames, in denen der Hauptthread blockiert ist. Eine Animation auf
 * `filter` oder `box-shadow` stünde dort still und machte den Ruckler erst
 * sichtbar, den sie verdecken soll.
 */
import { computed } from 'vue'
import LoadingBeacon from '@/components/ui/LoadingBeacon.vue'
import {
  VOYAGE_COMMAND_BAR_H,
  VOYAGE_FLEET_ACT_H,
  VOYAGE_FLEET_ACT_W,
  VOYAGE_FLEET_ASIDE_W,
  VOYAGE_FLEET_BAND_GAP,
  VOYAGE_FLEET_BAND_PAD_X,
  VOYAGE_FLEET_CARD_GAP,
  VOYAGE_FLEET_CARD_H,
  VOYAGE_FLEET_CARD_MIN_VISIBLE,
  VOYAGE_FLEET_CARD_MIN_W,
  VOYAGE_FLEET_RANK_W,
  VOYAGE_LOADER_ACCENT,
  VOYAGE_LOADER_CAPTION,
  VOYAGE_LOADER_ICON,
  VOYAGE_LOADER_TITLE,
  VOYAGE_MAP_ASPECT_MIN,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_RAIL_HANDLE_PX,
  VOYAGE_RAIL_PAD_X,
  VOYAGE_RAIL_ROW_H,
  VOYAGE_RAIL_THUMB_H,
  VOYAGE_RAIL_THUMB_W,
  VOYAGE_RAIL_WIDTH,
  VOYAGE_RAIL_WORD_H,
  VOYAGE_RAIL_ZONE_W,
} from '@/config/constants'

defineProps<{
  /** `performance.now()` beim Aufziehen — Basis der Sekundenangabe im Beacon. */
  startedAt: number
}>()

const railZone = `${VOYAGE_RAIL_ZONE_W}px`
const railWidth = `${VOYAGE_RAIL_WIDTH}px`
const railPadX = `${VOYAGE_RAIL_PAD_X}px`
const handleWidth = `${VOYAGE_RAIL_HANDLE_PX}px`
const wordHeight = `${VOYAGE_RAIL_WORD_H}px`
const rowHeight = `${VOYAGE_RAIL_ROW_H}px`
const thumbWidth = `${VOYAGE_RAIL_THUMB_W}px`
const thumbHeight = `${VOYAGE_RAIL_THUMB_H}px`
/** +3 für den eigenen `border-bottom`: `border-box` rechnet ihn in die Zeile. */
const headHeight = `${VOYAGE_COMMAND_BAR_H + 3}px`
const bandPadX = `${VOYAGE_FLEET_BAND_PAD_X}px`
const bandGap = `${VOYAGE_FLEET_BAND_GAP}px`
const rankWidth = `${VOYAGE_FLEET_RANK_W}px`
const asideWidth = `${VOYAGE_FLEET_ASIDE_W}px`
const cardWidth = `${VOYAGE_FLEET_CARD_MIN_W}px`
const cardHeight = `${VOYAGE_FLEET_CARD_H}px`
const cardGap = `${VOYAGE_FLEET_CARD_GAP}px`
const actW = `${VOYAGE_FLEET_ACT_W}px`
const actH = `${VOYAGE_FLEET_ACT_H}px`
/** So viele, wie gleich ohne Scrollen stehen — mehr verspräche eine Spur, die
 *  der Schleier nicht halten kann. */
const cardCount = VOYAGE_FLEET_CARD_MIN_VISIBLE
const bandHeight = `${VOYAGE_MAP_STATS_BAND_H}px`
/** Der Kasten sitzt so ueber dem Band, wie es gleich die Fit-Box tut. */
const stagePadBottom = `${VOYAGE_MAP_STATS_BAND_H + 10}px`
const mapAspect = `${VOYAGE_MAP_ASPECT_MIN}`

/**
 * Ein paar Häfen auf dem Platzhalter. Prozentkoordinaten IM Kasten, nicht auf
 * der Bühne — der Kasten trägt `aspect-ratio`, auf der vollen Fläche gerechnet
 * zöge das Muster zur Ellipse aus und verspräche eine Anordnung, die die Karte
 * nicht hat. Dieselbe Überlegung wie beim Sigil- und Forge-Skelett.
 */
const skeletonPorts = computed(() =>
  [
    [50, 50],
    [22, 30],
    [76, 26],
    [18, 68],
    [80, 72],
    [46, 18],
    [60, 82],
  ].map(([x, y], i) => ({ key: i, style: { left: `${x}%`, top: `${y}%` } })),
)
</script>

<template>
  <div class="vtl">
    <!-- Kopfleiste -->
    <div class="vtl-head" aria-hidden="true">
      <div class="vtl-bar">
        <span class="vtl-mark vtl-mark--rank" />
        <div class="vtl-lane">
          <span v-for="i in cardCount" :key="i" class="vtl-mark vtl-mark--card" />
        </div>
        <div class="vtl-aside">
          <span v-for="i in 2" :key="i" class="vtl-mark vtl-mark--act" />
        </div>
      </div>
    </div>

    <!-- Bühne -->
    <div class="vtl-stage">
      <div class="vtl-box" aria-hidden="true">
        <span class="vtl-core" />
        <span
          v-for="port in skeletonPorts"
          :key="port.key"
          class="vtl-port"
          :style="port.style"
        />
      </div>
      <LoadingBeacon
        class="vtl-beacon"
        :accent="VOYAGE_LOADER_ACCENT"
        :icon="VOYAGE_LOADER_ICON"
        :title="VOYAGE_LOADER_TITLE"
        :caption="VOYAGE_LOADER_CAPTION"
        :started-at="startedAt"
      />

      <div class="vtl-band" aria-hidden="true">
        <span v-for="i in 3" :key="i" class="vtl-mark vtl-mark--zone" />
      </div>
    </div>

    <!-- Zielliste samt Griff -->
    <div class="vtl-railzone" aria-hidden="true">
      <div class="vtl-rail">
        <div class="vtl-rail-list">
          <span v-for="i in 6" :key="i" class="vtl-row">
            <span class="vtl-row-thumb" />
            <span class="vtl-row-lines">
              <span class="vtl-mark vtl-mark--name" />
              <span class="vtl-mark vtl-mark--meta" />
            </span>
          </span>
        </div>
      </div>

      <div class="vtl-grip"><span class="vtl-grip-word" /></div>
    </div>

    <!-- Ein einziger wandernder Glanz: eine Fläche, die verschoben wird —
         kein Verlauf, der pro Frame neu entsteht. -->
    <span class="vtl-sheen" aria-hidden="true" />
  </div>
</template>

<style scoped>
.vtl {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(0, 1fr) v-bind(railZone);
  grid-template-rows: v-bind(headHeight) minmax(0, 1fr);
  overflow: hidden;
  background: #111008;
}

.vtl-mark {
  display: block;
  border-radius: 3px;
  background: #1c1a12;
}

/* ── Kopfleiste ─────────────────────────────────────────────── */
.vtl-head {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  background: #16100a;
  border-bottom: 3px solid #5c3310;
}
.vtl-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: v-bind(bandGap);
  padding: 0 v-bind(bandPadX);
  overflow: hidden;
}
/* Die Rangsäule füllt das Band, wie `.ecb-rank` im echten Kopf — eine geratene
   Pixelhöhe stand hier und überragte das Band, sobald es schrumpfte. */
.vtl-mark--rank {
  flex: 0 0 v-bind(rankWidth);
  width: v-bind(rankWidth);
  height: 100%;
}
.vtl-lane {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: v-bind(cardGap);
  overflow: hidden;
}
.vtl-mark--card {
  flex: 0 0 v-bind(cardWidth);
  width: v-bind(cardWidth);
  height: v-bind(cardHeight);
  border-radius: 4px;
}
.vtl-aside {
  flex: 0 0 v-bind(asideWidth);
  width: v-bind(asideWidth);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.vtl-mark--act {
  width: v-bind(actW);
  height: v-bind(actH);
  border-radius: 4px;
}

/* ── Zielliste samt Griff ───────────────────────────────────── */
.vtl-railzone {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  overflow: hidden;
}
.vtl-rail {
  flex: 0 0 v-bind(railWidth);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #111008;
  border-left: 2px solid #5c3310;
}
.vtl-rail-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px v-bind(railPadX) 14px;
  overflow: hidden;
}

/* Genau die Masse des Griffs, der gleich hier steht — samt Naht und der EINEN
   mittigen Gruppe. */
.vtl-grip {
  flex: 0 0 v-bind(handleWidth);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 6px 12px 4px;
  background: #14100c;
  border-left: 2px solid #5c3310;
}
/* Mittig wie das Wort selbst. Die Pille darüber zeichnet der Schleier nicht —
   sie steht nur eingeklappt, und eingeklappt startet die Liste nicht. */
.vtl-grip-word {
  display: block;
  width: 13px;
  height: v-bind(wordHeight);
  border-radius: 4px;
  background: #241a0e;
}

/* Dieselbe Karte, die gleich kommt: Fläche, Rahmen, Radius. */
.vtl-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: v-bind(rowHeight);
  flex-shrink: 0;
  padding: 7px 7px 7px 9px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
}
.vtl-row-thumb {
  width: v-bind(thumbWidth);
  height: v-bind(thumbHeight);
  flex-shrink: 0;
  border: 1px solid #3e200a;
  border-radius: 3px;
  background: #0b0806;
}
.vtl-row-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.vtl-mark--name {
  width: 82%;
  height: 11px;
}
.vtl-mark--meta {
  width: 58%;
  height: 9px;
}

/* ── Bühne ──────────────────────────────────────────────────── */
.vtl-stage {
  position: relative;
  grid-column: 1;
  grid-row: 2;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 10px v-bind(stagePadBottom);
  background: #0b0806;
}
/* Derselbe Kasten, in den die Galaxie gleich fällt. */
.vtl-box {
  position: relative;
  aspect-ratio: v-bind(mapAspect);
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  border-radius: 4px;
  background: radial-gradient(circle at 50% 50%, #171208 0%, #0b0806 70%);
}
.vtl-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(232, 192, 64, 0.18) 0%, rgba(232, 192, 64, 0) 70%);
}
.vtl-port {
  position: absolute;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 4px;
  background: #1c1a12;
}
.vtl-beacon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

/* ── Crew-Streifen ──────────────────────────────────────────── */
/* Das Datenband an der Unterkante — dieselbe Hoehe und dieselbe Dreiteilung,
   damit der Schleier nicht etwas anderes verspricht, als gleich kommt. */
.vtl-band {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: v-bind(bandHeight);
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 30px;
  border-top: 1px solid rgba(122, 78, 32, 0.42);
  background: linear-gradient(to top, rgba(8, 6, 3, 0.95), rgba(8, 6, 3, 0.82));
}
.vtl-mark--zone {
  height: 42px;
}
.vtl-mark--zone:nth-child(1) {
  width: 118px;
}
.vtl-mark--zone:nth-child(2) {
  width: 156px;
}
.vtl-mark--zone:nth-child(3) {
  flex: 1;
}

/* ── Der eine Glanz ─────────────────────────────────────────── */
.vtl-sheen {
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
  animation: vtl-sheen 2.1s ease-in-out infinite;
}
@keyframes vtl-sheen {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(300%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .vtl-sheen {
    animation: none;
  }
}
</style>
