<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
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
} from '@/config/constants'
import { getChampionRoles } from '@/config/championData'
import type { ChampionRole, ItemCategory } from '@/types'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import SigilBoardComponent from './sigil/SigilBoardComponent.vue'
import SigilDetailsPanel from './SigilDetailsPanel.vue'
import TeamModalShell from './TeamModalShell.vue'
import ChampionSelectPanel from '../roles/ChampionSelectPanel.vue'
import EquipmentPickerPanel from '../roles/EquipmentPickerPanel.vue'
import ChampionShopComponent from './championShop/ChampionShopComponent.vue'
import ChampionSkinsPanel from './ChampionSkinsPanel.vue'
import TeamSynergiesPanel from './TeamSynergiesPanel.vue'
import ExpeditionComponent from './expedition/ExpeditionComponent.vue'

type TeamModal = 'picker' | 'shop' | 'expedition' | 'equipment' | 'skins' | null

const ROLE_INDEX = Object.fromEntries(ROLES.map((r, i) => [r.key, i])) as Partial<
  Record<ChampionRole, number>
>

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const { showToast } = useActionToast()

const { headerSlots, secondarySlots } = storeToRefs(battleStore)

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
const activeModal = ref<TeamModal>(null)
const pickerSubSlot = ref(-1)
const shopRole = ref<ChampionRole | 'all'>('all')
const equipCategory = ref<ItemCategory>('weapon')

const roleIndex = computed(() => selectedRole.value ?? uiStore.rolesActiveSlot)
const roleDef = computed(() => ROLES[roleIndex.value])
const currentEquipment = computed(() => itemStore.slotEquipment[roleIndex.value])

const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))
const roleFilteredChampions = computed(() =>
  availableChampions.value.filter((c) => getChampionRoles(c).includes(roleDef.value.key)),
)

const pickerTitle = computed(() =>
  pickerSubSlot.value === -1
    ? `Select ${roleDef.value.label}`
    : `Select Ally ${pickerSubSlot.value + 1}`,
)

// ── Selection ────────────────────────────────────────────────────────────────
function selectRole(index: number) {
  synergiesOpen.value = false
  selectedRole.value = index
  uiStore.setRolesActiveSlot(index)
}

function selectAlly(index: number, subSlot: number) {
  selectRole(index)
  openPicker(subSlot)
}

function closePanel() {
  selectedRole.value = null
}

/** Empty board clicked — the only way to dismiss a side panel now that neither
 *  carries a close button of its own (Escape still works). */
function dismissPanels() {
  if (activeModal.value !== null) return
  selectedRole.value = null
  synergiesOpen.value = false
}

// ── Modals ───────────────────────────────────────────────────────────────────
function openPicker(subSlot: number = -1) {
  pickerSubSlot.value = subSlot
  activeModal.value = 'picker'
}

function openShop(role: ChampionRole | 'all' = 'all') {
  shopRole.value = role
  activeModal.value = 'shop'
}

function openExpedition() {
  activeModal.value = 'expedition'
}

function openSynergies() {
  selectedRole.value = null
  synergiesOpen.value = true
}

function openEquipment(category: ItemCategory) {
  equipCategory.value = category
  activeModal.value = 'equipment'
}

/** Champion whose skin gallery is open — the details page picks main or ally. */
const skinChampion = ref<string | null>(null)

function openSkins(champion: string) {
  if (!champion) return
  skinChampion.value = champion
  activeModal.value = 'skins'
}

function closeModal() {
  cancelDeferredPicker()
  activeModal.value = null
  pickerSubSlot.value = -1
  skinChampion.value = null
}

function onSelectorTabChange(subSlot: number) {
  pickerSubSlot.value = subSlot
}

// The picker never closes itself — the player fills main + allies back to back
// and dismisses the modal manually (✕ / Escape / backdrop).
function handleSelect(champion: string) {
  const subSlot = pickerSubSlot.value
  if (subSlot === -1) {
    battleStore.setHeaderSlot(roleIndex.value, champion)
    showToast(`${champion} set as ${roleDef.value.label}!`)
  } else {
    battleStore.setSecondarySlot(roleIndex.value, subSlot, champion)
    showToast(`${champion} assigned as Ally ${subSlot + 1}!`)
  }
  // Rapid-fire flow: advance to the next empty ally slot; stay put once full
  const row = battleStore.secondarySlots[roleIndex.value] ?? []
  const nextEmpty = row.findIndex((s) => s === null)
  if (nextEmpty !== -1) {
    pickerSubSlot.value = nextEmpty
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
 * The champion picker is deferred by two frames on purpose. A request that
 * names an ally sub-slot asks for the tab AND the picker, and the picker renders
 * every owned champion — 160+ cards. Mounting both in the same frame meant the
 * player clicked and then watched nothing happen until the whole lot was laid
 * out. Letting the tab paint first turns one long freeze into "tab appears, list
 * follows", at no cost to the total work.
 */
function applyRolesOpenRequest() {
  synergiesOpen.value = false
  selectedRole.value = uiStore.rolesActiveSlot
  const subSlot = uiStore.rolesActiveSubSlot
  uiStore.clearRolesOpenPending()
  if (subSlot < 0) {
    activeModal.value = null
    return
  }
  cancelDeferredPicker()
  deferredPicker = requestAnimationFrame(() => {
    deferredPicker = requestAnimationFrame(() => {
      deferredPicker = null
      openPicker(subSlot)
    })
  })
}

/** Pending deferred-picker frame, cancelled if the tab closes before it fires. */
let deferredPicker: number | null = null
function cancelDeferredPicker() {
  if (deferredPicker !== null) {
    cancelAnimationFrame(deferredPicker)
    deferredPicker = null
  }
}

watch(() => uiStore.rolesOpenToken, applyRolesOpenRequest)

watch(
  () => uiStore.pendingChampionSearch,
  (name) => {
    if (!name) return
    const roles = getChampionRoles(name)
    shopRole.value = roles.length > 0 ? roles[0] : 'all'
    activeModal.value = 'shop'
  },
  { immediate: true },
)

// While the shop list scrolls, card pulse animations pause and card hover is
// suppressed (via .is-scrolling) — dozens of animated glows plus hover-expand
// transitions firing under the cursor otherwise tank the frame rate.
const shopScrolling = ref(false)
let shopScrollTimer: ReturnType<typeof setTimeout> | null = null
function onShopScroll() {
  shopScrolling.value = true
  if (shopScrollTimer !== null) clearTimeout(shopScrollTimer)
  shopScrollTimer = setTimeout(() => {
    shopScrolling.value = false
    shopScrollTimer = null
  }, 150)
}

// Escape closes the modal first, then whichever side panel is open.
function onEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (activeModal.value) {
    closeModal()
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
  cancelDeferredPicker()
  if (mountFrame !== null) cancelAnimationFrame(mountFrame)
  window.removeEventListener('keydown', onEsc)
  if (shopScrollTimer !== null) clearTimeout(shopScrollTimer)
  // Tab zu → die gespiegelte Auswahl fällt mit, sonst bliebe im Command Panel
  // eine Markierung stehen, zu der es kein offenes Panel mehr gibt
  uiStore.setTeamActiveRole(null)
})
</script>

<template>
  <div class="team-tab">
    <!-- shared cosmic backdrop — spans the ENTIRE tab content, edge to edge,
         beneath the sigil board and both slide-in side panels. Star animations
         pause while a modal covers the tab (same as the board's own effects). -->
    <CosmicStageBackground :class="{ 'cosmic-paused': activeModal !== null }" />

    <!-- ══ LEFT — Battle Sigil ══ -->
    <SigilBoardComponent
      :selected-role="selectedRole"
      :mount-stage="mountStage"
      :panel-open="synergiesOpen"
      :search-highlights="searchHighlights"
      :hovered-ally="hoveredAllySub"
      :paused="activeModal !== null"
      @select-role="selectRole"
      @select-ally="selectAlly"
      @hover-ally="boardHoveredAlly = $event"
      @open-shop="openShop('all')"
      @open-expedition="openExpedition"
      @open-synergies="openSynergies"
      @deselect="dismissPanels"
    />

    <!-- ══ RIGHT — side panel: role details OR team synergies ══ -->
    <Transition name="sdp-slide" mode="out-in">
      <SigilDetailsPanel
        v-if="selectedRole !== null && panelReady"
        :role-index="selectedRole"
        :highlighted-ally="boardHoveredAlly"
        @swap="openPicker(-1)"
        @pick-ally="openPicker"
        @clear-ally="clearAlly"
        @pick-equipment="openEquipment"
        @pick-skins="openSkins"
        @hover-ally="hoveredAllySub = $event"
      />
      <TeamSynergiesPanel
        v-else-if="synergiesOpen && panelReady"
        @close="synergiesOpen = false"
        @highlight="searchHighlights = $event"
      />
    </Transition>

    <!-- ══ MODAL OVERLAYS ══ -->
    <TeamModalShell
      v-if="activeModal === 'picker'"
      :title="pickerTitle"
      icon="game-icons:switch-weapon"
      hide-header
      @close="closeModal"
    >
      <ChampionSelectPanel
        class="team-modal-fill"
        :active-role="roleDef.label"
        :role-key="roleDef.key"
        :role-filtered-champions="roleFilteredChampions"
        :header-slots="headerSlots"
        :secondary-slots="secondarySlots"
        :active-slot-index="roleIndex"
        :active-sub-slot="pickerSubSlot"
        :show-close="false"
        @select="handleSelect"
        @tab-change="onSelectorTabChange"
        @close="closeModal"
      />
    </TeamModalShell>

    <TeamModalShell
      v-if="activeModal === 'shop'"
      title="Shop"
      icon="game-icons:barbute"
      size="xl"
      hide-header
      hide-close
      @close="closeModal"
    >
      <!-- Unified shop: champions + items in one grid; the close button lives
           in the shop's own search row (the modal has no header of its own). -->
      <div
        class="team-shop-content"
        :class="{ 'is-scrolling': shopScrolling }"
        @scroll.passive="onShopScroll"
      >
        <ChampionShopComponent
          :initial-role="shopRole"
          show-close
          @role-change="handleShopRoleChange"
          @close="closeModal"
        />
      </div>
    </TeamModalShell>

    <TeamModalShell
      v-if="activeModal === 'skins' && skinChampion"
      :title="`${skinChampion} — Skins`"
      icon="game-icons:cape"
      size="xl"
      hide-header
      @close="closeModal"
    >
      <ChampionSkinsPanel class="team-modal-fill" :champion="skinChampion" />
    </TeamModalShell>

    <TeamModalShell
      v-if="activeModal === 'expedition'"
      title="Expeditions"
      icon="game-icons:campfire"
      @close="closeModal"
    >
      <div class="team-modal-fill">
        <ExpeditionComponent />
      </div>
    </TeamModalShell>

    <TeamModalShell
      v-if="activeModal === 'equipment'"
      title="Equipment"
      icon="game-icons:open-treasure-chest"
      :subtitle="`Equip the ${roleDef.label} champion`"
      @close="closeModal"
    >
      <EquipmentPickerPanel
        :initial-category="equipCategory"
        :current-equipment="currentEquipment"
        @equip="handleEquipFromPicker"
        @close="closeModal"
      />
    </TeamModalShell>
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
.cosmic-paused :deep(*) {
  animation-play-state: paused !important;
}
.team-modal-fill {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* unified shop modal content (the shop owns its own header row + close) */
.team-shop-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.team-shop-content::-webkit-scrollbar {
  width: 4px;
}
.team-shop-content::-webkit-scrollbar-track {
  background: #111;
}
.team-shop-content::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* details panel slide-in */
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
