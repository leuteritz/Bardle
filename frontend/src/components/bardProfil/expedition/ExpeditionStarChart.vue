<script setup lang="ts">
/**
 * Die Sternenkarte: jede befreite Galaxie als Ziel, jüngste zuerst.
 *
 * Ein Band und keine Fläche — die Karte beantwortet „wo war ich, was habe ich
 * dort kartiert", und darunter steht das Vertragsbrett, das die eigentliche
 * Entscheidung trägt. Ein Klick fokussiert ein Ziel und hebt die Verträge
 * dorthin hervor; ein zweiter Klick hebt den Fokus wieder auf.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { EXPEDITION_CHART_MAX } from '@/config/constants'
import ExpeditionDestinationCard from './ExpeditionDestinationCard.vue'

const galaxyStore = useGalaxyStore()
const chartStore = useExpeditionChartStore()
const expeditionStore = useExpeditionStore()
const { selectedGalaxy } = storeToRefs(chartStore)

/** Jüngstes Ziel zuerst — dorthin laufen auch die meisten Verträge. */
const records = computed(() =>
  [...galaxyStore.completedGalaxies].sort((a, b) => b.galaxy - a.galaxy),
)

const contractsPerGalaxy = computed(() => {
  const out: Record<number, number> = {}
  for (const slot of expeditionStore.availableExpeditions) {
    out[slot.galaxy] = (out[slot.galaxy] ?? 0) + 1
  }
  return out
})

const chartedTotal = computed(() => chartStore.chartedCount)

function select(galaxy: number) {
  selectedGalaxy.value = selectedGalaxy.value === galaxy ? 0 : galaxy
  chartStore.markSeen(galaxy)
}
</script>

<template>
  <section class="esc">
    <header class="esc-head">
      <Icon icon="game-icons:treasure-map" width="18" height="18" class="esc-head-ico" />
      <span class="esc-title">The Chart</span>
      <span class="esc-count">{{ records.length }} freed</span>
      <span class="esc-rule" />
      <span class="esc-hint">
        every run charts a port further — up to {{ EXPEDITION_CHART_MAX }}
      </span>
      <span class="esc-charted">
        charted {{ chartedTotal }} / {{ records.length }}
      </span>
      <span v-if="selectedGalaxy > 0" class="esc-focus">
        <Icon icon="lucide:crosshair" width="12" height="12" />
        focused — click again to clear
      </span>
    </header>

    <div class="esc-band">
      <ExpeditionDestinationCard
        v-for="rec in records"
        :key="rec.galaxy"
        :record="rec"
        :progress="chartStore.progressOf(rec.galaxy)"
        :selected="selectedGalaxy === rec.galaxy"
        :contracts="contractsPerGalaxy[rec.galaxy] ?? 0"
        @select="select"
      />
    </div>
  </section>
</template>

<style scoped>
.esc {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 14px 10px;
  background: #14120c;
  border-bottom: 2px solid #3e200a;
}

.esc-head {
  display: flex;
  align-items: center;
  gap: 9px;
}
.esc-head-ico {
  color: #c89040;
  flex-shrink: 0;
}
.esc-title {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 16px;
  letter-spacing: 0.09em;
  color: #e8c040;
}
.esc-count,
.esc-charted {
  font-size: 12px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.6);
  font-variant-numeric: tabular-nums;
}
.esc-rule {
  flex: 1;
  height: 1px;
  background: rgba(200, 164, 90, 0.16);
}
.esc-focus {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #e8c040;
}

.esc-band {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.esc-band::-webkit-scrollbar {
  height: 6px;
}
.esc-band::-webkit-scrollbar-track {
  background: #111;
}
.esc-band::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}

.esc-hint {
  font-size: 11.5px;
  color: rgba(200, 144, 64, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
