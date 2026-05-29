<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { getChampionRoles } from '@/config/championRoles'
import { ROLES as ROLE_DEFS, ROLE_BY_KEY } from '@/config/constants'
import { SHOP_ITEMS } from '@/config/items'
import type { ChampionRole, ItemCategory, RoleStat } from '@/types'
import ChampionSelectPanel from '../roles/ChampionSelectPanel.vue'
import ItemPickerPanel from '../roles/ItemPickerPanel.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'
import ExpeditionCreateComponent from './expedition/ExpeditionCreateComponent.vue'
import ExpeditionActiveComponent from './expedition/ExpeditionActiveComponent.vue'
import ItemShopComponent from './ItemShopComponent.vue'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { getChampionOrigin, getOriginColor } from '@/config/championOrigins'
import SynergiesPanelComponent from './SynergiesPanelComponent.vue'
import RoleSidebarComponent from './RoleSidebarComponent.vue'
import EquipmentSlotBarComponent from './EquipmentSlotBarComponent.vue'
import SecondaryChampionsPanelComponent from './SecondaryChampionsPanelComponent.vue'

const ROLES = ROLE_DEFS.map((r) => r.label)
const ROLE_MAP = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.key])) as Record<string, ChampionRole>
const ROLE_INDEX = Object.fromEntries(ROLE_DEFS.map((r, i) => [r.key, i])) as Partial<Record<ChampionRole, number>>
const ROLE_COLORS = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.color]))

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const expeditionStore = useExpeditionStore()

const doneExpeditionCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)

const { headerSlots, secondarySlots } = storeToRefs(battleStore)
const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))

const activeSlotIndex = ref(uiStore.rolesActiveSlot)
const activeSubSlot = ref(-1)
const selectedCategory = ref<ItemCategory | null>(null)
const panelMode = ref<'main' | 'champion-picker' | 'item-picker'>('main')

const showShop = ref(false)
const shopRole = ref<ChampionRole | 'all'>('all')
const showExpedition = ref(false)
const expeditionTab = ref<'create' | 'active'>('create')
const showItemShop = ref(false)
const itemShopCategory = ref<ItemCategory>('weapon')

const parallaxX = ref(0)
const parallaxY = ref(0)
const hoveredSyn = ref<{ involvedChampions: string[]; color: string } | null>(null)

const equipCollapsed = ref(true)
const synCollapsed   = ref(true)
const secCollapsed   = ref(true)

watch(
  () => uiStore.rolesActiveSlot,
  (val) => {
    activeSlotIndex.value = val
    selectedCategory.value = null
    panelMode.value = 'main'
  },
)

watch(
  () => uiStore.rolesOpenToken,
  () => {
    activeSlotIndex.value = uiStore.rolesActiveSlot
    activeSubSlot.value = uiStore.rolesActiveSubSlot
    selectedCategory.value = null
    panelMode.value = uiStore.rolesActiveSubSlot >= 0 ? 'champion-picker' : 'main'
  },
)

const activeRole = computed(() => ROLES[activeSlotIndex.value])
const currentEquipment = computed(() => itemStore.slotEquipment[activeSlotIndex.value])
const activeChampion = computed(() => headerSlots.value[activeSlotIndex.value])
const activeSecondaries = computed(
  () => secondarySlots.value[activeSlotIndex.value] ?? [null, null],
)

const pickerTitle = computed(() => {
  if (activeSubSlot.value === -1) return `${activeRole.value} — Main`
  return `${activeRole.value} — Secondary ${activeSubSlot.value + 1}`
})

function championRoleLabel(name: string): string | null {
  const mainIdx = headerSlots.value.indexOf(name)
  if (mainIdx >= 0) return ROLES[mainIdx]
  for (let r = 0; r < secondarySlots.value.length; r++) {
    if (secondarySlots.value[r].includes(name)) return ROLES[r]
  }
  return null
}

const categoryItems = computed(() => {
  if (!selectedCategory.value) return []
  const cat = selectedCategory.value
  return SHOP_ITEMS.filter((item) => {
    if (item.category !== cat) return false
    const equippedHere = currentEquipment.value[cat] === item.id
    return equippedHere || itemStore.availableCount(item.id) > 0
  })
})

const roleFilteredChampions = computed(() => {
  const internalRole = ROLE_MAP[activeRole.value]
  if (!internalRole) return availableChampions.value
  return availableChampions.value.filter((c) => getChampionRoles(c).includes(internalRole))
})

function closeActiveModal() {
  showShop.value = false
  showExpedition.value = false
  showItemShop.value = false
  if (panelMode.value !== 'main') {
    panelMode.value = 'main'
    selectedCategory.value = null
    activeSubSlot.value = -1
  }
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') closeActiveModal()
}

onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => window.removeEventListener('keydown', onEsc))

function openShop(role: ChampionRole | 'all' = 'all') {
  showExpedition.value = false
  showItemShop.value = false
  panelMode.value = 'main'
  shopRole.value = role
  showShop.value = true
}
function closeShop() {
  showShop.value = false
}

function openExpedition() {
  showShop.value = false
  showItemShop.value = false
  panelMode.value = 'main'
  expeditionTab.value = 'create'
  showExpedition.value = true
}
function closeExpedition() {
  showExpedition.value = false
}

function openItemShop() {
  showShop.value = false
  showExpedition.value = false
  panelMode.value = 'main'
  itemShopCategory.value = 'weapon'
  showItemShop.value = true
}
function closeItemShop() {
  showItemShop.value = false
}

function handleShopRoleChange(role: ChampionRole | 'all') {
  shopRole.value = role
  if (role !== 'all') {
    const idx = ROLE_INDEX[role]
    if (idx !== undefined) activeSlotIndex.value = idx
  }
}

function selectSlot(index: number) {
  closeActiveModal()
  activeSlotIndex.value = index
}

function openChampionPicker(subSlot: number = -1) {
  showShop.value = false
  showExpedition.value = false
  showItemShop.value = false
  activeSubSlot.value = subSlot
  panelMode.value = 'champion-picker'
}

function openItemPicker(cat: ItemCategory) {
  selectedCategory.value = cat
  panelMode.value = 'item-picker'
}

function closePanel() {
  panelMode.value = 'main'
  selectedCategory.value = null
  activeSubSlot.value = -1
}

function handleSelect(champion: string) {
  if (activeSubSlot.value === -1) {
    battleStore.setHeaderSlot(activeSlotIndex.value, champion)
  } else {
    battleStore.setSecondarySlot(activeSlotIndex.value, activeSubSlot.value, champion)
  }
  panelMode.value = 'main'
  activeSubSlot.value = -1
}

function clearSecondary(roleIndex: number, subIndex: number, event: Event) {
  event.stopPropagation()
  battleStore.clearSecondarySlot(roleIndex, subIndex)
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}

function handleEquip(itemId: string) {
  const cat = selectedCategory.value!
  if (currentEquipment.value[cat] === itemId) {
    itemStore.unequipItem(activeSlotIndex.value, cat)
  } else {
    itemStore.equipItem(activeSlotIndex.value, itemId)
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

const activeRoleStats = computed<RoleStat[]>(() => {
  const role = ROLE_MAP[activeRole.value]
  return role ? ((ROLE_BY_KEY[role]?.stats as RoleStat[]) ?? []) : []
})

function getRoleOrbitDescription(role: ChampionRole): string {
  return ROLE_BY_KEY[role]?.orbitDesc ?? ''
}

void championRoleLabel
</script>

<template>
  <div class="roles-tab">
    <div class="main-layout">
      <!-- ══ LEFT — Splash Art ══ -->
      <div
        class="splash-area"
        @mousemove="onSplashMouseMove"
        @mouseleave="onSplashMouseLeave"
        @click="
          !showShop &&
          !showExpedition &&
          !showItemShop &&
          panelMode === 'main' &&
          openChampionPicker(-1)
        "
      >
        <div class="splash-inner">
          <template v-if="activeChampion">
            <img
              :src="battleStore.getChampionImage(activeChampion)"
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
            <img
              :src="ROLE_BY_KEY[ROLE_MAP[activeRole]].image"
              :alt="activeRole"
              class="splash-empty-role-img"
            />
            <span class="splash-empty-plus">＋</span>
            <span class="splash-empty-hint">Select Champion</span>
          </div>
        </div>

        <!-- Vignettes -->
        <div class="vignette-edge" />
        <div class="vignette-bottom" />
        <div class="vignette-right" />

        <!-- ══ ACTION BAR — oben, volle Breite ══ -->
        <div class="splash-action-bar" :style="{ '--rc': ROLE_COLORS[activeRole] }" @click.stop>
          <button class="action-bar-btn" @click.stop="openShop('all')">
            <span class="action-bar-icon">⚔</span>
            <span class="action-bar-label">Shop</span>
          </button>
          <div class="action-bar-sep" />
          <button class="action-bar-btn action-bar-btn--featured" @click.stop="openExpedition">
            <span class="action-bar-icon">🗺</span>
            <span class="action-bar-label">Expedition</span>
          </button>
          <div class="action-bar-sep" />
          <button class="action-bar-btn" @click.stop="openItemShop">
            <span class="action-bar-icon">💼</span>
            <span class="action-bar-label">Items</span>
          </button>
        </div>

        <!-- ══ Top Info Box — Name + Stats (unverändert, nur Größen) ══ -->
        <div v-if="activeChampion" class="splash-info-box" @click.stop>
          <div class="splash-name-in-box">{{ activeChampion }}</div>
          <div
            v-if="getChampionOrigin(activeChampion)"
            class="splash-origin-badge"
            :style="{ '--oc': getOriginColor(activeChampion) }"
          >
            {{ getChampionOrigin(activeChampion) }}
          </div>
          <div class="splash-role-orbit-list">
            <div
              v-for="role in getChampionRoles(activeChampion).filter(r => r === ROLE_MAP[activeRole])"
              :key="role"
              class="orbit-ability-trigger"
            >
              <div class="orbit-role-row">
                <img
                  :src="ROLE_BY_KEY[role].image"
                  :alt="role"
                  class="orbit-role-img"
                  @error="onImgError"
                />
                <span class="orbit-role-desc">{{ ROLE_BY_KEY[role].abilityCompact }}</span>
              </div>
              <div class="orbit-ability-detail">
                <div
                  v-for="item in ROLE_BY_KEY[role].abilityDetails"
                  :key="item.name"
                  class="ability-detail-row"
                >
                  <span class="ability-detail-name">{{ item.name }}</span>
                  <span class="ability-detail-sep">–</span>
                  <span class="ability-detail-desc">{{ item.desc }}</span>
                  <span v-if="item.value" class="ability-detail-value">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="splash-role-fx-in-box">
            <div
              v-for="stat in activeRoleStats.filter(s => /\d/.test(s.value))"
              :key="stat.key"
              class="role-fx-row"
            >
              <span class="role-fx-label">{{ stat.label }}</span>
              <span class="role-fx-value">{{ stat.value }}</span>
            </div>
          </div>
        </div>

        <!-- ══ Secondary Panel (links) ══ -->
        <SecondaryChampionsPanelComponent
          :secondaries="activeSecondaries"
          :active-slot-index="activeSlotIndex"
          :collapsed="secCollapsed"
          :role-color="ROLE_COLORS[activeRole]"
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
        >{{ secCollapsed ? '▶' : '◀' }}</button>

        <!-- Synergy panel toggle -->
        <button
          class="panel-toggle panel-toggle--syn"
          :class="{ 'panel-toggle--syn-collapsed': synCollapsed }"
          :aria-label="synCollapsed ? 'Expand synergies' : 'Collapse synergies'"
          :aria-expanded="!synCollapsed"
          @mouseenter="synCollapsed = !synCollapsed"
        >{{ synCollapsed ? '◀' : '▶' }}</button>

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
        >{{ equipCollapsed ? '▲' : '▼' }}</button>

        <!-- ══ EQUIP BAR — zentriert unten ══ -->
        <EquipmentSlotBarComponent
          :equipment="currentEquipment"
          :collapsed="equipCollapsed"
          :role-color="ROLE_COLORS[activeRole]"
          @open-item-picker="openItemPicker"
        />

        <!-- ══ MODALS ══ -->
        <Transition name="modal-pop">
          <div v-if="showShop" class="modal-backdrop" @click.stop @click.self="closeShop">
            <div class="modal-panel modal-panel--md" @click.stop>
              <div class="modal-gold-line" />
              <button class="modal-close-btn" @click="closeShop">✕</button>
              <div class="modal-title-row">⚔️ Recruit Champions</div>
              <div class="modal-content">
                <ChampionShopComponent
                  :initial-role="shopRole"
                  @role-change="handleShopRoleChange"
                />
              </div>
            </div>
          </div>
        </Transition>

        <Transition name="modal-pop">
          <div
            v-if="showExpedition"
            class="modal-backdrop"
            @click.stop
            @click.self="closeExpedition"
          >
            <div class="modal-panel modal-panel--md" @click.stop>
              <div class="modal-gold-line" />
              <button class="modal-close-btn" @click="closeExpedition">✕</button>
              <div class="modal-tab-bar">
                <button
                  class="modal-tab"
                  :class="{ 'modal-tab--active': expeditionTab === 'create' }"
                  @click="expeditionTab = 'create'"
                >
                  🗺 Start
                </button>
                <button
                  class="modal-tab"
                  :class="{ 'modal-tab--active': expeditionTab === 'active' }"
                  @click="expeditionTab = 'active'"
                >
                  ⚡ Aktiv
                  <span v-if="doneExpeditionCount > 0" class="modal-tab-badge">{{ doneExpeditionCount }}</span>
                </button>
              </div>
              <div class="modal-content modal-content--scroll">
                <ExpeditionCreateComponent v-if="expeditionTab === 'create'" />
                <ExpeditionActiveComponent v-else />
              </div>
            </div>
          </div>
        </Transition>

        <Transition name="modal-pop">
          <div v-if="showItemShop" class="modal-backdrop" @click.stop @click.self="closeItemShop">
            <div class="modal-panel modal-panel--md" @click.stop>
              <div class="modal-gold-line" />
              <button class="modal-close-btn" @click="closeItemShop">✕</button>
              <div class="modal-tab-bar">
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
                  <img :src="`/img/itemShop/${cat.id}.png`" :alt="cat.label" width="18" height="18" loading="eager" class="modal-tab-img" />
                  {{ cat.label }}
                </button>
              </div>
              <div class="modal-content modal-content--scroll">
                <ItemShopComponent :category="itemShopCategory" />
              </div>
            </div>
          </div>
        </Transition>

        <Transition name="modal-pop">
          <div
            v-if="panelMode === 'champion-picker'"
            class="modal-backdrop"
            @click.stop
            @click.self="closePanel"
          >
            <div class="modal-panel modal-panel--lg" @click.stop>
              <div class="modal-gold-line" />
              <button class="modal-close-btn" @click="closePanel">✕</button>
              <ChampionSelectPanel
                class="modal-content"
                :active-role="activeRole"
                :picker-title="pickerTitle"
                :role-filtered-champions="roleFilteredChampions"
                :header-slots="headerSlots"
                :secondary-slots="secondarySlots"
                :active-slot-index="activeSlotIndex"
                :active-sub-slot="activeSubSlot"
                @select="handleSelect"
              />
            </div>
          </div>
        </Transition>

        <Transition name="modal-pop">
          <div
            v-if="panelMode === 'item-picker' && selectedCategory"
            class="modal-backdrop"
            @click.stop
            @click.self="closePanel"
          >
            <div class="modal-panel modal-panel--sm" @click.stop>
              <div class="modal-gold-line" />
              <button class="modal-close-btn" @click="closePanel">✕</button>
              <ItemPickerPanel
                class="modal-content"
                :selected-category="selectedCategory"
                :category-items="categoryItems"
                :current-equipment="currentEquipment"
                @equip="handleEquip"
              />
            </div>
          </div>
        </Transition>
      </div>

      <!-- ══ RIGHT — Sidebar ══ -->
      <RoleSidebarComponent
        :active-slot-index="activeSlotIndex"
        @select-slot="selectSlot"
      />
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════
   BARDLE — ROLES TAB
   ══════════════════════════════════════════ */
.roles-tab {
  --gold: #c89040;
  --gold-bright: #e8c060;
  --gold-dim: rgba(200, 144, 64, 0.32);
  --gold-glow: rgba(200, 144, 64, 0.2);
  --bg: #0d0a03;
  --bg-card: #181208;
  --border: rgba(92, 51, 16, 0.45);
  --r: 5px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  overflow: hidden;
}
.main-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: 0;
}

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

/* ══════════════════════════════════════
   ACTION BAR — oben, volle Breite
   ══════════════════════════════════════ */
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
  /* goldene untere Linie */
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

/* Expedition als leicht hervorgehobener Haupt-Button */
.action-bar-btn--featured {
  color: rgba(200, 144, 64, 0.8);
}
.action-bar-btn--featured .action-bar-icon {
  filter: drop-shadow(0 0 5px rgba(200, 144, 64, 0.5));
}
.action-bar-btn--featured:hover {
  background: rgba(200, 144, 64, 0.1);
}

.action-bar-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
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

/* ══════════════════════════════
   TOP INFO BOX (Name + Stats)
   Struktur unverändert, nur Größen
   ══════════════════════════════ */
.splash-info-box {
  position: absolute;
  /* Sitzt direkt unter der Action Bar */
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 7;
  background: rgba(8, 5, 2, 0.88);
  border: 1px solid rgba(122, 78, 32, 0.75);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 10px 24px 13px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}
.splash-name-in-box {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #f0d870;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    0 2px 14px rgba(0, 0, 0, 0.95),
    0 0 32px rgba(200, 144, 64, 0.45);
}
.splash-role-orbit-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.4);
}
.orbit-role-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.orbit-role-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  opacity: 0.85;
  flex-shrink: 0;
}
.orbit-role-desc {
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.75);
  letter-spacing: 0.04em;
}
.splash-role-fx-in-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 230px;
}
.role-fx-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.role-fx-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  flex: 1;
}
.role-fx-value {
  font-size: 14px;
  font-weight: 900;
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
  letter-spacing: 0.03em;
  text-align: right;
  white-space: nowrap;
}

.modal-tab-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  image-rendering: auto;
  flex-shrink: 0;
  vertical-align: middle;
}

/* ══════════════════════════════
   MODAL SYSTEM
   ══════════════════════════════ */
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
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 32px 80px rgba(0, 0, 0, 0.92);
  background: #111008;
  border-radius: 4px;
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
.modal-gold-line {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}
.modal-close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(200, 144, 64, 0.55);
  background: rgba(14, 10, 4, 0.92);
  border: 1px solid rgba(92, 51, 16, 0.65);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.modal-close-btn:hover {
  color: #e8c040;
  border-color: #c89040;
  background: rgba(30, 16, 6, 0.97);
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  padding: 12px;
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

/* ══════════════════════════════
   TRANSITIONS
   ══════════════════════════════ */
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

/* ══════════════════════════════
   ROLE ABILITY — Compact + Hover Detail
   ══════════════════════════════ */
.orbit-ability-trigger {
  position: relative;
  border-radius: 4px;
  padding: 2px 0;
  transition: background 0.15s;
  cursor: default;
}
.orbit-ability-trigger:hover {
  background: rgba(200, 144, 64, 0.06);
}

.orbit-ability-detail {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  padding: 0 4px;
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
}
.orbit-ability-trigger:hover .orbit-ability-detail {
  max-height: 400px;
  opacity: 1;
}

.ability-detail-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(92, 51, 16, 0.2);
}
.ability-detail-row:last-child {
  border-bottom: none;
}
.ability-detail-name {
  font-size: 10px;
  font-weight: 800;
  color: rgba(232, 192, 64, 0.9);
  white-space: nowrap;
  min-width: 72px;
  flex-shrink: 0;
}
.ability-detail-sep {
  font-size: 10px;
  color: rgba(200, 144, 64, 0.3);
  flex-shrink: 0;
}
.ability-detail-desc {
  font-size: 10px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.6);
  flex: 1;
  line-height: 1.4;
}
.ability-detail-value {
  font-size: 11px;
  font-weight: 900;
  color: #e8c040;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.45);
}

/* ══════════════════════════════
   ORIGIN — Splash info badge
   ══════════════════════════════ */
.splash-origin-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--oc, #e8c040);
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid var(--oc, #5c3310);
  border-radius: 3px;
  padding: 1px 7px;
  margin-top: 3px;
  margin-bottom: 2px;
  pointer-events: none;
}

/* ══════════════════════════════
   PANEL TOGGLE BUTTONS
   ══════════════════════════════ */
.panel-toggle {
  position: absolute;
  z-index: 8;
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  line-height: 1;
  color: rgba(200, 144, 64, 0.7);
  background: rgba(6, 4, 1, 0.88);
  border: 1px solid rgba(122, 78, 32, 0.65);
  border-radius: 3px;
  cursor: pointer;
  pointer-events: auto;
  transition: color 0.15s, background 0.15s, border-color 0.15s, left 0.3s ease, right 0.3s ease, bottom 0.3s ease;
}
.panel-toggle:hover {
  color: #f0d870;
  background: rgba(20, 12, 2, 0.95);
  border-color: rgba(200, 144, 64, 0.5);
}
.panel-toggle[aria-expanded="false"] {
  color: rgba(200, 144, 64, 0.5);
  border-color: rgba(92, 51, 16, 0.4);
}

/* Secondary panel toggle — right edge of sec panel, vertically centered */
.panel-toggle--sec {
  left: 116px; /* 12px offset + 100px panel + 4px gap */
  top: 50%;
  transform: translateY(-50%);
}
.panel-toggle--sec-collapsed {
  left: 4px;
}

/* Synergy panel toggle — left edge of syn panel (186px wide, 12px from right) */
.panel-toggle--syn {
  right: 200px; /* 12px offset + 186px panel + 2px gap */
  top: 50%;
  transform: translateY(-50%);
}
.panel-toggle--syn-collapsed {
  right: 4px;
}

/* Equipment bar toggle — centered above the equip bar */
.panel-toggle--equip {
  bottom: 150px; /* bar top edge ~143px (16px offset + ~127px height) + 7px gap */
  left: 50%;
  transform: translateX(-50%);
}
.panel-toggle--equip-collapsed {
  bottom: 4px;
}



</style>
