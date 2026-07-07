<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { useActionToast } from '@/composables/useActionToast'
import { ROLES } from '@/config/constants'
import { getChampionRoles } from '@/config/championRoles'
import type { ChampionRole, ItemCategory } from '@/types'
import SigilBoardComponent from './sigil/SigilBoardComponent.vue'
import SigilDetailsPanel from './SigilDetailsPanel.vue'
import TeamModalShell from './TeamModalShell.vue'
import ChampionSelectPanel from '../roles/ChampionSelectPanel.vue'
import EquipmentPickerPanel from '../roles/EquipmentPickerPanel.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'
import ExpeditionComponent from './expedition/ExpeditionComponent.vue'
import ItemShopComponent from './ItemShopComponent.vue'

type TeamModal = 'picker' | 'shop' | 'expedition' | 'equipment' | null

const ROLE_INDEX = Object.fromEntries(ROLES.map((r, i) => [r.key, i])) as Partial<
  Record<ChampionRole, number>
>

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const { showToast } = useActionToast()

const { headerSlots, secondarySlots } = storeToRefs(battleStore)

// ── Tab UI state ─────────────────────────────────────────────────────────────
/** null = details panel closed (sigil fills the tab). */
const selectedRole = ref<number | null>(null)
const activeModal = ref<TeamModal>(null)
const pickerSubSlot = ref(-1)
const shopRole = ref<ChampionRole | 'all'>('all')
const shopTab = ref<'champions' | 'items'>('champions')
const itemShopCategory = ref<ItemCategory>('weapon')
const equipCategory = ref<ItemCategory>('weapon')

const roleIndex = computed(() => selectedRole.value ?? uiStore.rolesActiveSlot)
const roleDef = computed(() => ROLES[roleIndex.value])
const currentEquipment = computed(() => itemStore.slotEquipment[roleIndex.value])

const selectorTab = ref<'main' | 'ally1' | 'ally2'>('main')
const TAB_SUBSLOT: Record<string, number> = { main: -1, ally1: 0, ally2: 1 }

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

// ── Modals ───────────────────────────────────────────────────────────────────
function openPicker(subSlot: number = -1) {
  pickerSubSlot.value = subSlot
  selectorTab.value = subSlot === 0 ? 'ally1' : subSlot === 1 ? 'ally2' : 'main'
  activeModal.value = 'picker'
}

function openShop(role: ChampionRole | 'all' = 'all') {
  shopRole.value = role
  shopTab.value = 'champions'
  activeModal.value = 'shop'
}

function openExpedition() {
  activeModal.value = 'expedition'
}

function openEquipment(category: ItemCategory) {
  equipCategory.value = category
  activeModal.value = 'equipment'
}

function closeModal() {
  activeModal.value = null
  pickerSubSlot.value = -1
}

function onSelectorTabChange(tab: 'main' | 'ally1' | 'ally2') {
  selectorTab.value = tab
  pickerSubSlot.value = TAB_SUBSLOT[tab]
}

function handleSelect(champion: string) {
  const subSlot = pickerSubSlot.value
  if (subSlot === -1) {
    battleStore.setHeaderSlot(roleIndex.value, champion)
    showToast(`${champion} set as ${roleDef.value.label}!`)
  } else {
    battleStore.setSecondarySlot(roleIndex.value, subSlot, champion)
    showToast(`${champion} assigned as Ally ${subSlot + 1}!`)
  }
  closeModal()
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
function applyRolesOpenRequest() {
  selectedRole.value = uiStore.rolesActiveSlot
  if (uiStore.rolesActiveSubSlot >= 0) {
    openPicker(uiStore.rolesActiveSubSlot)
  } else {
    activeModal.value = null
  }
  uiStore.clearRolesOpenPending()
}

watch(() => uiStore.rolesOpenToken, applyRolesOpenRequest)

watch(
  () => uiStore.pendingChampionSearch,
  (name) => {
    if (!name) return
    const roles = getChampionRoles(name)
    shopRole.value = roles.length > 0 ? roles[0] : 'all'
    shopTab.value = 'champions'
    activeModal.value = 'shop'
  },
  { immediate: true },
)

// Escape closes the modal first, then the details panel.
function onEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (activeModal.value) {
    closeModal()
  } else if (selectedRole.value !== null) {
    closePanel()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onEsc)
  // the tab may have just been opened BY a requestOpenRolesTab call — the token
  // watcher above wasn't registered yet, so consume the pending request here
  if (uiStore.rolesOpenPending) applyRolesOpenRequest()
})
onUnmounted(() => window.removeEventListener('keydown', onEsc))
</script>

<template>
  <div class="team-tab">
    <!-- ══ LEFT — Battle Sigil ══ -->
    <SigilBoardComponent
      :selected-role="selectedRole"
      @select-role="selectRole"
      @select-ally="selectAlly"
      @open-shop="openShop('all')"
      @open-expedition="openExpedition"
    />

    <!-- ══ RIGHT — Details Panel (slides in on champion click) ══ -->
    <Transition name="sdp-slide">
      <SigilDetailsPanel
        v-if="selectedRole !== null"
        :role-index="selectedRole"
        @close="closePanel"
        @swap="openPicker(-1)"
        @pick-ally="openPicker"
        @clear-ally="clearAlly"
        @pick-equipment="openEquipment"
      />
    </Transition>

    <!-- ══ MODAL OVERLAYS ══ -->
    <TeamModalShell
      v-if="activeModal === 'picker'"
      :title="pickerTitle"
      icon="game-icons:switch-weapon"
      :subtitle="`Owned champions for the ${roleDef.label} role`"
      @close="closeModal"
    >
      <ChampionSelectPanel
        class="team-modal-fill"
        :active-role="roleDef.label"
        :role-key="roleDef.key"
        :selector-tab="selectorTab"
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
      subtitle="Recruit champions & equip items"
      @close="closeModal"
    >
      <div class="team-shop-tabs">
        <button
          class="modal-tab"
          :class="{ 'modal-tab--active': shopTab === 'champions' }"
          @click="shopTab = 'champions'"
        >
          Champions
        </button>
        <button
          class="modal-tab"
          :class="{ 'modal-tab--active': shopTab === 'items' }"
          @click="shopTab = 'items'"
        >
          Items
        </button>
        <template v-if="shopTab === 'items'">
          <div class="team-shop-tabs-sep" />
          <button
            v-for="cat in [
              { id: 'weapon', label: 'Weapon' },
              { id: 'armor', label: 'Armor' },
              { id: 'artefact', label: 'Artefact' },
            ]"
            :key="cat.id"
            class="modal-tab"
            :class="{ 'modal-tab--active': itemShopCategory === cat.id }"
            @click="itemShopCategory = cat.id as ItemCategory"
          >
            <img
              :src="`/img/itemShop/${cat.id}.png`"
              :alt="cat.label"
              width="18"
              height="18"
              loading="eager"
              class="team-shop-tab-img"
            />
            {{ cat.label }}
          </button>
        </template>
      </div>
      <div class="team-shop-content">
        <ChampionShopComponent
          v-if="shopTab === 'champions'"
          :initial-role="shopRole"
          :show-close="false"
          @role-change="handleShopRoleChange"
          @close="closeModal"
        />
        <ItemShopComponent v-else :category="itemShopCategory" />
      </div>
    </TeamModalShell>

    <TeamModalShell
      v-if="activeModal === 'expedition'"
      title="Expeditions"
      icon="game-icons:campfire"
      subtitle="Send champions on missions for materials"
      @close="closeModal"
    >
      <div class="team-shop-content">
        <ExpeditionComponent @close="closeModal" />
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
  background: #0d0a03;
}
.team-modal-fill {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* shop modal sub-tabs (mirrors the old inline-panel tab bar) */
.team-shop-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.5);
  background: #1e1006;
  flex-shrink: 0;
}
.team-shop-tabs-sep {
  width: 1px;
  height: 22px;
  background: rgba(92, 51, 16, 0.6);
  margin: 0 4px;
  flex-shrink: 0;
}
.team-shop-tabs .modal-tab {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  background: rgba(14, 10, 4, 0.85);
  border: 1px solid rgba(92, 51, 16, 0.4);
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.team-shop-tabs .modal-tab:hover {
  color: #e8c040;
  border-color: rgba(122, 78, 32, 0.8);
}
.team-shop-tabs .modal-tab--active {
  color: #f0d870;
  background: rgba(30, 16, 6, 0.97);
  border-color: #c89040;
  box-shadow: inset 0 0 0 1px rgba(92, 51, 16, 0.5);
}
.team-shop-tab-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}
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
  transition: transform 0.22s cubic-bezier(0.55, 0, 1, 0.45);
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
