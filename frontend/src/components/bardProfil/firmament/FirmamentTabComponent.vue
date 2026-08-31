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
 * geschnitten wird sie am Feld `record.universe`. Die Leiste links wählt die
 * Bahn, und diese Wahl ist der ANSICHTSZUSTAND: sie ist nie leer.
 *
 * Die Wurzel hält, was beide Kinder teilen: die Bahn und die Auswahl. Eine
 * zweite Kette in der Karte liefe gegen die der Leiste.
 */
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/core/uiStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore, computeRequired } from '@/stores/world/galaxyStore'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import FirmamentLockedPanel from './FirmamentLockedPanel.vue'
import FirmamentCrestBand from './FirmamentCrestBand.vue'
import FirmamentUniverseRail from './FirmamentUniverseRail.vue'
import FirmamentChart from './FirmamentChart.vue'
import { buildFirmamentPath, type FirmamentPath } from '@/utils/ui/firmamentLayout'
import {
  FIRMAMENT_RAIL_AUTOFOLD_W,
  FIRMAMENT_RAIL_FOLDED_W,
  FIRMAMENT_RAIL_W,
} from '@/config/constants'
import type { FirmamentSelection } from '@/types'

const uiStore = useUiStore()
const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

const { completedGalaxies, currentGalaxy, currentThemeIndex, attemptResults, landfallResults } =
  storeToRefs(galaxyStore)

const isVisible = computed(() => uiStore.bardActiveTab === 'firmament')
const isUnlocked = computed(() => completedGalaxies.value.length > 0)

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

/** Ein befreiter Knoten ist eine TUER, keine Auswahl: er fuehrt in den Atlas,
 *  in dem man mit dieser Galaxie etwas tun kann. */
function openInVoyages(galaxy: number) {
  uiStore.requestOpenVoyagesFromFirmament(galaxy)
}

// ── Leiste ──────────────────────────────────────────────────────────────────
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

const railW = computed(() =>
  railFolded.value ? `${FIRMAMENT_RAIL_FOLDED_W}px` : `${FIRMAMENT_RAIL_W}px`,
)
</script>

<template>
  <div ref="root" class="fm-tab">
    <CosmicStageBackground />

    <FirmamentLockedPanel v-if="!isUnlocked" />

    <template v-else>
      <FirmamentCrestBand :universe="selection.universe" />

      <div class="fm-body">
        <FirmamentUniverseRail
          :folded="railFolded"
          :selection="selection"
          @select="select"
          @toggle="railChoice = !railFolded"
        />
        <FirmamentChart
          :nodes="path.nodes"
          :departure="path.departure"
          :selection="selection"
          :visible="isVisible"
          @select="select"
          @open="openInVoyages"
        />
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

/* Zwei Zonen, EIN Budget: was die Leiste nimmt, nimmt sie der Karte. */
.fm-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: v-bind(railW) minmax(0, 1fr);
  /* Die Breite fährt, die Leiste wird VERSCHOBEN statt abgerissen — `clip`,
     nicht `hidden`: ein Scrollport liesse sich verschieben. */
  transition: grid-template-columns 0.18s ease;
}
</style>
