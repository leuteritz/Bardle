<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useExpeditionStore } from '@/stores/expeditionStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { useChampionLevelStore } from '@/stores/championLevelStore'
import { useTeamSigil } from '@/composables/useTeamSigil'
import { useActionToast } from '@/composables/useActionToast'
import { championArtSizeFor } from '@/utils/champions'
import type { ChampionArtSize } from '@/types'
import {
  ROLES,
  SIGIL_STAGE_SIZE,
  SIGIL_CREST_SIZE,
  SIGIL_POWER_AUTO_GAP,
  SIGIL_POWER_AUTO_WIDTH,
  SIGIL_POWER_AUTO_HEIGHT,
  SIGIL_NODE_SIZE,
  SIGIL_SWORN_SIZE,
  TEAM_SIGIL_FOCUS_ZOOM,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_SYNERGIES_PANEL_WIDTH,
  TEAM_SIGIL_PAN_MAX_FRACTION,
  TEAM_SIGIL_DRAG_THRESHOLD_PX,
  ADMIN_TEAM_LEVEL_STEPS,
  CHAMPION_LEVEL_MAX_CAP,
  TEAM_TAB_MOUNT_STAGE_SATELLITES,
  TEAM_TAB_MOUNT_STAGE_ORNAMENTS,
  COMMAND_PANEL_ART_SIZE,
} from '@/config/constants'
import SigilSvgLayers from './SigilSvgLayers.vue'
import SigilRoleNode from './SigilRoleNode.vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import BattleReturnButton from '@/components/bardProfil/BattleReturnButton.vue'
import BattleTabReturnButton from '@/components/bardProfil/BattleTabReturnButton.vue'

const props = defineProps<{
  selectedRole: number | null
  /** Aufbaustufe des Tabs (TEAM_TAB_MOUNT_STAGE_*) — Satelliten und Deko warten
   *  einen Frame, damit das Öffnen nicht in einem Stück gerechnet wird. */
  mountStage: number
  /** True while a modal covers the board — pauses all decorative animations. */
  paused?: boolean
  /** True while a non-role side panel (e.g. synergies) occupies the right edge. */
  panelOpen?: boolean
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
  'open-shop': []
  'open-expedition': []
  'open-synergies': []
  /** Empty board clicked — the tab closes whatever side panel is open. */
  deselect: []
}>()

const battleStore = useBattleStore()
const expeditionStore = useExpeditionStore()
const synergyStore = useSynergyStore()
const levelStore = useChampionLevelStore()
const { showToast } = useActionToast()
const { newlyUnlockedChampions, secondarySlots } = storeToRefs(battleStore)
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
  showToast(
    autoLevelEnabled.value
      ? 'Auto level-up on — champions level as soon as you can pay for it.'
      : 'Auto level-up off — levels are bought by hand again.',
  )
}

// ── Admin: level the whole team ──────────────────────────────────────────────
// Testing shortcut — grants levels for free, stops at the cap. Lives on the
// board rather than the admin tab because that is where the levels are read.
const adminLevelSteps = ADMIN_TEAM_LEVEL_STEPS
/** Team members that could still gain a level — 0 disables the buttons. */
const adminLevelableCount = computed(() => {
  const cap = levelStore.levelCap
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
    showToast('Whole team is already at the level cap.')
    return
  }
  showToast(`+${granted} champion level${granted === 1 ? '' : 's'} granted.`)
}

/** Satelliten und Deko erscheinen erst, wenn das Board selbst steht. */
const satellitesReady = computed(() => props.mountStage >= TEAM_TAB_MOUNT_STAGE_SATELLITES)
/** Die Regalia-Ornamente der Knoten kommen ganz zuletzt. */
const ornamentsReady = computed(() => props.mountStage >= TEAM_TAB_MOUNT_STAGE_ORNAMENTS)

/** Per role: which ally sub-slots hold a champion — drives the aligned rune ticks. */
const allyFilled = computed(() =>
  ROLES.map((_, i) => (secondarySlots.value[i] ?? []).map((s) => s !== null)),
)

const shopBadgeCount = computed(() => newlyUnlockedChampions.value.length)
const expeditionBadgeCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
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

/** A right-side panel narrows the visible board — the two are not equally wide,
 *  so the board has to subtract the one that is actually open. */
const sidePanelWidth = computed(() => {
  if (props.selectedRole !== null) return TEAM_SIGIL_DETAILS_PANEL_WIDTH
  return props.panelOpen ? TEAM_SIGIL_SYNERGIES_PANEL_WIDTH : 0
})

const fitScale = computed(() => {
  const boardWidth = tabRect.value.width - sidePanelWidth.value
  if (boardWidth <= 0 || tabRect.value.height <= 0) return 1
  return Math.min(boardWidth, tabRect.value.height) / SIGIL_STAGE_SIZE
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// ── Camera focus on the selected role cluster ────────────────────────────────
/** Focal point = centroid of the role node and all its ally satellites (stage coords). */
const focusPoint = computed(() => {
  const i = props.selectedRole
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
  x: (tabRect.value.width - sidePanelWidth.value) / 2,
  y: tabRect.value.height / 2,
}))

/** Manual camera offset from drag-to-pan (screen px), bounded by the rubber band below. */
const panOffset = ref({ x: 0, y: 0 })

/** Pans the stage so the focal point lands on the board center (screen px). */
const stageTransform = computed(() => {
  const s = totalScale.value
  const f = focusPoint.value
  const c = boardCenter.value
  const o = panOffset.value
  const half = SIGIL_STAGE_SIZE / 2
  const pan = f ? `translate(${-(f.x - half) * s}px, ${-(f.y - half) * s}px) ` : ''
  return `translate(${c.x + o.x}px, ${c.y + o.y}px) ${pan}translate(-50%, -50%) scale(${s})`
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
  [() => props.selectedRole, () => props.panelOpen],
  () => {
    panOffset.value = { x: 0, y: 0 }
  },
)

</script>

<template>
  <div
    ref="panelEl"
    class="sigil-board"
    :class="{ 'sigil-board--paused': paused, 'sigil-board--dragging': isDragging }"
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
            : `Raise ${adminLevelableCount} champion(s) straight to level ${levelStore.levelCap}`
        "
        @click="adminLevelTeam(CHAMPION_LEVEL_MAX_CAP)"
      >
        MAX
      </button>
    </div>

    <!-- board actions: shop + expedition (always reachable) -->
    <button class="sigil-action sigil-action--shop" @click.stop="emit('open-shop')">
      <Icon icon="game-icons:shopping-bag" width="26" height="26" class="sigil-action-icon" />
      Shop
      <RpgNotifyBadge
        :count="shopBadgeCount"
        variant="shop"
        label="Champions available in shop"
      />
    </button>

    <!-- Rücksprung zum laufenden StarFight — mittig zwischen Shop + Expedition -->
    <BattleReturnButton @click.stop />
    <!-- Gleicher Ankerpunkt: Rückweg in den Battle-Tab, wenn der Team-Tab von
         einem offenen Rollen-Slot der Battle-Landing aus geöffnet wurde -->
    <BattleTabReturnButton @click.stop />

    <button class="sigil-action sigil-action--expedition" @click.stop="emit('open-expedition')">
      <Icon icon="game-icons:campfire" width="26" height="26" class="sigil-action-icon" />
      Expedition
      <RpgNotifyBadge :count="expeditionBadgeCount" label="Expedition rewards ready" />
    </button>


    <!-- scaled sigil stage -->
    <div
      class="sigil-stage"
      :style="{
        width: `${SIGIL_STAGE_SIZE}px`,
        height: `${SIGIL_STAGE_SIZE}px`,
        transform: stageTransform,
      }"
    >
      <SigilSvgLayers
        :stage="sigilStage"
        :filled-slots="filledSlots"
        :role-points="rolePoints"
        :ally-points="allyPoints"
        :ally-filled="allyFilled"
        :role-colors="roleColors"
        :main-filled="mainFilled"
        :role-full="roleFull"
        :selected-role="selectedRole"
        :show-pentagram="showPentagram"
        :show-mandala="showMandala"
      />

      <!-- center crest -->
      <div
        class="sigil-crest-pulse"
        :style="{
          width: `${SIGIL_CREST_SIZE}px`,
          height: `${SIGIL_CREST_SIZE}px`,
          borderColor: sigilStage.crestColor,
          animationDuration: sigilStage.pulseSec > 0 ? `${sigilStage.pulseSec}s` : undefined,
          animationName: sigilStage.pulseSec > 0 ? undefined : 'none',
        }"
      />
      <button
        class="sigil-crest"
        :style="{ width: `${SIGIL_CREST_SIZE}px`, height: `${SIGIL_CREST_SIZE}px` }"
        aria-label="Open team synergies"
        @click.stop="emit('open-synergies')"
      >
        <Icon
          icon="game-icons:crenel-crown"
          width="30"
          height="30"
          :style="{ color: sigilStage.crestColor }"
        />
        <div class="sigil-crest-power" :style="{ color: sigilStage.crestColor }">
          {{ $formatNumber(teamPower) }}
        </div>
        <div class="sigil-crest-label">Team Power</div>
        <div
          class="sigil-crest-stage"
          :style="{ color: sigilStage.crestColor, textShadow: `0 0 9px ${sigilStage.crestColor}` }"
        >
          {{ sigilStage.name }}
        </div>
        <span class="sigil-crest-syn">
          <Icon icon="game-icons:linked-rings" width="14" height="14" />
          {{ activeSynergyCount }}
        </span>
      </button>

      <!-- auto level-up, seated under the power crest. On the STAGE rather than
           on the board, so it stays under the crest through every pan and zoom
           instead of drifting off it. Sibling of the crest, not a child: the
           crest already owns a click (team synergies) and the two must not
           swallow each other. Flat and small on purpose — the gap between the
           synergy badge and the bottom name plates is 29 stage-px, and that is
           the whole budget (see SIGIL_POWER_AUTO_*). -->
      <button
        class="sigil-power-auto"
        :class="{ 'sigil-power-auto--on': autoLevelEnabled }"
        :style="{
          top: `calc(50% + ${SIGIL_CREST_SIZE / 2 + SIGIL_POWER_AUTO_GAP}px)`,
          width: `${SIGIL_POWER_AUTO_WIDTH}px`,
          height: `${SIGIL_POWER_AUTO_HEIGHT}px`,
        }"
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
        <Icon icon="game-icons:circle-sparks" width="13" height="13" />
        <span class="sigil-power-auto-label">Auto Level</span>
        <span class="sigil-power-auto-track"><span class="sigil-power-auto-knob" /></span>
      </button>

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
/* while dragging the stage follows the pointer 1:1 — the camera transition
   resumes on release and eases the pan back inside the bound / to center */
.sigil-board--dragging .sigil-stage {
  transition: none;
}
/* a modal covers the board (semi-transparent backdrop) — freeze all decorative
   animations so they stop compositing behind it; they resume on close */
.sigil-board--paused :deep(*) {
  animation-play-state: paused !important;
}

/* ── admin strip — muted red-brown so it never competes with the gold game
   actions. Parked directly above the Shop button rather than at the top of the
   board: the action toast drops in as a full-width bar up there and would bury
   the very button the player just pressed. ── */
.sigil-admin {
  position: absolute;
  bottom: 82px;
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

/* ── board actions (shop / expedition) ── */
.sigil-action {
  position: absolute;
  bottom: 22px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 24px;
  border-radius: 5px;
  background: rgba(14, 10, 5, 0.88);
  border: 2px solid #5c3310;
  color: #e8c040;
  font-size: 15px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}
.sigil-action--shop {
  left: 26px;
}
.sigil-action--expedition {
  right: 26px;
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

/* ── auto level-up, under the power crest ──
   Width, height and vertical offset come from the SIGIL_POWER_AUTO_* constants
   and are set inline, because the gap they fit into is stage geometry rather
   than a styling choice. Everything below is only the look.

   Flat and quiet: it sits inside the sigil, where the crest is the thing meant
   to carry weight. The knob is the single moving part and it moves on transform
   alone, so a full board keeps compositing at rate. */
.sigil-power-auto {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
  cursor: pointer;
  border-radius: 4px;
  background: rgba(14, 10, 5, 0.92);
  border: 1px solid #5c3310;
  color: #9c927c;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}
.sigil-power-auto:hover {
  border-color: #c89040;
  color: #e8dcc0;
}
.sigil-power-auto--on {
  border-color: #6ec040;
  color: #a8d890;
}
.sigil-power-auto--on:hover {
  border-color: #8ee060;
}
.sigil-power-auto-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
}
.sigil-power-auto-track {
  flex-shrink: 0;
  position: relative;
  width: 26px;
  height: 13px;
  border-radius: 3px;
  background: #0d0c08;
  border: 1px solid #5c3310;
  transition: border-color 0.15s ease;
}
.sigil-power-auto--on .sigil-power-auto-track {
  border-color: #6ec040;
}
.sigil-power-auto-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  background: #6b6455;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}
.sigil-power-auto--on .sigil-power-auto-knob {
  background: #52b830;
  transform: translateX(13px);
}

/* ── stage ── */
.sigil-stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: center center;
  /* camera pan/zoom (TEAM_SIGIL_CAMERA_MS) — also smooths wheel zoom */
  transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.35, 1);
}
.sigil-crest-pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid;
  pointer-events: none;
  animation: crest-pulse 3.5s ease-out infinite;
}
/* crest doubles as the team-synergies trigger */
.sigil-crest {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  border: none;
  cursor: pointer;
  background: radial-gradient(circle at 50% 36%, #2a1f10, #0e0906);
  box-shadow:
    0 0 0 2px #7a5a1e,
    0 0 28px rgba(220, 170, 60, 0.3),
    inset 0 0 22px rgba(0, 0, 0, 0.75);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}
.sigil-crest:hover {
  transform: translate(-50%, -50%) scale(1.03);
  box-shadow:
    0 0 0 2px #c89040,
    0 0 40px rgba(232, 192, 64, 0.5),
    inset 0 0 22px rgba(0, 0, 0, 0.75);
}
.sigil-crest-syn {
  position: absolute;
  left: 50%;
  bottom: -11px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 4px;
  background: #1e1006;
  border: 1px solid #c89040;
  color: #e8c040;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  transition: box-shadow 0.2s;
}
.sigil-crest:hover .sigil-crest-syn {
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
}
.sigil-crest-power {
  font-size: 28px;
  line-height: 1;
  text-shadow: 0 0 12px rgba(220, 170, 60, 0.45);
}
.sigil-crest-label {
  font-size: 8.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.6);
}
.sigil-crest-stage {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 2px;
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

@keyframes crest-pulse {
  0% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1);
  }
  72%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.55);
  }
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
  .sigil-stage {
    transition: none;
  }
  .sigil-crest-pulse,
  .sigil-ember {
    animation: none !important;
  }
}
</style>
