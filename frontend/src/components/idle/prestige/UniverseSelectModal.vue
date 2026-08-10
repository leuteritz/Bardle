<script setup lang="ts">
/**
 * Die Prestige-Wahl: drei Universen, über jedem eine Vorsehung.
 *
 * Früher standen hier alle zehn Universen mit ihrem festen Modifier, und danach
 * kam ein zweiter Schritt für die Vorsehung. Beides ist zusammengefallen: die
 * Wahl ist EINE Entscheidung aus drei gezogenen Karten, und jede sagt in einem
 * Blick, was sie gibt und was sie nimmt. Der Rest des Katalogs steht nicht mehr
 * zur Auswahl — genau das macht die Ziehung zu einer Ziehung.
 */
import { computed, onMounted, onUnmounted } from 'vue'
import RpgFrame from '../../ui/RpgFrame.vue'
import PrestigeOfferCard from './PrestigeOfferCard.vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'

const gameStore = useGameStore()
const providenceStore = useProvidenceStore()

const visible = computed(() => gameStore.showUniverseSelectModal)

/**
 * Eine Karte annehmen: erst die Vorsehung antreten, dann reisen.
 * `selectPrestigeUniverse` startet die Hyperspace-Animation, nach der der Reset
 * läuft — die Vorsehung muss davor stehen, sonst liefe der neue Durchlauf für
 * einen Moment unter der alten.
 */
function pick(universeId: number, providenceId: string) {
  if (!providenceStore.choose(universeId, providenceId)) return
  gameStore.selectPrestigeUniverse(universeId)
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') gameStore.closePrestigeModal()
}

onMounted(() => document.addEventListener('keydown', handleEscape))
onUnmounted(() => document.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9998] flex items-center justify-center rpg-overlay"
        @click.self="gameStore.closePrestigeModal()"
      >
        <div class="relative w-full max-w-5xl mx-4 overflow-hidden rpg-frame">
          <RpgFrame />
          <div class="rpg-accent-bar"></div>

          <!-- Header -->
          <div class="relative flex items-center justify-center p-6 rpg-header">
            <h2 class="text-3xl font-bold uni-title">Choose Your Next Universe</h2>
            <button class="modal-close-btn" @click="gameStore.closePrestigeModal()">✕</button>
          </div>

          <p class="uni-lead">
            Three roads lie open. Each carries its own blessing — and its own price.
          </p>

          <!-- Die drei gezogenen Karten -->
          <div class="flex gap-4 px-6 pb-6 uni-offer">
            <PrestigeOfferCard
              v-for="card in providenceStore.offerCards"
              :key="card.universe.id"
              :universe="card.universe"
              :providence="card.providence"
              @pick="pick(card.universe.id, card.providence.id)"
            />
          </div>

          <!-- Footer -->
          <div class="flex justify-center p-4 uni-footer">
            <button class="px-6 py-2 text-sm uni-cancel-btn" @click="gameStore.closePrestigeModal()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.uni-title {
  color: var(--rpg-gold);
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
}

.uni-lead {
  padding: 0 1.5rem;
  margin-top: 1.1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--rpg-text-dim);
  text-align: center;
}

/* Gleich hohe Karten, damit die Effektblöcke am Fuss auf einer Linie liegen —
   dort wird verglichen. */
.uni-offer {
  align-items: stretch;
}

.uni-footer {
  border-top: 1px solid var(--rpg-border-row);
}

.uni-cancel-btn {
  color: var(--rpg-text-dim);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.uni-cancel-btn:hover {
  color: var(--rpg-text-muted);
  border-color: var(--rpg-text-dim);
}
</style>
