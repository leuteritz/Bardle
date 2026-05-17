<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { getChampionRoles } from '@/config/championRoles'
import { SHOP_ITEMS } from '@/config/items'
import type { ChampionRole, ItemCategory, ShopItem } from '@/types'
import ChampionPickerPanel from './ChampionPickerPanel.vue'
import ItemPickerPanel from './ItemPickerPanel.vue'

const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Supp']

const ROLE_MAP: Record<string, ChampionRole> = {
  Top: 'top',
  Jungle: 'jungle',
  Mid: 'mid',
  ADC: 'adc',
  Supp: 'support',
}

const ROLE_COLORS: Record<string, string> = {
  Top: '#e05050',
  Jungle: '#50c060',
  Mid: '#5090e8',
  ADC: '#e89840',
  Supp: '#b8c8d8',
}

const CAT_LABELS: Record<ItemCategory, string> = {
  weapon: 'Waffe',
  armor: 'Rüstung',
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

const { headerSlots } = storeToRefs(battleStore)

const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))

const activeSlotIndex = ref(uiStore.rolesActiveSlot)
const selectedCategory = ref<ItemCategory | null>(null)
const panelMode = ref<'main' | 'champion-picker' | 'item-picker'>('main')

// Parallax state
const parallaxX = ref(0)
const parallaxY = ref(0)

watch(
  () => uiStore.rolesActiveSlot,
  (val) => {
    activeSlotIndex.value = val
    selectedCategory.value = null
    panelMode.value = 'main'
  },
)

const activeRole = computed(() => ROLES[activeSlotIndex.value])
const currentEquipment = computed(() => itemStore.slotEquipment[activeSlotIndex.value])
const activeChampion = computed(() => headerSlots.value[activeSlotIndex.value])

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

function selectSlot(index: number) {
  activeSlotIndex.value = index
  selectedCategory.value = null
  panelMode.value = 'main'
}

function openChampionPicker() {
  panelMode.value = 'champion-picker'
}

function openItemPicker(cat: ItemCategory) {
  selectedCategory.value = cat
  panelMode.value = 'item-picker'
}

function closePanel() {
  panelMode.value = 'main'
  selectedCategory.value = null
}

function handleSelect(champion: string) {
  battleStore.setHeaderSlot(activeSlotIndex.value, champion)
  panelMode.value = 'main'
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

function formatEffects(item: ShopItem | null): string[] {
  if (!item?.effects) return []
  const result: string[] = []
  if (item.effects.powerMultiplier) {
    result.push(`⚔ +${Math.round((item.effects.powerMultiplier - 1) * 100)}%`)
  }
  if (item.effects.cpsMultiplier) {
    result.push(`♪ +${Math.round((item.effects.cpsMultiplier - 1) * 100)}%`)
  }
  return result
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
</script>

<template>
  <div class="roles-tab">
    <!-- ════════════════════════════════
         MAIN VIEW
         ════════════════════════════════ -->
    <template v-if="panelMode === 'main'">
      <div class="main-layout">
        <!-- ══ LEFT — Dominant Splash Art ══ -->
        <div
          class="splash-area"
          @mousemove="onSplashMouseMove"
          @mouseleave="onSplashMouseLeave"
          @click="openChampionPicker"
        >
          <div class="splash-inner">
            <template v-if="activeChampion">
              <img
                :src="battleStore.getChampionImage(activeChampion)"
                :alt="activeChampion"
                class="splash-img"
                :style="{
                  transform: `scale(1.06) translate(${parallaxX}px, ${parallaxY}px)`,
                }"
                @error="onImgError"
              />
            </template>
            <div v-else class="splash-empty">
              <span class="splash-empty-plus">＋</span>
              <span class="splash-empty-hint">Champion wählen</span>
            </div>
          </div>

          <!-- Vignette overlays -->
          <div class="vignette-edge" />
          <div class="vignette-bottom" />
          <div class="vignette-right" />

          <!-- Equipment bar top-right -->
          <div class="equip-bar">
            <button
              v-for="cat in ['weapon', 'armor', 'misc'] as ItemCategory[]"
              :key="cat"
              class="equip-bar-btn"
              :class="{ 'equip-bar-btn--filled': currentEquipment[cat] !== null }"
              @click.stop="openItemPicker(cat)"
            >
              <template v-if="getEquippedItem(cat)">
                <img
                  v-if="getEquippedItem(cat)!.icon.startsWith('/')"
                  :src="getEquippedItem(cat)!.icon"
                  class="equip-bar-img"
                  :alt="getEquippedItem(cat)!.name"
                />
                <span v-else class="equip-bar-emoji">{{ getEquippedItem(cat)!.icon }}</span>
                <div class="equip-bar-effects">
                  <span
                    v-for="fx in formatEffects(getEquippedItem(cat))"
                    :key="fx"
                    class="equip-bar-fx"
                    >{{ fx }}</span
                  >
                </div>
              </template>
              <span v-else class="equip-bar-placeholder">{{ CAT_ICONS[cat] }}</span>
              <span class="equip-bar-label">{{ CAT_LABELS[cat] }}</span>
            </button>
          </div>

          <!-- Champion name bottom-left -->
          <div v-if="activeChampion" class="splash-champ-name">
            {{ activeChampion }}
          </div>

          <!-- Click hint -->
          <div class="splash-click-hint">
            <span>Klicken zum Wechseln</span>
          </div>

          <!-- Corner decorations -->
          <div class="splash-corner splash-corner--tl" />
          <div class="splash-corner splash-corner--br" />
        </div>

        <!-- ══ RIGHT — Sidebar ══ -->
        <div class="sidebar">
          <!-- Role Slots -->
          <div class="sidebar-section sidebar-section--roles">
            <div class="sidebar-label">Rolle</div>
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
                <span v-else class="role-btn-plus">＋</span>
                <div class="role-btn-gradient" />
                <span class="role-btn-label">{{ role }}</span>
                <div v-if="activeSlotIndex === i" class="role-btn-active-bar" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </template>

    <!-- ════════════════════════════════
         CHAMPION PICKER
         ════════════════════════════════ -->
    <ChampionPickerPanel
      v-else-if="panelMode === 'champion-picker'"
      :active-role="activeRole"
      :role-filtered-champions="roleFilteredChampions"
      :header-slots="headerSlots"
      :active-slot-index="activeSlotIndex"
      @back="closePanel"
      @select="handleSelect"
    />

    <!-- ════════════════════════════════
         ITEM PICKER
         ════════════════════════════════ -->
    <ItemPickerPanel
      v-else-if="panelMode === 'item-picker' && selectedCategory"
      :selected-category="selectedCategory"
      :category-items="categoryItems"
      :current-equipment="currentEquipment"
      @back="closePanel"
      @equip="handleEquip"
    />
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════
   BARDLE — ROLES TAB  •  Epic Gaming UI
   Layout: Dominant Splash Art | Sidebar
   ══════════════════════════════════════════ */

.roles-tab {
  --gold: #c89040;
  --gold-bright: #e8c060;
  --gold-dim: rgba(200, 144, 64, 0.32);
  --gold-glow: rgba(200, 144, 64, 0.2);
  --green: #6ec040;
  --green-glow: rgba(110, 192, 64, 0.32);
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

/* ── Main Layout: 65/35 split ── */
.main-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: 0;
}

/* ══════════════════════════════
   SPLASH ART AREA
   ══════════════════════════════ */
.splash-area {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: #080604;
  border-right: 1px solid rgba(92, 51, 16, 0.5);
}

.splash-area:hover .splash-click-hint {
  opacity: 1;
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
  transition: transform 0.12s ease-out;
  will-change: transform;
}

.splash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: rgba(200, 144, 64, 0.18);
}
.splash-empty-plus {
  font-size: 48px;
  line-height: 1;
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

/* Vignette */
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
  background: linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.55) 35%, transparent 100%);
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

/* Champion name */
.splash-champ-name {
  position: absolute;
  bottom: 14px;
  left: 14px;
  z-index: 5;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #f0d870;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.9), 0 0 30px rgba(200, 144, 64, 0.5);
  line-height: 1;
  pointer-events: none;
}

/* Click hint */
.splash-click-hint {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 5;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.splash-click-hint span {
  background: rgba(0, 0, 0, 0.65);
  padding: 3px 7px;
  border-radius: 3px;
  border: 1px solid rgba(92, 51, 16, 0.5);
}

/* Corner decorations */
.splash-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: var(--gold);
  border-style: solid;
  opacity: 0.6;
  pointer-events: none;
  z-index: 6;
  transition: opacity 0.2s;
}
.splash-area:hover .splash-corner {
  opacity: 1;
}
.splash-corner--tl {
  top: 8px;
  left: 8px;
  border-width: 2px 0 0 2px;
}
.splash-corner--br {
  bottom: 8px;
  right: 8px;
  border-width: 0 2px 2px 0;
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
.sidebar-section--equip {
  flex-shrink: 0;
}

.sidebar-label {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.35);
  padding: 0 2px 2px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.3);
  margin-bottom: 2px;
  flex-shrink: 0;
}

/* ── Equipment Bar (inside splash art) ── */
.equip-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-start;
  padding: 8px 0 4px;
  z-index: 5;
  pointer-events: auto;
}

.equip-bar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.15s;
}
.equip-bar-btn:hover {
  transform: translateY(-2px) scale(1.08);
}

.equip-bar-img {
  width: 116px;
  height: 116px;
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(200, 144, 64, 0.65));
  transition: filter 0.15s;
}
.equip-bar-btn:hover .equip-bar-img {
  filter: drop-shadow(0 0 24px rgba(200, 144, 64, 1));
}

.equip-bar-emoji {
  font-size: 108px;
  line-height: 1;
  filter: drop-shadow(0 0 12px rgba(200, 144, 64, 0.6));
  transition: filter 0.15s;
}
.equip-bar-btn:hover .equip-bar-emoji {
  filter: drop-shadow(0 0 24px rgba(200, 144, 64, 1));
}

.equip-bar-placeholder {
  font-size: 96px;
  line-height: 1;
  opacity: 0.22;
  transition: opacity 0.15s;
}
.equip-bar-btn:hover .equip-bar-placeholder {
  opacity: 0.55;
}

.equip-bar-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
}
.equip-bar-fx {
  font-size: 13px;
  color: #e8c040;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 2px;
  padding: 1px 4px;
  white-space: nowrap;
  line-height: 1.3;
  text-shadow: 0 0 4px rgba(232, 192, 64, 0.5);
}

.equip-bar-label {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.65);
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
}

/* ── Role Buttons ── */
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
    border-color 0.15s,
    box-shadow 0.15s;
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

.role-btn-plus {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: rgba(200, 144, 64, 0.15);
  transition: color 0.15s;
}
.role-btn:hover .role-btn-plus {
  color: rgba(200, 144, 64, 0.45);
}

.role-btn-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 65%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%);
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
  text-shadow: 0 0 12px color-mix(in srgb, var(--rc) 70%, transparent), 0 2px 6px rgba(0,0,0,0.95);
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

</style>
