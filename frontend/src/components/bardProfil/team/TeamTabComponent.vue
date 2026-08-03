<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { useActionToast } from '@/composables/useActionToast'
import {
  ROLES,
  TEAM_TAB_MOUNT_STAGE_BOARD,
  TEAM_TAB_MOUNT_STAGE_SATELLITES,
  TEAM_TAB_MOUNT_STAGE_PANEL,
  TEAM_TAB_MOUNT_STAGE_ORNAMENTS,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_SYNERGIES_PANEL_WIDTH,
  TEAM_SHOP_PANEL_WIDTH,
  TEAM_EXPEDITION_PANEL_WIDTH,
  TEAM_EQUIPMENT_PANEL_WIDTH,
} from '@/config/constants'
import { getChampionRoles } from '@/config/championData'
import { allySlotLabel } from '@/utils/format'
import type { ChampionRole, ItemCategory } from '@/types'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import SigilBoardComponent from './sigil/SigilBoardComponent.vue'
import SigilDetailsPanel from './SigilDetailsPanel.vue'
import TeamSidePanelShell from './TeamSidePanelShell.vue'
import EquipmentPickerPanel from '../roles/EquipmentPickerPanel.vue'
import ChampionShopComponent from './championShop/ChampionShopComponent.vue'
import TeamSynergiesPanel from './TeamSynergiesPanel.vue'
import ExpeditionComponent from './expedition/ExpeditionComponent.vue'

/**
 * The tab has exactly ONE right rail and everything opens into it — the role
 * details page, team synergies, and the three board destinations that used to be
 * modals over the whole tab. A modal answered a question by hiding the thing the
 * question was about: the shop covered the very sigil the player recruits for.
 *
 * The champion picker is not on this list: it lives inside the details page (see
 * SigilDetailsPanel → swapOpen), so choosing a champion no longer covers the
 * board it is being chosen for.
 */
type TeamDestination = 'shop' | 'expedition' | 'equipment' | null

const ROLE_INDEX = Object.fromEntries(ROLES.map((r, i) => [r.key, i])) as Partial<
  Record<ChampionRole, number>
>

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const { showToast } = useActionToast()

// ── Gestaffelter Aufbau ──────────────────────────────────────────────────────
// Siehe TEAM_TAB_MOUNT_STAGE_*: der Tab baut sich über drei Frames auf, damit
// das Öffnen nicht in einem einzigen langen Frame stattfindet.
const mountStage = ref(TEAM_TAB_MOUNT_STAGE_BOARD)
let mountFrame: number | null = null

function advanceMountStages() {
  const steps = [
    TEAM_TAB_MOUNT_STAGE_SATELLITES,
    TEAM_TAB_MOUNT_STAGE_PANEL,
    TEAM_TAB_MOUNT_STAGE_ORNAMENTS,
  ]
  const step = (i: number) => {
    if (i >= steps.length) {
      mountFrame = null
      return
    }
    mountFrame = requestAnimationFrame(() => {
      mountStage.value = steps[i]
      step(i + 1)
    })
  }
  step(0)
}

/** Die Detailseite darf erst mounten, wenn das Board steht. */
const panelReady = computed(() => mountStage.value >= TEAM_TAB_MOUNT_STAGE_PANEL)

// ── Tab UI state ─────────────────────────────────────────────────────────────
/** null = details panel closed (sigil fills the tab). */
const selectedRole = ref<number | null>(null)
/** Team synergies side panel — mutually exclusive with the role details panel. */
const synergiesOpen = ref(false)
/** Champions spotlighted by the synergies search — mirrored on the sigil board. */
const searchHighlights = ref<string[]>([])

watch(synergiesOpen, (open) => {
  if (!open) searchHighlights.value = []
})
/** Ally row hovered in the details panel — spotlighted on the sigil board. */
const hoveredAllySub = ref<number | null>(null)
/** Ally satellite hovered on the board — highlighted in the details panel. */
const boardHoveredAlly = ref<number | null>(null)

/**
 * The seat under the cursor, wherever the cursor happens to be — and it drives
 * BOTH surfaces, which is what makes the two read as one thing: the board
 * spotlights that satellite and pulls its four siblings back, the roster strip
 * lights that card and pulls the rest back, in the same moment.
 *
 * Feeding the board's own hover back to the board is the point. Without it,
 * pointing straight at a satellite dimmed the panel but left the board itself
 * unchanged, so the same gesture looked like two different effects depending on
 * which half of the tab your hand was over.
 *
 * The panel's hover wins a tie: it is the more deliberate of the two, and it is
 * the one still standing when the pointer travels from the board onto a card.
 */
const spotlightAlly = computed(() => hoveredAllySub.value ?? boardHoveredAlly.value)

watch(
  selectedRole,
  (index) => {
    hoveredAllySub.value = null
    boardHoveredAlly.value = null
    // Auswahl ins UI-Store spiegeln, damit das Command Panel dieselbe
    // Rollenkarte markiert (ein Watcher deckt alle Pfade ab: Board-Klick,
    // Panel schließen, Synergien öffnen, externe Öffnungs-Anfrage).
    uiStore.setTeamActiveRole(index)
  },
  { immediate: true },
)
/**
 * Which board destination owns the rail, if any.
 *
 * Shop and expeditions are destinations of their own and push the details page
 * out of the rail. Equipment is different: it is opened FROM the details page
 * for the role that page is on, so it takes the rail WITHOUT clearing
 * `selectedRole` — closing it drops straight back onto the page it came from,
 * and the board keeps its camera on that role the whole time.
 */
const activeDestination = ref<TeamDestination>(null)
const shopRole = ref<ChampionRole | 'all'>('all')
const equipCategory = ref<ItemCategory>('weapon')

/** Width the board has to subtract to fit itself beside the open rail. */
const sidePanelWidth = computed(() => {
  switch (activeDestination.value) {
    case 'shop':
      return TEAM_SHOP_PANEL_WIDTH
    case 'expedition':
      return TEAM_EXPEDITION_PANEL_WIDTH
    case 'equipment':
      return TEAM_EQUIPMENT_PANEL_WIDTH
  }
  if (selectedRole.value !== null) return TEAM_SIGIL_DETAILS_PANEL_WIDTH
  return synergiesOpen.value ? TEAM_SIGIL_SYNERGIES_PANEL_WIDTH : 0
})

const roleIndex = computed(() => selectedRole.value ?? uiStore.rolesActiveSlot)
const roleDef = computed(() => ROLES[roleIndex.value])
const currentEquipment = computed(() => itemStore.slotEquipment[roleIndex.value])

// ── Selection ────────────────────────────────────────────────────────────────
/** Seat the details page should open on — only a board satellite names one. */
const focusAlly = ref<number | null>(null)
/** Bumped with every focus request, see the panel's `focusToken` prop. */
const focusToken = ref(0)
/** Whether that request should land straight in the inline picker. */
const focusSwap = ref(false)
/** True while the details page has the picker open — Escape routes by it. */
const swapOpen = ref(false)
/** Bumped to ask the page to leave the picker (Escape), see `closeSwapToken`. */
const closeSwapToken = ref(0)

function focusSeat(subSlot: number | null, swap = false) {
  focusAlly.value = subSlot
  focusSwap.value = swap
  focusToken.value++
}

function selectRole(index: number) {
  synergiesOpen.value = false
  activeDestination.value = null
  selectedRole.value = index
  focusSeat(null)
  uiStore.setRolesActiveSlot(index)
}

/**
 * A satellite on the sigil board opens the DETAILS PAGE on that champion — it
 * used to jump straight into the swap modal, which threw the player out of the
 * page they were on to answer a question they had not asked.
 *
 * An empty seat is the one exception: it has no champion to describe, so the
 * page opens with its picker already up. That is exactly what the page does
 * when one of its own empty chips is clicked (see selectSubject there), so
 * board and page answer a click the same way. Swapping a seated champion stays
 * one click away — its portrait on the page is the swap button.
 */
function selectAlly(index: number, subSlot: number) {
  const seated = (battleStore.secondarySlots[index] ?? [])[subSlot] ?? null
  selectRole(index)
  focusSeat(subSlot, !seated)
}

function closePanel() {
  selectedRole.value = null
}

/** Empty board clicked — dismisses whatever the rail is showing, one layer at a
 *  time: equipment falls back to the page that opened it, everything else
 *  closes the rail outright. */
function dismissPanels() {
  if (activeDestination.value === 'equipment') {
    activeDestination.value = null
    return
  }
  activeDestination.value = null
  selectedRole.value = null
  synergiesOpen.value = false
}

// ── Rail destinations ────────────────────────────────────────────────────────
/** Shop and expeditions replace whatever the rail holds — see activeDestination. */
function openDestination(destination: Exclude<TeamDestination, null | 'equipment'>) {
  selectedRole.value = null
  synergiesOpen.value = false
  activeDestination.value = destination
}

function openShop(role: ChampionRole | 'all' = 'all') {
  shopRole.value = role
  openDestination('shop')
}

function openExpedition() {
  openDestination('expedition')
}

function openSynergies() {
  activeDestination.value = null
  selectedRole.value = null
  synergiesOpen.value = true
}

/** Opened from the details page — keeps `selectedRole`, so closing returns there. */
function openEquipment(category: ItemCategory) {
  equipCategory.value = category
  activeDestination.value = 'equipment'
}

function closeDestination() {
  activeDestination.value = null
}

/** A champion picked in the details page's inline picker. */
function assignChampion(subSlot: number, champion: string) {
  if (subSlot === -1) {
    battleStore.setHeaderSlot(roleIndex.value, champion)
    showToast(`${champion} set as ${roleDef.value.label}!`)
  } else {
    battleStore.setSecondarySlot(roleIndex.value, subSlot, champion)
    showToast(`${champion} assigned as ${allySlotLabel(subSlot)}!`)
  }
}

function clearAlly(subSlot: number) {
  battleStore.clearSecondarySlot(roleIndex.value, subSlot)
}

function handleEquipFromPicker(itemId: string, category: ItemCategory) {
  if (currentEquipment.value[category] === itemId) {
    itemStore.unequipItem(roleIndex.value, category)
  } else {
    itemStore.equipItem(roleIndex.value, itemId)
  }
}

function handleShopRoleChange(role: ChampionRole | 'all') {
  shopRole.value = role
  if (role !== 'all') {
    const idx = ROLE_INDEX[role]
    if (idx !== undefined) uiStore.setRolesActiveSlot(idx)
  }
}

// ── External navigation hooks ────────────────────────────────────────────────
/**
 * Consumes a "open the team tab on this slot" request from elsewhere (command
 * panel, battle roster, striker squad).
 *
 * A request that names an ally sub-slot asks for that seat's picker, which is
 * now the details page's own — one page opens, not a page and a modal over it.
 * The two-frame defer that used to sit here went with the modal: the inline
 * grid is windowed (useVirtualGrid), so it lays out a dozen cards, not 160.
 */
function applyRolesOpenRequest() {
  synergiesOpen.value = false
  selectedRole.value = uiStore.rolesActiveSlot
  const subSlot = uiStore.rolesActiveSubSlot
  uiStore.clearRolesOpenPending()
  activeDestination.value = null
  if (subSlot < 0) {
    focusSeat(null)
    return
  }
  focusSeat(subSlot, true)
}

watch(() => uiStore.rolesOpenToken, applyRolesOpenRequest)

watch(
  () => uiStore.pendingChampionSearch,
  (name) => {
    if (!name) return
    const roles = getChampionRoles(name)
    openShop(roles.length > 0 ? roles[0] : 'all')
  },
  { immediate: true },
)

/** True while the shop rail shows a card's detail over its grid. */
const shopDetailOpen = ref(false)
/** Bumped to ask the shop to leave that detail (Escape), see `closeDetailToken`. */
const closeShopDetailToken = ref(0)

// Escape unwinds one layer at a time: the shop's detail, the details page's own
// picker, then whatever the rail is showing. Only this handler listens for the
// key — both of those live in children, so the request travels down as a token
// rather than as a second window listener racing this one.
function onEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (activeDestination.value === 'shop' && shopDetailOpen.value) {
    closeShopDetailToken.value++
  } else if (activeDestination.value !== null) {
    closeDestination()
  } else if (swapOpen.value) {
    closeSwapToken.value++
  } else if (synergiesOpen.value) {
    synergiesOpen.value = false
  } else if (selectedRole.value !== null) {
    closePanel()
  }
}

onMounted(() => {
  advanceMountStages()
  window.addEventListener('keydown', onEsc)
  // the tab may have just been opened BY a requestOpenRolesTab call — the token
  // watcher above wasn't registered yet, so consume the pending request here
  if (uiStore.rolesOpenPending) applyRolesOpenRequest()
})
onUnmounted(() => {
  if (mountFrame !== null) cancelAnimationFrame(mountFrame)
  window.removeEventListener('keydown', onEsc)
  // Tab zu → die gespiegelte Auswahl fällt mit, sonst bliebe im Command Panel
  // eine Markierung stehen, zu der es kein offenes Panel mehr gibt
  uiStore.setTeamActiveRole(null)
})
</script>

<template>
  <div class="team-tab">
    <!-- shared cosmic backdrop — spans the ENTIRE tab content, edge to edge,
         beneath the sigil board and every slide-in rail. -->
    <CosmicStageBackground />

    <!-- ══ LEFT — Battle Sigil ══ -->
    <SigilBoardComponent
      :selected-role="selectedRole"
      :mount-stage="mountStage"
      :side-panel-width="sidePanelWidth"
      :search-highlights="searchHighlights"
      :hovered-ally="spotlightAlly"
      @select-role="selectRole"
      @select-ally="selectAlly"
      @hover-ally="boardHoveredAlly = $event"
      @open-shop="openShop('all')"
      @open-expedition="openExpedition"
      @open-synergies="openSynergies"
      @deselect="dismissPanels"
    />

    <!-- ══ RIGHT — the one rail: board destination, role details or synergies ══
         One Transition for all of them, so opening the shop while the details
         page is up is a single slide, not a close followed by an open. -->
    <Transition name="sdp-slide" mode="out-in">
      <TeamSidePanelShell
        v-if="activeDestination === 'shop'"
        key="shop"
        title="Shop"
        icon="game-icons:shopping-bag"
        :width="TEAM_SHOP_PANEL_WIDTH"
        hide-header
        @close="closeDestination"
      >
        <!-- Unified shop: champions + items in one grid, the card detail slides
             in over it (the rail has no room for a permanent detail column).
             No title stripe above it — the search row is the shop's own header
             and carries the close button. -->
        <ChampionShopComponent
          :initial-role="shopRole"
          :close-detail-token="closeShopDetailToken"
          @role-change="handleShopRoleChange"
          @detail-state="shopDetailOpen = $event"
          @close="closeDestination"
        />
      </TeamSidePanelShell>

      <TeamSidePanelShell
        v-else-if="activeDestination === 'expedition'"
        key="expedition"
        title="Expeditions"
        icon="game-icons:campfire"
        subtitle="Send champions out for materials"
        :width="TEAM_EXPEDITION_PANEL_WIDTH"
        @close="closeDestination"
      >
        <ExpeditionComponent />
      </TeamSidePanelShell>

      <TeamSidePanelShell
        v-else-if="activeDestination === 'equipment'"
        key="equipment"
        title="Equipment"
        icon="game-icons:open-treasure-chest"
        :subtitle="`Equip the ${roleDef.label} champion`"
        :width="TEAM_EQUIPMENT_PANEL_WIDTH"
        @close="closeDestination"
      >
        <EquipmentPickerPanel
          :initial-category="equipCategory"
          :current-equipment="currentEquipment"
          @equip="handleEquipFromPicker"
        />
      </TeamSidePanelShell>

      <SigilDetailsPanel
        v-else-if="selectedRole !== null && panelReady"
        key="details"
        :role-index="selectedRole"
        :highlighted-ally="boardHoveredAlly"
        :focus-ally="focusAlly"
        :focus-token="focusToken"
        :focus-swap="focusSwap"
        :close-swap-token="closeSwapToken"
        @assign="assignChampion"
        @clear-ally="clearAlly"
        @pick-equipment="openEquipment"
        @hover-ally="hoveredAllySub = $event"
        @swap-state="swapOpen = $event"
      />
      <TeamSynergiesPanel
        v-else-if="synergiesOpen && panelReady"
        key="synergies"
        @close="synergiesOpen = false"
        @highlight="searchHighlights = $event"
      />
    </Transition>
  </div>
</template>

<style scoped>
.team-tab {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #111008; /* same deep-space base as Shop / Planets / Skill Tree */
}
/* rail slide-in — shared by the details page, the synergies panel and every
   board destination, so they all enter and leave on the same motion */
.sdp-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.sdp-slide-leave-active {
  transition: transform 0.12s cubic-bezier(0.55, 0, 1, 0.45);
}
.sdp-slide-enter-from,
.sdp-slide-leave-to {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .sdp-slide-enter-active,
  .sdp-slide-leave-active {
    transition: opacity 0.15s ease !important;
  }
  .sdp-slide-enter-from,
  .sdp-slide-leave-to {
    transform: none !important;
    opacity: 0;
  }
}
</style>
