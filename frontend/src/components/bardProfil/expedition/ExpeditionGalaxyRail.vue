<script setup lang="ts">
/**
 * Die rechte Spalte: jede befreite Galaxie, jüngste zuerst.
 *
 * Gesteuert und dumm, wie `ShopFacetRail` — sie rendert die Zeilen, die man ihr
 * gibt, und meldet zurück, welche getroffen wurde. Was eine Galaxie BEDEUTET,
 * bleibt beim Atlas, der sie als Einziger gegen die Kataloge auflösen kann.
 *
 * Die Zähler sind nicht Zierrat: sie sind die Antwort auf „wo liegt gerade
 * etwas". Ohne sie wäre die Leiste eine Liste ohne Auskunft, und der Spieler
 * müsste jede Galaxie durchklicken, um eine leere Karte zu finden.
 *
 * Sie kennt ihren Klappzustand NICHT mehr: sie fährt als ganzes Stück hinaus,
 * und die Geste gehört dem Griff daneben (`ExpeditionRailHandle`).
 *
 * Sie hat auch KEINE eigene Überschrift mehr. Ihr Kopfband zeigte dasselbe Wort,
 * das senkrecht auf dem Griff steht, und nahm ihr dafür 37,5 px Höhe; die Zahl
 * daneben ist mit ihm an den Griff gewandert. Dieselbe Aufteilung wie im Skill
 * Tree, wo `StarForgePanel` titellos ist.
 */
import { onMounted, ref, watch } from 'vue'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageRailRow } from '@/types'
import {
  VOYAGE_RAIL_HANDLE_LABEL,
  VOYAGE_RAIL_PAD_X,
  VOYAGE_RAIL_REVEAL_PAD,
} from '@/config/constants'
import ExpeditionGalaxyRow from './ExpeditionGalaxyRow.vue'

const props = defineProps<{
  rows: VoyageRailRow[]
  records: CompletedGalaxyRecord[]
  selected: number
}>()
const emit = defineEmits<{ select: [galaxy: number] }>()

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

const padX = `${VOYAGE_RAIL_PAD_X}px`
</script>

<template>
  <!-- Ohne Kopfband ist der Griff daneben die einzige Beschriftung, und der
       steht in einem Knopf — ohne das `aria-label` waere die Region namenlos. -->
  <aside class="egl" :aria-label="VOYAGE_RAIL_HANDLE_LABEL">
    <div ref="scroll" class="egl-scroll rpg-scrollbar">
      <template v-for="row in rows" :key="row.galaxy">
        <ExpeditionGalaxyRow
          v-if="recordFor(records, row.galaxy)"
          :row="row"
          :record="recordFor(records, row.galaxy)!"
          :selected="selected === row.galaxy"
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
/* Dieselbe Fläche und dieselbe Naht wie die Forge-Detailspalte (`.sf-panel`):
   eine Seitenleiste liest sich in diesem Spiel als EIN Ort, nicht als einer je
   Reiter. Die Naht gehört immer der rechten Zone — eine zweite Linie am
   Nachbarn verdoppelte sie. */
.egl {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #111008;
  border-left: 2px solid #5c3310;
}

.egl-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* Seitlich an die Konstante gebunden — der Ladeschleier baut dieselbe Zone,
     und zwei Zahlen dafuer liefen still auseinander. Karten brauchen mehr Luft
     ZUEINANDER als randlose Zeilen, deshalb der groessere `gap`. */
  padding: 10px v-bind(padX) 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
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
</style>
