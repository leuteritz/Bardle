<script setup lang="ts">
import { SHOP_ITEMS } from '@/config/items'
import type { ItemCategory, ShopItem, SlotEquipment } from '@/types'

const props = defineProps<{
  equipment: SlotEquipment
  collapsed: boolean
  roleColor: string
}>()

const emit = defineEmits<{
  'open-item-picker': [cat: ItemCategory]
}>()

const CAT_LABELS: Record<ItemCategory, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  artefact: 'Artefact',
}

function getEquippedItem(cat: ItemCategory): ShopItem | null {
  const id = props.equipment[cat]
  if (!id) return null
  return SHOP_ITEMS.find((i) => i.id === id) ?? null
}
</script>

<template>
  <div
    class="splash-equip-bar"
    :class="{ 'splash-equip-bar--collapsed': collapsed }"
    :style="{ '--rc': roleColor }"
    @click.stop
  >
    <button
      v-for="cat in ['weapon', 'armor', 'artefact'] as ItemCategory[]"
      :key="cat"
      class="hud-equip-btn"
      :class="{ 'hud-equip-btn--filled': equipment[cat] !== null }"
      :title="getEquippedItem(cat)?.name ?? CAT_LABELS[cat]"
      @click.stop="emit('open-item-picker', cat)"
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
        <img
          v-else
          class="hud-equip-slot-img"
          :src="`/img/itemShop/${cat}.png`"
          :alt="CAT_LABELS[cat]"
          width="40"
          height="40"
          loading="eager"
        />
      </div>
      <div class="hud-equip-meta">
        <span class="hud-equip-name">{{ getEquippedItem(cat)?.name ?? '— empty —' }}</span>
        <span class="hud-equip-cat">{{ CAT_LABELS[cat] }}</span>
      </div>
      <div v-if="equipment[cat]" class="hud-equip-filled-dot" />
    </button>
  </div>
</template>

<style scoped>
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
  border-radius: var(--bp-radius);
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
  transition: transform 0.3s ease, opacity 0.25s ease;
}
.splash-equip-bar--collapsed {
  transform: translateX(-50%) translateY(130%);
  opacity: 0;
  pointer-events: none;
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

.hud-equip-art {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--bp-radius);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  flex-shrink: 0;
}
.hud-equip-btn--filled .hud-equip-art {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(200, 144, 64, 0.45);
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
.hud-equip-slot-img {
  width: 62px;
  height: 62px;
  object-fit: contain;
  image-rendering: auto;
  opacity: 0.3;
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.hud-equip-btn:hover .hud-equip-slot-img {
  opacity: 0.65;
  transform: scale(1.07);
}

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
</style>
