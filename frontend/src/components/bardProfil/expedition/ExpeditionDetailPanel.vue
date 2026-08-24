<script setup lang="ts">
/**
 * Die rechte Spalte: was der angeklickte Ankerplatz ist.
 *
 * Drei Subjekte, drei bestehende Karten — die Spalte selbst hält nur den
 * Rahmen und den Tausch. Ein Vertrag zeigt `ExpeditionContractCard` (Sitze,
 * Hazards, additive Chance, Send), eine Mission das vollhohe Dossier
 * `ExpeditionFieldCard`, und ohne Auswahl steht die Galaxie selbst da.
 *
 * **Eingeklappt wird VERSCHOBEN, nicht abgerissen.** Der Körper behält seine
 * Breite und läuft aus der geklemmten Spur, `overflow: clip` schneidet ihn ab
 * (`hidden` wäre ein Scrollport und liesse sich zurückschieben). Ein `v-if`
 * verlöre die halb besetzte Crew eines Vertrags, und das Wiederaufbauen kostet
 * beim Zurückfahren mehr als die gesparte Ebene einbringt. Den Fokus nimmt
 * `inert`, aber verzögert — sonst liegt seine Arbeit im ersten Frame der Fahrt.
 */
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { VOYAGE_DETAIL_COLLAPSED, VOYAGE_DETAIL_MIN_WIDTH } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { AvailableExpeditionSlot, VoyagePlacedSite } from '@/types'
import ExpeditionContractCard from './ExpeditionContractCard.vue'
import ExpeditionFieldCard from './ExpeditionFieldCard.vue'
import ExpeditionOverviewCard from './ExpeditionOverviewCard.vue'

const props = defineProps<{
  site: VoyagePlacedSite | null
  record: CompletedGalaxyRecord | null
  now: number
  folded: boolean
}>()
const emit = defineEmits<{
  send: [AvailableExpeditionSlot]
  collect: [string]
  'picker-open': [boolean]
  fold: [boolean]
}>()

/** Ein Schlüssel je Subjekt, damit der Tausch die richtige Karte auswechselt. */
const subjectKey = computed(() => {
  if (props.site?.offer) return `offer:${props.site.offer.id}`
  if (props.site?.mission) return `mission:${props.site.mission.id}`
  return `overview:${props.record?.galaxy ?? 0}`
})

const gripWidth = `${VOYAGE_DETAIL_COLLAPSED}px`
const panelMinWidth = `${VOYAGE_DETAIL_MIN_WIDTH - VOYAGE_DETAIL_COLLAPSED}px`

/** Das Icon des gewählten Subjekts — die eingeklappte Spalte meldet, worauf sie zeigt. */
const subjectIcon = computed(
  () => props.site?.offer?.icon ?? props.site?.mission?.icon ?? 'game-icons:scroll-unfurled',
)

const inert = ref(props.folded)
let inertTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.folded,
  (folded) => {
    if (inertTimer !== null) clearTimeout(inertTimer)
    if (!folded) {
      inert.value = false
      inertTimer = null
      return
    }
    // Rein visuelle Verzögerung, deshalb setTimeout und nicht gameTimeout().
    inertTimer = setTimeout(() => {
      inert.value = true
      inertTimer = null
    }, 0)
  },
)
onBeforeUnmount(() => {
  if (inertTimer !== null) clearTimeout(inertTimer)
})
</script>

<template>
  <aside class="edp" :class="{ 'edp--folded': folded }">
    <button
      class="edp-grip"
      :title="folded ? 'Show details' : 'Hide details'"
      :aria-label="folded ? 'Show details' : 'Hide details'"
      :aria-expanded="!folded"
      @click="emit('fold', !folded)"
    >
      <span class="edp-grip-arrow">{{ folded ? '‹' : '›' }}</span>
      <Icon :icon="subjectIcon" width="18" height="18" class="edp-grip-ico" />
    </button>

    <div class="edp-panel" :inert="inert">
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
    </div>
  </aside>
</template>

<style scoped>
.edp {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  min-height: 0;
  background: #14100a;
  border-left: 2px solid #5c3310;
  /* `clip` und nicht `hidden`: hidden ist ein Scrollport, der geklemmte Körper
     liesse sich hineinrollen. */
  overflow: clip;
}

.edp-grip {
  flex-shrink: 0;
  width: v-bind(gripWidth);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  background: #1e1006;
  border: none;
  border-right: 2px solid #5c3310;
  color: #c89040;
  cursor: pointer;
  transition: color 0.13s;
}
.edp-grip:hover {
  color: #e8c040;
}
.edp--folded .edp-grip {
  border-right: none;
  border-left: none;
}
.edp-grip-arrow {
  font-size: 15px;
  line-height: 1;
}
.edp-grip-ico {
  color: rgba(200, 144, 64, 0.55);
}

/* Der Körper behält seine Breite und läuft aus der geklemmten Spur — verschoben,
   nicht versteckt. Die Untergrenze ist die Detailbreite abzüglich des Griffs. */
.edp-panel {
  flex: 1;
  min-width: v-bind(panelMinWidth);
  min-height: 0;
  display: flex;
  flex-direction: column;
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
