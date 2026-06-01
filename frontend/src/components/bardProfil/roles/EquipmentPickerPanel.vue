<script setup lang="ts">
import { ref, computed } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import { SHOP_ITEMS } from '@/config/items'
import type { ItemCategory, SlotEquipment } from '@/types'

const CATEGORIES: Array<{ id: ItemCategory; label: string }> = [
  { id: 'weapon', label: 'Weapon' },
  { id: 'armor', label: 'Armor' },
  { id: 'artefact', label: 'Artefact' },
]

const props = defineProps<{
  initialCategory: ItemCategory
  currentEquipment: SlotEquipment
}>()

const emit = defineEmits<{
  equip: [itemId: string, category: ItemCategory]
  close: []
}>()

const itemStore = useItemStore()
const activeTab = ref<ItemCategory>(props.initialCategory)

const filteredItems = computed(() =>
  SHOP_ITEMS.filter((item) => {
    if (item.category !== activeTab.value) return false
    const equippedHere = props.currentEquipment[activeTab.value] === item.id
    return equippedHere || itemStore.availableCount(item.id) > 0
  }),
)

function isEquipped(itemId: string): boolean {
  return props.currentEquipment[activeTab.value] === itemId
}

function effectSummary(item: (typeof SHOP_ITEMS)[number]): string {
  const parts: string[] = []
  if (item.effects.cpsMultiplier) parts.push(`+${Math.round((item.effects.cpsMultiplier - 1) * 100)}% CPS`)
  if (item.effects.powerMultiplier) parts.push(`+${Math.round((item.effects.powerMultiplier - 1) * 100)}% Power`)
  return parts.join('  ·  ')
}
</script>

<template>
  <div class="ep-root">
    <!-- Gold accent bar -->
    <div class="ep-gold-bar" />

    <!-- Tab bar -->
    <div class="ep-tabs">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.id"
        class="ep-tab"
        :class="{ 'ep-tab--active': activeTab === cat.id }"
        @click="activeTab = cat.id"
      >
        <img
          :src="`/img/itemShop/${cat.id}.png`"
          :alt="cat.label"
          width="18"
          height="18"
          loading="eager"
          class="ep-tab-img"
        />
        {{ cat.label }}
      </button>
    </div>

    <!-- Grid -->
    <div class="ep-grid-wrapper">
      <div v-if="filteredItems.length === 0" class="ep-empty">
        <span class="ep-empty-icon">⚔</span>
        <span>No Items Available</span>
      </div>
      <div v-else class="ep-grid">
        <button
          v-for="item in filteredItems"
          :key="item.id"
          class="ep-card"
          :class="[`ep-card--${item.rarity}`, { 'ep-card--equipped': isEquipped(item.id) }]"
          @click="emit('equip', item.id, activeTab)"
        >
          <!-- Rarity glow for legendary -->
          <div v-if="item.rarity === 'legendary'" class="ep-card-glow" />

          <!-- Icon -->
          <div class="ep-card-icon-wrap">
            <img
              v-if="item.icon.startsWith('/')"
              :src="item.icon"
              class="ep-card-icon"
              :alt="item.name"
            />
            <span v-else class="ep-card-icon ep-card-icon--emoji">{{ item.icon }}</span>
          </div>

          <!-- Info -->
          <div class="ep-card-info">
            <span class="ep-card-name">{{ item.name }}</span>
            <span class="ep-card-rarity" :class="`ep-rarity-text--${item.rarity}`">
              {{ item.rarity }}
            </span>
            <span class="ep-card-effects">{{ effectSummary(item) }}</span>
          </div>

          <!-- Equipped badge -->
          <div v-if="isEquipped(item.id)" class="ep-equipped-badge">Equipped</div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ep-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #111008;
}

/* ── Gold bar ── */
.ep-gold-bar {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}

/* ── Tabs ── */
.ep-tabs {
  display: flex;
  flex-direction: row;
  gap: 0;
  padding: 0;
  flex-shrink: 0;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.ep-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 10px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  background: transparent;
  border: none;
  border-right: 1px solid rgba(92, 51, 16, 0.4);
  border-radius: 0;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.ep-tab:last-child {
  border-right: none;
}

.ep-tab:hover {
  color: #c89040;
  background: rgba(92, 51, 16, 0.18);
}

.ep-tab--active {
  color: #e8c060;
  background: #111008;
  box-shadow: inset 0 -3px 0 #c89040;
}

.ep-tab-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
  opacity: 0.75;
}

.ep-tab--active .ep-tab-img {
  opacity: 1;
}

/* ── Grid wrapper ── */
.ep-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.ep-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 100%;
  min-height: 200px;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: rgba(200, 144, 64, 0.28);
}

.ep-empty-icon {
  font-size: 36px;
  opacity: 0.3;
}

/* ── Grid ── */
.ep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
}

/* ── Card ── */
.ep-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 10px 12px;
  background: #1a1008;
  border: 2px solid rgba(92, 51, 16, 0.45);
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
  overflow: hidden;
}

.ep-card:hover {
  background: #201608;
  border-color: rgba(200, 144, 64, 0.5);
  box-shadow: 0 0 12px rgba(200, 144, 64, 0.1);
}

.ep-card--equipped {
  border-color: #6ec040;
  background: rgba(82, 184, 48, 0.06);
  box-shadow: 0 0 14px rgba(110, 192, 64, 0.2);
}

.ep-card--legendary {
  border-color: rgba(200, 144, 64, 0.55);
}

.ep-card--legendary:hover,
.ep-card--legendary.ep-card--equipped {
  box-shadow: 0 0 20px rgba(232, 192, 64, 0.25);
}

/* Legendary animated glow */
.ep-card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(232, 192, 64, 0.07) 0%, transparent 70%);
  pointer-events: none;
  animation: legendary-pulse 2.8s ease-in-out infinite;
}

@keyframes legendary-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ── Card icon ── */
.ep-card-icon-wrap {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #141410;
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 4px;
}

.ep-card-icon {
  width: 52px;
  height: 52px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(200, 144, 64, 0.3));
}

.ep-card-icon--emoji {
  font-size: 34px;
  line-height: 1;
  filter: none;
}

/* ── Card info ── */
.ep-card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.ep-card-name {
  font-size: 10px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ep-card--equipped .ep-card-name {
  color: #8ed84a;
}

.ep-card-rarity {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ep-rarity-text--common   { color: #8aab70; }
.ep-rarity-text--rare     { color: #5090d0; }
.ep-rarity-text--epic     { color: #9060d0; }
.ep-rarity-text--legendary { color: #e8c040; }

.ep-card-effects {
  font-size: 8px;
  color: rgba(200, 144, 64, 0.45);
  letter-spacing: 0.04em;
  line-height: 1.3;
  text-align: center;
}

/* ── Equipped badge ── */
.ep-equipped-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 3px 0;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-align: center;
  color: #111;
  background: linear-gradient(to right, #52b830, #2e7a1a);
  border-top: 1px solid #6ec040;
}
</style>
