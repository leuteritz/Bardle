<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { getChampionRoles } from '@/config/championRoles'
import { SHOP_ITEMS } from '@/config/items'
import type { ChampionRole, ItemCategory } from '@/types'

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

const searchQuery = ref('')
const activeSlotIndex = ref(uiStore.rolesActiveSlot)
const selectedCategory = ref<ItemCategory | null>(null)
const panelMode = ref<'main' | 'champion-picker' | 'item-picker'>('main')

watch(
  () => uiStore.rolesActiveSlot,
  (val) => {
    activeSlotIndex.value = val
    searchQuery.value = ''
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

const filteredChampions = computed(() => {
  const list = searchQuery.value
    ? roleFilteredChampions.value.filter((c) =>
        c.toLowerCase().includes(searchQuery.value.toLowerCase()),
      )
    : roleFilteredChampions.value
  return [...list].sort((a, b) => a.localeCompare(b))
})

function selectSlot(index: number) {
  activeSlotIndex.value = index
  searchQuery.value = ''
  selectedCategory.value = null
  panelMode.value = 'main'
}

function openChampionPicker() {
  panelMode.value = 'champion-picker'
  searchQuery.value = ''
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

function getEquippedItem(cat: ItemCategory) {
  const id = currentEquipment.value[cat]
  if (!id) return null
  return SHOP_ITEMS.find((i) => i.id === id) ?? null
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
        <!-- LEFT — Active Champion Card (groß, klickbar) -->
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

        <!-- CENTER — 5 Role Slots als Portrait-Karten -->
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
            <div class="equip-btn-icon">
              <template v-if="getEquippedItem(cat)">
                <img
                  v-if="getEquippedItem(cat)!.icon.startsWith('/')"
                  :src="getEquippedItem(cat)!.icon"
                  class="equip-btn-img"
                  :alt="getEquippedItem(cat)!.name"
                />
                <span v-else class="equip-btn-emoji">{{ getEquippedItem(cat)!.icon }}</span>
              </template>
              <span v-else class="equip-btn-placeholder">{{ CAT_ICONS[cat] }}</span>
            </div>
            <span class="equip-btn-label">{{ CAT_LABELS[cat] }}</span>
            <span v-if="getEquippedItem(cat)" class="equip-btn-name">
              {{ getEquippedItem(cat)!.name }}
            </span>
            <div class="equip-btn-corner equip-btn-corner--tl" />
            <div class="equip-btn-corner equip-btn-corner--br" />
          </button>
        </div>
      </div>
    </template>

    <!-- ════════════════════════════════
         CHAMPION PICKER
         ════════════════════════════════ -->
    <template v-else-if="panelMode === 'champion-picker'">
      <div class="sub-header">
        <span class="sub-header-title">{{ activeRole }} — Champion wählen</span>
        <button class="back-btn" @click="closePanel">← Zurück</button>
      </div>

      <div class="search-row">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="`${activeRole}-Champion suchen …`"
          class="search-input"
        />
        <span class="search-count">
          {{ filteredChampions.length }}<span class="search-count-sep">/</span
          >{{ roleFilteredChampions.length }}
        </span>
      </div>

      <div class="picker-body">
        <div v-if="filteredChampions.length === 0" class="picker-empty">
          <span class="picker-empty-icon">🎵</span>
          <span>{{
            roleFilteredChampions.length === 0
              ? `Keine ${activeRole}-Champions gekauft!`
              : 'Kein Champion gefunden.'
          }}</span>
        </div>
        <div v-else class="picker-grid">
          <button
            v-for="champion in filteredChampions"
            :key="champion"
            class="picker-champ"
            :class="{
              'picker-champ--active': headerSlots[activeSlotIndex] === champion,
              'picker-champ--taken':
                headerSlots.includes(champion) && headerSlots[activeSlotIndex] !== champion,
            }"
            @click="handleSelect(champion)"
          >
            <img
              :src="battleStore.getChampionImage(champion)"
              :alt="champion"
              class="picker-champ-img"
              @error="onImgError"
            />
            <div class="picker-champ-gradient" />
            <span class="picker-champ-name">{{ champion }}</span>
            <span class="pchamp-corner pchamp-corner--tl" />
            <span class="pchamp-corner pchamp-corner--br" />
            <div v-if="headerSlots[activeSlotIndex] === champion" class="picker-active-overlay">
              <span class="picker-check">✓</span>
            </div>
            <div v-else-if="headerSlots.includes(champion)" class="picker-taken-badge">
              {{ ROLES[headerSlots.indexOf(champion)] }}
            </div>
          </button>
        </div>
      </div>
    </template>

    <!-- ════════════════════════════════
         ITEM PICKER
         ════════════════════════════════ -->
    <template v-else-if="panelMode === 'item-picker'">
      <div class="sub-header">
        <span class="sub-header-title">
          {{ CAT_ICONS[selectedCategory!] }} {{ CAT_LABELS[selectedCategory!] }} wählen
        </span>
        <button class="back-btn" @click="closePanel">← Zurück</button>
      </div>

      <div class="item-body">
        <div v-if="categoryItems.length === 0" class="picker-empty">
          <span class="picker-empty-icon">🎵</span>
          <span>Keine Items verfügbar</span>
        </div>
        <button
          v-for="item in categoryItems"
          :key="item.id"
          class="item-row"
          :class="{ 'item-row--active': currentEquipment[selectedCategory!] === item.id }"
          @click="handleEquip(item.id)"
        >
          <div class="item-row-icon">
            <img
              v-if="item.icon.startsWith('/')"
              :src="item.icon"
              class="item-row-img"
              :alt="item.name"
            />
            <span v-else class="item-row-emoji">{{ item.icon }}</span>
          </div>
          <div class="item-row-info">
            <span class="item-row-name">{{ item.name }}</span>
            <span class="item-row-desc">{{ item.description }}</span>
          </div>
          <div class="item-rarity-pip" :class="`rarity--${item.rarity}`" />
          <span v-if="currentEquipment[selectedCategory!] === item.id" class="item-row-check"
            >✓</span
          >
        </button>
      </div>
    </template>
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
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px;
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

.equip-btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.equip-btn-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(200, 144, 64, 0.4));
}
.equip-btn-emoji {
  font-size: 22px;
  line-height: 1;
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

.equip-btn-label {
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(180, 130, 50, 0.45);
  line-height: 1;
  transition: color 0.15s;
}
.equip-btn:hover .equip-btn-label {
  color: rgba(220, 170, 60, 0.9);
}
.equip-btn--filled .equip-btn-label {
  color: rgba(200, 160, 50, 0.75);
}

.equip-btn-name {
  font-size: 7px;
  font-weight: 700;
  color: var(--gold);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
  line-height: 1.2;
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

/* ══════════════════════════════════════════
   SUB-PANELS
   ══════════════════════════════════════════ */

.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 7px;
  border-bottom: 1px solid rgba(42, 26, 6, 0.9);
  flex-shrink: 0;
  background: linear-gradient(to bottom, #1a1006, #120d04);
}
.sub-header-title {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold-bright);
  line-height: 1;
}
.back-btn {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(200, 144, 64, 0.55);
  background: rgba(60, 30, 10, 0.5);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  color: var(--gold-bright);
  border-color: rgba(200, 144, 64, 0.5);
  background: rgba(80, 40, 10, 0.7);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 26, 6, 0.7);
  flex-shrink: 0;
}
.search-icon {
  font-size: 11px;
  opacity: 0.4;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  background: #181208;
  border: 1px solid #3a2510;
  border-radius: 5px;
  padding: 5px 10px;
  color: var(--gold-bright);
  font-size: 11px;
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
}
.search-input:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px rgba(200, 144, 64, 0.08);
}
.search-input::placeholder {
  color: rgba(200, 144, 64, 0.28);
}
.search-count {
  font-size: 10px;
  font-weight: 700;
  color: var(--gold-dim);
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
.search-count-sep {
  opacity: 0.3;
  margin: 0 1px;
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 12px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0d0a04;
}

.picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  min-height: 220px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.3);
}
.picker-empty-icon {
  font-size: 34px;
  opacity: 0.38;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  align-content: start;
}

.picker-champ {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #0c0906;
  padding: 0;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
}
.picker-champ:hover {
  border-color: rgba(200, 144, 64, 0.9);
  box-shadow: 0 0 14px var(--gold-glow);
  transform: translateY(-2px) scale(1.025);
}
.picker-champ--active {
  border-color: var(--green);
  box-shadow: 0 0 16px var(--green-glow);
}
.picker-champ--taken {
  opacity: 0.42;
}

.picker-champ-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s;
  display: block;
}
.picker-champ:hover .picker-champ-img {
  transform: scale(1.08);
}
.picker-champ-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, transparent 52%);
  pointer-events: none;
  z-index: 1;
}
.picker-champ-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: 0 3px 5px;
  font-size: 8px;
  font-weight: 900;
  color: rgba(215, 175, 75, 0.88);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
}
.picker-champ:hover .picker-champ-name {
  color: #f0d060;
}
.picker-champ--active .picker-champ-name {
  color: #8ed84a;
}

.pchamp-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(200, 144, 64, 0.22);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.15s;
}
.picker-champ:hover .pchamp-corner {
  border-color: rgba(200, 144, 64, 0.6);
}
.picker-champ--active .pchamp-corner {
  border-color: rgba(110, 192, 64, 0.5);
}
.pchamp-corner--tl {
  top: 2px;
  left: 2px;
  border-width: 1px 0 0 1px;
}
.pchamp-corner--br {
  bottom: 2px;
  right: 2px;
  border-width: 0 1px 1px 0;
}

.picker-active-overlay {
  position: absolute;
  inset: 0;
  background: rgba(12, 36, 6, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}
.picker-check {
  font-size: 26px;
  color: var(--green);
  filter: drop-shadow(0 0 8px rgba(110, 192, 64, 0.9));
  line-height: 1;
}
.picker-taken-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 4;
  padding: 2px 5px;
  background: rgba(14, 10, 4, 0.9);
  border: 1px solid rgba(200, 144, 64, 0.3);
  border-radius: 3px;
  font-size: 7px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.7);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
}

.item-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0d0a04;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #181208;
  border: 1px solid rgba(92, 51, 16, 0.35);
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  flex-shrink: 0;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}
.item-row:hover {
  border-color: var(--border-hover);
  background: #201608;
  box-shadow: 0 0 8px rgba(200, 144, 64, 0.08);
}
.item-row--active {
  border-color: var(--green);
  background: rgba(82, 184, 48, 0.07);
  box-shadow: 0 0 10px rgba(110, 192, 64, 0.18);
}

.item-row-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.item-row-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(200, 144, 64, 0.3));
}
.item-row-emoji {
  font-size: 22px;
  line-height: 1;
}

.item-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.item-row-name {
  font-size: 10px;
  font-weight: 900;
  color: var(--gold-bright);
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}
.item-row--active .item-row-name {
  color: #8ed84a;
}
.item-row-desc {
  font-size: 9px;
  color: rgba(200, 144, 64, 0.42);
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.item-rarity-pip {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.rarity--common {
  background: #8aab70;
}
.rarity--rare {
  background: #5090d0;
}
.rarity--epic {
  background: #9060d0;
}
.rarity--legendary {
  background: var(--gold);
  box-shadow: 0 0 5px rgba(232, 160, 32, 0.55);
}

.item-row-check {
  font-size: 15px;
  color: var(--green);
  filter: drop-shadow(0 0 5px rgba(110, 192, 64, 0.8));
  flex-shrink: 0;
  line-height: 1;
}
</style>
