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
</script>

<template>
  <div class="roles-tab">
    <!-- ════════════════════════════════
         MAIN VIEW
         ════════════════════════════════ -->
    <template v-if="panelMode === 'main'">
      <div class="banner">
        <div class="banner-line banner-line--l" />
        <span class="banner-text">{{ activeRole }}</span>
        <div class="banner-line banner-line--r" />
      </div>

      <div class="main-layout">
        <!-- LEFT — Active Champion Card -->
        <div class="col-champ">
          <div class="champ-card" @click="openChampionPicker">
            <img
              v-if="headerSlots[activeSlotIndex]"
              :src="battleStore.getChampionImage(headerSlots[activeSlotIndex]!)"
              :alt="headerSlots[activeSlotIndex]!"
              class="champ-card-img"
              @error="onImgError"
            />
            <div v-else class="champ-card-empty">
              <span class="champ-card-plus">＋</span>
              <span class="champ-card-hint">Champion<br />wählen</span>
            </div>
            <div class="champ-card-gradient" />
            <span v-if="headerSlots[activeSlotIndex]" class="champ-card-name">
              {{ headerSlots[activeSlotIndex] }}
            </span>
            <div class="champ-card-corner champ-card-corner--tl" />
            <div class="champ-card-corner champ-card-corner--br" />
          </div>
        </div>

        <!-- CENTER — 5 Role Slots -->
        <div class="col-roles">
          <button
            v-for="(role, i) in ROLES"
            :key="i"
            class="role-slot"
            :class="{
              'role-slot--active': activeSlotIndex === i,
              'role-slot--filled': headerSlots[i] !== null,
            }"
            :title="role"
            @click="selectSlot(i)"
          >
            <img
              v-if="headerSlots[i]"
              :src="battleStore.getChampionImage(headerSlots[i]!)"
              :alt="headerSlots[i]!"
              class="role-slot-img"
              @error="onImgError"
            />
            <span v-else class="role-slot-plus">＋</span>

            <div class="role-slot-gradient" />
            <span class="role-slot-label">{{ role }}</span>
            <div v-if="activeSlotIndex === i" class="role-slot-active-bar" />
            <div v-if="activeSlotIndex === i" class="role-slot-glow" />
          </button>
        </div>

        <!-- RIGHT — Equipment Slots -->
        <div class="col-equip">
          <button
            v-for="cat in ['weapon', 'armor', 'misc'] as ItemCategory[]"
            :key="cat"
            class="equip-btn"
            :class="{ 'equip-btn--filled': currentEquipment[cat] !== null }"
            @click="openItemPicker(cat)"
          >
            <template v-if="getEquippedItem(cat)">
              <div class="equip-img-wrap">
                <img
                  v-if="getEquippedItem(cat)!.icon.startsWith('/')"
                  :src="getEquippedItem(cat)!.icon"
                  class="equip-btn-img"
                  :alt="getEquippedItem(cat)!.name"
                />
                <span v-else class="equip-emoji-lg">{{ getEquippedItem(cat)!.icon }}</span>
              </div>
              <div class="equip-effects">
                <span
                  v-for="fx in formatEffects(getEquippedItem(cat))"
                  :key="fx"
                  class="equip-effect-chip"
                  >{{ fx }}</span
                >
              </div>
            </template>
            <template v-else>
              <div class="equip-placeholder-wrap">
                <span class="equip-btn-placeholder">{{ CAT_ICONS[cat] }}</span>
              </div>
            </template>
            <span class="equip-btn-label">{{ CAT_LABELS[cat] }}</span>
            <div class="equip-btn-corner equip-btn-corner--tl" />
            <div class="equip-btn-corner equip-btn-corner--br" />
          </button>
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
   BARDLE — ROLES TAB  •  RPG Edition v3
   Layout: Active Champ | 5 Role Slots | Equipment
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
  --border-hover: rgba(200, 144, 64, 0.6);
  --r: 7px;

  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  overflow: hidden;
}

/* ── Banner ── */
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 24px;
  flex-shrink: 0;
  padding: 0 14px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(200, 144, 64, 0.07) 40%,
    rgba(200, 144, 64, 0.07) 60%,
    transparent
  );
  border-bottom: 1px solid rgba(200, 144, 64, 0.12);
}
.banner-text {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold-bright);
  white-space: nowrap;
}
.banner-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(200, 144, 64, 0.4), transparent);
}
.banner-line--l {
  transform: scaleX(-1);
}

/* ── 3-column Main Layout ── */
.main-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 62px 1fr;
  gap: 8px;
  padding: 10px;
  align-items: stretch;
}

/* ══ LEFT — Active Champion Card ══ */
.col-champ {
  display: flex;
  flex-direction: column;
}

.champ-card {
  position: relative;
  flex: 1;
  border-radius: var(--r);
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-card);
  border: 1px solid var(--border);
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.champ-card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 0 20px var(--gold-glow);
  transform: scale(1.01);
}

.champ-card-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s ease;
}
.champ-card:hover .champ-card-img {
  transform: scale(1.05);
}

.champ-card-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  z-index: 1;
}
.champ-card-plus {
  font-size: 28px;
  color: rgba(200, 144, 64, 0.18);
  line-height: 1;
  transition:
    color 0.15s,
    transform 0.15s;
}
.champ-card:hover .champ-card-plus {
  color: rgba(200, 144, 64, 0.55);
  transform: scale(1.2);
}
.champ-card-hint {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gold-dim);
  text-align: center;
  line-height: 1.4;
}

.champ-card-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 50%);
  pointer-events: none;
  z-index: 1;
}
.champ-card-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: 6px 8px 10px;
  font-size: 10px;
  font-weight: 900;
  color: rgba(230, 185, 70, 0.95);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
}

.champ-card-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(200, 144, 64, 0.22);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.15s;
}
.champ-card:hover .champ-card-corner {
  border-color: rgba(200, 144, 64, 0.65);
}
.champ-card-corner--tl {
  top: 4px;
  left: 4px;
  border-width: 1px 0 0 1px;
}
.champ-card-corner--br {
  bottom: 4px;
  right: 4px;
  border-width: 0 1px 1px 0;
}

/* ══ CENTER — 5 Role Slots ══ */
.col-roles {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.role-slot {
  position: relative;
  flex: 1;
  padding: 0;
  border-radius: var(--r);
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-card);
  border: 1px solid var(--border);
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.role-slot:hover {
  border-color: var(--border-hover);
  box-shadow: 0 0 10px var(--gold-glow);
  transform: scale(1.04);
}
.role-slot:active {
  transform: scale(0.97);
}
.role-slot--active {
  border-color: var(--gold) !important;
  box-shadow:
    0 0 16px rgba(200, 144, 64, 0.35),
    inset 0 1px 0 rgba(255, 200, 80, 0.08) !important;
}
.role-slot--filled {
  border-color: rgba(160, 110, 30, 0.6);
}

.role-slot-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.2s ease;
  display: block;
}
.role-slot:hover .role-slot-img {
  transform: scale(1.08);
}

.role-slot-plus {
  font-size: 14px;
  color: rgba(200, 144, 64, 0.18);
  line-height: 1;
  position: relative;
  z-index: 1;
  transition:
    color 0.15s,
    transform 0.15s;
}
.role-slot:hover .role-slot-plus {
  color: rgba(200, 144, 64, 0.5);
  transform: scale(1.2);
}
.role-slot--active .role-slot-plus {
  color: rgba(200, 144, 64, 0.55);
}

.role-slot-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.78) 0%, transparent 55%);
  pointer-events: none;
  z-index: 1;
}

.role-slot-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: 0 2px 3px;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  text-align: center;
  color: rgba(180, 130, 50, 0.5);
  line-height: 1;
  pointer-events: none;
  transition: color 0.15s;
}
.role-slot:hover .role-slot-label {
  color: rgba(230, 180, 60, 0.9);
}
.role-slot--active .role-slot-label {
  color: var(--gold-bright);
}
.role-slot--filled .role-slot-label {
  color: rgba(220, 170, 60, 0.85);
}

.role-slot-active-bar {
  position: absolute;
  bottom: 0;
  left: 8%;
  right: 8%;
  height: 2px;
  background: linear-gradient(to right, transparent, var(--gold-bright), transparent);
  border-radius: 2px 2px 0 0;
  z-index: 3;
}

.role-slot-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 60%, rgba(200, 144, 64, 0.14), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ══ RIGHT — Equipment Buttons ══ */
.col-equip {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.equip-btn {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
  padding: 4px;
  background: linear-gradient(160deg, #1c1508, #130f04);
  border: 1px solid var(--border);
  border-radius: var(--r);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s,
    background 0.15s;
}
.equip-btn:hover {
  border-color: var(--border-hover);
  background: linear-gradient(160deg, #251c08, #1a1305);
  transform: scale(1.02);
  box-shadow: 0 0 10px var(--gold-glow);
}
.equip-btn:active {
  transform: scale(0.97);
}
.equip-btn--filled {
  border-color: rgba(160, 110, 30, 0.6);
}

.equip-img-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.equip-btn-img {
  width: 100%;
  height: 100%;
  max-height: 60px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(200, 144, 64, 0.4));
}
.equip-emoji-lg {
  font-size: 32px;
  line-height: 1;
}

.equip-placeholder-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.equip-btn-placeholder {
  font-size: 20px;
  line-height: 1;
  opacity: 0.25;
  transition: opacity 0.15s;
}
.equip-btn:hover .equip-btn-placeholder {
  opacity: 0.55;
}

.equip-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
  padding: 0 2px;
  flex-shrink: 0;
}
.equip-effect-chip {
  font-size: 7px;
  color: #e8c040;
  background: rgba(14, 10, 4, 0.8);
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 3px;
  padding: 1px 4px;
  white-space: nowrap;
  line-height: 1.3;
}

.equip-btn-label {
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(180, 130, 50, 0.45);
  line-height: 1;
  text-align: center;
  flex-shrink: 0;
  transition: color 0.15s;
}
.equip-btn:hover .equip-btn-label {
  color: rgba(220, 170, 60, 0.9);
}
.equip-btn--filled .equip-btn-label {
  color: rgba(200, 160, 50, 0.75);
}

.equip-btn-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(200, 144, 64, 0.18);
  border-style: solid;
  pointer-events: none;
  transition: border-color 0.15s;
}
.equip-btn:hover .equip-btn-corner {
  border-color: rgba(200, 144, 64, 0.5);
}
.equip-btn-corner--tl {
  top: 3px;
  left: 3px;
  border-width: 1px 0 0 1px;
}
.equip-btn-corner--br {
  bottom: 3px;
  right: 3px;
  border-width: 0 1px 1px 0;
}
</style>
