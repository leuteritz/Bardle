<script setup lang="ts">
/**
 * Das Firmament — der ganze Weg auf EINER Karte.
 *
 * Der Reiter beantwortet die Frage, die sonst nirgends gestellt wird: wie weit
 * ist der Wandering Caretaker INSGESAMT gekommen. Journey zählt Zahlen, das
 * Archiv listet Galaxien, der Codex misst Bahnen — hier steht der Weg als Bild.
 *
 * **EINE Bahn je Universum.** Die Galaxienkette selbst läuft über das Prestige
 * hinweg durch (`executePrestigeReset` fasst `completedGalaxies` nicht an) —
 * geschnitten wird sie am Feld `record.universe`. Die Leiste rechts wählt die
 * Bahn, und diese Wahl ist der ANSICHTSZUSTAND: sie ist nie leer.
 *
 * Die Wurzel hält, was die Kinder teilen: die Bahn, die Auswahl und die
 * Leistenzeilen. Eine zweite Kette in der Karte liefe gegen die der Leiste, und
 * eine zweite Zählung im Griff gegen die der Liste.
 */
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/core/uiStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore, computeRequired } from '@/stores/world/galaxyStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import FirmamentLockedPanel from './FirmamentLockedPanel.vue'
import FirmamentCrestBand from './FirmamentCrestBand.vue'
import FirmamentUniverseRail from './FirmamentUniverseRail.vue'
import FirmamentRailHandle from './FirmamentRailHandle.vue'
import FirmamentChart from './FirmamentChart.vue'
import { buildFirmamentPath, type FirmamentPath } from '@/utils/ui/firmamentLayout'
import { buildFirmamentRailRows } from '@/utils/ui/firmamentRail'
import { buildFirmamentChronicle } from '@/utils/ui/firmamentChronicle'
import {
  FIRMAMENT_RAIL_AUTOFOLD_W,
  FIRMAMENT_RAIL_HANDLE_PX,
  FIRMAMENT_RAIL_PANEL_W,
  FIRMAMENT_RAIL_SLIDE_MS,
  FIRMAMENT_RAIL_ZONE_W,
} from '@/config/constants'
import type { FirmamentSelection } from '@/types'

const uiStore = useUiStore()
const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const providenceStore = useProvidenceStore()

const { completedGalaxies, currentGalaxy, currentThemeIndex, attemptResults, landfallResults } =
  storeToRefs(galaxyStore)

const isVisible = computed(() => uiStore.bardActiveTab === 'firmament')
/* Das Schloss weicht auch, wenn ein Aufbruch ansteht: der Prestige-Knopf im
   Header fuehrt hierher, und die Chimes-Schwelle und die erste befreite Galaxie
   sind zwei verschiedene Uhren. Die laufende Bahn traegt auch ohne Archiv immer
   den `current`-Knoten samt seinen Vorausplaetzen. */
const isUnlocked = computed(
  () => completedGalaxies.value.length > 0 || gameStore.prestigeAvailable,
)

/**
 * Die Karten des Aufbruchs — aber nur auf der LAUFENDEN Bahn.
 *
 * Auf einer vergangenen haette ein Angebot nichts zu suchen: dort steht das
 * Abflugportal, das dokumentiert, wohin der Weg damals ging. Auf einer Bahn
 * steht immer genau EINE Art Portal, und `buildDeparture` haelt die andere
 * Haelfte dieser Zusage (es gibt auf der laufenden Bahn nie eine `departure`).
 */
const offers = computed(() =>
  selection.value.universe === gameStore.currentUniverse ? providenceStore.offerCards : [],
)

// ── Auswahl: der Ansichtszustand, nie leer ──────────────────────────────────
const selection = ref<FirmamentSelection>({
  universe: gameStore.currentUniverse,
  galaxy: null,
})

function select(next: FirmamentSelection) {
  selection.value = next
}

function resetSelection() {
  selection.value = { universe: gameStore.currentUniverse, galaxy: null }
}

/** Ein Prestige bei offenem Profil macht die gezeigte Bahn zur Vergangenheit —
 *  ohne das stünde die Karte darauf, während die Wolke „hier bin ich" sagt. */
watch(() => gameStore.currentUniverse, resetSelection)

// ── Die EINE Bahn ───────────────────────────────────────────────────────────
const path = computed<FirmamentPath>(() =>
  buildFirmamentPath({
    completed: completedGalaxies.value,
    runs: gameStore.universeRuns,
    universe: selection.value.universe,
    currentUniverse: gameStore.currentUniverse,
    currentGalaxy: currentGalaxy.value,
    currentRescued: attemptResults.value.filter((a) => a !== 'failed').length,
    currentLost: attemptResults.value.filter((a) => a === 'failed').length,
    currentLandfalls: landfallResults.value.filter((l) => l.cleared).length,
    currentThemeIndex: currentThemeIndex.value,
    starsOf: computeRequired,
  }),
)

/** Was die gezeigte Bahn hergab — die vier Ablesungen des Kopfbands.
 *
 *  Sie haengt am PFAD, nicht an den Lebenszeit-Zaehlern: der ist schon nach
 *  `record.universe` geschnitten und traegt die laufende Galaxie mit. Die Uhr
 *  bleibt draussen, gerechnet wird nur, wenn sich der Bestand aendert. */
const chronicle = computed(() =>
  buildFirmamentChronicle({
    nodes: path.value.nodes,
    runs: gameStore.universeRuns,
    universe: selection.value.universe,
    currentUniverse: gameStore.currentUniverse,
    liveChimes: gameStore.chimesForNextUniverse,
    liveGoal: gameStore.chimesToUniverseRescue,
    liveSeconds: gameStore.universeRunStats.playedSeconds,
    chimesPerSecond: gameStore.chimesPerSecond,
  }),
)

/** Ein befreiter Knoten ist eine TUER, keine Auswahl: er fuehrt in den Atlas,
 *  in dem man mit dieser Galaxie etwas tun kann. */
function openInVoyages(galaxy: number) {
  uiStore.requestOpenVoyagesFromFirmament(galaxy)
}

// ── Leiste ──────────────────────────────────────────────────────────────────
/** Die EINE Zeilenrechnung — Liste und Griff lesen dieselbe. */
const railRows = computed(() =>
  buildFirmamentRailRows({
    completed: completedGalaxies.value,
    runs: gameStore.universeRuns,
    currentUniverse: gameStore.currentUniverse,
    selectedUniverse: selection.value.universe,
  }),
)
const walkedCount = computed(() => railRows.value.filter((r) => r.walked).length)

/** `null` = der Reiter entscheidet nach Breite, sonst hat es der Spieler gesagt. */
const railChoice = ref<boolean | null>(null)
const narrow = ref(false)
const railFolded = computed(() => railChoice.value ?? narrow.value)

const root = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

function observe(el: HTMLElement) {
  observer = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width ?? 0
    // Die 0 eines versteckten Reiters verwerfen — sonst spränge die Leiste beim
    // Zurückkehren einen Frame lang auf die eingeklappte Breite.
    if (w > 0) narrow.value = w < FIRMAMENT_RAIL_AUTOFOLD_W
  })
  observer.observe(el)
}

// ── Sichtbarkeit: Escape-Leiter und Beobachter hängen daran, nicht am Leben ──
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (selection.value.galaxy !== null) select({ ...selection.value, galaxy: null })
  else if (selection.value.universe !== gameStore.currentUniverse) resetSelection()
  else if (railChoice.value === true) railChoice.value = null
  // Nicht verbraucht: die Taste gehört dem Profil, es macht zu.
  else return
  e.preventDefault()
  e.stopPropagation()
}

watch(
  isVisible,
  (visible) => {
    if (!visible) {
      document.removeEventListener('keydown', onKeydown, true)
      if (observer) {
        observer.disconnect()
        observer = null
      }
      // Beim VERLASSEN zurücksetzen, nicht beim Betreten: ein Reset im selben
      // Flush wie eine Öffnungs-Anfrage löschte, was gerade gezeigt werden soll.
      resetSelection()
      return
    }
    document.addEventListener('keydown', onKeydown, true)
    if (root.value && !observer) observe(root.value)
  },
  { immediate: true },
)

watch(root, (el) => {
  if (el && isVisible.value && !observer) observe(el)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  observer?.disconnect()
})

/**
 * Der Rueckweg aus dem Voyages-Atlas. EINMAL verbrauchen — und NACH dem
 * `isVisible`-Watcher, der die Auswahl beim Verlassen leert.
 *
 * `immediate: true` ist Pflicht: der Reiter wird lazy gemountet, beim
 * allerersten Ruecksprung laeuft sein Setup erst NACH dem Setzen des Zeigers.
 */
watch(
  () => uiStore.pendingFirmamentGalaxy,
  (galaxy) => {
    if (galaxy === null) return
    // Der Atlas kennt kein Universum — auf welcher Bahn die Galaxie liegt,
    // steht in ihrem Datensatz.
    const record = completedGalaxies.value.find((r) => r.galaxy === galaxy)
    select({ universe: record?.universe ?? gameStore.currentUniverse, galaxy })
    uiStore.clearPendingFirmamentGalaxy()
  },
  { immediate: true },
)

/**
 * Die Buehne links, die Universumsleiste rechts.
 *
 * Die Zonenbreite wechselt HART, ohne Transition — sie steht ueber den
 * ResizeObserver der Karte in deren `paintKey` UND `groundKey`, und ueber die
 * Fahrt animiert malte sie je Umschaltung Sternfeld, Wall und Bahn wieder und
 * wieder statt einmal. Was man WANDERN sieht, ist das Panel darin.
 */
const bodyColumns = computed(
  () =>
    `minmax(0, 1fr) ${railFolded.value ? FIRMAMENT_RAIL_HANDLE_PX : FIRMAMENT_RAIL_ZONE_W}px`,
)
const railPanelWidth = `${FIRMAMENT_RAIL_PANEL_W}px`
const handleWidth = `${FIRMAMENT_RAIL_HANDLE_PX}px`
const slideMs = `${FIRMAMENT_RAIL_SLIDE_MS}ms`

/**
 * Den Fokus nimmt `inert`, aber VERZOEGERT: synchron gesetzt liegt seine Arbeit
 * im ersten Frame der Fahrt, und dort ist der Ruck am sichtbarsten.
 */
const railInert = ref(false)
let inertTimer: ReturnType<typeof setTimeout> | null = null
watch(railFolded, (folded) => {
  if (inertTimer !== null) clearTimeout(inertTimer)
  inertTimer = setTimeout(() => {
    inertTimer = null
    railInert.value = folded
  }, FIRMAMENT_RAIL_SLIDE_MS)
})
onBeforeUnmount(() => {
  if (inertTimer !== null) clearTimeout(inertTimer)
})
</script>

<template>
  <div ref="root" class="fm-tab">
    <CosmicStageBackground />

    <FirmamentLockedPanel v-if="!isUnlocked" />

    <template v-else>
      <FirmamentCrestBand :universe="selection.universe" :chronicle="chronicle" />

      <div class="fm-body">
        <FirmamentChart
          :nodes="path.nodes"
          :departure="path.departure"
          :offers="offers"
          :selection="selection"
          :visible="isVisible"
          @select="select"
          @open="openInVoyages"
        />

        <!-- Die Leiste faehrt als EIN Stueck seitlich hinaus; stehen bleibt die
             Griffleiste. Sie steht im DOM HINTER der Karte, damit Tabulator und
             Screenreader dem Bild folgen. -->
        <div class="fm-rail-zone">
          <div
            class="fm-rail-slide"
            :class="{ 'fm-rail-slide--parked': railFolded }"
            :inert="railInert"
          >
            <FirmamentUniverseRail :rows="railRows" :selection="selection" @select="select" />
          </div>

          <FirmamentRailHandle
            :walked="walkedCount"
            :total="railRows.length"
            :open="!railFolded"
            @toggle="railChoice = !railFolded"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* `.tab-layer` ist `position: absolute` ohne Flex — die Box bringt der Reiter
   selbst mit, sonst fielen Band und Bühne auf Inhaltsgröße. */
.fm-tab {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #111008;
}

/* Depth-Wash über dem Sternfeld — flache Radialtöne, kein Blur, einmal Paint. */
.fm-tab::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(100% 70% at 42% 6%, rgba(92, 51, 16, 0.2) 0%, transparent 60%),
    radial-gradient(80% 70% at 100% 100%, rgba(46, 34, 96, 0.2) 0%, transparent 64%);
}

/* Zwei Zonen, EIN Budget: was die Leiste nimmt, nimmt sie der Karte. Die
   Spaltenbreite wechselt HART — sie steht in `paintKey` und `groundKey` der
   Karte, animiert malte jede Umschaltung die ganze Platte mehrfach neu. */
.fm-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: v-bind(bodyColumns);
  /* `clip` und NICHT `hidden`: die geparkte Leiste steht ausserhalb dieses
     Rahmens, und `hidden` machte ihn zum Scrollport — er schneidet dann nicht
     nur ab, er laesst sich auch verschieben. */
  overflow: clip;
}

/* Die Huelle traegt beide Kinder absolut — die Spaltenbreite wechselt hart, das
   Panel darin faehrt. */
.fm-rail-zone {
  position: relative;
  min-width: 0;
  min-height: 0;
}

/* Die Liste behaelt ihre Breite IMMER — genau deshalb ueberlebt die
   Rollposition das Zuklappen, ohne dass jemand sie sichert: sie wird nie neu
   umbrochen, nur verschoben.

   Hier steht bewusst KEIN `transform: translateX(0)` und kein `will-change`:
   beides machte dieses Element zum Containing Block fuer `position: fixed`, und
   die Hover-Karten des Reiters teleportieren nach `<body>`. */
.fm-rail-slide {
  position: absolute;
  top: 0;
  bottom: 0;
  right: v-bind(handleWidth);
  width: v-bind(railPanelWidth);
  z-index: 1;
  transition: transform v-bind(slideMs) ease;
}
.fm-rail-slide--parked {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .fm-rail-slide,
  .fm-rail-slide--parked {
    transition: none;
  }
}
</style>
