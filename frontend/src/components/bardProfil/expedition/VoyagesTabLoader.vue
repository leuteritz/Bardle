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
 * Das Skelett zeigt, was kommt: die Leiste in ihrer echten Breite, in der Mitte
 * der Kasten im Seitenverhältnis der Fit-Box mit ein paar Häfen darauf, rechts
 * die eingeklappte Detailspalte, an der Unterkante der Bühne das Datenband. Ein
 * Platzhalter, der etwas anderes verspricht als das, was kommt, hat den Ruckler
 * nur gegen einen Sprung getauscht.
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
  VOYAGE_DETAIL_COLLAPSED,
  VOYAGE_FLEET_STRIP_H,
  VOYAGE_LOADER_ACCENT,
  VOYAGE_LOADER_CAPTION,
  VOYAGE_LOADER_ICON,
  VOYAGE_LOADER_TITLE,
  VOYAGE_MAP_ASPECT_MIN,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_RAIL_ROW_H,
  VOYAGE_RAIL_THUMB_H,
  VOYAGE_RAIL_THUMB_W,
  VOYAGE_RAIL_WIDTH,
} from '@/config/constants'

defineProps<{
  /** `performance.now()` beim Aufziehen — Basis der Sekundenangabe im Beacon. */
  startedAt: number
}>()

const railWidth = `${VOYAGE_RAIL_WIDTH}px`
const rowHeight = `${VOYAGE_RAIL_ROW_H}px`
const thumbWidth = `${VOYAGE_RAIL_THUMB_W}px`
const thumbHeight = `${VOYAGE_RAIL_THUMB_H}px`
/** Die Detailspalte startet EINGEKLAPPT — der Platzhalter muss den Griff
 *  zeigen, nicht die geöffnete Spalte, sonst springt das Layout beim Enthüllen. */
const detailWidth = `${VOYAGE_DETAIL_COLLAPSED}px`
const headHeight = `${VOYAGE_COMMAND_BAR_H + VOYAGE_FLEET_STRIP_H}px`
const stripHeight = `${VOYAGE_FLEET_STRIP_H}px`
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
        <span class="vtl-spacer" />
        <span class="vtl-mark vtl-mark--read" />
        <span class="vtl-mark vtl-mark--read" />
        <span class="vtl-mark vtl-mark--read" />
        <span class="vtl-mark vtl-mark--btn" />
      </div>
      <div class="vtl-strip">
        <span v-for="i in 4" :key="i" class="vtl-mark vtl-mark--pill" />
      </div>
    </div>

    <!-- Seitenleiste -->
    <div class="vtl-rail" aria-hidden="true">
      <span v-for="i in 6" :key="i" class="vtl-row">
        <span class="vtl-row-thumb" />
        <span class="vtl-row-lines">
          <span class="vtl-mark vtl-mark--name" />
          <span class="vtl-mark vtl-mark--meta" />
        </span>
      </span>
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

    <!-- Detailspalte -->
    <!-- Nur der Griff: die Detailspalte steht eingeklappt, bis ein Hafen
         angeklickt wird. Fünf Inhaltsbalken versprächen hier eine Spalte, die
         gleich gar nicht kommt. -->
    <div class="vtl-detail" aria-hidden="true">
      <span class="vtl-mark vtl-mark--grip" />
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
  grid-template-columns: v-bind(railWidth) minmax(0, 1fr) v-bind(detailWidth);
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
  gap: 14px;
  padding: 0 14px;
}
.vtl-strip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: v-bind(stripHeight);
  padding: 0 14px;
  border-top: 1px solid #402a12;
  background: #17100a;
}
.vtl-mark--pill {
  width: 150px;
  height: 26px;
  border-radius: 4px;
}
.vtl-mark--rank {
  width: 210px;
  height: 26px;
}
.vtl-spacer {
  flex: 1;
}
.vtl-mark--read {
  width: 62px;
  height: 22px;
}
.vtl-mark--btn {
  width: 104px;
  height: 26px;
}

/* ── Seitenleiste ───────────────────────────────────────────── */
.vtl-rail {
  grid-column: 1;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 7px;
  overflow: hidden;
  background: #12100a;
  border-right: 2px solid #5c3310;
}
.vtl-row {
  display: flex;
  align-items: center;
  gap: 9px;
  height: v-bind(rowHeight);
  flex-shrink: 0;
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
  grid-column: 2;
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

/* ── Detailspalte ───────────────────────────────────────────── */
.vtl-detail {
  grid-column: 3;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  background: #1e1006;
  border-left: 2px solid #5c3310;
}
.vtl-mark--grip {
  width: 16px;
  height: 46px;
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
