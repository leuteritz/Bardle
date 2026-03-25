<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '../stores/inventoryStore'
import { MATERIALS } from '../config/materials'

defineProps<{ visible: boolean }>()

const inventoryStore = useInventoryStore()

const rarityColor: Record<string, string> = {
  common: '#fbbf24',
  uncommon: '#34d399',
  rare: '#60a5fa',
  epic: '#c084fc',
}

const tooltipMaterials = computed(() =>
  MATERIALS.map((m) => ({
    ...m,
    count: inventoryStore.collectedMaterials[m.id] ?? 0,
  })),
)
</script>

<template>
  <Transition name="tooltip-fade">
    <div v-if="visible" class="inventory-tooltip">
      <div class="inventory-tooltip__title">Materialien</div>
      <div class="inventory-tooltip__grid">
        <div
          v-for="m in tooltipMaterials"
          :key="m.id"
          class="inventory-tooltip__item"
          :class="{ 'inventory-tooltip__item--empty': m.count === 0 }"
          :style="{ borderColor: rarityColor[m.rarity] }"
        >
          <img :src="m.image" class="inventory-tooltip__img" alt="" />
          <span class="inventory-tooltip__name" :style="{ color: rarityColor[m.rarity] }">
            {{ m.name }}
          </span>
          <span class="inventory-tooltip__count" :style="{ color: rarityColor[m.rarity] }">
            {{ m.count }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.inventory-tooltip {
  position: absolute;
  right: calc(100% + 0.75rem);
  top: 0.5rem;
  z-index: 150;
  background: linear-gradient(135deg, #020818 0%, #06152e 50%, #020c1a 100%);
  border: 1px solid rgba(251, 146, 60, 0.25);
  border-radius: 0.75rem;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(251, 146, 60, 0.06);
  backdrop-filter: blur(12px);
  padding: 0.75rem 0.875rem;
  min-width: 220px;
  pointer-events: none;
  white-space: nowrap;
}

.inventory-tooltip__title {
  font-size: 1rem;
  font-weight: bold;
  letter-spacing: 0.08em;
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
  margin-bottom: 0.5rem;
}

.inventory-tooltip__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
}

.inventory-tooltip__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.35rem 0.25rem;
  border-radius: 0.4rem;
  border: 1px solid;
  background: rgba(0, 0, 0, 0.2);
  transition: opacity 0.15s;
}

.inventory-tooltip__item--empty {
  opacity: 0.3;
  filter: grayscale(0.7);
}

.inventory-tooltip__img {
  width: 2.25rem;
  height: 2.25rem;
  object-fit: contain;
}

.inventory-tooltip__name {
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.1;
}

.inventory-tooltip__count {
  font-size: 0.85rem;
  font-weight: bold;
  line-height: 1;
}

.tooltip-fade-enter-active {
  animation: tooltipIn 0.15s ease-out;
}
.tooltip-fade-leave-active {
  animation: tooltipOut 0.1s ease-in forwards;
}

@keyframes tooltipIn {
  from {
    opacity: 0;
    transform: translateX(6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes tooltipOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(6px);
  }
}
</style>
