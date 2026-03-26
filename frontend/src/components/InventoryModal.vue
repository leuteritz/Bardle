<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '../stores/inventoryStore'
import { MATERIALS } from '../config/materials'

const inventoryStore = useInventoryStore()

const allMaterials = computed(() =>
  MATERIALS.map((m) => ({
    ...m,
    count: inventoryStore.collectedMaterials[m.id] ?? 0,
  })),
)

const rarityColor: Record<string, string> = {
  common: '#fbbf24',
  uncommon: '#34d399',
  rare: '#60a5fa',
  epic: '#c084fc',
}

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="open"
      class="modal-backdrop"
      @click="onBackdropClick"
      aria-modal="true"
      role="dialog"
    >
      <div class="modal-card rpg-frame">
        <!-- Gold Accent -->
        <div class="rpg-accent-bar" style="width: 100%" />

        <!-- Header -->
        <div class="flex items-center justify-between w-full mb-1 px-6 pt-4">
          <h2 class="modal-title">🎒 Inventar</h2>
          <button class="rpg-close-btn px-2 py-1" @click="emit('close')" aria-label="Schließen">✕</button>
        </div>

        <div class="divider" />

        <!-- Materialien -->
        <section class="w-full px-6 pb-5">
          <h3 class="section-label">Materialien</h3>
          <div class="material-grid">
            <div
              v-for="material in allMaterials"
              :key="material.id"
              class="material-card"
              :class="{ 'material-card--empty': material.count === 0 }"
              :style="{
                borderColor: rarityColor[material.rarity],
                boxShadow:
                  material.count > 0
                    ? `0 0 10px ${rarityColor[material.rarity]}55, inset 0 0 8px ${rarityColor[material.rarity]}15`
                    : `0 0 4px ${rarityColor[material.rarity]}22`,
              }"
            >
              <span
                class="material-card__count"
                :style="{
                  color:
                    material.count > 0 ? rarityColor[material.rarity] : 'rgba(180,180,180,0.45)',
                }"
                >{{ material.count }}</span
              >
              <div class="material-card__icon-wrapper">
                <img :src="material.image" class="material-card__img" alt="" />
              </div>
              <div
                class="material-card__name"
                :style="{
                  color:
                    material.count > 0 ? rarityColor[material.rarity] : 'rgba(180,180,180,0.4)',
                }"
              >
                {{ material.name }}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
}

.modal-card {
  width: clamp(300px, 38vw, 480px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  overflow: hidden;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--rpg-gold);
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
  letter-spacing: 0.05em;
  margin: 0;
}

.divider {
  width: 100%;
  height: 1px;
  background: var(--rpg-wood-mid);
  margin: 0.25rem 0;
}

.section-label {
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-gold-dim);
  margin: 0.5rem 0;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  width: 100%;
}

.material-card {
  position: relative;
  padding: 0.75rem 0.6rem 0.6rem;
  border-radius: 4px;
  border: 1px solid;
  background: var(--rpg-bg-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  transition:
    box-shadow 0.2s,
    opacity 0.2s;
}

.material-card--empty {
  opacity: 0.35;
  filter: grayscale(0.6);
}

.material-card__count {
  position: absolute;
  top: 0.35rem;
  right: 0.5rem;
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

.material-card__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 10rem;
}

.material-card__img {
  width: 10rem;
  height: 10rem;
  object-fit: contain;
}

.material-card__name {
  font-size: 1.2rem;
  text-align: center;
  line-height: 1.2;
}

/* Transition */
.modal-fade-enter-active {
  animation: modalIn 0.22s ease-out;
}
.modal-fade-leave-active {
  animation: modalOut 0.18s ease-in forwards;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.92);
  }
}
</style>
