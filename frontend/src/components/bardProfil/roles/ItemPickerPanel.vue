<script setup lang="ts">
import type { ItemCategory, ShopItem, SlotEquipment } from '@/types'

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

defineProps<{
  selectedCategory: ItemCategory
  categoryItems: ShopItem[]
  currentEquipment: SlotEquipment
}>()

const emit = defineEmits<{
  back: []
  equip: [itemId: string]
}>()
</script>

<template>
  <div class="item-picker-panel">
    <div class="sub-header">
      <span class="sub-header-title">
        Select {{ CAT_ICONS[selectedCategory] }} {{ CAT_LABELS[selectedCategory] }}
      </span>
      <button class="back-btn" @click="emit('back')">← Back</button>
    </div>

    <div class="item-body">
      <div v-if="categoryItems.length === 0" class="picker-empty">
        <span class="picker-empty-icon">🎵</span>
        <span>No Items Available</span>
      </div>
      <button
        v-for="item in categoryItems"
        :key="item.id"
        class="item-row"
        :class="{ 'item-row--active': currentEquipment[selectedCategory] === item.id }"
        @click="emit('equip', item.id)"
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
        <span v-if="currentEquipment[selectedCategory] === item.id" class="item-row-check">✓</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.item-picker-panel {
  --gold: #c89040;
  --gold-bright: #e8c060;
  --gold-dim: rgba(200, 144, 64, 0.32);
  --green: #6ec040;
  --border: rgba(92, 51, 16, 0.45);
  --border-hover: rgba(200, 144, 64, 0.6);

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 7px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.5);
  flex-shrink: 0;
  background: #1e1006;
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
