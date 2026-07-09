<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useExpeditionStore } from '@/stores/expeditionStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { useTeamSigil } from '@/composables/useTeamSigil'
import {
  ROLES,
  SIGIL_STAGE_SIZE,
  SIGIL_CREST_SIZE,
  TEAM_SIGIL_FOCUS_ZOOM,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_PAN_MAX_FRACTION,
  TEAM_SIGIL_DRAG_THRESHOLD_PX,
} from '@/config/constants'
import SigilSvgLayers from './SigilSvgLayers.vue'
import SigilRoleNode from './SigilRoleNode.vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'

const props = defineProps<{
  selectedRole: number | null
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
  'open-shop': []
  'open-expedition': []
  'open-synergies': []
}>()

const battleStore = useBattleStore()
const expeditionStore = useExpeditionStore()
const synergyStore = useSynergyStore()
const { newlyUnlockedChampions, secondarySlots } = storeToRefs(battleStore)

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

/** A right-side panel (role details OR synergies) narrows the visible board. */
const sidePanelOpen = computed(() => props.selectedRole !== null || !!props.panelOpen)

const fitScale = computed(() => {
  const boardWidth = tabRect.value.width - (sidePanelOpen.value ? TEAM_SIGIL_DETAILS_PANEL_WIDTH : 0)
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

/** Board center in tab px — computed (not CSS 50%) so the close animation targets
 *  the FINAL board width immediately instead of jumping when the panel unmounts. */
const boardCenter = computed(() => ({
  x: (tabRect.value.width - (sidePanelOpen.value ? TEAM_SIGIL_DETAILS_PANEL_WIDTH : 0)) / 2,
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
    @dragstart.prevent
  >
    <!-- board actions: shop + expedition (always reachable) -->
    <button class="sigil-action sigil-action--shop" @click.stop="emit('open-shop')">
      <Icon icon="game-icons:shopping-bag" width="26" height="26" class="sigil-action-icon" />
      Shop
      <RpgNotifyBadge :count="shopBadgeCount" variant="shop" label="Champions available in shop" />
    </button>
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

      <!-- escalation embers -->
      <div
        v-for="(ember, k) in embers"
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
        :search-highlights="searchHighlights"
        :hovered-ally="selectedRole === i ? (hoveredAlly ?? null) : null"
        @select="emit('select-role', i)"
        @select-ally="(sub: number) => emit('select-ally', i, sub)"
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
  background: radial-gradient(circle at 42% 46%, #1c1409, #0b0705 72%);
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

.sigil-board::after {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-radius: 5px;
  pointer-events: none;
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
