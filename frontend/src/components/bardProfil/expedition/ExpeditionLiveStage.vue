<script setup lang="ts">
/**
 * Die zweite Bühne des Reiters: der LAUFENDE Lauf, gross.
 *
 * Der Atlas führt nur `completedGalaxies` — die Galaxie, in der der Spieler
 * gerade fliegt, ist dort nie dabei. Sie steht deshalb hier, und zwar mit
 * DEMSELBEN Renderer wie die Bottom-Bar-Minimap: Kamera, Komet, Zoomfahrt auf
 * den Zielstern und die Ankunft im Sternsystem stehen dort geschrieben, und ein
 * zweiter Live-Renderer daneben liesse beide Bilder auseinanderlaufen.
 *
 * Vergrössert wird über `scale` — der Faktor liegt in der Canvas-Transformation,
 * nicht an den Konstanten. Die Fläche ist QUADRATISCH wie die Vorlage (440x440):
 * die Weltabbildung des Renderers streckt sonst die Galaxienscheibe.
 *
 * Die Bühne ist eine ANSICHT. Die Gesten der Minimap (Zielstern anklicken,
 * überspringen) bleiben dort — zwei Bedienwege für dieselbe Handlung wären
 * einer zu viel.
 *
 * Links und rechts der quadratischen Fläche bleibt auf jedem Desktop Rand übrig;
 * er trägt die zwei Listen, die die Karte nur als namenlose Marken kennt. Sie
 * WEICHEN, sobald der Rand zu schmal wird — die Karte gibt keinen Pixel dafür
 * ab.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { destinationName } from '@/config/economy/expeditionDestinations'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { toRoman } from '@/utils/ui/format'
import MiniMapCanvas from '@/components/bottom/minimap/MiniMapCanvas.vue'
import ExpeditionLiveBand from './ExpeditionLiveBand.vue'
import ExpeditionRunLedger from './ExpeditionRunLedger.vue'
import ExpeditionRunLog from './ExpeditionRunLog.vue'
import {
  VOYAGE_LIVE_ASIDE_GAP,
  VOYAGE_LIVE_ASIDE_MAX_W,
  VOYAGE_LIVE_ASIDE_SHARE,
  VOYAGE_LIVE_PLAQUE_LABEL,
  VOYAGE_LIVE_REF_PX,
  VOYAGE_LIVE_SCALE_MAX,
  VOYAGE_LIVE_SCALE_MIN,
  VOYAGE_LIVE_STATES,
} from '@/config/constants'

const props = defineProps<{ visible: boolean }>()

const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
// NICHT `isIdleRenderingPaused`: das ist wahr, sobald ein Profil-Reiter offen
// ist — also immer, wenn diese Bühne sichtbar ist.
const { isRenderingPaused } = useRenderingPaused()

const mapEl = ref<HTMLElement | null>(null)
const edge = ref(0)

let observer: ResizeObserver | null = null
watch(mapEl, (el) => {
  observer?.disconnect()
  observer = null
  if (!el) return
  observer = new ResizeObserver((entries) => {
    const box = entries[0]?.contentRect
    if (box) edge.value = box.width
  })
  observer.observe(el)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const scale = computed(() =>
  Math.min(
    VOYAGE_LIVE_SCALE_MAX,
    Math.max(VOYAGE_LIVE_SCALE_MIN, (edge.value || VOYAGE_LIVE_REF_PX) / VOYAGE_LIVE_REF_PX),
  ),
)

/** Verdeckt kostet die Schleife nichts — der Reiter bleibt gemountet. */
const active = computed(() => props.visible && !isRenderingPaused.value)

const accent = computed(
  () => `rgb(${minimapAccentForTheme(galaxyStore.currentThemeIndex, gameStore.currentUniverse)})`,
)

const themeName = computed(() => destinationName(galaxyStore.currentThemeIndex))

const asideGap = `${VOYAGE_LIVE_ASIDE_GAP}px`
/** Die Kante der Karte — die kleinere der beiden Seiten des Rahmens. */
const mapEdge = `min(calc(100cqw - ${VOYAGE_LIVE_ASIDE_GAP * 2}px), 100cqh)`
/** Die Spalte bleibt ein ANTEIL der Karte: auf einem flachen Fenster stünde sie
 *  sonst breiter da als das Bild, das sie erklärt. */
const asideMax = `min(${VOYAGE_LIVE_ASIDE_MAX_W}px, calc(${VOYAGE_LIVE_ASIDE_SHARE} * ${mapEdge}))`

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
</script>

<template>
  <div class="els">
    <div class="els-frame">
      <div class="els-aside">
        <ExpeditionRunLedger class="els-aside-in" />
      </div>

      <div ref="mapEl" class="els-map" :style="{ '--els-accent': accent }">
        <MiniMapCanvas :scale="scale" :active="active" />

        <!-- Plaketten liegen ÜBER der Karte, sie schrumpfen sie nicht: die
             Kartenfläche ist quadratisch und hat links und rechts ohnehin
             Rand. -->
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
      </div>

      <div class="els-aside">
        <ExpeditionRunLog class="els-aside-in" />
      </div>
    </div>

    <ExpeditionLiveBand />
  </div>
</template>

<style scoped>
.els {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #0b0806;
}

/* `size` und nicht `inline-size`: die Kante der Karte ist die KLEINERE der
   beiden Seiten, dafür braucht es cqh. */
.els-frame {
  container-type: size;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: v-bind(asideGap);
  padding: 4px;
}

/* Die Spalten nehmen NUR, was der quadratische Zuschnitt übrig lässt: `flex: 1`
   gegen eine Karte, die nicht schrumpfen darf. Unter der Schwelle bleibt die
   Hülle stehen und ihr Inhalt geht — eine gestauchte Liste wäre schlimmer als
   keine. */
.els-aside {
  container-type: inline-size;
  flex: 1 1 0;
  min-width: 0;
  max-width: v-bind(asideMax);
  display: flex;
  overflow: hidden;
}
.els-aside-in {
  flex: 1;
  min-width: 0;
}
/* Unter 150 px geht der Inhalt: eine gestauchte Liste ist schlimmer als keine.
   Die Schwelle steht als LITERAL — eine Query-Praeambel nimmt kein var(), und
   v-bind kompiliert genau dazu. */
@container (max-width: 149.9px) {
  .els-aside-in {
    display: none;
  }
}

/* Quadratisch wie die Vorlage — die Weltabbildung des Renderers rechnet Breite
   und Höhe getrennt, ein anderes Seitenverhältnis staucht die Scheibe.
   `min(cqw, cqh)` statt aspect-ratio: mit einer festen Seite plus max-* auf der
   anderen bleibt die Ratio nicht erhalten, das Bild verzöge sich. */
.els-map {
  position: relative;
  flex: 0 0 auto;
  /* Die Fuge zweimal abziehen: sonst überliefe die Reihe genau dann, wenn die
     Karte die volle Breite nimmt. */
  width: v-bind(mapEdge);
  height: v-bind(mapEdge);
  border: 4px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310;
  background: #111008;
  overflow: hidden;
}

/* ── Plaketten ───────────────────────────────────────────────────────────── */
.els-plaque {
  position: absolute;
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

@media (prefers-reduced-motion: reduce) {
  .els-live {
    animation: none;
    opacity: 1;
  }
}
</style>
