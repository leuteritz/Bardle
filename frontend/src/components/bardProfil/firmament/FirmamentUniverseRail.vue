<script setup lang="ts">
/**
 * Die Universumsleiste — sie waehlt die BAHN, die die Karte zeigt.
 *
 * Sie steht RECHTS und traegt das Rezept der Forge-Detailspalte: dieselbe Flaeche
 * `#111008`, dieselbe Naht `border-left: 2px #5c3310`, dieselbe Zeilenkarte
 * `#1c1c18` / `1px #32210c`. Eine Seitenleiste ist in diesem Spiel EIN Ort, nicht
 * einer je Reiter.
 *
 * Sie hat KEINE eigene Ueberschrift, genau wie ihre beiden Vorbilder: das Wort
 * steht senkrecht auf dem Griff daneben, und die Zahl der begangenen Universen
 * folgt ihm dort im Fluss. Ein Kopfband darueber zeigte dasselbe Wort ein zweites
 * Mal und nahm der Liste dafuer 38 px.
 *
 * Und sie kennt ihren Klappzustand NICHT — das Panel wird als Ganzes verschoben,
 * die Zeilen bleiben, wie sie sind. Genau deshalb ueberlebt die Rollposition das
 * Zuklappen, ohne dass jemand sie sichert.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  FIRMAMENT_HERE_COLOR,
  FIRMAMENT_RAIL_HANDLE_LABEL,
  FIRMAMENT_RAIL_PAD_X,
  FIRMAMENT_RAIL_REVEAL_PAD,
  UNIVERSE_DISC_RAIL_COMPACT_PX,
  UNIVERSE_DISC_RAIL_PX,
  UNIVERSE_RAIL_COMPACT_MAX_VH,
  UNIVERSE_RAIL_ROW_GAP,
  UNIVERSE_RAIL_ROW_GAP_COMPACT,
} from '@/config/constants'
import UniverseDisc from './UniverseDisc.vue'
import type { FirmamentRailRow } from '@/utils/ui/firmamentRail'
import type { FirmamentSelection } from '@/types'

const props = defineProps<{
  rows: FirmamentRailRow[]
  selection: FirmamentSelection
}>()

const emit = defineEmits<{
  (e: 'select', value: FirmamentSelection): void
}>()

/** Kein Toggle: die Bahn ist der Ansichtszustand, es gibt kein Nichts. */
function pick(row: FirmamentRailRow) {
  if (!row.pickable || row.picked) return
  emit('select', { universe: row.id, galaxy: null })
}

/* Den Rollkasten SELBST rollen — `scrollIntoView` rollt jeden scrollbaren
   Vorfahren mit und riss den Reiter schon zweimal seitwaerts. */
const scroll = ref<HTMLElement | null>(null)

function revealSelected() {
  const box = scroll.value
  const el = box?.querySelector<HTMLElement>(`[data-universe="${props.selection.universe}"]`)
  // Ein versteckter Reiter meldet 0 — dann traegt die Rechnung nichts.
  if (!box || !el || box.clientHeight === 0) return
  const r = el.getBoundingClientRect()
  const c = box.getBoundingClientRect()
  if (r.top < c.top) box.scrollTop -= c.top - r.top + FIRMAMENT_RAIL_REVEAL_PAD
  else if (r.bottom > c.bottom) box.scrollTop += r.bottom - c.bottom + FIRMAMENT_RAIL_REVEAL_PAD
}

// `post`: der Ruecksprung aus dem Atlas laeuft `pre`, und der Reiter haengt an
// `v-show` — vor dem DOM-Update misst der Rollkasten 0.
watch(() => props.selection.universe, revealSelected, { flush: 'post' })
onMounted(revealSelected)

/**
 * Die KOMPAKTE Stufe — eine Hoehen-Media-Query, in JS gelesen statt im CSS.
 *
 * Die Scheibe traegt ihre Masse als Inline-Style (`.uni-disc`), gegen den eine
 * CSS-Regel nur mit `!important` ankaeme; und sie treibt die Zeilenhoehe, also
 * muss sie WIRKLICH kleiner werden, nicht bloss skaliert aussehen. Der Listener
 * feuert beim Umschalten, nicht im Takt.
 */
const compact = ref(false)
let heightQuery: MediaQueryList | null = null
const readCompact = () => {
  compact.value = heightQuery?.matches ?? false
}
onMounted(() => {
  heightQuery = window.matchMedia(`(max-height: ${UNIVERSE_RAIL_COMPACT_MAX_VH}px)`)
  heightQuery.addEventListener('change', readCompact)
  readCompact()
})
onBeforeUnmount(() => heightQuery?.removeEventListener('change', readCompact))

const hereColor = FIRMAMENT_HERE_COLOR
const discPx = computed(() =>
  compact.value ? UNIVERSE_DISC_RAIL_COMPACT_PX : UNIVERSE_DISC_RAIL_PX,
)
const padX = `${FIRMAMENT_RAIL_PAD_X}px`
const rowGap = computed(() =>
  compact.value ? `${UNIVERSE_RAIL_ROW_GAP_COMPACT}px` : `${UNIVERSE_RAIL_ROW_GAP}px`,
)
const railLabel = computed(() => `${FIRMAMENT_RAIL_HANDLE_LABEL} — the paths you have walked`)
</script>

<template>
  <!-- Ohne Kopfband ist der Griff daneben die einzige Beschriftung, und der steht
       in einem Knopf — ohne das `aria-label` waere die Region namenlos. -->
  <aside class="fm-rail" :class="{ 'fm-rail--compact': compact }" :aria-label="railLabel">
    <div ref="scroll" class="fm-rail-list rpg-scrollbar">
      <button
        v-for="row in rows"
        :key="row.id"
        class="fm-rail-row"
        :class="{
          'is-current': row.current,
          'is-picked': row.picked,
          'is-dim': !row.walked,
          'is-inert': !row.pickable,
        }"
        :style="{ '--fm-row-tint': row.tint }"
        :data-universe="row.id"
        :aria-label="`Universe ${row.roman} — ${row.name}, ${row.note}`"
        :aria-pressed="row.picked"
        @click="pick(row)"
      >
        <span class="fm-rail-disc">
          <UniverseDisc :universe="row.id" :state="row.discState" :px="discPx" />
          <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre
               Deckkraft. Nur „du bist hier" atmet. -->
          <span v-if="row.current" class="fm-rail-pulse" aria-hidden="true" />
          <span class="fm-rail-roman">{{ row.roman }}</span>
        </span>

        <span class="fm-rail-body">
          <span class="fm-rail-name">{{ row.name }}</span>
          <span class="fm-rail-note">{{ row.note }}</span>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Dieselbe Flaeche und dieselbe Naht wie die Forge-Detailspalte (`.sf-panel`)
   und die Voyages-Zielliste (`.egl`). Die Naht gehoert immer der rechten Zone —
   eine zweite Linie am Nachbarn verdoppelte sie. */
.fm-rail {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #111008;
  border-left: 2px solid #5c3310;
}

.fm-rail-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* Seitlich an die Konstante gebunden — `UNIVERSE_RAIL_LIST_PAD` (24) spiegelt
     die 10 oben und 14 unten, und die Spec rechnet mit genau diesen Zahlen. */
  padding: 10px v-bind(padX) 14px;
  display: flex;
  flex-direction: column;
  gap: v-bind(rowGap);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.fm-rail-list::-webkit-scrollbar {
  width: 4px;
}
.fm-rail-list::-webkit-scrollbar-track {
  background: #111;
}
.fm-rail-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* Eine Karte im Rezept der Forge-Liste (`.fut-row`) und der Voyages-Zeile
   (`.egr`): eigene Flaeche, eigener Rahmen, Radius 4. */
.fm-rail-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  /* Der Rollkasten ist eine Flex-Spalte: ohne das stauchen sich zehn Zeilen
     gegenseitig, statt zu rollen — und die Scheibe, die das Wiedererkennen
     TRAEGT, waere darin unkenntlich. */
  flex-shrink: 0;
  /* Links mehr: 3 px Zustandskanal plus 6 px Luft. */
  padding: 6px 7px 6px 9px;
  text-align: left;
  color: inherit;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease;
}

/* Der ZUSTANDSKANAL, und zwar als eigene Ebene statt als `border-left`. Damit
   ist er vom Rahmen entkoppelt, den Hover und Auswahl faerben — die Kurzform
   `border-color` loeschte sonst genau die Auskunft, neben der sie steht.
   Dieselbe Trennung fuehren `.egr::before` und `.fut-row::before`. */
.fm-rail-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--st-c, transparent);
  pointer-events: none;
  z-index: 1;
}
.fm-rail-row.is-current {
  --st-c: v-bind(hereColor);
}
/* Die gewaehlte Zeile ist vom Hover AUSGENOMMEN, statt ihn zu ueberschreiben:
   `:not()` hebt die Spezifitaet, und `.is-picked` danach zu schreiben genuegte
   deshalb nicht — der Hover faerbte den Rahmen der gewaehlten Zeile genau dann
   um, wenn der Zeiger daraufsteht. Markiert ist sie ohnehin schon. */
.fm-rail-row:not(.is-inert):not(.is-picked):hover {
  border-color: #7a4e20;
}
.fm-rail-row.is-inert {
  cursor: default;
}
/* Die gewaehlte Bahn traegt den Ton DIESES Universums, nicht den einer
   Zustandsfarbe — `universeTint.spec.ts` haelt beide auseinander. */
.fm-rail-row.is-picked {
  --st-c: var(--fm-row-tint);
  background: color-mix(in srgb, var(--fm-row-tint) 20%, #1c1c18);
  border-color: var(--fm-row-tint);
}
.fm-rail-row:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}

/* Die Scheibe traegt die Ziffer, wie die Voyages-Miniatur (`.egr-no`) — in der
   Namenszeile kostete sie die 24 px, die der Name braucht. */
.fm-rail-disc {
  position: relative;
  flex-shrink: 0;
  display: block;
  line-height: 0;
}

.fm-rail-roman {
  position: absolute;
  left: 1px;
  top: -1px;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.1;
  color: #e8c040;
  text-shadow: 0 1px 3px #000;
}
.fm-rail-row.is-dim .fm-rail-roman {
  color: #8a7a52;
}

/* Statischer Schein, animierte Deckkraft — Performance-Regel 11. */
.fm-rail-pulse {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 10px 2px rgba(159, 224, 98, 0.55);
  animation: fm-rail-breathe 2.6s ease-in-out infinite;
}
@keyframes fm-rail-breathe {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 1;
  }
}

/* Feste Zeilenkaesten: so treibt die SCHEIBE die Zeilenhoehe und nicht die
   Schriftmetrik — nur dann sagt `UNIVERSE_RAIL_ROW_H` die Wahrheit.
   MedievalSharp ueberschiesst seine Zeilenbox um die Haelfte. */
.fm-rail-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1;
}

.fm-rail-name {
  font-size: 16px;
  line-height: 20px;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fm-rail-row.is-picked .fm-rail-name {
  color: #fff4dc;
}
.fm-rail-row.is-dim .fm-rail-name {
  color: #7a6a46;
}

.fm-rail-note {
  font-size: 12px;
  line-height: 16px;
  color: #7a6c50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fm-rail-row.is-current .fm-rail-note {
  color: v-bind(hereColor);
}
.fm-rail-row.is-dim .fm-rail-note {
  color: #5c4e34;
}

/* ══ Kompakte Stufe ══
   Nur Polsterung und Schrift; die Zeilenhoehe faellt von selbst, weil die
   SCHEIBE sie treibt und `discPx` mitgeschaltet hat. Gemessen passen damit zehn
   Zeilen in 556 von 569 px — dem flachsten Referenzfall (Full HD im Fenster).
   Die Schwelle steht in `UNIVERSE_RAIL_COMPACT_MAX_VH`. */
.fm-rail--compact .fm-rail-list {
  padding: 8px v-bind(padX) 12px;
}
.fm-rail--compact .fm-rail-row {
  padding: 6px 6px 6px 8px;
  gap: 7px;
}
.fm-rail--compact .fm-rail-name {
  font-size: 15px;
  line-height: 19px;
}
.fm-rail--compact .fm-rail-note {
  font-size: 11px;
  line-height: 15px;
}
.fm-rail--compact .fm-rail-roman {
  font-size: 11px;
}

@media (prefers-reduced-motion: reduce) {
  .fm-rail-pulse {
    animation: none;
    opacity: 0.7;
  }
}
</style>
