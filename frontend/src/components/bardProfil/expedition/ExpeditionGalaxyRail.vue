<script setup lang="ts">
/**
 * Die rechte Spalte: der laufende Lauf, dann jede befreite Galaxie, jüngste
 * zuerst.
 *
 * Die Live-Zeile steht OBEN und immer: sie ist die einzige Galaxie, die der
 * Atlas nicht führen kann, und ohne sie hätte der Reiter vor der ersten
 * Befreiung keinen einzigen Eintrag.
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
 * und die Geste gehört dem Griff daneben (`ui/SideRailHandle.vue`, geteilt mit den drei anderen Leisten).
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
import ExpeditionLiveRow from './ExpeditionLiveRow.vue'

const props = defineProps<{
  rows: VoyageRailRow[]
  records: CompletedGalaxyRecord[]
  selected: number
  live: boolean
}>()
const emit = defineEmits<{ select: [galaxy: number]; selectLive: [] }>()

function recordFor(records: CompletedGalaxyRecord[], galaxy: number) {
  return records.find((r) => r.galaxy === galaxy)
}

/**
 * Ein Sprung von aussen (Universe, Minimap, Fleet-Band) markiert eine Zeile,
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
  <aside class="sr egl" :aria-label="VOYAGE_RAIL_HANDLE_LABEL">
    <div ref="scroll" class="sr-scroll egl-scroll">
      <ExpeditionLiveRow :selected="live" @select="emit('selectLive')" />

      <template v-for="row in rows" :key="row.galaxy">
        <ExpeditionGalaxyRow
          v-if="recordFor(records, row.galaxy)"
          :row="row"
          :record="recordFor(records, row.galaxy)!"
          :selected="selected === row.galaxy"
          @select="emit('select', $event)"
        />
      </template>
    </div>
  </aside>
</template>

<style scoped>
/* Flaeche, Naht und Rollkasten stehen als `.sr-*` im Theme. Hier steht NUR,
   was diese Leiste allein weiss. */

/* Seitlich an die Konstante gebunden — der Ladeschleier baut dieselbe Zone,
   und zwei Zahlen dafuer liefen still auseinander. Karten brauchen mehr Luft
   ZUEINANDER als randlose Zeilen, deshalb der eigene `gap`. */
.egl-scroll {
  padding: 10px v-bind(padX) 14px;
  gap: 5px;
}
</style>
