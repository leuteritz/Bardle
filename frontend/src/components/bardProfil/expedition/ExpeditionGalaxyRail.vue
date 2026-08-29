<script setup lang="ts">
/**
 * Die linke Spalte: jede befreite Galaxie, jüngste zuerst.
 *
 * Gesteuert und dumm, wie `ShopFacetRail` — sie rendert die Zeilen, die man ihr
 * gibt, und meldet zurück, welche getroffen wurde. Was eine Galaxie BEDEUTET,
 * bleibt beim Atlas, der sie als Einziger gegen die Kataloge auflösen kann.
 *
 * Die Zähler sind nicht Zierrat: sie sind die Antwort auf „wo liegt gerade
 * etwas". Ohne sie wäre die Leiste eine Liste ohne Auskunft, und der Spieler
 * müsste jede Galaxie durchklicken, um eine leere Karte zu finden.
 */
import { onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageRailRow } from '@/types'
import { VOYAGE_RAIL_REVEAL_PAD } from '@/config/constants'
import ExpeditionGalaxyRow from './ExpeditionGalaxyRow.vue'

const props = defineProps<{
  rows: VoyageRailRow[]
  records: CompletedGalaxyRecord[]
  selected: number
  folded: boolean
}>()
const emit = defineEmits<{ select: [galaxy: number]; fold: [folded: boolean] }>()

function recordFor(records: CompletedGalaxyRecord[], galaxy: number) {
  return records.find((r) => r.galaxy === galaxy)
}

/**
 * Ein Sprung von aussen (Firmament, Minimap, Fleet-Band) markiert eine Zeile,
 * die weit unten liegen kann — unsichtbar markiert saehe der Sprung aus, als
 * haette er nichts getroffen.
 *
 * Gerollt wird der gemeinte Kasten SELBST, nie per `scrollIntoView()`: das
 * zieht jeden scrollbaren Vorfahren mit und riss den Reiter schon zweimal
 * seitwaerts.
 */
const scroll = ref<HTMLElement | null>(null)

function revealSelected() {
  const box = scroll.value
  const el = box?.querySelector<HTMLElement>(`[data-galaxy="${props.selected}"]`)
  // Ein versteckter Reiter meldet 0 — dann traegt die Rechnung nichts.
  if (!box || !el || box.clientHeight === 0) return
  const r = el.getBoundingClientRect()
  const c = box.getBoundingClientRect()
  if (r.top < c.top) box.scrollTop -= c.top - r.top + VOYAGE_RAIL_REVEAL_PAD
  else if (r.bottom > c.bottom) box.scrollTop += r.bottom - c.bottom + VOYAGE_RAIL_REVEAL_PAD
}

// `post`: der Deep-Link-Watcher laeuft `pre`, und der Reiter haengt an
// `v-show` — vor dem DOM-Update misst der Rollkasten 0.
watch(() => props.selected, revealSelected, { flush: 'post' })
// Deckt das ALLERERSTE Oeffnen ab: da waehlt der Sprung, bevor es die Leiste
// gibt, es gaebe also keinen Wechsel, auf den ein Watcher anspringen koennte.
onMounted(revealSelected)
</script>

<template>
  <aside class="egl" :class="{ 'egl--folded': folded }">
    <button
      class="egl-grip"
      :title="folded ? 'Show destinations' : 'Hide destinations'"
      :aria-label="folded ? 'Show destinations' : 'Hide destinations'"
      :aria-expanded="!folded"
      @click="emit('fold', !folded)"
    >
      <Icon icon="game-icons:treasure-map" width="16" height="16" />
      <span v-if="!folded" class="egl-grip-label">Destinations</span>
      <span v-if="!folded" class="egl-grip-count">{{ rows.length }}</span>
      <span class="egl-grip-arrow">{{ folded ? '›' : '‹' }}</span>
    </button>

    <div ref="scroll" class="egl-scroll rpg-scrollbar">
      <template v-for="row in rows" :key="row.galaxy">
        <ExpeditionGalaxyRow
          v-if="recordFor(records, row.galaxy)"
          :row="row"
          :record="recordFor(records, row.galaxy)!"
          :selected="selected === row.galaxy"
          :folded="folded"
          @select="emit('select', $event)"
        />
      </template>

      <p v-if="!rows.length" class="egl-empty">
        No galaxy freed yet — rescue every star and defeat the core to open your first port.
      </p>
    </div>
  </aside>
</template>

<style scoped>
.egl {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #12100a;
  border-right: 2px solid #5c3310;
}

.egl-grip {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 9px 10px;
  background: #1e1006;
  border: none;
  border-bottom: 2px solid #5c3310;
  color: #c89040;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.egl-grip:hover {
  color: #e8c040;
}
.egl--folded .egl-grip {
  justify-content: center;
  padding: 9px 0;
}
.egl-grip-count {
  color: rgba(200, 144, 64, 0.5);
  font-variant-numeric: tabular-nums;
}
.egl-grip-arrow {
  margin-left: auto;
  font-size: 13px;
  line-height: 1;
}
.egl--folded .egl-grip-arrow {
  display: none;
}

.egl-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 7px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.egl--folded .egl-scroll {
  padding: 6px 4px 12px;
}
.egl-scroll::-webkit-scrollbar {
  width: 4px;
}
.egl-scroll::-webkit-scrollbar-track {
  background: #111;
}
.egl-scroll::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.egl-empty {
  padding: 16px 8px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.45;
  color: rgba(200, 144, 64, 0.4);
}
.egl--folded .egl-empty {
  display: none;
}
</style>
