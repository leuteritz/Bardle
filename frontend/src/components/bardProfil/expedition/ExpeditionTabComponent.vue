<script setup lang="ts">
/**
 * Der Voyages-Reiter — eine KARTE, kein Vertragsbrett.
 *
 * Mittig steht die gewählte Galaxie, live gezeichnet, mit den Verträgen als
 * anklickbare Ankerplätze auf ihr. Links wählt die Leiste, welche befreite
 * Galaxie man besucht. Der Spieler soll sehen, WOHIN er schickt.
 *
 * ZWEI Zonen, nicht drei. Die Detailspalte ist gefallen: die Auskunft trägt die
 * Hover-Karte der Marke, die Geste die Marke selbst — ein Klick führt aus, was
 * `utils/game/voyageAction.ts` für sie ausrechnet. Was die Spalte kostete, hat
 * die Galaxie geerbt (Full HD 628 → 1016 px).
 *
 * Solange keine Galaxie befreit ist, steht statt allem das Sperr-Panel: der
 * Reiter ist von Anfang an sichtbar, also braucht er von Anfang an Inhalt.
 *
 * Der Reiter bleibt nach dem ersten Öffnen gemountet. Alles, was läuft, hängt
 * deshalb an `isVisible` und nicht an der Lebensdauer.
 *
 * KEIN `zoom: var(--team-ui-scale)` wie der Shop-Atlas: die Hover-Karten der
 * Marken teleportieren nach <body> und heften sich an ein hier gemessenes
 * Rechteck — unter `zoom` stünden sie skaliert daneben. Der Faktor ist auf allen
 * vier Referenzauflösungen ohnehin 1; schmalere Fenster klappen die Leiste ein.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'
import { useVoyageAtlas } from '@/composables/expedition/useVoyageAtlas'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import {
  VOYAGE_COMMAND_BAR_H,
  VOYAGE_LOADER_MIN_MS,
  VOYAGE_LOADER_SETTLE_FRAMES,
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
import VoyagesTabLoader from './VoyagesTabLoader.vue'
import FirmamentReturnButton from '@/components/bardProfil/FirmamentReturnButton.vue'

const uiStore = useUiStore()
const chartStore = useExpeditionChartStore()
const { setPursuit } = useForgeSpotlight()
const { openDetails } = useForgeDetailsPane()

const isVisible = computed(() => uiStore.bardActiveTab === 'expedition')

const atlas = useVoyageAtlas(isVisible)
const {
  now,
  records,
  selectedGalaxy,
  selectedRecord,
  selectedKey,
  placedSites,
  actions,
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

/** Der Sprung aus dem Fleet-Band. Reihenfolge ist bindend: `selectGalaxy`
 *  räumt `selectedKey` ab. */
function jumpToMark(galaxy: number, key: string | null) {
  atlas.selectGalaxy(galaxy)
  if (key) selectedKey.value = key
}

/**
 * Die Auswahl ist seit dem Fall der Detailspalte reine HERVORHEBUNG — sie
 * markiert die Marke, auf die ein Sprung von aussen gezielt hat (Fleet-Karte,
 * Minimap, Firmament). Ein Klick auf die Marke wählt nicht mehr, er handelt.
 */
function onSelect(key: string | null) {
  selectedKey.value = key
}

/**
 * Derselbe Sprung, andere Quelle: die Minimap setzt ihr Ziel in den uiStore,
 * hier wird es EINMAL verbraucht.
 *
 * Seine Stelle ist gemessen und bindend: NACH `useVoyageAtlas`, dessen
 * `isVisible`-Watcher `autoSelect()` ruft und eine hier gesetzte Marke
 * überschriebe. Er feuert beim ERSTEN Öffnen im Setup — davor stünde die
 * Hervorhebung, bevor der Atlas sie kennt.
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

const atlasColumns = computed(
  () => `${railFolded.value ? VOYAGE_RAIL_COLLAPSED : VOYAGE_RAIL_WIDTH}px minmax(0, 1fr)`,
)
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
// Zwei Stufen, seit die Detailspalte gefallen ist: die Hervorhebung auf der
// Karte, dann eine von Hand eingeklappte Leiste. Der Kartenfokus IST diese
// Leiste — sie ist der einzige Rand, den der Reiter noch hat. Stufe 3 wird
// NICHT verbraucht: die Karte zeigt immer eine Galaxie, sie zu leeren wäre kein
// Schritt zurück, sondern ein leerer Bildschirm.
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (selectedKey.value) onSelect(null)
  else if (userRailFolded.value === true) userRailFolded.value = false
  else return
  e.preventDefault()
  e.stopPropagation()
}

watch(
  isVisible,
  (visible) => {
    if (visible) document.addEventListener('keydown', onKeydown, true)
    else document.removeEventListener('keydown', onKeydown, true)
  },
  { immediate: true },
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true))

/**
 * Der Weg zur Massen-Geste — auf das Upgrade SELBST, nicht auf einen seiner
 * Zubringer: die Detailspalte des SKILL-TREES trägt es als Verfolgungs-Block,
 * samt seinen Toren.
 *
 * KEIN `openBardModal()` — das toggelt und schlösse das offene Profil.
 * KEIN `focusNode(..., { readable: true })` — dessen Impuls liest allein der
 * Baum und höbe den Zoom für eine Id, die dort keinen Sitz hat.
 * `openDetails()` VOR `setPursuit`: die Spalte startet eingeklappt, und der
 * Block rollt sie nur zurück, wenn sie offen ist.
 */
function openMassSendUpgrade() {
  uiStore.setBardTab('tree')
  openDetails()
  setPursuit(FORGE_MASS_SEND_NODE)
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
          :actions="actions"
          @select="onSelect"
          @act="atlas.runMarkAction"
        />

        <!-- Nur da, wenn man aus dem Firmament kam. Ueberlagerung, KEINE
             Gridzeile: jede Hoehe in der Spalte ginge der Galaxie ab. -->
        <FirmamentReturnButton />
      </div>

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
  position: relative;
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  min-height: 0;
  padding: v-bind(stageGutter);
  background: #0b0806;
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
