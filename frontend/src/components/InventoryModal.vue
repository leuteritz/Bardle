<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useShopStore } from '../stores/shopStore'
import { formatNumber } from '../config/numberFormat'

const gameStore = useGameStore()
const shopStore = useShopStore()

const ownedBuildings = computed(() =>
  shopStore.shopUpgrades.filter((u) => u.level > 0),
)

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="open" class="modal-backdrop" @click="onBackdropClick" aria-modal="true" role="dialog">
      <div class="modal-card">
        <!-- Header -->
        <div class="flex items-center justify-between w-full mb-1">
          <h2 class="modal-title">🎒 Inventar</h2>
          <button class="close-btn" @click="emit('close')" aria-label="Schließen">✕</button>
        </div>

        <div class="divider" />

        <!-- Ressourcen -->
        <section class="w-full">
          <h3 class="section-label">Ressourcen</h3>
          <ul class="item-list">
            <li class="item-row">
              <img src="/img/BardAbilities/BardChime.png" class="item-icon" />
              <span class="item-name">Chimes</span>
              <span class="item-count">{{ formatNumber(gameStore.chimes) }}</span>
            </li>
            <li class="item-row">
              <img src="/img/BardAbilities/BardMeep.png" class="item-icon" />
              <span class="item-name">Meeps</span>
              <span class="item-count">{{ formatNumber(gameStore.meeps) }}</span>
            </li>
          </ul>
        </section>

        <!-- Gebäude -->
        <section class="w-full mt-2">
          <h3 class="section-label">Gebäude</h3>
          <ul v-if="ownedBuildings.length > 0" class="item-list">
            <li v-for="building in ownedBuildings" :key="building.id" class="item-row">
              <img :src="building.icon" class="item-icon" :alt="building.name" />
              <span class="item-name">{{ building.name }}</span>
              <span class="item-count">{{ building.level }}</span>
            </li>
          </ul>
          <p v-else class="empty-hint">Noch keine Gebäude erworben.</p>
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
  background: rgba(0, 2, 15, 0.7);
  backdrop-filter: blur(6px);
}

.modal-card {
  width: clamp(300px, 38vw, 480px);
  background: linear-gradient(135deg, #020818 0%, #06152e 50%, #020c1a 100%);
  border: 1px solid rgba(251, 146, 60, 0.2);
  border-radius: 1rem;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(251, 146, 60, 0.08);
  backdrop-filter: blur(16px);
  padding: 1.5rem 1.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fbbf24;
  text-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
  letter-spacing: 0.05em;
  margin: 0;
  font-family: 'MedievalSharp', serif;
}

.close-btn {
  color: rgba(251, 146, 60, 0.6);
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem 0.4rem;
  border-radius: 0.4rem;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover {
  color: #fb923c;
  background: rgba(251, 146, 60, 0.1);
}

.divider {
  width: 100%;
  height: 1px;
  background: rgba(251, 146, 60, 0.15);
  margin: 0.25rem 0;
}

.section-label {
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(251, 146, 60, 0.45);
  margin: 0 0 0.4rem 0;
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.15s;
}
.item-row:hover {
  background: rgba(251, 146, 60, 0.06);
}

.item-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 4px rgba(251, 146, 60, 0.3));
}

.item-name {
  flex: 1;
  font-size: 0.88rem;
  color: rgba(255, 220, 160, 0.85);
  font-family: 'MedievalSharp', serif;
}

.item-count {
  font-size: 0.95rem;
  font-weight: bold;
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
  font-family: 'MedievalSharp', serif;
  min-width: 2.5rem;
  text-align: right;
}

.empty-hint {
  font-size: 0.78rem;
  color: rgba(255, 200, 130, 0.4);
  margin: 0.25rem 0 0;
  font-style: italic;
}

/* Transition */
.modal-fade-enter-active {
  animation: modalIn 0.22s ease-out;
}
.modal-fade-leave-active {
  animation: modalOut 0.18s ease-in forwards;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.9) translateY(-8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes modalOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.92); }
}
</style>
