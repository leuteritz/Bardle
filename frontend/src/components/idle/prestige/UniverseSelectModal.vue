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
function pick(universeId: number) {
  if (!providenceStore.choose(universeId)) return
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

          <!-- Die drei gezogenen Karten. Ohne erklärende Zeile darüber: der
               Titel sagt, was zu tun ist, und die Karten sagen es noch einmal —
               ein Satz dazwischen stünde nur zwischen Blick und Entscheidung. -->
          <div class="flex gap-4 px-6 pt-6 pb-6 uni-offer">
            <PrestigeOfferCard
              v-for="card in providenceStore.offerCards"
              :key="card.universe.id"
              :universe="card.universe"
              :providence="card.providence"
              @pick="pick(card.universe.id)"
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
