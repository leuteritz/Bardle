<script setup lang="ts">
/**
 * Der Voyages-Reiter — eine KARTE, kein Vertragsbrett.
 *
 * Mittig steht die gewählte Galaxie, live gezeichnet, mit den Verträgen als
 * anklickbare Ankerplätze auf ihr. Links wählt die Leiste, welche befreite
 * Galaxie man besucht, rechts steht das Detail, in dem die Crew gesetzt und
 * abgeschickt wird. Der Spieler soll sehen, WOHIN er schickt.
 *
 * Solange keine Galaxie befreit ist, steht statt allem das Sperr-Panel: der
 * Reiter ist von Anfang an sichtbar, also braucht er von Anfang an Inhalt.
 *
 * Der Reiter bleibt nach dem ersten Öffnen gemountet. Alles, was läuft, hängt
 * deshalb an `isVisible` und nicht an der Lebensdauer.
 *
 * KEIN `zoom: var(--team-ui-scale)` wie der Shop-Atlas: `ExpeditionCrewPicker`
 * teleportiert nach <body> und heftet sich an ein hier gemessenes Rechteck —
 * unter `zoom` stünde es skaliert daneben. Der Faktor ist auf allen vier
 * Referenzauflösungen ohnehin 1; schmalere Fenster klappen die Leiste ein.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useVoyageAtlas } from '@/composables/expedition/useVoyageAtlas'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import {
  VOYAGE_COMMAND_BAR_H,
  VOYAGE_LOADER_MIN_MS,
  VOYAGE_LOADER_SETTLE_FRAMES,
  VOYAGE_DETAIL_COLLAPSED,
  VOYAGE_DETAIL_MAX_WIDTH,
  VOYAGE_DETAIL_MIN_WIDTH,
  VOYAGE_DETAIL_PCT,
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_RAIL_AUTOFOLD_WIDTH,
  VOYAGE_RAIL_COLLAPSED,
  VOYAGE_RAIL_WIDTH,
  FORGE_MASS_SEND_NODE,
} from '@/config/constants'
import ExpeditionLockedPanel from './ExpeditionLockedPanel.vue'
import ExpeditionCommandBar from './ExpeditionCommandBar.vue'
import ExpeditionGalaxyRail from './ExpeditionGalaxyRail.vue'
import ExpeditionGalaxyMap from './ExpeditionGalaxyMap.vue'
import ExpeditionDetailPanel from './ExpeditionDetailPanel.vue'
import VoyagesTabLoader from './VoyagesTabLoader.vue'

const uiStore = useUiStore()
const chartStore = useExpeditionChartStore()
const forgeStore = useStarForgeStore()
const { focusNode } = useForgeSpotlight()

const isVisible = computed(() => uiStore.bardActiveTab === 'expedition')

const atlas = useVoyageAtlas(isVisible)
const {
  now,
  records,
  selectedGalaxy,
  selectedRecord,
  selectedKey,
  selectedSite,
  placedSites,
  railRows,
  chimePops,
  collectFlashing,
  homecomings,
  gateState,
} = atlas

const destination = computed(() =>
  selectedRecord.value ? destinationFor(selectedRecord.value) : null,
)
const galaxyTitle = computed(() => destination.value?.name ?? '')
const galaxyTier = computed(() => destination.value?.tier ?? 'common')

// ── Zonenbudget ─────────────────────────────────────────────────────────────
// Am ATLAS gemessen, nicht am Viewport: das Profilmodal ist beidseitig um
// `--hud-panel-size` eingerückt, eine Media Query klappte die Leiste auf den
// falschen Schirmen ein.
const atlasEl = ref<HTMLElement | null>(null)
const atlasWidth = ref(0)
/** Ausdrückliche Wahl des Spielers, sonst „lass die Breite entscheiden". */
const userRailFolded = ref<boolean | null>(null)
const railFolded = computed(
  () =>
    userRailFolded.value ??
    (atlasWidth.value > 0 && atlasWidth.value < VOYAGE_RAIL_AUTOFOLD_WIDTH),
)

/**
 * Die Detailspalte folgt der Auswahl: zu, bis ein Hafen angeklickt wird. Der
 * Reiter ist eine Karte, und die soll man beim Öffnen sehen.
 *
 * DREI Zustände, nicht zwei. `null` heisst „zu, weil nichts gewählt ist", `true`
 * heisst „zugeklappt, weil der Spieler die Karte sehen will" — nur das zweite
 * ist Kartenfokus. Ohne die Unterscheidung stünde der Fokusknopf auf schmalen
 * Fenstern ab dem ersten Frame gedrückt da (dort faltet die Leiste von selbst),
 * und Escape verbrauchte mit einem Druck zwei Stufen.
 */
const userDetailFolded = ref<boolean | null>(null)
const detailFolded = computed(() => userDetailFolded.value ?? true)

/** Die Spalte öffnet nur über einer Galaxie, die etwas trägt. */
const detailOpenable = computed(() => placedSites.value.length > 0)

/** Die EINE Stelle, die aufklappt — `null` und nicht `true`, damit eine stille
 *  Galaxie nicht als gewollter Kartenfokus zählt. */
function setDetailFolded(folded: boolean) {
  userDetailFolded.value = folded ? true : detailOpenable.value ? false : null
}

/**
 * Kartenfokus: beide Ränder weggeklappt. ABGELEITET, kein eigenes Flag — der
 * Spieler erreicht ihn über die Griffe von Leiste und Detailspalte, seit die
 * Kopfleiste keinen Focus-Knopf mehr trägt. Nur Escape braucht beides.
 */
const chartFocus = computed(() => railFolded.value && userDetailFolded.value === true)
function toggleFocus() {
  const next = !chartFocus.value
  userRailFolded.value = next
  setDetailFolded(next)
}

/** Der Sprung aus dem Fleet-Band. Reihenfolge ist bindend: `selectGalaxy`
 *  räumt `selectedKey` ab. */
function jumpToMark(galaxy: number, key: string | null) {
  atlas.selectGalaxy(galaxy)
  if (key) selectedKey.value = key
}

/**
 * Ein ausdrücklicher Klick auf den Bühnengrund schliesst mit — aber er hebt
 * einen gewollten Kartenfokus NICHT auf. Dieselbe Ausnahme wie im Watcher auf
 * die Galaxie: `true` ist die ausdrückliche Wahl des Spielers, `null` nur „zu,
 * weil nichts gewählt ist". Ohne die Ausnahme fiele Escape-Stufe 2 aus dem
 * Fokus, bevor Stufe 3 ihn aufwickeln kann — die Leiter hätte eine Sprosse
 * verloren, seit die Kopfleiste keinen Focus-Knopf mehr trägt.
 */
function onSelect(key: string | null) {
  selectedKey.value = key
  if (key === null && userDetailFolded.value !== true) userDetailFolded.value = null
}

/**
 * Jede Auswahl öffnet — auch die, die nicht vom Klick kommt: eine zurückgekehrte
 * Mission beim Betreten des Reiters, und die Marke, die gerade abgeschickt wurde.
 * Der Watcher schliesst NIE: verschwindet ein Subjekt unter der Auswahl
 * (eingesammelt, abgelaufen), bleibt die Spalte offen und fällt auf die
 * Galaxie-Übersicht zurück — die Beute steht genau dort.
 */
watch(selectedKey, (key) => {
  if (key !== null) userDetailFolded.value = false
})
watch(isVisible, (visible) => {
  if (!visible) userDetailFolded.value = null
})

/**
 * Die Spalte folgt AUCH der Galaxie, nicht nur dem Ankerplatz: eine Galaxie ohne
 * Vertrag und ohne Crew hat kein Detail, das ihre Breite rechtfertigt.
 *
 * Der Watcher hängt an der GALAXIE, nicht an `placedSites` — wer den letzten
 * Vertrag einsammelt, behält die offene Spalte samt Beute.
 */
watch(selectedGalaxy, () => {
  if (userDetailFolded.value === true) return
  userDetailFolded.value = placedSites.value.length ? false : null
})

/**
 * Derselbe Sprung, andere Quelle: die Minimap setzt ihr Ziel in den uiStore,
 * hier wird es EINMAL verbraucht.
 *
 * Seine Stelle ist zwischen zwei Zwängen eingeklemmt, und beide sind gemessen:
 * NACH `useVoyageAtlas`, dessen `isVisible`-Watcher `autoSelect()` ruft und eine
 * hier gesetzte Marke überschriebe — und NACH den beiden Watchern oben, weil er
 * beim ERSTEN Öffnen im Setup feuert. Stünde er davor, wäre `selectedKey` schon
 * gesetzt, bevor `watch(selectedKey)` registriert ist: die Marke gewählt, das
 * Dossier aber zugeklappt.
 */
watch(
  () => uiStore.pendingVoyageTarget,
  (target) => {
    if (!target) return
    jumpToMark(target.galaxy, target.pinKey)
    uiStore.clearPendingVoyageTarget()
  },
  { immediate: true },
)

const atlasColumns = computed(() => {
  const rail = railFolded.value ? VOYAGE_RAIL_COLLAPSED : VOYAGE_RAIL_WIDTH
  const detail = detailFolded.value
    ? `${VOYAGE_DETAIL_COLLAPSED}px`
    : `clamp(${VOYAGE_DETAIL_MIN_WIDTH}px, ${VOYAGE_DETAIL_PCT}%, ${VOYAGE_DETAIL_MAX_WIDTH}px)`
  return `${rail}px minmax(0, 1fr) ${detail}`
})
const stageGutter = computed(() => `${VOYAGE_MAP_GUTTER_PX / 2}px`)
/** Die Chime-Zahlen steigen unter der Kopfleiste auf — +3 fuer deren Rahmen. */
const popTop = `${VOYAGE_COMMAND_BAR_H + 3 + 8}px`

let observer: ResizeObserver | null = null
watch(atlasEl, (el) => {
  observer?.disconnect()
  observer = null
  if (!el) return
  observer = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width
    if (w != null) atlasWidth.value = w
  })
  observer.observe(el)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

// ── Ladeschleier ────────────────────────────────────────────────────────────
// Gemessen am Produktionsbuild: das ERSTE Öffnen kostet 472 ms längsten
// Einzelframe, teurer als der Shop-Tab. Alles danach ist billig (Galaxiewechsel
// 14–34 ms, Wiedereinblenden 28 ms) — deshalb GENAU EINMAL je Sitzung. Das Flag
// darf komponentenlokal liegen, weil der Reiter nach dem ersten Öffnen nie mehr
// abgerissen wird; dasselbe wie `shopBuilt` im Shop und `boardBuilt` im Team-Tab.
const loaderVisible = ref(false)
const loaderStartedAt = ref(0)
const atlasBuilt = ref(false)
let settleFrame: number | null = null
let revealTimer: ReturnType<typeof setTimeout> | null = null

function cancelReveal() {
  if (settleFrame !== null) cancelAnimationFrame(settleFrame)
  settleFrame = null
  if (revealTimer !== null) clearTimeout(revealTimer)
  revealTimer = null
}

function revealWhenPainted() {
  let left = VOYAGE_LOADER_SETTLE_FRAMES
  const step = () => {
    if (left > 0) {
      left--
      settleFrame = requestAnimationFrame(step)
      return
    }
    settleFrame = null
    atlasBuilt.value = true
    const shown = performance.now() - loaderStartedAt.value
    // setTimeout und NICHT gameTimeout(): der Schleier ist reine Anzeige und
    // hat mit der Spielzeit nichts zu tun.
    revealTimer = setTimeout(() => {
      revealTimer = null
      loaderVisible.value = false
    }, Math.max(0, VOYAGE_LOADER_MIN_MS - shown))
  }
  step()
}

watch(
  isVisible,
  (visible) => {
    if (visible) {
      if (atlasBuilt.value || loaderVisible.value) return
      loaderStartedAt.value = performance.now()
      loaderVisible.value = true
      revealWhenPainted()
      return
    }
    cancelReveal()
    loaderVisible.value = false
    // Wer mitten im Aufbau weggeht, hat trotzdem gebaut.
    atlasBuilt.value = true
  },
  { immediate: true },
)
onBeforeUnmount(cancelReveal)

// ── Escape-Leiter ───────────────────────────────────────────────────────────
// Stufe 1 (Crew-Popover) gehört der Vertragskarte, sie meldet sich hier ab.
// Stufe 2 ist die Auswahl auf der Karte. Stufe 3 ist der Kartenfokus — er kommt
// NACH der Auswahl, weil die Auswahl das Jüngere ist: wer im Fokus einen Hafen
// angeklickt hat, will mit Escape diesen Hafen loswerden, nicht die ganze
// Ansicht. Stufe 4 — nichts gewählt, kein Fokus — wird NICHT verbraucht: die
// Karte zeigt immer eine Galaxie, sie zu leeren wäre kein Schritt zurück,
// sondern ein leerer Bildschirm.
const pickerOpen = ref(false)

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (pickerOpen.value) return
  if (selectedKey.value) onSelect(null)
  else if (chartFocus.value) toggleFocus()
  else return
  e.preventDefault()
  e.stopPropagation()
}

watch(
  isVisible,
  (visible) => {
    if (visible) document.addEventListener('keydown', onKeydown, true)
    else {
      document.removeEventListener('keydown', onKeydown, true)
      pickerOpen.value = false
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true))

/**
 * Der Weg zur Massen-Geste. Die Konstellation hat keinen Sitz im Netz — der
 * Sprung zeigt deshalb auf ihren ersten noch offenen Zubringer; steht die
 * Bedingung schon, liegt sie ohnehin im Angebotsstreifen.
 *
 * KEIN `openBardModal()` — das toggelt und schloesse das offene Profil.
 */
function openMassSendUpgrade() {
  uiStore.setBardTab('tree')
  const step = forgeStore.constellationNextStep(FORGE_MASS_SEND_NODE)
  if (step) focusNode(step, { readable: true })
}
</script>

<template>
  <div class="etc">
    <!-- Das Sperr-Panel trägt seine Bedingung selbst. -->
    <ExpeditionLockedPanel v-if="!chartStore.isUnlocked" />

    <div v-else ref="atlasEl" class="etc-atlas">
      <ExpeditionCommandBar
        class="etc-bar"
        :now="now"
        :collect-flashing="collectFlashing"
        :rows="railRows"
        :selected-key="selectedKey"
        @collect-all="atlas.collectAll"
        @send-all="atlas.sendAll"
        @open-upgrade="openMassSendUpgrade"
        @open="jumpToMark"
      />

      <ExpeditionGalaxyRail
        class="etc-rail"
        :rows="railRows"
        :records="records"
        :selected="selectedGalaxy"
        :folded="railFolded"
        @select="atlas.selectGalaxy"
        @fold="userRailFolded = $event"
      />

      <div class="etc-stage">
        <ExpeditionGalaxyMap
          v-if="selectedRecord"
          :record="selectedRecord"
          :sites="placedSites"
          :selected-key="selectedKey"
          :now="now"
          :title="galaxyTitle"
          :tier="galaxyTier"
          :visible="isVisible"
          :gate="gateState"
          :homecomings="homecomings"
          @select="onSelect"
        />
      </div>

      <ExpeditionDetailPanel
        class="etc-detail"
        :site="selectedSite"
        :sites="placedSites"
        :record="selectedRecord"
        :now="now"
        :folded="detailFolded"
        :openable="detailOpenable"
        @select="onSelect"
        @send="atlas.sendExpedition"
        @collect="atlas.collectMission"
        @picker-open="pickerOpen = $event"
        @fold="setDetailFolded"
      />

      <!-- Nur ein LEAVE — der Schleier ist ab Frame 1 voll deckend und wird
           weggeblendet, nie eingeblendet. -->
      <Transition name="vtl-reveal">
        <VoyagesTabLoader v-if="loaderVisible" :started-at="loaderStartedAt" />
      </Transition>

      <div class="etc-pops" aria-hidden="true">
        <span
          v-for="pop in chimePops"
          :key="pop.id"
          class="etc-pop"
          :style="{ '--pop-dx': pop.dx + 'px' }"
        >
          +{{ $formatNumber(pop.amount) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.etc {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #111008;
}

/* ══ Atlas ══
   `container-type` und keine Media Query: das Profilmodal ist beidseitig um
   `--hud-panel-size` eingerückt, die Breite, die über die Leiste entscheidet,
   ist also die des ATLAS. KEIN `zoom` — siehe Kopfkommentar. */
.etc-atlas {
  container-type: inline-size;
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: v-bind(atlasColumns);
  grid-template-rows: auto minmax(0, 1fr);
  background: #111008;
}

.etc-bar {
  grid-column: 1 / -1;
  grid-row: 1;
}
.etc-rail {
  grid-column: 1;
  grid-row: 2;
  min-height: 0;
}
.etc-stage {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  min-height: 0;
  padding: v-bind(stageGutter);
  background: #0b0806;
}
.etc-detail {
  grid-column: 3;
  grid-row: 2;
}

.vtl-reveal-leave-active {
  transition: opacity 0.3s ease;
}
.vtl-reveal-leave-to {
  opacity: 0;
}

/* ── Sammel-Rückmeldung ───────────────────────────────────── */
/* Direkt unter der Kopfleiste — an ihre Konstante gebunden, nicht geraten. */
.etc-pops {
  position: absolute;
  top: v-bind(popTop);
  left: 42%;
  z-index: 30;
  pointer-events: none;
}
.etc-pop {
  position: absolute;
  left: 50%;
  bottom: 0;
  font-size: 18px;
  font-weight: 900;
  color: #e8c040;
  white-space: nowrap;
  -webkit-text-stroke: 1.5px #3e200a;
  text-shadow:
    0 0 6px #e8c040,
    0 0 14px #c89040,
    0 0 28px rgba(232, 192, 64, 0.5);
  animation: etc-pop-float 0.85s ease-out forwards;
}
@keyframes etc-pop-float {
  0% {
    opacity: 0;
    transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(0) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(-12px) scale(1.12);
  }
  100% {
    opacity: 0;
    transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(-58px) scale(0.9);
  }
}
</style>
