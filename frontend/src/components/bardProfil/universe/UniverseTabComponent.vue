<script setup lang="ts">
/**
 * Das Universe — der ganze Weg auf EINER Karte.
 *
 * Der Reiter beantwortet die Frage, die sonst nirgends gestellt wird: wie weit
 * ist der Wandering Caretaker INSGESAMT gekommen. Journey zählt Zahlen, das
 * Voyages listet Galaxien — hier steht der Weg als Bild.
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
import UniverseCrestBand from './UniverseCrestBand.vue'
import UniverseRail from './UniverseRail.vue'
import SideRailHandle from '@/components/ui/SideRailHandle.vue'
import { useSideRail } from '@/composables/ui/useSideRail'
import UniverseChart from './UniverseChart.vue'
import { buildUniversePath, type UniversePath } from '@/utils/ui/universeLayout'
import { buildUniverseRailRows, visibleUniverseRailRows } from '@/utils/ui/universeRail'
import { buildUniverseChronicle } from '@/utils/ui/universeChronicle'
import { universeOfRecord } from '@/utils/game/galaxyUniverseBackfill'
import {
  UNIVERSE_MAP_RAIL_AUTOFOLD_W,
  UNIVERSE_MAP_RAIL_CLOSE_TITLE,
  UNIVERSE_MAP_RAIL_HANDLE_LABEL,
  UNIVERSE_MAP_RAIL_HANDLE_PX,
  UNIVERSE_MAP_RAIL_OPEN_TITLE,
  UNIVERSE_MAP_RAIL_PANEL_W,
  UNIVERSE_MAP_RAIL_SLIDE_MS,
  UNIVERSE_MAP_RAIL_ZONE_W,
} from '@/config/constants'
import type { UniverseDiveRequest, UniverseSelection } from '@/types'

const uiStore = useUiStore()
const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const providenceStore = useProvidenceStore()

const { completedGalaxies, currentGalaxy, currentThemeIndex, attemptResults, landfallResults } =
  storeToRefs(galaxyStore)

const isVisible = computed(() => uiStore.bardActiveTab === 'universe')
/**
 * Die Karten des Aufbruchs — aber nur auf der LAUFENDEN Bahn.
 *
 * Auf einer vergangenen haette ein Angebot nichts zu suchen: dort steht das
 * Abflugportal, das dokumentiert, wohin der Weg damals ging. Auf einer Bahn
 * steht immer genau EINE Art Portal, und `buildDeparture` haelt die andere
 * Haelfte dieser Zusage (es gibt auf der laufenden Bahn nie eine `departure`).
 */
const offers = computed(() =>
  selection.value.universe === gameStore.currentUniverse &&
  (hasCurrentPathContent.value || uiStore.universeDepartureRequested)
    ? providenceStore.offerCards
    : [],
)

// ── Auswahl: der Ansichtszustand, nie leer ──────────────────────────────────
const selection = ref<UniverseSelection>({
  universe: gameStore.currentUniverse,
  galaxy: null,
})

function select(next: UniverseSelection) {
  selection.value = next
}

function resetSelection() {
  selection.value = { universe: gameStore.currentUniverse, galaxy: null }
}

/** Ein Prestige bei offenem Profil macht die gezeigte Bahn zur Vergangenheit —
 *  ohne das stünde die Karte darauf, während die Wolke „hier bin ich" sagt. */
watch(() => gameStore.currentUniverse, resetSelection)

// ── Die EINE Bahn ───────────────────────────────────────────────────────────
/** Die Sterne der laufenden Galaxie — EINE Quelle fuer Bahn, Chronik und Leiste.
 *  Zwei Zaehlungen liefen still auseinander, sobald eine davon nachzog. */
const currentRescued = computed(() => attemptResults.value.filter((a) => a !== 'failed').length)
const currentLost = computed(() => attemptResults.value.filter((a) => a === 'failed').length)
const hasCurrentPathContent = computed(
  () =>
    completedGalaxies.value.some((record) => universeOfRecord(record) === gameStore.currentUniverse) ||
    currentRescued.value > 0 ||
    currentLost.value > 0,
)

/** Alles ausser dem Universum. */
const pathBase = computed(() => ({
  completed: completedGalaxies.value,
  runs: gameStore.universeRuns,
  currentUniverse: gameStore.currentUniverse,
  currentGalaxy: currentGalaxy.value,
  currentRescued: currentRescued.value,
  currentLost: currentLost.value,
  currentLandfalls: landfallResults.value.filter((l) => l.cleared).length,
  currentThemeIndex: currentThemeIndex.value,
  starsOf: computeRequired,
}))

const path = computed<UniversePath>(() =>
  buildUniversePath({ ...pathBase.value, universe: selection.value.universe }),
)

/** Was die gezeigte Bahn hergab — die vier Ablesungen des Kopfbands.
 *
 *  Sie haengt am PFAD, nicht an den Lebenszeit-Zaehlern: der ist schon nach
 *  `record.universe` geschnitten und traegt die laufende Galaxie mit. Die Uhr
 *  bleibt draussen, gerechnet wird nur, wenn sich der Bestand aendert. */
const chronicle = computed(() =>
  buildUniverseChronicle({
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
function openInGalaxy(galaxy: number) {
  uiStore.requestOpenGalaxyFromUniverse(galaxy)
}

/** Dieselbe Tuer als Kamerafahrt — den Reiter schaltet der Schleier. */
function diveInto(req: UniverseDiveRequest) {
  uiStore.requestUniverseDive(req)
}

/** Der Rueckweg aus dem Atlas kommt als Fahrt an: die Karte setzt sich aus dem
 *  Knoten dieser Galaxie heraus, sobald der Schleier faellt. */
const arriving = computed(() => {
  const d = uiStore.universeDive
  return d && d.toward === 'universe' && d.phase === 'in' ? d.galaxy : null
})

// ── Leiste ──────────────────────────────────────────────────────────────────
/** Die EINE Zeilenrechnung — Liste und Griff lesen dieselbe. */
const railRows = computed(() =>
  buildUniverseRailRows({
    completed: completedGalaxies.value,
    runs: gameStore.universeRuns,
    currentUniverse: gameStore.currentUniverse,
    selectedUniverse: selection.value.universe,
    currentRescued: currentRescued.value,
    currentLost: currentLost.value,
  }),
)
const visibleRailRows = computed(() => visibleUniverseRailRows(railRows.value))
const walkedCount = computed(() => railRows.value.filter((r) => r.walked).length)

/** `null` = der Reiter entscheidet nach Breite, sonst hat es der Spieler gesagt. */
const railChoice = ref<boolean | null>(null)
const narrow = ref(false)
const railFolded = computed(() => railChoice.value ?? narrow.value)

const root = ref<HTMLElement | null>(null)

/** Fahrt, Fokus und Breitenmessung teilen sich alle vier Leisten. Die
 *  Politik — Startzustand und Escape-Richtung — bleibt hier. */
const {
  inert: railInert,
  observe,
  unobserve,
} = useSideRail({
  folded: railFolded,
  slideMs: UNIVERSE_MAP_RAIL_SLIDE_MS,
  autofoldW: UNIVERSE_MAP_RAIL_AUTOFOLD_W,
  narrow,
})

// ── Sichtbarkeit: Escape-Leiter und Beobachter hängen daran, nicht am Leben ──
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  // Das Oberste zuerst: was ueber allem liegt, geht zuerst zu.
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
      unobserve()
      // Beim VERLASSEN zurücksetzen, nicht beim Betreten: ein Reset im selben
      // Flush wie eine Öffnungs-Anfrage löschte, was gerade gezeigt werden soll.
      resetSelection()
      return
    }
    document.addEventListener('keydown', onKeydown, true)
    observe(root.value)
  },
  { immediate: true },
)

watch(root, (el) => {
  if (isVisible.value) observe(el)
})

watch(
  () => [isVisible.value, uiStore.universeDepartureRequested, gameStore.prestigeAvailable] as const,
  ([visible, requested, available]) => {
    if (visible && requested && available) gameStore.checkPrestigeAvailability()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
})

/**
 * Der Rueckweg aus dem Voyages-Atlas. EINMAL verbrauchen — und NACH dem
 * `isVisible`-Watcher, der die Auswahl beim Verlassen leert.
 *
 * `immediate: true` ist Pflicht: der Reiter wird lazy gemountet, beim
 * allerersten Ruecksprung laeuft sein Setup erst NACH dem Setzen des Zeigers.
 */
watch(
  () => uiStore.pendingUniverseGalaxy,
  (galaxy) => {
    if (galaxy === null) return
    // Der Atlas kennt kein Universum — auf welcher Bahn die Galaxie liegt,
    // steht in ihrem Datensatz.
    const record = completedGalaxies.value.find((r) => r.galaxy === galaxy)
    select({ universe: record?.universe ?? gameStore.currentUniverse, galaxy })
    uiStore.clearPendingUniverseGalaxy()
  },
  { immediate: true },
)

/**
 * Die Buehne links, die Universumsleiste rechts.
 *
 * Die Zonenbreite wechselt HART, ohne Transition — sie steht ueber den
 * ResizeObserver der Karte in deren `paintKey` UND `groundKey`, und ueber die
 * Fahrt animiert malte sie je Umschaltung Grund, Wall und Bahn wieder und
 * wieder statt einmal. Was man WANDERN sieht, ist das Panel darin.
 */
const bodyColumns = computed(
  () =>
    `minmax(0, 1fr) ${railFolded.value ? UNIVERSE_MAP_RAIL_HANDLE_PX : UNIVERSE_MAP_RAIL_ZONE_W}px`,
)
/** Die Zahl hinter dem Wort ist Auskunft, kein Signal: wie viele Universen
 *  begangen sind. Das „/ 10" der gefallenen Kopfzeile steht in der Hover-Karte. */
const handleTitle = computed(
  () =>
    `${railFolded.value ? UNIVERSE_MAP_RAIL_OPEN_TITLE : UNIVERSE_MAP_RAIL_CLOSE_TITLE} — ` +
    `${walkedCount.value} of ${railRows.value.length} walked`,
)

const railPanelWidth = `${UNIVERSE_MAP_RAIL_PANEL_W}px`
const handleWidth = `${UNIVERSE_MAP_RAIL_HANDLE_PX}px`
const slideMs = `${UNIVERSE_MAP_RAIL_SLIDE_MS}ms`
</script>

<template>
  <div ref="root" class="un-tab">
    <CosmicStageBackground />

    <UniverseCrestBand :universe="selection.universe" :chronicle="chronicle" />

    <div class="un-body">
      <UniverseChart
        :nodes="path.nodes"
        :departure="path.departure"
        :offers="offers"
        :selection="selection"
        :visible="isVisible"
        :arriving="arriving"
        @select="select"
        @open="openInGalaxy"
        @dive="diveInto"
      />

      <!-- Die Leiste faehrt als EIN Stueck seitlich hinaus; stehen bleibt die
           Griffleiste. Sie steht im DOM HINTER der Karte, damit Tabulator und
           Screenreader dem Bild folgen. -->
      <div class="un-rail-zone">
        <div
          class="un-rail-slide"
          :class="{ 'un-rail-slide--parked': railFolded }"
          :inert="railInert"
        >
          <UniverseRail :rows="visibleRailRows" :selection="selection" @select="select" />
        </div>

        <SideRailHandle
          :label="UNIVERSE_MAP_RAIL_HANDLE_LABEL"
          :width-px="UNIVERSE_MAP_RAIL_HANDLE_PX"
          :open="!railFolded"
          :title="handleTitle"
          @toggle="railChoice = !railFolded"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* `.tab-layer` ist `position: absolute` ohne Flex — die Box bringt der Reiter
   selbst mit, sonst fielen Band und Bühne auf Inhaltsgröße. */
.un-tab {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #111008;
}

/* Depth-Wash über dem Grund — flache Radialtöne, kein Blur, einmal Paint. */
.un-tab::after {
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
.un-body {
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
.un-rail-zone {
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
.un-rail-slide {
  position: absolute;
  top: 0;
  bottom: 0;
  right: v-bind(handleWidth);
  width: v-bind(railPanelWidth);
  z-index: 1;
  transition: transform v-bind(slideMs) ease;
}
.un-rail-slide--parked {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .un-rail-slide,
  .un-rail-slide--parked {
    transition: none;
  }
}
</style>
