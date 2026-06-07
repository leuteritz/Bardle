<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useActionToast } from '@/composables/useActionToast'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { ROLES as ROLE_DEFS, ROLE_BY_KEY } from '@/config/constants'
import { getChampionRoles } from '@/config/championRoles'
import { getChampionOrigin, getOriginColor } from '@/config/championOrigins'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/championTraits'
import type { ChampionRole, ItemCategory, SlotEquipment } from '@/types'
import ChampionInfoHeader from './ChampionInfoHeader.vue'
import ChampionSelectPanel from '../roles/ChampionSelectPanel.vue'
import EquipmentPickerPanel from '../roles/EquipmentPickerPanel.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'
import ExpeditionComponent from './expedition/ExpeditionComponent.vue'
import ItemShopComponent from './ItemShopComponent.vue'
import SynergiesPanelComponent from './SynergiesPanelComponent.vue'
import EquipmentSlotBarComponent from './EquipmentSlotBarComponent.vue'
import SecondaryChampionsPanelComponent from './SecondaryChampionsPanelComponent.vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'

const ROLES = ROLE_DEFS.map((r) => r.label)
const ROLE_MAP = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.key])) as Record<
  string,
  ChampionRole
>
const ROLE_INDEX = Object.fromEntries(ROLE_DEFS.map((r, i) => [r.key, i])) as Partial<
  Record<ChampionRole, number>
>
const ROLE_COLORS = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.color]))

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const expeditionStore = useExpeditionStore()
const { showToast } = useActionToast()

const { headerSlots, secondarySlots, recruitableChampions } = storeToRefs(battleStore)
const activeSlotIndex = computed(() => uiStore.rolesActiveSlot)

const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))
const activeChampion = computed(() => headerSlots.value[activeSlotIndex.value])
const activeSecondaries = computed(
  () => secondarySlots.value[activeSlotIndex.value] ?? [null, null],
)
const currentEquipment = computed(() => itemStore.slotEquipment[activeSlotIndex.value])

const activeRole = computed(() => ROLES[activeSlotIndex.value])
const roleKey = computed(() => ROLE_MAP[activeRole.value] as ChampionRole)
const activeRoleDef = computed(() => ROLE_BY_KEY[roleKey.value])

const splashImageUrl = computed(() =>
  activeChampion.value ? battleStore.getChampionImage(activeChampion.value) : '',
)
const roleColor = computed(() => ROLE_COLORS[activeRole.value])
const roleImage = computed(() => activeRoleDef.value?.image ?? '')
const abilityCompact = computed(() => activeRoleDef.value?.abilityCompact ?? '')
const abilityDetails = computed(() => activeRoleDef.value?.abilityDetails ?? [])
const roleStats = computed(
  () => (ROLE_BY_KEY[roleKey.value]?.stats ?? []) as import('@/types').RoleStat[],
)
const championTraits = computed(() =>
  (CHAMPION_TRAITS[activeChampion.value ?? ''] ?? []).map((id) => TRAIT_BY_ID[id]),
)
const origin = computed(() => getChampionOrigin(activeChampion.value ?? '') ?? null)
const originColor = computed(() => getOriginColor(activeChampion.value ?? ''))

const roleFilteredChampions = computed(() => {
  const internalRole = ROLE_MAP[activeRole.value]
  if (!internalRole) return availableChampions.value
  return availableChampions.value.filter((c) => getChampionRoles(c).includes(internalRole))
})

const parallaxX = ref(0)
const parallaxY = ref(0)
const hoveredSyn = ref<{ involvedChampions: string[]; color: string } | null>(null)

const equipCollapsed = ref(true)
const synCollapsed = ref(true)
const secCollapsed = ref(true)

const allOpen = computed(() => !equipCollapsed.value && !synCollapsed.value && !secCollapsed.value)
const allCollapsed = computed(
  () => equipCollapsed.value && synCollapsed.value && secCollapsed.value,
)

const activePanel = ref<'shop' | 'expedition' | 'items' | null>(null)
const shopRole = ref<ChampionRole | 'all'>('all')
const itemShopCategory = ref<ItemCategory>('weapon')

const expeditionBadgeCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)
const shopBadgeCount = computed(() =>
  recruitableChampions.value.filter((c) => getChampionRoles(c.name).includes(roleKey.value)).length,
)

const panelMode = ref<'main' | 'champion-picker' | 'item-picker'>('main')
const internalSubSlot = ref(-1)
const selectedCategory = ref<ItemCategory | null>(null)
const selectorTab = ref<'main' | 'ally1' | 'ally2'>('main')
const TAB_SUBSLOT: Record<string, number> = { main: -1, ally1: 0, ally2: 1 }

watch(
  () => uiStore.rolesOpenToken,
  () => {
    if (uiStore.rolesActiveSubSlot >= 0) {
      internalSubSlot.value = uiStore.rolesActiveSubSlot
      panelMode.value = 'champion-picker'
    }
  },
)

watch(roleKey, (role) => {
  if (activePanel.value === 'shop') shopRole.value = role
})

function closeActiveModal() {
  activePanel.value = null
  if (panelMode.value !== 'main') {
    panelMode.value = 'main'
    selectedCategory.value = null
    internalSubSlot.value = -1
  }
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') closeActiveModal()
}

onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => window.removeEventListener('keydown', onEsc))

function openShop(role: ChampionRole | 'all' = 'all') {
  shopRole.value = role
  panelMode.value = 'main'
  activePanel.value = activePanel.value === 'shop' ? null : 'shop'
}

function openExpedition() {
  panelMode.value = 'main'
  activePanel.value = activePanel.value === 'expedition' ? null : 'expedition'
}

function openItemShop() {
  itemShopCategory.value = 'weapon'
  panelMode.value = 'main'
  activePanel.value = activePanel.value === 'items' ? null : 'items'
}

function closeInlinePanel() {
  activePanel.value = null
}

function openChampionPicker(subSlot: number = -1) {
  activePanel.value = null
  internalSubSlot.value = subSlot
  selectorTab.value = subSlot === 0 ? 'ally1' : subSlot === 1 ? 'ally2' : 'main'
  panelMode.value = 'champion-picker'
}

function onSelectorTabChange(tab: 'main' | 'ally1' | 'ally2') {
  selectorTab.value = tab
  internalSubSlot.value = TAB_SUBSLOT[tab]
}

function openItemPicker(cat: ItemCategory) {
  selectedCategory.value = cat
  panelMode.value = 'item-picker'
}

function closePanel() {
  panelMode.value = 'main'
  selectedCategory.value = null
  internalSubSlot.value = -1
}

function handleSelect(champion: string) {
  const subSlot = internalSubSlot.value
  if (subSlot === -1) {
    battleStore.setHeaderSlot(activeSlotIndex.value, champion)
    showToast(`${champion} set as ${activeRole.value}!`)
  } else {
    battleStore.setSecondarySlot(activeSlotIndex.value, subSlot, champion)
    showToast(`${champion} assigned as Ally ${subSlot + 1}!`)
  }
  panelMode.value = 'main'
  internalSubSlot.value = -1
}

function clearSecondary(roleIndex: number, subIndex: number, event: Event) {
  event.stopPropagation()
  battleStore.clearSecondarySlot(roleIndex, subIndex)
}

function handleEquipFromPicker(itemId: string, category: ItemCategory) {
  if (currentEquipment.value[category] === itemId) {
    itemStore.unequipItem(activeSlotIndex.value, category)
  } else {
    itemStore.equipItem(activeSlotIndex.value, itemId)
  }
}

function handleShopRoleChange(role: ChampionRole | 'all') {
  shopRole.value = role
  if (role !== 'all') {
    const idx = ROLE_INDEX[role]
    if (idx !== undefined) uiStore.setRolesActiveSlot(idx)
  }
}

function isHighlighted(champion: string | null | undefined): boolean {
  if (!champion || !hoveredSyn.value) return false
  return hoveredSyn.value.involvedChampions.includes(champion)
}

function highlightStyle(champion: string | null | undefined): Record<string, string> {
  if (!isHighlighted(champion)) return {}
  return { '--hl-color': hoveredSyn.value!.color }
}

function onSplashMouseMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  parallaxX.value = ((e.clientX - cx) / rect.width) * 6
  parallaxY.value = ((e.clientY - cy) / rect.height) * 4
}

function onSplashMouseLeave() {
  parallaxX.value = 0
  parallaxY.value = 0
}

function toggleAll() {
  const target = allOpen.value
  equipCollapsed.value = target
  synCollapsed.value = target
  secCollapsed.value = target
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div
    class="splash-area"
    @mousemove="onSplashMouseMove"
    @mouseleave="onSplashMouseLeave"
    @click="activePanel === null && panelMode === 'main' && openChampionPicker(-1)"
  >
    <div class="splash-inner">
      <template v-if="activeChampion">
        <img
          :src="splashImageUrl"
          :alt="activeChampion"
          class="splash-img"
          :class="{ 'splash-img--syn-glow': isHighlighted(activeChampion) }"
          :style="[
            { transform: `scale(1.06) translate(${parallaxX}px, ${parallaxY}px)` },
            highlightStyle(activeChampion),
          ]"
          @error="onImgError"
        />
      </template>
      <div v-else class="splash-empty">
        <img :src="roleImage" :alt="activeRole" class="splash-empty-role-img" />
        <span class="splash-empty-plus">＋</span>
        <span class="splash-empty-hint">Select Champion</span>
      </div>
    </div>

    <!-- Vignettes -->
    <div class="vignette-edge" />
    <div class="vignette-bottom" />
    <div class="vignette-right" />

    <!-- ══ ACTION BAR ══ -->
    <div class="splash-action-bar" :style="{ '--rc': roleColor }" @click.stop>
      <button
        class="action-bar-btn"
        :class="{ 'action-bar-btn--active': activePanel === 'shop' }"
        @click.stop="openShop(roleKey)"
      >
        <Icon icon="game-icons:barbute" class="action-bar-icon" />
        <span class="action-bar-label">Shop</span>
        <RpgNotifyBadge :count="shopBadgeCount" variant="shop" label="Champions available in shop" />
      </button>
      <div class="action-bar-sep" />
      <button
        class="action-bar-btn action-bar-btn--featured"
        :class="{ 'action-bar-btn--active': activePanel === 'expedition' }"
        @click.stop="openExpedition"
      >
        <Icon icon="game-icons:campfire" class="action-bar-icon" />
        <span class="action-bar-label">Expedition</span>
        <RpgNotifyBadge :count="expeditionBadgeCount" label="Expedition rewards ready" />
      </button>
      <div class="action-bar-sep" />
      <button
        class="action-bar-btn"
        :class="{ 'action-bar-btn--active': activePanel === 'items' }"
        @click.stop="openItemShop"
      >
        <Icon icon="game-icons:open-treasure-chest" class="action-bar-icon" />
        <span class="action-bar-label">Items</span>
      </button>
    </div>

    <!-- ══ Global Collapse All ══ -->
    <button
      class="panel-collapse-all"
      :aria-expanded="!allCollapsed"
      :aria-label="allOpen ? 'Collapse all panels' : 'Expand all panels'"
      @click.stop="toggleAll"
    >
      <span class="collapse-all-icon" :class="{ 'collapse-all-icon--open': allOpen }">▼</span>
    </button>

    <!-- ══ Champion Info Header ══ -->
    <ChampionInfoHeader
      v-if="activeChampion"
      :champion-name="activeChampion"
      :origin="origin"
      :origin-color="originColor"
      :champion-traits="championTraits"
      :role-key="roleKey"
      :role-image="roleImage"
      :role-label="roleKey.toUpperCase()"
      :ability-compact="abilityCompact"
      :ability-details="abilityDetails"
      :role-stats="roleStats"
      @click.stop
    />

    <!-- ══ Secondary Panel (links) ══ -->
    <SecondaryChampionsPanelComponent
      :secondaries="activeSecondaries"
      :active-slot-index="activeSlotIndex"
      :collapsed="secCollapsed"
      :role-color="roleColor"
      :hovered-syn="hoveredSyn"
      @open-champion-picker="openChampionPicker"
      @clear-secondary="clearSecondary"
    />

    <!-- Secondary panel toggle -->
    <button
      class="panel-toggle panel-toggle--sec"
      :class="{ 'panel-toggle--sec-collapsed': secCollapsed }"
      :aria-label="secCollapsed ? 'Expand allies panel' : 'Collapse allies panel'"
      :aria-expanded="!secCollapsed"
      @mouseenter="secCollapsed = !secCollapsed"
      @click.stop="secCollapsed = !secCollapsed"
    >
      <span class="toggle-chevron">{{ secCollapsed ? '▶' : '◀' }}</span>
      <span class="toggle-label">Allies</span>
    </button>

    <!-- Synergy panel toggle -->
    <button
      class="panel-toggle panel-toggle--syn"
      :class="{ 'panel-toggle--syn-collapsed': synCollapsed }"
      :aria-label="synCollapsed ? 'Expand synergies' : 'Collapse synergies'"
      :aria-expanded="!synCollapsed"
      @mouseenter="synCollapsed = !synCollapsed"
      @click.stop="synCollapsed = !synCollapsed"
    >
      <span class="toggle-chevron">{{ synCollapsed ? '◀' : '▶' }}</span>
      <span class="toggle-label">Synergies</span>
    </button>

    <!-- ══ TFT Synergy Panel (rechts) ══ -->
    <SynergiesPanelComponent
      :active-slot-index="activeSlotIndex"
      :collapsed="synCollapsed"
      @hovered-syn-change="hoveredSyn = $event"
    />

    <!-- Equipment bar toggle -->
    <button
      class="panel-toggle panel-toggle--equip"
      :class="{ 'panel-toggle--equip-collapsed': equipCollapsed }"
      :aria-label="equipCollapsed ? 'Expand equipment' : 'Collapse equipment'"
      :aria-expanded="!equipCollapsed"
      @mouseenter="equipCollapsed = !equipCollapsed"
      @click.stop="equipCollapsed = !equipCollapsed"
    >
      <span class="toggle-chevron">{{ equipCollapsed ? '▲' : '▼' }}</span>
      <span class="toggle-label">Equipment</span>
    </button>

    <!-- ══ EQUIP BAR ══ -->
    <EquipmentSlotBarComponent
      :equipment="currentEquipment"
      :collapsed="equipCollapsed"
      :role-color="roleColor"
      @open-item-picker="openItemPicker"
    />

    <!-- ══ INLINE PANELS ══ -->
    <Transition name="inline-panel">
      <div
        v-if="activePanel && panelMode === 'main'"
        :key="activePanel"
        class="inline-panel"
        @click.stop
      >
        <div v-if="activePanel === 'items'" class="inline-panel-tab-bar">
          <template v-if="activePanel === 'items'">
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
                class="modal-tab-img"
              />
              {{ cat.label }}
            </button>
          </template>
          <button class="modal-close-btn" @click="closeInlinePanel">✕</button>
        </div>

        <div class="inline-panel-content">
          <ChampionShopComponent
            v-if="activePanel === 'shop'"
            :initial-role="shopRole"
            :show-close="true"
            @role-change="handleShopRoleChange"
            @close="closeInlinePanel"
          />
          <ExpeditionComponent v-else-if="activePanel === 'expedition'" @close="closeInlinePanel" />
          <ItemShopComponent v-else-if="activePanel === 'items'" :category="itemShopCategory" />
        </div>
      </div>
    </Transition>

    <Transition name="champion-selector">
      <div v-if="panelMode === 'champion-picker'" class="champion-selector-panel" @click.stop>
        <button class="modal-close-btn" @click="closePanel">✕</button>

        <ChampionSelectPanel
          class="champion-selector-content"
          :active-role="activeRole"
          :selector-tab="selectorTab"
          :role-filtered-champions="roleFilteredChampions"
          :header-slots="headerSlots"
          :secondary-slots="secondarySlots"
          :active-slot-index="activeSlotIndex"
          :active-sub-slot="internalSubSlot"
          @select="handleSelect"
          @tab-change="onSelectorTabChange"
        />
      </div>
    </Transition>

    <Transition name="equipment-picker">
      <div
        v-if="panelMode === 'item-picker' && selectedCategory"
        class="equipment-picker-panel"
        @click.stop
      >
        <button class="modal-close-btn" @click="closePanel">✕</button>
        <EquipmentPickerPanel
          :initial-category="selectedCategory"
          :current-equipment="currentEquipment"
          @equip="handleEquipFromPicker"
          @close="closePanel"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ══ SPLASH ══ */
.splash-area {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: #080604;
  border-right: 1px solid rgba(92, 51, 16, 0.5);
}
.splash-inner {
  position: absolute;
  inset: 0;
}
.splash-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  transition:
    transform 0.12s ease-out,
    filter 0.25s ease;
  will-change: transform;
}
.splash-img--syn-glow {
  filter: brightness(1.3) saturate(1.2) drop-shadow(0 0 24px var(--hl-color, #e8c040));
}
.splash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
}
.splash-empty-plus {
  font-size: 48px;
  line-height: 1;
  color: rgba(200, 144, 64, 0.18);
  transition: color 0.15s;
}
.splash-area:hover .splash-empty-plus {
  color: rgba(200, 144, 64, 0.45);
}
.splash-empty-hint {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.28);
}
.splash-empty-role-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  opacity: 0.12;
  filter: grayscale(50%);
  pointer-events: none;
  transition:
    opacity 0.25s,
    filter 0.25s;
}
.splash-area:hover .splash-empty-role-img {
  opacity: 0.22;
  filter: grayscale(25%);
}

.vignette-edge {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.65) 100%);
  pointer-events: none;
  z-index: 2;
}
.vignette-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 55%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.92) 0%,
    rgba(0, 0, 0, 0.55) 35%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 3;
}
.vignette-right {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 30%;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
  pointer-events: none;
  z-index: 2;
}

/* ══ ACTION BAR ══ */
.splash-action-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 7;
  pointer-events: auto;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: rgba(6, 4, 1, 0.88);
  border-bottom: 1px solid rgba(122, 78, 32, 0.6);
  box-shadow:
    inset 0 -1px 0 rgba(92, 51, 16, 0.3),
    0 4px 20px rgba(0, 0, 0, 0.5);
  background-image: linear-gradient(
    to bottom,
    rgba(200, 144, 64, 0) calc(100% - 2px),
    rgba(200, 144, 64, 0.15) 100%
  );
}
.action-bar-btn {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 11px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(200, 144, 64, 0.55);
  position: relative;
  overflow: visible;
  transition:
    color 0.15s,
    background 0.15s;
}
.action-bar-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: rgba(200, 144, 64, 0);
  border-radius: 2px 2px 0 0;
  transition: background 0.2s;
}
.action-bar-btn:hover {
  color: #f0d870;
  background: rgba(200, 144, 64, 0.07);
}
.action-bar-btn:hover::after {
  background: rgba(200, 144, 64, 0.65);
}
.action-bar-btn:active {
  background: rgba(200, 144, 64, 0.12);
}
.action-bar-btn--featured {
  color: rgba(200, 144, 64, 0.8);
}
.action-bar-btn--featured .action-bar-icon {
  filter: drop-shadow(0 0 5px rgba(200, 144, 64, 0.5));
}
.action-bar-btn--featured:hover {
  background: rgba(200, 144, 64, 0.1);
}
.action-bar-btn--active {
  color: #f0d870;
  background: rgba(200, 144, 64, 0.1);
}
.action-bar-btn--active::after {
  background: rgba(200, 144, 64, 0.85);
}
.action-bar-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  line-height: 1;
  flex-shrink: 0;
  color: currentColor;
}
.action-bar-label {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
}
.action-bar-sep {
  width: 1px;
  margin: 8px 0;
  background: rgba(92, 51, 16, 0.55);
  flex-shrink: 0;
}

.modal-tab-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  image-rendering: auto;
  flex-shrink: 0;
  vertical-align: middle;
}

/* ══ INLINE PANEL ══ */
.splash-area {
  --action-bar-h: 40px;
}
.inline-panel {
  position: absolute;
  top: var(--action-bar-h);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  background: rgba(8, 6, 2, 0.93);
  border-top: 1px solid #c89040;
  overflow: hidden;
}

.inline-panel-tab-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.5);
  background: #1e1006;
  flex-shrink: 0;
}
.inline-panel-tab-bar > .modal-close-btn {
  position: static;
  margin-left: auto;
  flex-shrink: 0;
  transform: none;
}
.inline-panel-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.inline-panel-content::-webkit-scrollbar {
  width: 4px;
}
.inline-panel-content::-webkit-scrollbar-track {
  background: #111;
}
.inline-panel-content::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ══ INLINE PANEL TRANSITION ══ */
.inline-panel-enter-active {
  transition: clip-path 0.32s ease-out;
}
.inline-panel-leave-active {
  transition: clip-path 0.22s ease-in;
}
.inline-panel-enter-from,
.inline-panel-leave-to {
  clip-path: inset(0 0 100% 0);
}
.inline-panel-enter-to,
.inline-panel-leave-from {
  clip-path: inset(0 0 0% 0);
}

/* ══ MODAL SYSTEM ══ */
.modal-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #c89040;
  box-shadow:
    0 0 0 1px #5c3310,
    0 32px 80px rgba(0, 0, 0, 0.92);
  background: #111008;
  border-radius: var(--bp-radius);
  overflow: hidden;
}
.modal-panel--sm {
  width: min(360px, 90%);
  height: min(85%, 680px);
}
.modal-panel--md {
  width: min(460px, 90%);
  height: min(88%, 720px);
}
.modal-panel--lg {
  width: min(660px, 94%);
  height: min(90%, 750px);
}

.modal-tab-bar {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.5);
  background: #1e1006;
  flex-shrink: 0;
}
.modal-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  background: rgba(14, 10, 4, 0.85);
  border: 1px solid rgba(92, 51, 16, 0.4);
  border-radius: var(--bp-radius);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.modal-tab:hover {
  color: #e8c040;
  border-color: rgba(122, 78, 32, 0.8);
}
.modal-tab--active {
  color: #f0d870;
  background: rgba(30, 16, 6, 0.97);
  border-color: #c89040;
  box-shadow: inset 0 0 0 1px rgba(92, 51, 16, 0.5);
}
.modal-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 9px;
  font-weight: 900;
  border-radius: var(--bp-radius);
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #a0ffa0;
  margin-left: 5px;
  line-height: 16px;
  vertical-align: middle;
}
.modal-title-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #1e1006;
  border-bottom: 1px solid rgba(92, 51, 16, 0.5);
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
}
.modal-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-content--scroll {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  display: block;
}
.modal-content--scroll::-webkit-scrollbar {
  width: 4px;
}
.modal-content--scroll::-webkit-scrollbar-track {
  background: #111;
}
.modal-content--scroll::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ══ TRANSITIONS ══ */
.modal-pop-enter-active {
  transition: opacity 0.22s ease;
}
.modal-pop-leave-active {
  transition: opacity 0.18s ease;
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
}
.modal-pop-enter-active .modal-panel {
  transition: transform 0.22s ease;
}
.modal-pop-leave-active .modal-panel {
  transition: transform 0.18s ease;
}
.modal-pop-enter-from .modal-panel,
.modal-pop-leave-to .modal-panel {
  transform: scale(0.95) translateY(10px);
}
.syn-champs-fade-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.syn-champs-fade-leave-active {
  transition: opacity 0.15s ease;
}
.syn-champs-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.syn-champs-fade-leave-to {
  opacity: 0;
}

/* ══ PANEL TOGGLE BUTTONS ══ */
.panel-toggle {
  position: absolute;
  z-index: 8;
  width: auto;
  min-height: 36px;
  padding: 0 10px;
  gap: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: rgba(200, 144, 64, 0.7);
  background: rgba(6, 4, 1, 0.88);
  border: 1px solid rgba(122, 78, 32, 0.65);
  border-radius: 3px;
  cursor: pointer;
  pointer-events: auto;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s,
    left 0.3s ease,
    right 0.3s ease,
    bottom 0.3s ease;
}
.panel-toggle:hover {
  color: #f0d870;
  background: rgba(20, 12, 2, 0.95);
  border-color: rgba(200, 144, 64, 0.5);
}
.panel-toggle[aria-expanded='false'] {
  color: rgba(200, 144, 64, 0.5);
  border-color: rgba(92, 51, 16, 0.4);
}
.panel-toggle--sec {
  left: 116px;
  top: 50%;
  transform: translateY(-50%);
}
.panel-toggle--sec-collapsed {
  left: 4px;
}
.panel-toggle--syn {
  right: 200px;
  top: 50%;
  transform: translateY(-50%);
}
.panel-toggle--syn-collapsed {
  right: 4px;
}
.panel-toggle--equip {
  bottom: 150px;
  left: 50%;
  transform: translateX(-50%);
}
.panel-toggle--equip-collapsed {
  bottom: 4px;
}
.toggle-chevron {
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}
.toggle-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* ══ GLOBAL COLLAPSE-ALL ══ */
.panel-collapse-all {
  position: absolute;
  top: 44px;
  left: 8px;
  z-index: 9;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 4, 1, 0.88);
  border: 1px solid rgba(122, 78, 32, 0.75);
  border-radius: var(--bp-radius);
  color: rgba(200, 144, 64, 0.75);
  cursor: pointer;
  pointer-events: auto;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
}
.panel-collapse-all:hover {
  color: #f0d870;
  background: rgba(20, 12, 2, 0.95);
  border-color: rgba(200, 144, 64, 0.5);
}
.collapse-all-icon {
  font-size: 16px;
  line-height: 1;
  display: inline-block;
  transition: transform 0.25s ease;
}
.collapse-all-icon--open {
  transform: rotate(180deg);
}

/* ══ CHAMPION SELECTOR PANEL ══ */
.champion-selector-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  background: rgba(8, 6, 2, 0.97);
  border-top: 2px solid #c89040;
  overflow: hidden;
}
/* Align close button with ChampionSelectPanel's csp-tabs row center (padding:8px + btn~26px/2 ≈ 21px) */
.champion-selector-panel > .modal-close-btn {
  top: 21px;
  transform: translateY(-50%);
}

.champion-selector-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ══ CHAMPION SELECTOR TRANSITION (slide left → right) ══ */
.champion-selector-enter-active {
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.champion-selector-leave-active {
  transition: transform 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}
.champion-selector-enter-from,
.champion-selector-leave-to {
  transform: translateX(-100%);
}
.champion-selector-enter-to,
.champion-selector-leave-from {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .panel-toggle,
  .panel-collapse-all,
  .collapse-all-icon {
    transition: none !important;
  }
  .inline-panel-enter-active,
  .inline-panel-leave-active {
    transition: opacity 0.15s ease !important;
  }
  .inline-panel-enter-from,
  .inline-panel-leave-to {
    clip-path: none !important;
    opacity: 0;
  }
  .champion-selector-enter-active,
  .champion-selector-leave-active {
    transition: opacity 0.15s ease !important;
  }
  .champion-selector-enter-from,
  .champion-selector-leave-to {
    transform: none !important;
    opacity: 0;
  }
  .equipment-picker-enter-active,
  .equipment-picker-leave-active {
    transition: opacity 0.15s ease !important;
  }
  .equipment-picker-enter-from,
  .equipment-picker-leave-to {
    transform: none !important;
    opacity: 0;
  }
}

/* ══ EQUIPMENT PICKER PANEL ══ */
.equipment-picker-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* Align close button with EquipmentPickerPanel's ep-tabs row center (gold-bar:3px + ep-tab padding:13px + 18px/2 ≈ 25px) */
.equipment-picker-panel > .modal-close-btn {
  top: 25px;
  transform: translateY(-50%);
}

/* ══ EQUIPMENT PICKER TRANSITION (slide bottom → top) ══ */
.equipment-picker-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.equipment-picker-leave-active {
  transition: transform 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}
.equipment-picker-enter-from,
.equipment-picker-leave-to {
  transform: translateY(100%);
}
.equipment-picker-enter-to,
.equipment-picker-leave-from {
  transform: translateY(0);
}

</style>
