<script setup lang="ts">
/**
 * Die rechte Spalte: was der angeklickte Ankerplatz ist.
 *
 * Drei Subjekte, drei bestehende Karten — die Spalte selbst hält nur den
 * Rahmen und den Tausch. Ein Vertrag zeigt `ExpeditionContractCard` (Sitze,
 * Hazards, additive Chance, Send), eine Mission `ExpeditionFieldCard`, und ohne
 * Auswahl steht die Galaxie selbst da.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { AvailableExpeditionSlot, VoyagePlacedSite } from '@/types'
import ExpeditionContractCard from './ExpeditionContractCard.vue'
import ExpeditionFieldCard from './ExpeditionFieldCard.vue'
import ExpeditionOverviewCard from './ExpeditionOverviewCard.vue'

const props = defineProps<{
  site: VoyagePlacedSite | null
  record: CompletedGalaxyRecord | null
  now: number
}>()
const emit = defineEmits<{
  send: [AvailableExpeditionSlot]
  collect: [string]
  'picker-open': [boolean]
}>()

/** Ein Schlüssel je Subjekt, damit der Tausch die richtige Karte auswechselt. */
const subjectKey = computed(() => {
  if (props.site?.offer) return `offer:${props.site.offer.id}`
  if (props.site?.mission) return `mission:${props.site.mission.id}`
  return `overview:${props.record?.galaxy ?? 0}`
})
</script>

<template>
  <aside class="edp">
    <Transition name="edp-swap" mode="out-in">
      <div :key="subjectKey" class="edp-body">
        <ExpeditionContractCard
          v-if="site?.offer"
          variant="column"
          :offer="site.offer"
          :now="now"
          @send="emit('send', $event)"
          @picker-open="emit('picker-open', $event)"
        />
        <ExpeditionFieldCard
          v-else-if="site?.mission"
          variant="column"
          :mission="site.mission"
          :now="now"
          @collect="emit('collect', $event)"
        />
        <ExpeditionOverviewCard v-else-if="record" :record="record" :now="now" />
        <div v-else class="edp-empty">
          <Icon icon="game-icons:treasure-map" width="32" height="32" class="edp-empty-ico" />
          <span class="edp-empty-title">No destination charted</span>
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.edp {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #14100a;
  border-left: 2px solid #5c3310;
}
.edp-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.edp-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  text-align: center;
}
.edp-empty-ico {
  color: rgba(200, 144, 64, 0.24);
}
.edp-empty-title {
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
}

/* Die Spalte TAUSCHT ihr Subjekt, sie schiebt es nicht — dasselbe Verhalten
   wie die Detailspalte des Shop-Atlas. */
.edp-swap-enter-active {
  transition:
    opacity 0.17s ease,
    transform 0.17s ease;
}
.edp-swap-leave-active {
  transition:
    opacity 0.09s ease,
    transform 0.09s ease;
}
.edp-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.edp-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .edp-swap-enter-active,
  .edp-swap-leave-active {
    transition: none;
  }
}
</style>
