<script setup lang="ts">
/**
 * Die Kartenspur des Fleet-Bandes — eine Karte je Expedition, über ALLE Galaxien.
 *
 * Sie hat FESTE Höhe und bricht nicht um: `.etc-bar` ist eine auto-Grid-Zeile,
 * eine wachsende Spur nähme der Bühne Höhe und malte die Galaxie bei jedem Spawn
 * neu.
 *
 * Anders als die Pillen davor passen nicht mehr alle Marken nebeneinander — eine
 * Karte trägt fünf Portraits. Zugesagt ist der Boden aus
 * `VOYAGE_FLEET_CARD_MIN_VISIBLE`; weil `buildVoyageFleetCards` nach
 * Dringlichkeit ordnet, sind die sichtbaren die, die etwas wollen. Was dahinter
 * liegt, nennt der `+N`-Chip — still verschwinden darf nichts.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ExpeditionFleetCard from './ExpeditionFleetCard.vue'
import { VOYAGE_FLEET_CARD_GAP, VOYAGE_FLEET_CARD_MIN_W } from '@/config/constants'
import type { VoyageFleetCard } from '@/types'

const props = defineProps<{
  cards: VoyageFleetCard[]
  selectedKey: string | null
  now: number
}>()
const emit = defineEmits<{ open: [galaxy: number, pinKey: string] }>()

const gap = `${VOYAGE_FLEET_CARD_GAP}px`

const trackEl = ref<HTMLElement | null>(null)
const trackW = ref(0)

/** Wie viele Karten ohne Scrollen stehen. Nur bei Resize gerechnet, nie im Takt. */
const fits = computed(() => {
  if (trackW.value <= 0) return props.cards.length
  const step = VOYAGE_FLEET_CARD_MIN_W + VOYAGE_FLEET_CARD_GAP
  return Math.max(1, Math.floor((trackW.value + VOYAGE_FLEET_CARD_GAP) / step))
})
const hidden = computed(() => Math.max(0, props.cards.length - fits.value))

let ro: ResizeObserver | null = null
onMounted(() => {
  if (!trackEl.value) return
  ro = new ResizeObserver(([entry]) => {
    // Die 0 eines versteckten Panels verwerfen, sonst spränge der Chip beim
    // Zurückkehren einen Frame lang auf.
    const w = entry.contentRect.width
    if (w > 0) trackW.value = w
  })
  ro.observe(trackEl.value)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

/** Der Chip rollt zur ersten verdeckten Karte, statt nur zu zählen. */
function scrollOn() {
  trackEl.value?.scrollBy({ left: trackW.value * 0.8, behavior: 'smooth' })
}
</script>

<template>
  <div class="efl">
    <div ref="trackEl" class="efl-track rpg-scrollbar">
      <ExpeditionFleetCard
        v-for="card in cards"
        :key="card.pinKey"
        :card="card"
        :now="now"
        :selected="card.pinKey === selectedKey"
        @open="(galaxy, pinKey) => emit('open', galaxy, pinKey)"
      />

      <p v-if="!cards.length" class="efl-empty">
        <Icon icon="lucide:timer" width="14" height="14" />
        No contracts bound anywhere — the next one is on its way
      </p>
    </div>

    <button
      v-if="hidden > 0"
      class="efl-more"
      :aria-label="`${hidden} more contracts — scroll the lane`"
      :title="`${hidden} more`"
      @click="scrollOn"
    >
      +{{ hidden }}
    </button>
  </div>
</template>

<style scoped>
.efl {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
}

.efl-track {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: v-bind(gap);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 transparent;
}
.efl-track::-webkit-scrollbar {
  height: 4px;
}
.efl-track::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}
.efl-track::-webkit-scrollbar-track {
  background: transparent;
}

.efl-empty {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.45);
}

/* Liegt ÜBER der Spur statt in ihr — nähme er Flussbreite, änderte er die Zahl,
   die er meldet. */
.efl-more {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 800;
  color: #e8c040;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: -14px 0 18px 10px rgba(22, 16, 10, 0.92);
}
.efl-more:hover {
  background: #2a1c0a;
}
</style>
