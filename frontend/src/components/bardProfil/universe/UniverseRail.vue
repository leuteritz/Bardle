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
  UNIVERSE_MAP_HERE_COLOR,
  UNIVERSE_MAP_RAIL_HANDLE_LABEL,
  UNIVERSE_MAP_RAIL_PAD_X,
  UNIVERSE_MAP_RAIL_REVEAL_PAD,
  UNIVERSE_DISC_RAIL_COMPACT_PX,
  UNIVERSE_DISC_RAIL_PX,
  UNIVERSE_RAIL_COMPACT_MAX_VH,
  UNIVERSE_RAIL_ROW_GAP,
  UNIVERSE_RAIL_ROW_GAP_COMPACT,
} from '@/config/constants'
import UniverseDisc from './UniverseDisc.vue'
import type { UniverseRailRow } from '@/utils/ui/universeRail'
import type { UniverseSelection } from '@/types'

const props = defineProps<{
  rows: UniverseRailRow[]
  selection: UniverseSelection
}>()

const emit = defineEmits<{
  (e: 'select', value: UniverseSelection): void
}>()

/** Kein Toggle: die Bahn ist der Ansichtszustand, es gibt kein Nichts. */
function pick(row: UniverseRailRow) {
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
  if (r.top < c.top) box.scrollTop -= c.top - r.top + UNIVERSE_MAP_RAIL_REVEAL_PAD
  else if (r.bottom > c.bottom) box.scrollTop += r.bottom - c.bottom + UNIVERSE_MAP_RAIL_REVEAL_PAD
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

const hereColor = UNIVERSE_MAP_HERE_COLOR
const discPx = computed(() =>
  compact.value ? UNIVERSE_DISC_RAIL_COMPACT_PX : UNIVERSE_DISC_RAIL_PX,
)
const padX = `${UNIVERSE_MAP_RAIL_PAD_X}px`
const rowGap = computed(() =>
  compact.value ? `${UNIVERSE_RAIL_ROW_GAP_COMPACT}px` : `${UNIVERSE_RAIL_ROW_GAP}px`,
)
const railLabel = computed(() => `${UNIVERSE_MAP_RAIL_HANDLE_LABEL} — the paths you have walked`)
</script>

<template>
  <!-- Ohne Kopfband ist der Griff daneben die einzige Beschriftung, und der steht
       in einem Knopf — ohne das `aria-label` waere die Region namenlos. -->
  <aside class="un-rail" :class="{ 'un-rail--compact': compact }" :aria-label="railLabel">
    <div ref="scroll" class="un-rail-list rpg-scrollbar">
      <button
        v-for="row in rows"
        :key="row.id"
        class="un-rail-row"
        :class="{
          'is-current': row.current,
          'is-picked': row.picked,
          'is-dim': !row.walked,
          'is-inert': !row.pickable,
        }"
        :style="{ '--un-row-tint': row.tint }"
        :data-universe="row.id"
        :aria-label="`Universe ${row.roman}, ${row.note}`"
        :aria-pressed="row.picked"
        @click="pick(row)"
      >
        <span class="un-rail-disc">
          <UniverseDisc :universe="row.id" :state="row.discState" :px="discPx" />
          <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre
               Deckkraft. Nur „du bist hier" atmet. -->
          <span v-if="row.current" class="un-rail-pulse" aria-hidden="true" />
          <span class="un-rail-roman">{{ row.roman }}</span>
        </span>

        <span class="un-rail-body">
          <span class="un-rail-name">Universe {{ row.roman }}</span>
          <span class="un-rail-note">{{ row.note }}</span>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Dieselbe Flaeche und dieselbe Naht wie die Forge-Detailspalte (`.sf-panel`)
   und die Voyages-Zielliste (`.egl`). Die Naht gehoert immer der rechten Zone —
   eine zweite Linie am Nachbarn verdoppelte sie. */
.un-rail {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #111008;
  border-left: 2px solid #5c3310;
}

.un-rail-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* Seitlich an die Konstante gebunden — `UNIVERSE_RAIL_LIST_PAD` (20) spiegelt
     die 8 oben und 12 unten, und die Spec rechnet mit genau diesen Zahlen. */
  padding: 8px v-bind(padX) 12px;
  display: flex;
  flex-direction: column;
  gap: v-bind(rowGap);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.un-rail-list::-webkit-scrollbar {
  width: 4px;
}
.un-rail-list::-webkit-scrollbar-track {
  background: #111;
}
.un-rail-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* Eine Karte im Rezept der Forge-Liste (`.fut-row`) und der Voyages-Zeile
   (`.egr`): eigene Flaeche, eigener Rahmen, Radius 4. */
.un-rail-row {
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
.un-rail-row::before {
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
.un-rail-row.is-current {
  --st-c: v-bind(hereColor);
}
/* Die gewaehlte Zeile ist vom Hover AUSGENOMMEN, statt ihn zu ueberschreiben:
   `:not()` hebt die Spezifitaet, und `.is-picked` danach zu schreiben genuegte
   deshalb nicht — der Hover faerbte den Rahmen der gewaehlten Zeile genau dann
   um, wenn der Zeiger daraufsteht. Markiert ist sie ohnehin schon. */
.un-rail-row:not(.is-inert):not(.is-picked):hover {
  border-color: #7a4e20;
}
.un-rail-row.is-inert {
  cursor: default;
}
/* Die gewaehlte Bahn traegt den Ton DIESES Universums, nicht den einer
   Zustandsfarbe — `universeTint.spec.ts` haelt beide auseinander. */
.un-rail-row.is-picked {
  --st-c: var(--un-row-tint);
  background: color-mix(in srgb, var(--un-row-tint) 20%, #1c1c18);
  border-color: var(--un-row-tint);
}
.un-rail-row:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}

/* Die Scheibe traegt die Ziffer, wie die Voyages-Miniatur (`.egr-no`) — in der
   Namenszeile kostete sie die 24 px, die der Name braucht. */
.un-rail-disc {
  position: relative;
  flex-shrink: 0;
  display: block;
  line-height: 0;
}

.un-rail-roman {
  position: absolute;
  left: 1px;
  top: -1px;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.1;
  color: #e8c040;
  text-shadow: 0 1px 3px #000;
}
.un-rail-row.is-dim .un-rail-roman {
  color: #8a7a52;
}

/* Statischer Schein, animierte Deckkraft — Performance-Regel 11. */
.un-rail-pulse {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 10px 2px rgba(159, 224, 98, 0.55);
  animation: un-rail-breathe 2.6s ease-in-out infinite;
}
@keyframes un-rail-breathe {
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
.un-rail-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1;
}

.un-rail-name {
  font-size: 16px;
  line-height: 20px;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.un-rail-row.is-picked .un-rail-name {
  color: #fff4dc;
}
.un-rail-row.is-dim .un-rail-name {
  color: #7a6a46;
}

.un-rail-note {
  font-size: 12px;
  line-height: 16px;
  color: #7a6c50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.un-rail-row.is-current .un-rail-note {
  color: v-bind(hereColor);
}
.un-rail-row.is-dim .un-rail-note {
  color: #5c4e34;
}

/* ══ Kompakte Stufe ══
   Nur Polsterung und Schrift; die Zeilenhoehe faellt von selbst, weil die
   SCHEIBE sie treibt und `discPx` mitgeschaltet hat. Gemessen passen damit zehn
   Zeilen in 543 von 553 px — dem flachsten Referenzfall (Full HD im Fenster).
   Es waren 556 von 569, bis das Kopfband um 16 px wuchs; die Differenz zahlen
   Polsterung (6/10 statt 8/12) und Zeilenabstand, NICHT die Scheibe — sie
   traegt die Zeile, und kleiner waere die Drehung wieder unsichtbar.
   Die Schwelle steht in `UNIVERSE_RAIL_COMPACT_MAX_VH`. */
.un-rail--compact .un-rail-list {
  padding: 6px v-bind(padX) 10px;
}
.un-rail--compact .un-rail-row {
  padding: 6px 6px 6px 8px;
  gap: 7px;
}
.un-rail--compact .un-rail-name {
  font-size: 15px;
  line-height: 19px;
}
.un-rail--compact .un-rail-note {
  font-size: 11px;
  line-height: 15px;
}
.un-rail--compact .un-rail-roman {
  font-size: 11px;
}

@media (prefers-reduced-motion: reduce) {
  .un-rail-pulse {
    animation: none;
    opacity: 0.7;
  }
}
</style>
