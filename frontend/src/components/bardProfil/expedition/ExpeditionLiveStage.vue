<script setup lang="ts">
/**
 * Die zweite Bühne des Reiters: der LAUFENDE Lauf, gross.
 *
 * Der Atlas führt nur `completedGalaxies` — die Galaxie, in der der Spieler
 * gerade fliegt, ist dort nie dabei. Sie steht deshalb hier, und zwar in
 * DERSELBEN Bildsprache: `ExpeditionLivePlate` malt sie mit `paintGalaxy`, aus
 * einem synthetischen Datensatz (`liveGalaxyRecord`). Beim Umschalten wechselt
 * damit nur der Inhalt, nicht das Bild.
 *
 * Die Zoomfahrt auf den Zielstern und das Ankunfts-Sternsystem bleiben allein
 * bei der Minimap: im kleinen HUD sind sie richtig, hier will man die ganze
 * Galaxie sehen.
 *
 * Die Bühne ist eine ANSICHT. Die Gesten der Minimap (Zielstern anklicken,
 * überspringen) bleiben dort — zwei Bedienwege für dieselbe Handlung wären
 * einer zu viel.
 */
import { computed } from 'vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { destinationName } from '@/config/economy/expeditionDestinations'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { liveGalaxyRecord } from '@/utils/game/liveGalaxyRecord'
import { toRoman } from '@/utils/ui/format'
import ExpeditionLivePlate from './ExpeditionLivePlate.vue'
import ExpeditionPlayerMarkerLayer from './ExpeditionPlayerMarkerLayer.vue'
import ExpeditionLiveBand from './ExpeditionLiveBand.vue'
import ExpeditionRunLedger from './ExpeditionRunLedger.vue'
import ExpeditionRunLog from './ExpeditionRunLog.vue'
import {
  VOYAGE_LIVE_ASIDE_MAX_SHARE,
  VOYAGE_LIVE_ASIDE_W,
  VOYAGE_LIVE_PLAQUE_LABEL,
  VOYAGE_LIVE_STATES,
  VOYAGE_MAP_STATS_BAND_H,
} from '@/config/constants'

const props = defineProps<{ visible: boolean }>()

const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()

/**
 * Der laufende Lauf als Datensatz. Dieselbe Feldliste, die beim Abschluss ins
 * Archiv geht — so kann das Bild der laufenden Galaxie gar nicht von dem
 * abweichen, das sie nach ihrer Befreiung zeigt.
 */
const record = computed(() =>
  liveGalaxyRecord({
    galaxy: galaxyStore.currentGalaxy,
    mapSeed: galaxyStore.mapSeed,
    themeIndex: galaxyStore.currentThemeIndex,
    universe: gameStore.currentUniverse,
    attemptResults: galaxyStore.attemptResults,
    landfallResults: galaxyStore.landfallResults,
    incidentResults: galaxyStore.incidentResults,
    starManifests: galaxyStore.starManifests,
  }),
)

/** Der Sekundentakt des Datenbands — KEINE zweite Uhr. */
const now = computed(() => galaxyStore._travelTickMs)

const accent = computed(
  () => `rgb(${minimapAccentForTheme(galaxyStore.currentThemeIndex, gameStore.currentUniverse)})`,
)

const themeName = computed(() => destinationName(galaxyStore.currentThemeIndex))

const state = computed(() => {
  if (galaxyStore.isComplete) return VOYAGE_LIVE_STATES.freed
  if (galaxyStore.pendingRoleSelection) return VOYAGE_LIVE_STATES.role
  if (galaxyStore.bossPhaseActive || galaxyStore.travelingToGalaxyBoss)
    return VOYAGE_LIVE_STATES.boss
  if (galaxyStore.championTravelState === 'traveling') return VOYAGE_LIVE_STATES.flight
  if (
    galaxyStore.championTravelState === 'champion_available' ||
    galaxyStore.championTravelState === 'champion_spawned'
  )
    return VOYAGE_LIVE_STATES.system
  return VOYAGE_LIVE_STATES.idle
})

const asideW = `${VOYAGE_LIVE_ASIDE_W}px`
/** Die Listen decken höchstens diesen Anteil der Bühne ab; darüber rollen sie
 *  in sich. Sie schrumpfen die Fit-Box NICHT — was unter ihnen liegt, steht
 *  abgedunkelt weiter da. */
const asideMaxH = `calc(${VOYAGE_LIVE_ASIDE_MAX_SHARE} * (100% - ${VOYAGE_MAP_STATS_BAND_H}px))`
</script>

<template>
  <div class="els" :style="{ '--els-accent': accent }">
    <ExpeditionLivePlate v-slot="{ box, width, height, bandH }" :record="record">
      <ExpeditionPlayerMarkerLayer
        :record="record"
        :box="box"
        :width="width"
        :height="height"
        :visible="props.visible"
        :now="now"
      />

      <!-- Plakette und Zustandspille liegen ÜBER der Karte, sie schrumpfen sie
           nicht: unter ihnen dürfen echte Marken stehen. -->
      <div class="els-plaque">
        <span class="els-live" aria-hidden="true" />
        <span class="els-plaque-body">
          <span class="els-kicker">{{ VOYAGE_LIVE_PLAQUE_LABEL }}</span>
          <span v-ink-center.y class="els-title">
            Galaxy {{ toRoman(galaxyStore.currentGalaxy) }}
          </span>
          <span class="els-theme">{{ themeName }}</span>
        </span>
      </div>

      <span v-ink-center.y class="els-state">{{ state }}</span>

      <!-- Die zwei Listen, die die Karte nur als namenlose Marken kennt. Scrim
           statt Kasten, wie die Manifestreihe des Atlas. -->
      <div class="els-aside els-aside--l">
        <span class="els-scrim els-scrim--l" aria-hidden="true" />
        <ExpeditionRunLedger class="els-aside-in" />
      </div>

      <div class="els-aside els-aside--r">
        <span class="els-scrim els-scrim--r" aria-hidden="true" />
        <ExpeditionRunLog class="els-aside-in" />
      </div>

      <div v-if="bandH > 0" class="els-band">
        <ExpeditionLiveBand />
      </div>
    </ExpeditionLivePlate>
  </div>
</template>

<style scoped>
.els {
  container-type: inline-size;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #0b0806;
}

/* ── Plaketten ───────────────────────────────────────────────────────────── */
.els-plaque {
  position: absolute;
  z-index: 2;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 12px 7px 10px;
  background: rgba(17, 16, 8, 0.88);
  border: 1px solid #5c3310;
  border-left: 3px solid var(--els-accent, #c89040);
  border-radius: 4px;
  pointer-events: none;
}

.els-plaque-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.els-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.62);
}

.els-title {
  font-size: clamp(15px, 1.5vh, 21px);
  font-weight: 900;
  letter-spacing: 0.06em;
  line-height: 1;
  color: #e8c040;
}

.els-theme {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(212, 200, 160, 0.7);
  white-space: nowrap;
}

/* Der Punkt RUHT: statischer Schein, animiert wird allein die Deckkraft. */
.els-live {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #5ce8b4;
  box-shadow: 0 0 8px rgba(92, 232, 180, 0.75);
  animation: els-live-pulse 2.4s ease-in-out infinite alternate;
}

@keyframes els-live-pulse {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

.els-state {
  position: absolute;
  z-index: 2;
  top: 10px;
  right: 10px;
  padding: 6px 11px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(212, 200, 160, 0.82);
  background: rgba(17, 16, 8, 0.88);
  border: 1px solid #5c3310;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}

/* ── Die zwei Listen ─────────────────────────────────────────────────────── */
.els-aside {
  position: absolute;
  z-index: 2;
  top: 68px;
  width: v-bind(asideW);
  max-height: v-bind(asideMaxH);
  display: flex;
  min-height: 0;
  pointer-events: none;
}
.els-aside--l {
  left: 10px;
}
.els-aside--r {
  right: 10px;
}

/* Scrim, kein Kasten: unter der Liste liegen echte Marken, und die sollen
   abgedunkelt weiter dastehen statt zu verschwinden. Der Verlauf fällt
   SENKRECHT und wird waagerecht maskiert. */
.els-scrim {
  position: absolute;
  inset: -6px -8px;
  background: linear-gradient(
    to bottom,
    rgba(8, 6, 3, 0.88),
    rgba(8, 6, 3, 0.7) 62%,
    rgba(8, 6, 3, 0)
  );
}
.els-scrim--l {
  -webkit-mask-image: linear-gradient(to right, #000 72%, transparent 100%);
  mask-image: linear-gradient(to right, #000 72%, transparent 100%);
}
.els-scrim--r {
  -webkit-mask-image: linear-gradient(to left, #000 72%, transparent 100%);
  mask-image: linear-gradient(to left, #000 72%, transparent 100%);
}

/* Nur die Liste selbst nimmt Zeiger an — der Klick auf den Bühnengrund muss
   überall sonst durchkommen. */
.els-aside-in {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  pointer-events: auto;
}

/* Unter dieser Bühnenbreite weichen beide: eine gestauchte Liste ist schlimmer
   als keine. Die Schwelle steht als LITERAL — eine Query-Präambel nimmt kein
   var(), und v-bind kompiliert genau dazu. */
@container (max-width: 899.9px) {
  .els-aside {
    display: none;
  }
}

/* ── Das Datenband ───────────────────────────────────────────────────────── */
/* Es sitzt IN der Bühne und schrumpft die Fit-Box um genau seine Höhe — damit
   ist die Plattengeometrie Zeichen für Zeichen die des Atlas. */
.els-band {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  bottom: 0;
}

@media (prefers-reduced-motion: reduce) {
  .els-live {
    animation: none;
    opacity: 1;
  }
}
</style>
