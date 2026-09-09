<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useTeamSigil } from '@/composables/ui/useTeamSigil'
import { useHerald } from '@/composables/ui/useHerald'
import { championArtSizeFor } from '@/utils/game/champions'
import type { ChampionArtSize } from '@/types'
import {
  ROLES,
  SIGIL_STAGE_SIZE,
  SIGIL_NODE_SIZE,
  SIGIL_SWORN_SIZE,
  TEAM_SIGIL_FOCUS_ZOOM,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_PAN_MAX_FRACTION,
  TEAM_SIGIL_DRAG_THRESHOLD_PX,
  ADMIN_TEAM_LEVEL_STEPS,
  CHAMPION_LEVEL_MAX_CAP,
  TEAM_TAB_MOUNT_STAGE_SATELLITES,
  TEAM_TAB_MOUNT_STAGE_ORNAMENTS,
  COMMAND_PANEL_ART_SIZE,
  SIGIL_ACTIONS_COMPACT_MAX_W,
  TEAM_SIGIL_OPEN_MS,
  TEAM_SIGIL_TRAVEL_MS,
  TEAM_SIGIL_EASE_OPEN,
  TEAM_SIGIL_EASE_TRAVEL,
  TEAM_SIGIL_FLIGHT_DIM_OPACITY,
} from '@/config/constants'
import type { SigilCamPhase } from '@/composables/ui/useSigilCamera'
import SigilSvgLayers from './SigilSvgLayers.vue'
import SigilRoleNode from './SigilRoleNode.vue'
import SigilPowerCore from './SigilPowerCore.vue'
import BattleReturnButton from '@/components/bardProfil/BattleReturnButton.vue'
import BattleTabReturnButton from '@/components/bardProfil/BattleTabReturnButton.vue'

const props = defineProps<{
  selectedRole: number | null
  /**
   * Worauf die KAMERA blickt. Nicht dasselbe wie `selectedRole`: der geklickte
   * Knoten wächst sofort (Rückmeldung in Frame 0), die Kamera fährt erst im
   * zweiten Takt hinterher — siehe `useSigilCamera`.
   */
  cameraRole: number | null
  /** Takt des Übergangs; setzt Fahrtdauer, Kurve und den Stillstand der Deko. */
  camPhase: SigilCamPhase
  /** Aufbaustufe des Tabs (TEAM_TAB_MOUNT_STAGE_*) — Satelliten und Deko warten
   *  einen Frame, damit das Öffnen nicht in einem Stück gerechnet wird. */
  mountStage: number
  /**
   * Width (px) the open right rail takes from the tab — 0 when none is open.
   * The tab owns it: it is the only place that knows WHICH of the rails (role
   * details, synergies, equipment) is up, and they are not equally wide. The board only needs the number, and it needs it while the
   * closing rail is still in the flex row, so open/close resolves in a single
   * camera move instead of a second, delayed one after the slide-out.
   */
  sidePanelWidth: number
  /** Champions spotlighted by the synergies search — hits pulse, the rest dims. */
  searchHighlights?: string[]
  /** Ally sub-slot hovered in the details panel — spotlights that satellite of the selected role. */
  hoveredAlly?: number | null
}>()

const emit = defineEmits<{
  'select-role': [roleIndex: number]
  'select-ally': [roleIndex: number, subSlot: number]
  /** Hovered ally satellite of the SELECTED role (null = none). */
  'hover-ally': [subSlot: number | null]
  'open-synergies': []
  /** Empty board clicked — the tab closes whatever side panel is open. */
  deselect: []
  /** Ende einer Bühnenfahrt — der Taktgeber der Phasenmaschine. */
  'camera-settled': [event: TransitionEvent]
}>()

const battleStore = useBattleStore()
const synergyStore = useSynergyStore()
const levelStore = useChampionLevelStore()
const { announceReceipt } = useHerald()
const { secondarySlots } = storeToRefs(battleStore)
const { autoLevelEnabled } = storeToRefs(levelStore)

// ── Auto level-up ────────────────────────────────────────────────────────────
// Roster-wide, so it belongs to the board rather than to any one champion page:
// this is the surface that shows all thirty slots at once, which is exactly the
// scope the switch acts on. It rides on the stage under the power crest, so it
// belongs to the sigil itself and travels with it. The board's own edges were
// all taken: the bottom row's centre by the battle return buttons and the top
// centre by the Top role's ally satellites.
//
// It deliberately shows no "X ready to level" counter. That would have to weigh
// chimes and materials, and a chime-aware check re-runs on every tick while the
// board is open — the same reason needsAttention() stays affordability-blind.
function toggleAutoLevel() {
  levelStore.setAutoLevel(!autoLevelEnabled.value)
  announceReceipt({
    kind: 'info',
    eyebrow: 'AUTO LEVEL-UP',
    headline: autoLevelEnabled.value ? 'On' : 'Off',
    subline: autoLevelEnabled.value
      ? 'Champions level as soon as you can pay for it'
      : 'Levels are bought by hand again',
    // Ein Umschalter, kein Vorgang: ein `×4` zählte nur die Klicks auf denselben
    // Knopf, nicht vier verschiedene Ergebnisse.
    countable: false,
    mergeKey: 'autolevel',
  })
}

// ── Admin: level the whole team ──────────────────────────────────────────────
// Testing shortcut — grants levels for free up to CHAMPION_LEVEL_MAX_CAP. Der
// Galaxie-Deckel (levelStore.levelCap) gilt hier bewusst NICHT, siehe
// adminLevelUpTeam(); Zähler und Tooltip müssen dieselbe Grenze nennen wie die
// Action, sonst stehen die Knöpfe grau, während sie noch etwas täten. Lives on
// the board rather than the admin tab because that is where the levels are read.
const adminLevelSteps = ADMIN_TEAM_LEVEL_STEPS
/** Team members that could still gain a level — 0 disables the buttons. */
const adminLevelableCount = computed(() => {
  const cap = CHAMPION_LEVEL_MAX_CAP
  const roster = new Set<string>()
  for (const main of battleStore.headerSlots) if (main) roster.add(main)
  for (const row of secondarySlots.value) for (const ally of row) if (ally) roster.add(ally)
  let n = 0
  for (const name of roster) if (levelStore.levelOf(name) < cap) n++
  return n
})

function adminLevelTeam(steps: number) {
  const granted = levelStore.adminLevelUpTeam(steps)
  if (granted === 0) {
    announceReceipt({
      kind: 'warning',
      headline: 'Level cap reached',
      subline: 'The whole team is at the cap',
      countable: false,
    })
    return
  }
  announceReceipt({
    kind: 'levelup',
    eyebrow: 'ADMIN',
    headline: 'Team levelled',
    delta: { value: granted, unit: 'levels', unitOne: 'level' },
    mergeKey: 'levelup/team',
  })
}

/** Satelliten und Deko erscheinen erst, wenn das Board selbst steht. */
const satellitesReady = computed(() => props.mountStage >= TEAM_TAB_MOUNT_STAGE_SATELLITES)
/** Die Regalia-Ornamente der Knoten kommen ganz zuletzt. */
const ornamentsReady = computed(() => props.mountStage >= TEAM_TAB_MOUNT_STAGE_ORNAMENTS)

/** Per role: which ally sub-slots hold a champion — drives the aligned rune ticks. */
const allyFilled = computed(() =>
  ROLES.map((_, i) => (secondarySlots.value[i] ?? []).map((s) => s !== null)),
)

const activeSynergyCount = computed(
  () =>
    synergyStore.activeTraits.length +
    synergyStore.activeOriginSynergies.filter((o) => o.activeThreshold !== null).length,
)

const {
  mainFilled,
  filledSlots,
  roleFull,
  sigilStage,
  showPentagram,
  showMandala,
  teamPower,
  rolePower,
  roleShares,
  rolePoints,
  allyPoints,
  embers,
} = useTeamSigil()

const roleColors = ROLES.map((r) => r.color)

// ── Fit-scale (camera-only zoom — no manual zoom controls) ──────────────────
const panelEl = ref<HTMLElement | null>(null)
const tabRect = ref({ width: 0, height: 0 })

let resizeObserver: ResizeObserver | null = null

// Observe the tab container (not the board): the details panel leaves the flex
// layout only AFTER its slide-out transition, so watching the board itself would
// fire a second, delayed fit-scale animation. Subtracting the panel width
// reactively lets open/close resolve in a single camera move.
onMounted(() => {
  const tabEl = panelEl.value?.parentElement
  if (!tabEl) return
  tabRect.value = { width: tabEl.clientWidth, height: tabEl.clientHeight }
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    tabRect.value = { width: rect.width, height: rect.height }
  })
  resizeObserver.observe(tabEl)
})

/** What the board is left with once the open rail has taken its share. */
const boardWidth = computed(() => tabRect.value.width - props.sidePanelWidth)

const fitScale = computed(() => {
  if (boardWidth.value <= 0 || tabRect.value.height <= 0) return 1
  return Math.min(boardWidth.value, tabRect.value.height) / SIGIL_STAGE_SIZE
})

/** Right-edge actions step down on a board an open rail has squeezed. */
const compactActions = computed(
  () => boardWidth.value > 0 && boardWidth.value < SIGIL_ACTIONS_COMPACT_MAX_W,
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// ── Camera focus on the selected role cluster ────────────────────────────────
/** Focal point = centroid of the role node and all its ally satellites (stage coords). */
const focusPoint = computed(() => {
  const i = props.cameraRole
  if (i === null) return null
  const cluster = [rolePoints.value[i], ...allyPoints.value[i]]
  return {
    x: cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length,
    y: cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length,
  }
})

const totalScale = computed(
  () => fitScale.value * (focusPoint.value ? TEAM_SIGIL_FOCUS_ZOOM : 1),
)

/**
 * Größte Kamerastufe, die dieses Layout erreichen kann — der Maßstab, nach dem
 * die Knoten ihre Bildvariante wählen. Bewusst NICHT `totalScale`: der ändert
 * sich beim Öffnen und Schließen der Detailseite, und jede Änderung würde die
 * Portraits eine andere Datei nachladen lassen. Diese Obergrenze hängt nur an
 * der Fenstergröße und steht damit still, solange niemand das Fenster zieht.
 */
const maxScale = computed(() => {
  const { width, height } = tabRect.value
  if (width <= 0 || height <= 0) return 1
  // Ohne Detailseite füllt das Board den Tab — dafür gibt es keinen Fokus-Zoom:
  // gezoomt wird nur auf eine ausgewählte Rolle, und die öffnet immer die Seite.
  const wide = Math.min(width, height) / SIGIL_STAGE_SIZE
  // Mit Detailseite ist das Board um deren Breite schmaler, dafür zoomt die
  // Kamera. Beide Fälle schließen sich aus, also zählt der größere von beiden.
  const focused =
    (Math.min(Math.max(width - TEAM_SIGIL_DETAILS_PANEL_WIDTH, 0), height) / SIGIL_STAGE_SIZE) *
    TEAM_SIGIL_FOCUS_ZOOM
  return Math.max(wide, focused)
})
/**
 * Die Rollenknoten zeigen dieselben fünf Champions wie das Command Panel in der
 * Bottom Bar — und das ist immer sichtbar, hat seine Bilder also längst geladen.
 * Deshalb greift der Knoten mindestens zu DESSEN Stufe, auch wenn er rechnerisch
 * mit einer kleineren auskäme: eine geteilte Datei ist ein Cache-Treffer, eine
 * eigene wäre ein zusätzlicher Download und ein zweiter Decode desselben Motivs,
 * ausgerechnet in dem Moment, in dem der Tab aufgeht. Braucht der Knoten mehr
 * (große Auflösungen), gewinnt selbstverständlich seine eigene Rechnung.
 */
const ART_SIZE_ORDER: ChampionArtSize[] = ['sm', 'md', 'lg', 'full']
function atLeast(a: ChampionArtSize, b: ChampionArtSize): ChampionArtSize {
  return ART_SIZE_ORDER.indexOf(a) >= ART_SIZE_ORDER.indexOf(b) ? a : b
}
const nodeArtSize = computed(() =>
  atLeast(championArtSizeFor(SIGIL_NODE_SIZE * maxScale.value), COMMAND_PANEL_ART_SIZE),
)
const allyArtSize = computed(() => championArtSizeFor(SIGIL_SWORN_SIZE * maxScale.value))

/** Board center in tab px — computed (not CSS 50%) so the close animation targets
 *  the FINAL board width immediately instead of jumping when the panel unmounts. */
const boardCenter = computed(() => ({
  x: (tabRect.value.width - props.sidePanelWidth) / 2,
  y: tabRect.value.height / 2,
}))

const openMs = `${TEAM_SIGIL_OPEN_MS}ms`
const travelMs = `${TEAM_SIGIL_TRAVEL_MS}ms`
const easeOpen = TEAM_SIGIL_EASE_OPEN
const easeTravel = TEAM_SIGIL_EASE_TRAVEL
const flightDim = String(TEAM_SIGIL_FLIGHT_DIM_OPACITY)

/** Manual camera offset from drag-to-pan (screen px), bounded by the rubber band below. */
const panOffset = ref({ x: 0, y: 0 })

/** Pans the stage so the focal point lands on the board center (screen px). */
const stageTransform = computed(() => {
  const s = totalScale.value
  const f = focusPoint.value
  const c = boardCenter.value
  const o = panOffset.value
  const half = SIGIL_STAGE_SIZE / 2
  // Der Pan-Term steht IMMER, auch als 0: eine Liste, die zwischen drei und
  // vier Funktionen wechselt, zwingt Chrome auf Matrix-Interpolation, und die
  // Fahrt nimmt dann einen anderen Weg als den gemeinten.
  const px = f ? -(f.x - half) * s : 0
  const py = f ? -(f.y - half) * s : 0
  return `translate(${c.x + o.x}px, ${c.y + o.y}px) translate(${px}px, ${py}px) translate(-50%, -50%) scale(${s})`
})

// ── Drag-to-pan (rubber-band bounded camera offset) ──────────────────────────
const isDragging = ref(false)
/** Set on the first move past the drag threshold; suppresses the trailing click. */
let didDrag = false
let dragPointerId: number | null = null
let dragStart = { x: 0, y: 0 }
let dragStartOffset = { x: 0, y: 0 }

const maxPan = computed(() => TEAM_SIGIL_PAN_MAX_FRACTION * SIGIL_STAGE_SIZE * totalScale.value)

/** 1:1 near center, tanh-saturating toward the bound — the offset never exceeds maxPan. */
function rubberBand(raw: number): number {
  const m = maxPan.value
  return m > 0 ? m * Math.tanh(raw / m) : 0
}

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  dragPointerId = event.pointerId
  didDrag = false
  dragStart = { x: event.clientX, y: event.clientY }
  dragStartOffset = { ...panOffset.value }
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerId !== dragPointerId) return
  const dx = event.clientX - dragStart.x
  const dy = event.clientY - dragStart.y
  if (!isDragging.value) {
    if (Math.hypot(dx, dy) < TEAM_SIGIL_DRAG_THRESHOLD_PX) return
    isDragging.value = true
    didDrag = true
    // capture only once it IS a drag — capturing on pointerdown would retarget
    // the trailing click to the board and break role/ally node clicks
    panelEl.value?.setPointerCapture(event.pointerId)
  }
  panOffset.value = {
    x: rubberBand(dragStartOffset.x + dx),
    y: rubberBand(dragStartOffset.y + dy),
  }
}

function onPointerEnd(event: PointerEvent): void {
  if (event.pointerId !== dragPointerId) return
  dragPointerId = null
  isDragging.value = false
  // safety clamp (rubber band already stays inside; bound shrinks with the camera)
  const m = maxPan.value
  panOffset.value = {
    x: Math.min(m, Math.max(-m, panOffset.value.x)),
    y: Math.min(m, Math.max(-m, panOffset.value.y)),
  }
}

/** After a real drag, swallow the click so nodes/buttons under the pointer don't fire. */
function onClickCapture(event: MouseEvent): void {
  if (!didDrag) return
  didDrag = false
  event.stopPropagation()
  event.preventDefault()
}

/**
 * A click that reaches the board itself — not a role node, an ally satellite or
 * one of the board's own buttons, all of which stop propagation — lands on empty
 * space and dismisses the open side panel. That is the only way to close it now,
 * so it must survive a drag: `didDrag` is still set when this fires after the
 * capture handler above swallowed the click.
 */
function onBackgroundClick(): void {
  if (didDrag || isDragging.value) return
  emit('deselect')
}

// the focus camera owns the framing — a selection/panel change eases the pan back home
watch(
  [() => props.selectedRole, () => props.cameraRole, () => props.sidePanelWidth],
  () => {
    panOffset.value = { x: 0, y: 0 }
  },
)

</script>

<template>
  <div
    ref="panelEl"
    class="sigil-board"
    :class="{
      'sigil-board--dragging': isDragging,
      'sigil-board--compact-actions': compactActions,
      'sigil-board--flying': camPhase !== 'idle',
      'sigil-board--open': camPhase === 'open',
      'sigil-board--travel': camPhase === 'travel',
      'sigil-board--closing': camPhase === 'closing',
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @click.capture="onClickCapture"
    @click="onBackgroundClick"
    @dragstart.prevent
  >
    <!-- admin: raise every team champion's level, capped. Deliberately styled
         apart from the gold game actions so it never reads as a normal button. -->
    <div class="sigil-admin" @click.stop>
      <Icon icon="game-icons:lightning-trio" width="18" height="18" class="sigil-admin-icon" />
      <span class="sigil-admin-label">Admin · Team Level</span>
      <button
        v-for="step in adminLevelSteps"
        :key="step"
        class="sigil-admin-btn"
        type="button"
        :disabled="adminLevelableCount === 0"
        :title="
          adminLevelableCount === 0
            ? 'Every team champion is at the level cap'
            : `Raise ${adminLevelableCount} champion(s) by ${step} level(s), up to the cap`
        "
        @click="adminLevelTeam(step)"
      >
        +{{ step }}
      </button>
      <!-- asks for a full cap's worth of steps, so it lands on the cap from any
           level; the store stops there on its own -->
      <button
        class="sigil-admin-btn sigil-admin-btn--max"
        type="button"
        :disabled="adminLevelableCount === 0"
        :title="
          adminLevelableCount === 0
            ? 'Every team champion is at the level cap'
            : `Raise ${adminLevelableCount} champion(s) straight to level ${CHAMPION_LEVEL_MAX_CAP}`
        "
        @click="adminLevelTeam(CHAMPION_LEVEL_MAX_CAP)"
      >
        MAX
      </button>
    </div>

    <!-- Rücksprung zum laufenden StarFight — bleibt mittig auf der Grundlinie -->
    <BattleReturnButton @click.stop />
    <!-- Gleicher Ankerpunkt: Rückweg in den Battle-Tab, wenn der Team-Tab von
         einem offenen Rollen-Slot der Battle-Landing aus geöffnet wurde -->
    <BattleTabReturnButton @click.stop />

    <!-- ── board actions: auto level ──
         Die Expedition ist ein eigener Reiter geworden — ein Knopf, der in
         einen anderen Reiter springt, ist eine andere Geste als einer, der eine
         Schiene daneben aufzieht, und die Reiterleiste steht drei Zentimeter
         entfernt. -->
    <div class="sigil-actions">

      <!-- auto level-up — deliberately a notch quieter than the row above it:
           that one is a door, this is a setting, and a setting that looked like
           a door would be pressed by mistake. It stops zooming with the sigil,
           and the switch it reads (roster-wide) sits with the other
           roster-wide actions. -->
      <button
        class="sigil-action sigil-action--auto"
        :class="{ 'sigil-action--auto-on': autoLevelEnabled }"
        type="button"
        role="switch"
        :aria-checked="autoLevelEnabled"
        :title="
          autoLevelEnabled
            ? 'On — every champion buys its next level as soon as its XP, chimes and materials are in stock'
            : 'Off — levels are bought by hand on the champion page'
        "
        @click.stop="toggleAutoLevel"
      >
        <Icon icon="game-icons:circle-sparks" width="24" height="24" class="sigil-action-icon" />
        <span class="sigil-action-label">Auto Level</span>
        <span class="sigil-auto-track"><span class="sigil-auto-knob" /></span>
      </button>
    </div>


    <!-- scaled sigil stage -->
    <div
      class="sigil-stage"
      :style="{
        width: `${SIGIL_STAGE_SIZE}px`,
        height: `${SIGIL_STAGE_SIZE}px`,
        transform: stageTransform,
      }"
      @transitionend="emit('camera-settled', $event)"
    >
      <SigilSvgLayers
        :stage="sigilStage"
        :filled-slots="filledSlots"
        :role-points="rolePoints"
        :ally-points="allyPoints"
        :ally-filled="allyFilled"
        :role-colors="roleColors"
        :role-shares="roleShares"
        :main-filled="mainFilled"
        :role-full="roleFull"
        :selected-role="selectedRole"
        :show-pentagram="showPentagram"
        :show-mandala="showMandala"
      />

      <!-- centre: the team power, and the ring that says which role carried it -->
      <SigilPowerCore
        :stage="sigilStage"
        :team-power="teamPower"
        :role-power="rolePower"
        :synergy-count="activeSynergyCount"
        @open="emit('open-synergies')"
      />

      <!-- escalation embers -->
      <div
        v-for="(ember, k) in satellitesReady ? embers : []"
        :key="`ember-${k}`"
        class="sigil-ember"
        :style="{
          left: `${ember.x}px`,
          top: `${ember.y}px`,
          width: `${ember.size}px`,
          height: `${ember.size}px`,
          background: sigilStage.crestColor,
          boxShadow: `0 0 6px ${sigilStage.crestColor}`,
          animationDelay: `${ember.delaySec}s`,
          animationDuration: `${ember.durationSec}s`,
        }"
      />

      <!-- role nodes + ally satellites -->
      <SigilRoleNode
        v-for="(role, i) in ROLES"
        :key="role.key"
        :role-index="i"
        :point="rolePoints[i]"
        :ally-points="allyPoints[i]"
        :selected="selectedRole === i"
        :full="roleFull[i]"
        :power="rolePower[i]"
        :show-allies="satellitesReady"
        :show-ornaments="ornamentsReady"
        :node-art-size="nodeArtSize"
        :ally-art-size="allyArtSize"
        :search-highlights="searchHighlights"
        :hovered-ally="selectedRole === i ? (hoveredAlly ?? null) : null"
        @select="emit('select-role', i)"
        @select-ally="(sub: number) => emit('select-ally', i, sub)"
        @hover-ally="(sub: number | null) => selectedRole === i && emit('hover-ally', sub)"
      />
    </div>

  </div>
</template>

<style scoped>
.sigil-board {
  position: relative;
  /* Eigener Stapelkontext — sonst schlüge die eigene Ebene des Boards (die
     Admin-Leiste auf z-index 6) durch den
     Ladeschleier des Tabs hindurch, der das Board gerade abdecken soll. Nach
     innen ändert das nichts: die Ebenen ordnen sich weiterhin untereinander,
     nur eben in diesem Kontext. Nach außen auch nicht — Board und Schiene
     liegen nebeneinander und überlappen sich nie. */
  z-index: 0;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  /* transparent: the cosmic backdrop lives on the .team-tab wrapper so it
     spans the whole tab — the board must not paint over it */
  background: transparent;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.sigil-board--dragging {
  cursor: grabbing;
}

/* ── admin strip — muted red-brown so it never competes with the gold game
   actions. Bottom left, in the corner the shop door used to share with it. ── */
/* Auf derselben Grundlinie wie die Aktionsspalte rechts (.sigil-actions) — die
   beiden sind das Paar unten am Board, und links blieb sonst ein toter Streifen. */
.sigil-admin {
  position: absolute;
  bottom: 22px;
  left: 26px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  border-radius: 4px;
  background: rgba(14, 10, 5, 0.9);
  border: 1px solid #6a3020;
}
.sigil-admin-icon {
  color: #cc6050;
  flex-shrink: 0;
}
.sigil-admin-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(204, 96, 80, 0.75);
}
.sigil-admin-btn {
  min-width: 34px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  background: #1c1410;
  border: 1px solid #6a3020;
  color: #e0a090;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.2;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.sigil-admin-btn:hover:not(:disabled) {
  background: #2e1a12;
  border-color: #cc6050;
  color: #f0c0b0;
}
.sigil-admin-btn:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}
/* the jump-to-cap press reads as the loudest of the row */
.sigil-admin-btn--max {
  min-width: 44px;
  background: #2a1610;
  border-color: #cc6050;
  color: #f0c0b0;
  letter-spacing: 0.08em;
}
.sigil-admin-btn--max:hover:not(:disabled) {
  background: #3c1e14;
}

/* ── board actions (auto level) ──
   One column at the right edge — the edge the rail opens from, so the button
   and the panel it summons sit on the same side. `align-items: stretch` gives
   both rows the width of the longer label, so the icons line up on a common
   left edge and the pair reads as one block. */
.sigil-actions {
  position: absolute;
  right: 26px;
  bottom: 22px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  /* never grow into the sigil on a board an open rail has squeezed */
  max-width: calc(100% - 52px);
}
/* When a battle CTA holds the bottom line, the column steps above it. At Full
   HD with a rail open the board is 340 px — the centred CTA and this column
   cannot share that line, and the CTA is the time-critical one, so it keeps the
   baseline. */
.sigil-board:has(.brb, .btrb) .sigil-actions {
  bottom: 92px;
}
/* Die Admin-Leiste teilt die Grundlinie und weicht deshalb mit aus. */
.sigil-board:has(.brb, .btrb) .sigil-admin {
  bottom: 92px;
}
.sigil-action {
  /* the notify badges hang off the button's own corner */
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 17px 24px;
  border-radius: 5px;
  background: rgba(14, 10, 5, 0.88);
  border: 2px solid #5c3310;
  color: #e8c040;
  font-size: 19px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}
.sigil-action:hover {
  border-color: #c89040;
  box-shadow: 0 0 14px rgba(232, 192, 64, 0.35);
  transform: translateY(-1px);
}
.sigil-action:active {
  transform: translateY(0);
}
.sigil-action-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.sigil-action-label {
  white-space: nowrap;
}

/* ── Compact: the board squeezed by an open rail ──
   340 px at Full HD. One step down keeps the column clear of the sigil's foot,
   and the admin strip moves above the column, since at that width nothing fits
   beside it. */
.sigil-board--compact-actions .sigil-actions {
  gap: 10px;
}
.sigil-board--compact-actions .sigil-action {
  gap: 10px;
  padding: 12px 16px;
  font-size: 15px;
}
.sigil-board--compact-actions .sigil-action-icon {
  width: 26px;
  height: 26px;
}
/* The admin strip is 310–344 px wide on its own, so on a squeezed board nothing
   fits beside the column — it has to clear it vertically instead. Measured with
   the column's two remaining rows: 102 px tall from bottom 22, i.e. its top edge
   at 124. With a battle CTA holding the baseline the column starts 70 px higher. */
.sigil-board--compact-actions .sigil-admin {
  bottom: 136px;
}
.sigil-board--compact-actions:has(.brb, .btrb) .sigil-admin {
  bottom: 206px;
}

/* ── auto level-up — second row of the action column ──
   It shares the column's frame so the two read as one block, and undercuts it
   everywhere else so nobody mistakes a setting for a door: shorter, smaller
   type, smaller glyph, and the switch pushed out to the right edge where a
   switch belongs. On is the project's green, the same one that marks anything
   active or affordable.
   The knob is the single moving part and it moves on transform alone, so a full
   board keeps compositing at rate. */
.sigil-action--auto {
  gap: 11px;
  padding: 11px 20px;
  font-size: 15px;
  color: #9c927c;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}
.sigil-action--auto .sigil-action-icon {
  color: currentColor;
}
.sigil-action--auto:hover {
  border-color: #c89040;
  color: #e8dcc0;
  box-shadow: none;
  transform: none;
}
.sigil-action--auto-on {
  border-color: #6ec040;
  color: #a8d890;
}
.sigil-action--auto-on:hover {
  border-color: #8ee060;
}
.sigil-auto-track {
  flex-shrink: 0;
  /* the switch reads as the row's right-hand end, not as a third label */
  margin-left: auto;
  position: relative;
  width: 30px;
  height: 15px;
  border-radius: 3px;
  background: #0d0c08;
  border: 1px solid #5c3310;
  transition: border-color 0.15s ease;
}
.sigil-action--auto-on .sigil-auto-track {
  border-color: #6ec040;
}
.sigil-auto-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  background: #6b6455;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}
.sigil-action--auto-on .sigil-auto-knob {
  background: #52b830;
  transform: translateX(15px);
}
/* compact board — the same step down the two rows above take */
.sigil-board--compact-actions .sigil-action--auto {
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
}
.sigil-board--compact-actions .sigil-action--auto .sigil-action-icon {
  width: 18px;
  height: 18px;
}
.sigil-board--compact-actions .sigil-auto-track {
  width: 26px;
  height: 13px;
}
.sigil-board--compact-actions .sigil-auto-knob {
  width: 9px;
  height: 9px;
}
.sigil-board--compact-actions .sigil-action--auto-on .sigil-auto-knob {
  transform: translateX(13px);
}

/* ── stage ── */
/* Zwei Takte, zwei Kurven: OPEN beschleunigt weg, alles andere kommt an. Die
   Ankunft ist die Grundfahrt — auch eine Breite, die sich ohne Rollenwechsel
   ändert (Equipment auf und zu), soll fahren statt zu springen. Kein
   `will-change`: die Bühne steht die meiste Zeit still. */
.sigil-stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: center center;
  transition: transform v-bind(travelMs) v-bind(easeTravel);
}
.sigil-board--open .sigil-stage {
  transition: transform v-bind(openMs) v-bind(easeOpen);
}
/* Die Hand schlägt jeden Takt: 1:1 am Zeiger, und beim Loslassen fährt die
   Kamera den Pan zurück. Steht NACH den Phasen — gleiche Spezifität. */
.sigil-board--dragging .sigil-stage {
  transition: none;
}

/* Unter einer wechselnden Rasterskala erklärt jede laufende Animation pro Frame
   den Stil ihres Elements für ungültig — hier 73 Stück: Auren, Kegelverläufe,
   XP-Atmung, Sheen, Ringdrehung, Kernpuls und Glut. `paused` friert EIN statt
   zurückzusetzen, die Takte laufen danach weiter, wo sie standen (Muster:
   .idle-deco-paused).

   NAMENTLICH, nicht `.sigil-stage *`: der Universalselektor lässt jeden Wechsel
   der Klasse den ganzen Teilbaum neu durchrechnen — rund 900 Elemente, zweimal je
   Fahrt. Gemessen kostete das den Rollenwechsel 175 statt 95 ms. */
.sigil-board--flying :deep(:is(
    .sigil-node-aura,
    .sigil-node-conic,
    .sigil-node-xp-fill,
    .sigil-node-rank-pulse,
    .sigil-node-rank-sheen,
    .sigil-node-circle,
    .sigil-ally,
    .sigil-svg--spin,
    .sigil-svg--pentagram,
    .core-pulse
  )),
.sigil-board--flying :deep(.sigil-ally--sworn)::after {
  animation-play-state: paused !important;
}
/* Glut trägt box-shadow und sagt nichts — sie geht die Fahrt über weg. */
.sigil-board--flying .sigil-ember {
  opacity: 0;
  transition: opacity v-bind(openMs) linear;
}
/* Ein Cluster ist Knoten UND Satelliten — die liegen als Geschwister daneben,
   nicht darin. Nur den Knoten zu dimmen ergäbe halbe Cluster.
   Nicht beim Schließen: dort ist keiner mehr gewählt, es dimmten alle fünf. */
.sigil-board--open :deep(.sigil-node:not(.sigil-node--selected)),
.sigil-board--travel :deep(.sigil-node:not(.sigil-node--selected)),
.sigil-board--open :deep(.sigil-ally:not(.sigil-ally--highlight)),
.sigil-board--travel :deep(.sigil-ally:not(.sigil-ally--highlight)) {
  opacity: v-bind(flightDim);
}

/* ── Was während der Fahrt NICHT animiert ─────────────────────────────────
   Ein Rollenklick schaltet an 5 Knoten und 25 Satelliten `box-shadow` und
   `filter` um — je drei Schattenterme, beim Satelliten zusätzlich über
   `--sub × 25ms` auf 625 ms gestreckt. Als Transition rastert das die Box samt
   Schatten in JEDEM Frame neu, pro Element (Perf-Regel 2), und zwar genau über
   der Fahrt. Während der Fahrt schlagen diese Zustände deshalb SOFORT um: eine
   Rasterung statt zweihundert. Was bleibt, ist die Rückmeldung (`transform`)
   und die Tiefe (`opacity`) — beides Kompositor-Arbeit. */
.sigil-board--flying :deep(.sigil-node-circle),
.sigil-board--flying :deep(.sigil-node-img) {
  transition: none;
}
.sigil-board--flying :deep(.sigil-node) {
  transition:
    transform 0.18s,
    opacity 0.25s;
}
.sigil-board--flying :deep(.sigil-ally) {
  transition: opacity 0.25s;
  transition-delay: 0s;
}
.sigil-ember {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  animation: ember-rise 2.8s ease-out infinite;
  z-index: 1;
}

@keyframes ember-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(8px) scale(0.5);
  }
  22% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-34px) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sigil-stage,
  .sigil-board--open .sigil-stage {
    transition: none;
  }
  .sigil-board--flying :deep(:is(
      .sigil-node-aura,
      .sigil-node-conic,
      .sigil-node-xp-fill,
      .sigil-node-rank-pulse,
      .sigil-node-rank-sheen,
      .sigil-node-circle,
      .sigil-ally,
      .sigil-svg--spin,
      .sigil-svg--pentagram,
      .core-pulse
    )),
  .sigil-board--flying :deep(.sigil-ally--sworn)::after {
    animation-play-state: running !important;
  }
  .sigil-board--flying .sigil-ember,
  .sigil-board--open :deep(.sigil-node:not(.sigil-node--selected)),
  .sigil-board--travel :deep(.sigil-node:not(.sigil-node--selected)),
  .sigil-board--open :deep(.sigil-ally:not(.sigil-ally--highlight)),
  .sigil-board--travel :deep(.sigil-ally:not(.sigil-ally--highlight)) {
    opacity: unset;
    transition: none;
  }
  .sigil-ember {
    animation: none !important;
  }
}
</style>
