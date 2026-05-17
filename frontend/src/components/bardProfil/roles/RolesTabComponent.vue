<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { getChampionRoles } from '@/config/championRoles'
import { SHOP_ITEMS } from '@/config/items'
import type { ChampionRole, ItemCategory, ShopItem, ActiveSynergy } from '@/types'
import ChampionPickerPanel from './ChampionPickerPanel.vue'
import ItemPickerPanel from './ItemPickerPanel.vue'
import { useSynergyStore } from '@/stores/synergyStore'

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

const { headerSlots, secondarySlots } = storeToRefs(battleStore)

const synergyStore = useSynergyStore()
const { globalSynergies, activeSynergies } = storeToRefs(synergyStore)

const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))

const activeSlotIndex = ref(uiStore.rolesActiveSlot)
const activeSubSlot = ref(-1)
const selectedCategory = ref<ItemCategory | null>(null)
const panelMode = ref<'main' | 'champion-picker' | 'item-picker'>('main')

const parallaxX = ref(0)
const parallaxY = ref(0)

const hoveredSynId = ref<string | null>(null)

const hoveredSyn = computed(
  () => activeSynergies.value.find((s) => s.id === hoveredSynId.value) ?? null,
)

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

function selectSlot(index: number) {
  activeSlotIndex.value = index
  activeSubSlot.value = -1
  selectedCategory.value = null
  panelMode.value = 'main'
}

function openChampionPicker(subSlot: number = -1) {
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

function formatEffect(syn: ActiveSynergy): string {
  return syn.effects
    .map((e) => {
      const pct = Math.round((e.multiplier - 1) * 100)
      const label = e.type === 'cps' ? 'CPS' : e.type === 'power' ? 'Macht' : 'DPS'
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

function getSynergiesFor(champion: string | null | undefined): ActiveSynergy[] {
  if (!champion) return []
  return activeSynergies.value.filter((s) => s.involvedChampions.includes(champion))
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

void championRoleLabel
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
          @click="openChampionPicker(-1)"
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
              <span class="splash-empty-plus">＋</span>
              <span class="splash-empty-hint">Champion wählen</span>
            </div>
          </div>

          <!-- Vignette overlays -->
          <div class="vignette-edge" />
          <div class="vignette-bottom" />
          <div class="vignette-right" />

          <!-- Champion Name — top center -->
          <div v-if="activeChampion" class="splash-name-top">{{ activeChampion }}</div>

          <!-- Click hint -->

          <!-- Corner decorations -->
          <div class="splash-corner splash-corner--tl" />
          <div class="splash-corner splash-corner--br" />

          <!-- ══ Bottom HUD: Secondary 1 | Equipment | Secondary 2 ══ -->
          <div class="splash-hud" :style="{ '--rc': ROLE_COLORS[activeRole] }" @click.stop>
            <!-- Secondary Champion 1 -->
            <div class="hud-sec-col">
              <button
                class="hud-sec-card"
                :class="{ 'hud-sec-card--syn-glow': isHighlighted(activeSecondaries[0]) }"
                :style="highlightStyle(activeSecondaries[0])"
                @click.stop="openChampionPicker(0)"
              >
                <img
                  v-if="activeSecondaries[0]"
                  :src="battleStore.getChampionImage(activeSecondaries[0]!)"
                  :alt="activeSecondaries[0]!"
                  class="hud-sec-img"
                  @error="onImgError"
                />
                <span v-else class="hud-sec-plus">＋</span>
                <span class="hud-sec-name">{{ activeSecondaries[0] ?? 'Slot 1' }}</span>
                <button
                  v-if="activeSecondaries[0]"
                  class="hud-sec-clear"
                  title="Entfernen"
                  @click.stop="clearSecondary(activeSlotIndex, 0, $event)"
                >
                  ✕
                </button>
              </button>
              <div v-if="activeSecondaries[0]" class="hud-syn-badges">
                <div
                  v-for="syn in getSynergiesFor(activeSecondaries[0])"
                  :key="syn.id"
                  class="hud-syn-badge"
                  :style="{ '--sc': syn.color }"
                  @mouseenter="hoveredSynId = syn.id"
                  @mouseleave="hoveredSynId = null"
                >
                  <span class="hud-syn-icon">{{ syn.icon }}</span>
                  <span class="hud-syn-text">{{ syn.name }}</span>
                  <span class="hud-syn-fx">{{ formatEffect(syn) }}</span>
                </div>
              </div>
            </div>

            <!-- Equipment Center -->
            <div class="hud-equip-col">
              <button
                v-for="cat in ['weapon', 'armor', 'misc'] as ItemCategory[]"
                :key="cat"
                class="hud-equip-btn"
                :class="{ 'hud-equip-btn--filled': currentEquipment[cat] !== null }"
                :title="getEquippedItem(cat)?.name ?? CAT_LABELS[cat]"
                @click.stop="openItemPicker(cat)"
              >
                <template v-if="getEquippedItem(cat)">
                  <img
                    v-if="getEquippedItem(cat)!.icon.startsWith('/')"
                    :src="getEquippedItem(cat)!.icon"
                    class="hud-equip-img"
                    :alt="getEquippedItem(cat)!.name"
                  />
                  <span v-else class="hud-equip-emoji">{{ getEquippedItem(cat)!.icon }}</span>
                  <span class="hud-equip-fx">{{
                    formatEffects(getEquippedItem(cat)).join(' ')
                  }}</span>
                </template>
                <span v-else class="hud-equip-empty">{{ CAT_ICONS[cat] }}</span>
              </button>
            </div>

            <!-- Secondary Champion 2 -->
            <div class="hud-sec-col">
              <button
                class="hud-sec-card"
                :class="{ 'hud-sec-card--syn-glow': isHighlighted(activeSecondaries[1]) }"
                :style="highlightStyle(activeSecondaries[1])"
                @click.stop="openChampionPicker(1)"
              >
                <img
                  v-if="activeSecondaries[1]"
                  :src="battleStore.getChampionImage(activeSecondaries[1]!)"
                  :alt="activeSecondaries[1]!"
                  class="hud-sec-img"
                  @error="onImgError"
                />
                <span v-else class="hud-sec-plus">＋</span>
                <span class="hud-sec-name">{{ activeSecondaries[1] ?? 'Slot 2' }}</span>
                <button
                  v-if="activeSecondaries[1]"
                  class="hud-sec-clear"
                  title="Entfernen"
                  @click.stop="clearSecondary(activeSlotIndex, 1, $event)"
                >
                  ✕
                </button>
              </button>
              <div v-if="activeSecondaries[1]" class="hud-syn-badges">
                <div
                  v-for="syn in getSynergiesFor(activeSecondaries[1])"
                  :key="syn.id"
                  class="hud-syn-badge"
                  :style="{ '--sc': syn.color }"
                  @mouseenter="hoveredSynId = syn.id"
                  @mouseleave="hoveredSynId = null"
                >
                  <span class="hud-syn-icon">{{ syn.icon }}</span>
                  <span class="hud-syn-text">{{ syn.name }}</span>
                  <span class="hud-syn-fx">{{ formatEffect(syn) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ RIGHT — Sidebar (role tabs only) ══ -->
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
                  'role-btn--syn-glow': isHighlighted(headerSlots[i]),
                }"
                :style="[{ '--rc': ROLE_COLORS[role] }, highlightStyle(headerSlots[i])]"
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

                <!-- Mini secondaries column -->
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
    </template>

    <!-- ════════════════════════════════
         CHAMPION PICKER
         ════════════════════════════════ -->
    <ChampionPickerPanel
      v-else-if="panelMode === 'champion-picker'"
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

/* Champion name — top center */
.splash-name-top {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 5;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f0d870;
  text-shadow:
    0 2px 20px rgba(0, 0, 0, 0.95),
    0 0 40px rgba(200, 144, 64, 0.5);
  pointer-events: none;
  line-height: 1;
}

/* Global synergy overlay — left side */
.splash-syn-overlay {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 5px;
  pointer-events: none;
}

.splash-syn-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(8, 5, 2, 0.72);
  border: 1px solid rgba(232, 192, 64, 0.25);
  border-radius: 4px;
  padding: 4px 8px;
}

.splash-syn-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.splash-syn-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.splash-syn-name {
  font-size: 10px;
  font-weight: 700;
  color: #e8c040;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.splash-syn-champs {
  font-size: 8px;
  color: rgba(200, 160, 96, 0.55);
  display: block;
}

/* Click hint — top right (below champion name) */
.splash-click-hint {
  position: absolute;
  top: 40px;
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
   SPLASH HUD — Bottom Overlay
   Layout: [Sec1] [Equipment] [Sec2]
   ══════════════════════════════ */
.splash-hud {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 6;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 14px 12px;
}

/* ── Secondary champion columns ── */
.hud-sec-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.hud-sec-card {
  position: relative;
  width: 86px;
  height: 108px;
  border-radius: 4px;
  border: 2px solid color-mix(in srgb, var(--rc, #c89040) 70%, transparent);
  background: #0a0804;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.12s,
    filter 0.2s;
}
.hud-sec-card:hover {
  border-color: var(--rc, #c89040);
  box-shadow: 0 0 16px color-mix(in srgb, var(--rc, #c89040) 55%, transparent);
  transform: translateY(-3px);
}
.hud-sec-card--syn-glow {
  border-color: var(--hl-color, var(--rc)) !important;
  box-shadow: 0 0 22px color-mix(in srgb, var(--hl-color, #e8c040) 65%, transparent) !important;
  filter: brightness(1.18);
}

.hud-sec-img {
  width: 100%;
  height: 82px;
  object-fit: cover;
  object-position: top center;
  display: block;
  flex-shrink: 0;
}

.hud-sec-plus {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: rgba(200, 144, 64, 0.25);
  transition: color 0.15s;
}
.hud-sec-card:hover .hud-sec-plus {
  color: rgba(200, 144, 64, 0.65);
}

.hud-sec-name {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rc, #c89040);
  text-align: center;
  padding: 3px 3px;
  background: rgba(0, 0, 0, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.hud-sec-clear {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  font-size: 8px;
  color: #cc6050;
  background: rgba(20, 10, 6, 0.92);
  border: 1px solid rgba(180, 60, 40, 0.55);
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 2;
  transition:
    opacity 0.15s ease,
    background 0.15s ease;
}
.hud-sec-card:hover .hud-sec-clear {
  opacity: 1;
}
.hud-sec-clear:hover {
  background: rgba(160, 40, 20, 0.85);
  border-color: #cc6050;
}

/* Synergy badges below secondary card */
.hud-syn-badges {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 86px;
}

.hud-syn-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(8, 5, 2, 0.78);
  border: 1px solid color-mix(in srgb, var(--sc, #e8c040) 40%, transparent);
  border-radius: 3px;
  padding: 2px 5px;
  cursor: default;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.hud-syn-badge:hover {
  border-color: var(--sc, #e8c040);
  box-shadow: 0 0 6px color-mix(in srgb, var(--sc, #e8c040) 40%, transparent);
}

.hud-syn-icon {
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}

.hud-syn-text {
  font-size: 7px;
  font-weight: 700;
  color: var(--sc, #e8c040);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-syn-fx {
  font-size: 7px;
  color: #e8c040;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Equipment center column ── */
.hud-equip-col {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
}

.hud-equip-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(8, 5, 2, 0.7);
  border: 1px solid rgba(92, 51, 16, 0.55);
  border-radius: 4px;
  padding: 7px 8px;
  cursor: pointer;
  min-width: 56px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
}
.hud-equip-btn:hover {
  border-color: rgba(200, 144, 64, 0.6);
  box-shadow: 0 0 12px rgba(200, 144, 64, 0.3);
  transform: translateY(-3px);
}
.hud-equip-btn--filled {
  border-color: rgba(200, 144, 64, 0.4);
}

.hud-equip-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(200, 144, 64, 0.6));
  transition: filter 0.15s;
}
.hud-equip-btn:hover .hud-equip-img {
  filter: drop-shadow(0 0 14px rgba(200, 144, 64, 0.95));
}

.hud-equip-emoji {
  font-size: 40px;
  line-height: 1;
  filter: drop-shadow(0 0 6px rgba(200, 144, 64, 0.5));
}

.hud-equip-empty {
  font-size: 36px;
  line-height: 1;
  opacity: 0.22;
  transition: opacity 0.15s;
}
.hud-equip-btn:hover .hud-equip-empty {
  opacity: 0.55;
}

.hud-equip-fx {
  font-size: 8px;
  color: #e8c040;
  white-space: nowrap;
  text-shadow: 0 0 4px rgba(232, 192, 64, 0.5);
}

/* ══════════════════════════════
   SIDEBAR — Role tabs only
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
    box-shadow 0.2s,
    filter 0.2s;
}
.role-btn:hover {
  border-color: var(--rc);
  box-shadow: 0 0 10px color-mix(in srgb, var(--rc) 30%, transparent);
}
.role-btn--active {
  border-color: var(--rc) !important;
  box-shadow: 0 0 14px color-mix(in srgb, var(--rc) 45%, transparent) !important;
}
.role-btn--syn-glow {
  filter: brightness(1.2);
  border-color: var(--hl-color, var(--rc)) !important;
  box-shadow: 0 0 16px color-mix(in srgb, var(--hl-color, var(--rc)) 55%, transparent) !important;
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
</style>
