<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { getChampionRoles } from '@/config/championRoles'
import { ROLES as ROLE_DEFS, ROLE_BY_KEY } from '@/config/constants'
import { SHOP_ITEMS } from '@/config/items'
import type { ChampionRole, ItemCategory, ShopItem, ActiveSynergy, RoleStat } from '@/types'
import ChampionSelectPanel from '../roles/ChampionSelectPanel.vue'
import ItemPickerPanel from '../roles/ItemPickerPanel.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'
import ExpeditionCreateComponent from './expedition/ExpeditionCreateComponent.vue'
import ExpeditionActiveComponent from './expedition/ExpeditionActiveComponent.vue'
import ItemShopComponent from './ItemShopComponent.vue'
import { useSynergyStore } from '@/stores/synergyStore'
import { useExpeditionStore } from '@/stores/expedetionStore'

const ROLES = ROLE_DEFS.map((r) => r.label)
const ROLE_MAP = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.key])) as Record<string, ChampionRole>
const ROLE_INDEX = Object.fromEntries(ROLE_DEFS.map((r, i) => [r.key, i])) as Partial<Record<ChampionRole, number>>
const ROLE_COLORS = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.color]))

const CAT_LABELS: Record<ItemCategory, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  misc: 'Misc',
}

const CAT_ICONS: Record<ItemCategory, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  misc: '✨',
}

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const expeditionStore = useExpeditionStore()

const doneExpeditionCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)

const { headerSlots, secondarySlots } = storeToRefs(battleStore)
const synergyStore = useSynergyStore()
const { globalSynergies, activeSynergies } = storeToRefs(synergyStore)

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
const hoveredSynId = ref<string | null>(null)

const hoveredSyn = computed(
  () => activeSynergies.value.find((s) => s.id === hoveredSynId.value) ?? null,
)

const sortedRoleSynergies = computed<ActiveSynergy[]>(() => {
  const globals = activeSynergies.value.filter((s) => s.roleIndex === undefined)
  const roleSpecific = activeSynergies.value.filter((s) => s.roleIndex === activeSlotIndex.value)
  return [...globals, ...roleSpecific]
})

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

function getEquippedItem(cat: ItemCategory): ShopItem | null {
  const id = currentEquipment.value[cat]
  if (!id) return null
  return SHOP_ITEMS.find((i) => i.id === id) ?? null
}

function formatEffect(syn: ActiveSynergy): string {
  return syn.effects
    .map((e) => {
      const pct = Math.round((e.multiplier - 1) * 100)
      const label = e.type === 'cps' ? 'CPS' : e.type === 'power' ? 'Power' : 'DPS'
      return `${label} +${pct}%`
    })
    .join(' · ')
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
void globalSynergies
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
          <div class="splash-role-orbit-list">
            <div
              v-for="role in getChampionRoles(activeChampion)"
              :key="role"
              class="orbit-role-row"
            >
              <img
                :src="ROLE_BY_KEY[role].image"
                :alt="role"
                class="orbit-role-img"
                @error="onImgError"
              />
              <span class="orbit-role-desc">{{ getRoleOrbitDescription(role) }}</span>
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
        <div class="splash-sec-panel" :style="{ '--rc': ROLE_COLORS[activeRole] }" @click.stop>
          <div class="sec-panel-label">Allies</div>
          <button
            v-for="(slotIdx, i) in [0, 1]"
            :key="i"
            class="sec-slot"
            :class="{
              'sec-slot--filled': !!activeSecondaries[slotIdx],
              'sec-slot--syn-glow': isHighlighted(activeSecondaries[slotIdx]),
            }"
            :style="highlightStyle(activeSecondaries[slotIdx])"
            @click.stop="openChampionPicker(slotIdx)"
          >
            <span class="sec-slot-num">{{ i + 1 }}</span>
            <template v-if="activeSecondaries[slotIdx]">
              <div class="sec-slot-portrait">
                <img
                  :src="battleStore.getChampionImage(activeSecondaries[slotIdx]!)"
                  :alt="activeSecondaries[slotIdx]!"
                  class="sec-slot-img"
                  @error="onImgError"
                />
                <div class="sec-slot-img-overlay" />
              </div>
              <div class="sec-slot-footer">
                <span class="sec-slot-name">{{ activeSecondaries[slotIdx] }}</span>
              </div>
              <button
                class="sec-slot-remove"
                title="Remove"
                @click.stop="clearSecondary(activeSlotIndex, slotIdx, $event)"
              >
                ✕
              </button>
            </template>
            <template v-else>
              <div class="sec-slot-empty-body">
                <span class="sec-slot-empty-icon">＋</span>
                <span class="sec-slot-empty-hint">Add Ally</span>
              </div>
            </template>
          </button>
        </div>

        <!-- ══ Synergy Panel (rechts) ══ -->
        <div class="splash-syn-panel" @click.stop>
          <div class="syn-panel-label">Synergies</div>
          <div
            v-for="syn in sortedRoleSynergies"
            :key="syn.id"
            class="splash-syn-entry"
            :class="{ 'splash-syn-entry--global': syn.roleIndex === undefined }"
            :style="syn.roleIndex !== undefined ? { '--sc': syn.color } : {}"
            @mouseenter="hoveredSynId = syn.id"
            @mouseleave="hoveredSynId = null"
          >
            <div class="syn-entry-icon-wrap">
              <span class="splash-syn-entry-icon">{{ syn.icon }}</span>
            </div>
            <div class="splash-syn-entry-info">
              <div class="syn-entry-header">
                <span class="splash-syn-entry-name">{{ syn.name }}</span>
                <span v-if="syn.roleIndex === undefined" class="splash-syn-global-badge">✦</span>
              </div>
              <span class="splash-syn-entry-fx">{{ formatEffect(syn) }}</span>
              <Transition name="syn-champs-fade">
                <div
                  v-if="hoveredSynId === syn.id && syn.involvedChampions.length"
                  class="splash-syn-entry-champs"
                >
                  <div
                    v-for="champ in syn.involvedChampions"
                    :key="champ"
                    class="syn-champ-wrap"
                    :title="champ"
                  >
                    <img
                      :src="battleStore.getChampionImage(champ)"
                      :alt="champ"
                      class="splash-syn-champ-avatar"
                      @error="onImgError"
                    />
                    <span class="syn-champ-name">{{ champ }}</span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <div v-if="sortedRoleSynergies.length === 0" class="syn-empty">
            <span class="syn-empty-icon">🔗</span>
            <span class="syn-empty-hint">No active synergies</span>
          </div>
        </div>

        <!-- ══ EQUIP BAR — zentriert unten ══ -->
        <div class="splash-equip-bar" :style="{ '--rc': ROLE_COLORS[activeRole] }" @click.stop>
          <button
            v-for="cat in ['weapon', 'armor', 'misc'] as ItemCategory[]"
            :key="cat"
            class="hud-equip-btn"
            :class="{ 'hud-equip-btn--filled': currentEquipment[cat] !== null }"
            :title="getEquippedItem(cat)?.name ?? CAT_LABELS[cat]"
            @click.stop="openItemPicker(cat)"
          >
            <div class="hud-equip-art">
              <template v-if="getEquippedItem(cat)">
                <img
                  v-if="getEquippedItem(cat)!.icon.startsWith('/')"
                  :src="getEquippedItem(cat)!.icon"
                  class="hud-equip-img"
                  :alt="getEquippedItem(cat)!.name"
                />
                <span v-else class="hud-equip-emoji">{{ getEquippedItem(cat)!.icon }}</span>
              </template>
              <span v-else class="hud-equip-empty-icon">{{ CAT_ICONS[cat] }}</span>
            </div>
            <div class="hud-equip-meta">
              <span class="hud-equip-name">{{ getEquippedItem(cat)?.name ?? '— empty —' }}</span>
              <span class="hud-equip-cat">{{ CAT_LABELS[cat] }}</span>
            </div>
            <div v-if="currentEquipment[cat]" class="hud-equip-filled-dot" />
          </button>
        </div>

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
                    { id: 'weapon', icon: '⚔️', label: 'Weapon' },
                    { id: 'armor', icon: '🛡️', label: 'Armor' },
                    { id: 'misc', icon: '✨', label: 'Misc' },
                  ]"
                  :key="cat.id"
                  class="modal-tab"
                  :class="{ 'modal-tab--active': itemShopCategory === cat.id }"
                  @click="itemShopCategory = cat.id as ItemCategory"
                >
                  {{ cat.icon }} {{ cat.label }}
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
                @back="closePanel"
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
                @back="closePanel"
                @equip="handleEquip"
              />
            </div>
          </div>
        </Transition>
      </div>

      <!-- ══ RIGHT — Sidebar ══ -->
      <div class="sidebar">
        <div class="sidebar-section sidebar-section--roles">
          <div class="role-list">
            <button
              v-for="(role, i) in ROLES"
              :key="i"
              class="role-btn"
              :class="{
                'role-btn--active': activeSlotIndex === i,
                'role-btn--filled': headerSlots[i] !== null,
              }"
              :style="{ '--rc': ROLE_COLORS[role] }"
              @click="selectSlot(i)"
            >
              <img
                v-if="headerSlots[i]"
                :src="battleStore.getChampionImage(headerSlots[i]!)"
                :alt="headerSlots[i]!"
                class="role-btn-img"
                @error="onImgError"
              />
              <img
                v-else
                :src="ROLE_BY_KEY[ROLE_MAP[role]].image"
                :alt="role"
                class="role-btn-img role-btn-img--placeholder"
                @error="onImgError"
              />
              <div class="role-btn-gradient" />
              <span class="role-btn-label">{{ role }}</span>
              <div class="role-btn-secs">
                <div
                  v-for="s in [0, 1]"
                  :key="s"
                  class="role-btn-sec"
                  :class="{ 'role-btn-sec--filled': secondarySlots[i][s] !== null }"
                >
                  <img
                    v-if="secondarySlots[i][s]"
                    :src="battleStore.getChampionImage(secondarySlots[i][s]!)"
                    :alt="secondarySlots[i][s]!"
                    class="role-btn-sec-img"
                    @error="onImgError"
                  />
                  <span v-else class="role-btn-sec-plus">＋</span>
                </div>
              </div>
              <div v-if="activeSlotIndex === i" class="role-btn-active-bar" />
            </button>
          </div>
        </div>
      </div>
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

/* ══════════════════════════════
   SECONDARY PANEL — etwas größer
   ══════════════════════════════ */
.splash-sec-panel {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  pointer-events: auto;
  width: 100px;
}
.sec-panel-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--rc, #c89040) 70%, transparent);
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--rc, #c89040) 22%, transparent);
}
.sec-slot {
  position: relative;
  width: 100px;
  height: 128px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--rc, #c89040) 30%, transparent);
  background: rgba(6, 4, 1, 0.82);
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s ease;
}
.sec-slot:hover {
  border-color: color-mix(in srgb, var(--rc, #c89040) 80%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc, #c89040) 25%, transparent),
    0 8px 24px rgba(0, 0, 0, 0.6);
  transform: translateY(-3px) scale(1.02);
}
.sec-slot:active {
  transform: translateY(-1px) scale(1.01);
}
.sec-slot--filled {
  border-color: color-mix(in srgb, var(--rc, #c89040) 55%, transparent);
}
.sec-slot--filled:hover {
  border-color: var(--rc, #c89040);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc, #c89040) 35%, transparent),
    0 0 20px color-mix(in srgb, var(--rc, #c89040) 30%, transparent),
    0 10px 28px rgba(0, 0, 0, 0.7);
}
.sec-slot--syn-glow {
  border-color: var(--hl-color, var(--rc)) !important;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--hl-color, #e8c040) 40%, transparent),
    0 0 28px color-mix(in srgb, var(--hl-color, #e8c040) 55%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--hl-color, #e8c040) 15%, transparent) !important;
  filter: brightness(1.25) saturate(1.15);
}
.sec-slot-num {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 4;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 900;
  line-height: 18px;
  text-align: center;
  color: var(--rc, #c89040);
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid color-mix(in srgb, var(--rc, #c89040) 45%, transparent);
  border-radius: 3px;
  pointer-events: none;
}
.sec-slot-portrait {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.sec-slot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  transition: transform 0.25s ease;
}
.sec-slot:hover .sec-slot-img {
  transform: scale(1.07);
}
.sec-slot-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 45%,
    rgba(0, 0, 0, 0.55) 75%,
    rgba(0, 0, 0, 0.85) 100%
  );
  pointer-events: none;
}
.sec-slot-footer {
  flex-shrink: 0;
  padding: 5px 7px;
  background: rgba(0, 0, 0, 0.78);
  border-top: 1px solid color-mix(in srgb, var(--rc, #c89040) 20%, transparent);
}
.sec-slot-name {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--rc, #c89040);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
.sec-slot-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 5;
  width: 18px;
  height: 18px;
  font-size: 9px;
  line-height: 1;
  color: rgba(220, 80, 60, 0.9);
  background: rgba(10, 5, 2, 0.9);
  border: 1px solid rgba(180, 50, 30, 0.5);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  cursor: pointer;
  padding: 0;
  transition:
    opacity 0.15s,
    background 0.15s,
    border-color 0.15s,
    transform 0.12s;
}
.sec-slot:hover .sec-slot-remove {
  opacity: 1;
}
.sec-slot-remove:hover {
  background: rgba(160, 30, 15, 0.88);
  border-color: rgba(220, 70, 50, 0.9);
  transform: scale(1.1);
}
.sec-slot-empty-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.sec-slot-empty-icon {
  font-size: 26px;
  line-height: 1;
  color: color-mix(in srgb, var(--rc, #c89040) 22%, transparent);
  transition:
    color 0.2s,
    transform 0.2s;
}
.sec-slot:hover .sec-slot-empty-icon {
  color: color-mix(in srgb, var(--rc, #c89040) 60%, transparent);
  transform: scale(1.15);
}
.sec-slot-empty-hint {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--rc, #c89040) 28%, transparent);
  transition: color 0.2s;
}
.sec-slot:hover .sec-slot-empty-hint {
  color: color-mix(in srgb, var(--rc, #c89040) 55%, transparent);
}

/* ══════════════════════════════
   SYNERGY PANEL — größerer Text
   ══════════════════════════════ */
.splash-syn-panel {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  pointer-events: auto;
  width: 182px;
  max-height: 75%;
  overflow-y: auto;
}
.splash-syn-panel::-webkit-scrollbar {
  width: 3px;
}
.splash-syn-panel::-webkit-scrollbar-track {
  background: transparent;
}
.splash-syn-panel::-webkit-scrollbar-thumb {
  background: rgba(92, 51, 16, 0.6);
  border-radius: 2px;
}
.syn-panel-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(232, 192, 64, 0.55);
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.45);
  flex-shrink: 0;
}
.splash-syn-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(8, 5, 2, 0.82);
  border: 1px solid color-mix(in srgb, var(--sc, #e8c040) 28%, transparent);
  border-radius: 6px;
  padding: 8px 10px;
  cursor: default;
  position: relative;
  overflow: hidden;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
}
.splash-syn-entry::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: color-mix(in srgb, var(--sc, #e8c040) 70%, transparent);
  border-radius: 6px 0 0 6px;
}
.splash-syn-entry:hover {
  border-color: color-mix(in srgb, var(--sc, #e8c040) 70%, transparent);
  background: rgba(12, 8, 2, 0.92);
  box-shadow:
    0 0 12px color-mix(in srgb, var(--sc, #e8c040) 22%, transparent),
    inset 0 0 20px color-mix(in srgb, var(--sc, #e8c040) 6%, transparent);
}
.splash-syn-entry--global {
  background: rgba(92, 51, 16, 0.55);
  border: 1px solid rgba(232, 192, 64, 0.45);
}
.splash-syn-entry--global::before {
  background: linear-gradient(to bottom, #e8c040, #c89040);
}
.splash-syn-entry--global:hover {
  border-color: rgba(232, 192, 64, 0.85);
  background: rgba(110, 62, 18, 0.7);
}
.splash-syn-entry--global .splash-syn-entry-name {
  color: #f0d870;
}
.syn-entry-icon-wrap {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--sc, #e8c040) 10%, rgba(0, 0, 0, 0.5));
  border: 1px solid color-mix(in srgb, var(--sc, #e8c040) 25%, transparent);
  border-radius: 5px;
}
.splash-syn-entry--global .syn-entry-icon-wrap {
  background: rgba(200, 144, 64, 0.15);
  border-color: rgba(232, 192, 64, 0.35);
}
.splash-syn-entry-icon {
  font-size: 16px;
  line-height: 1;
}
.splash-syn-entry-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.syn-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.splash-syn-entry-name {
  font-size: 11px;
  font-weight: 800;
  color: var(--sc, #e8c040);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.splash-syn-global-badge {
  font-size: 10px;
  color: #e8c040;
  opacity: 0.8;
  flex-shrink: 0;
  line-height: 1;
}
.splash-syn-entry-fx {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--sc, #e8c040) 65%, rgba(255, 255, 255, 0.3));
  white-space: nowrap;
  letter-spacing: 0.02em;
}
.splash-syn-entry--global .splash-syn-entry-fx {
  color: rgba(232, 192, 64, 0.75);
}
.splash-syn-entry-champs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.syn-champ-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.splash-syn-champ-avatar {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  object-fit: cover;
  object-position: top center;
  border: 1px solid color-mix(in srgb, var(--sc, #e8c040) 55%, transparent);
  background: rgba(8, 5, 2, 0.9);
  flex-shrink: 0;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.splash-syn-champ-avatar:hover {
  transform: scale(1.12);
  box-shadow: 0 0 8px color-mix(in srgb, var(--sc, #e8c040) 60%, transparent);
}
.syn-champ-name {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--sc, #e8c040) 60%, transparent);
  white-space: nowrap;
  max-width: 34px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.syn-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 8px;
}
.syn-empty-icon {
  font-size: 22px;
  opacity: 0.25;
}
.syn-empty-hint {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.25);
  text-align: center;
}

/* ══════════════════════════════════════════
   EQUIP BAR — zentriert unten, alles größer
   ══════════════════════════════════════════ */
.splash-equip-bar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 7;
  pointer-events: auto;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: rgba(6, 4, 1, 0.92);
  border: 1px solid rgba(122, 78, 32, 0.8);
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(92, 51, 16, 0.4),
    0 10px 36px rgba(0, 0, 0, 0.85),
    inset 0 1px 0 rgba(200, 144, 64, 0.15);
  background-image: linear-gradient(
    to bottom,
    rgba(200, 144, 64, 0.15) 0px,
    rgba(200, 144, 64, 0) 3px
  );
}

.hud-equip-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 14px 22px 12px;
  background: transparent;
  border: none;
  border-right: 1px solid rgba(92, 51, 16, 0.5);
  cursor: pointer;
  min-width: 118px;
  transition:
    background 0.15s,
    box-shadow 0.15s;
  overflow: hidden;
}
.hud-equip-btn:last-child {
  border-right: none;
}
.hud-equip-btn:hover {
  background: rgba(200, 144, 64, 0.07);
  box-shadow: inset 0 1px 0 rgba(200, 144, 64, 0.22);
}
.hud-equip-btn--filled:hover {
  background: rgba(200, 144, 64, 0.1);
  box-shadow: inset 0 1px 0 rgba(200, 144, 64, 0.38);
}

/* Item-Art-Feld — deutlich größer */
.hud-equip-art {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 7px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  flex-shrink: 0;
}
.hud-equip-btn--filled .hud-equip-art {
  border-color: rgba(200, 144, 64, 0.45);
  box-shadow: inset 0 0 18px rgba(200, 144, 64, 0.09);
}
.hud-equip-btn:hover .hud-equip-art {
  border-color: rgba(200, 144, 64, 0.8);
  box-shadow:
    0 0 22px rgba(200, 144, 64, 0.25),
    inset 0 0 14px rgba(200, 144, 64, 0.12);
}

.hud-equip-img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 0 7px rgba(200, 144, 64, 0.5));
  transition:
    filter 0.15s,
    transform 0.15s;
}
.hud-equip-btn:hover .hud-equip-img {
  filter: drop-shadow(0 0 20px rgba(200, 144, 64, 0.95));
  transform: scale(1.07);
}
.hud-equip-emoji {
  font-size: 42px;
  line-height: 1;
  filter: drop-shadow(0 0 6px rgba(200, 144, 64, 0.45));
  transition:
    filter 0.15s,
    transform 0.15s;
}
.hud-equip-btn:hover .hud-equip-emoji {
  filter: drop-shadow(0 0 16px rgba(200, 144, 64, 0.9));
  transform: scale(1.09);
}
.hud-equip-empty-icon {
  font-size: 38px;
  line-height: 1;
  opacity: 0.2;
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.hud-equip-btn:hover .hud-equip-empty-icon {
  opacity: 0.5;
  transform: scale(1.07);
}

/* Item-Name + Kategorie */
.hud-equip-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
}
.hud-equip-name {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: rgba(200, 144, 64, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  max-width: 100px;
  text-align: center;
  transition: color 0.15s;
}
.hud-equip-btn--filled .hud-equip-name {
  color: rgba(232, 192, 64, 0.92);
}
.hud-equip-btn:hover .hud-equip-name {
  color: #f0d870;
}
.hud-equip-cat {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.3);
  line-height: 1;
  transition: color 0.15s;
}
.hud-equip-btn:hover .hud-equip-cat {
  color: rgba(200, 144, 64, 0.6);
}

.hud-equip-filled-dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e8c040;
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.9);
}

/* ══════════════════════════════
   SIDEBAR
   ══════════════════════════════ */
.sidebar {
  display: flex;
  flex-direction: column;
  background: #0e0b05;
  overflow: hidden;
}
.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 8px 6px;
}
.sidebar-section--roles {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.role-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.role-btn {
  position: relative;
  padding: 0;
  border-radius: var(--r);
  overflow: hidden;
  cursor: pointer;
  background: #0a0804;
  border: 1px solid rgba(92, 51, 16, 0.35);
  flex: 1;
  min-height: 0;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.role-btn:hover {
  border-color: var(--rc);
  box-shadow: 0 0 10px color-mix(in srgb, var(--rc) 30%, transparent);
}
.role-btn--active {
  border-color: var(--rc) !important;
  box-shadow: 0 0 14px color-mix(in srgb, var(--rc) 45%, transparent) !important;
}
.role-btn-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  transition: transform 0.25s ease;
}
.role-btn:hover .role-btn-img {
  transform: scale(1.07);
}
.role-btn-img--placeholder {
  opacity: 0.18;
  filter: grayscale(55%);
}
.role-btn:hover .role-btn-img--placeholder {
  opacity: 0.38;
  filter: grayscale(30%);
}
.role-btn-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 65%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.92) 0%,
    rgba(0, 0, 0, 0.5) 45%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 1;
}
.role-btn-label {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rc);
  line-height: 1;
  z-index: 2;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--rc) 70%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.95);
  pointer-events: none;
}
.role-btn-active-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--rc);
  box-shadow: 0 0 8px var(--rc);
  z-index: 3;
}
.role-btn-secs {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}
.role-btn-sec {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--rc) 55%, transparent);
  background: rgba(10, 8, 4, 0.85);
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}
.role-btn-sec--filled {
  border-color: var(--rc);
  box-shadow:
    0 0 6px color-mix(in srgb, var(--rc) 45%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.8);
}
.role-btn-sec-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  border-radius: 50%;
}
.role-btn-sec-plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 12px;
  color: rgba(200, 144, 64, 0.3);
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
</style>
