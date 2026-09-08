<script setup lang="ts">
/**
 * Die Universumsleiste — sie waehlt die BAHN, die die Karte zeigt.
 *
 * Sie steht RECHTS und traegt die Seitenleisten-Sprache (`.sr-*` in
 * `rpg-theme.css`): Flaeche, Naht, Rollkasten, Zeilenkarte und Schriftskala
 * kommen von dort. Eine Seitenleiste ist in diesem Spiel EIN Ort, nicht einer je
 * Reiter — und seit die Sprache existiert, ist das kein Vorsatz mehr, sondern
 * derselbe Code.
 *
 * Hier bleibt NUR, was allein dieser Leiste gehoert: die Scheibe samt ihrer
 * Ziffer, der Puls auf „du bist hier", die Toenung der gewaehlten Bahn — und
 * die Polsterung, weil sie an `UNIVERSE_RAIL_*` haengt und `universeLayout.spec`
 * mit genau diesen Zahlen rechnet.
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
  <aside class="sr un-rail" :class="{ 'sr--compact': compact }" :aria-label="railLabel">
    <div ref="scroll" class="sr-scroll un-rail-list">
      <button
        v-for="row in rows"
        :key="row.id"
        class="sr-row un-rail-row"
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

        <span class="sr-row-body">
          <span class="sr-row-name">Universe {{ row.roman }}</span>
          <span class="sr-row-note">{{ row.note }}</span>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Flaeche, Naht, Rollkasten und Zeilenkarte stehen als `.sr-*` im Theme.
   Hier steht NUR, was diese Leiste allein weiss. */

/* Die Polsterung haengt an den Konstanten, nicht an der Schriftskala:
   `UNIVERSE_RAIL_LIST_PAD` (20) spiegelt die 8 oben und 12 unten, und
   `universeLayout.spec.ts` rechnet mit genau diesen Zahlen. Ein em-Mass
   drifteete gegen die Spec, sobald der Monitor wechselt. */
.un-rail-list {
  padding: 8px v-bind(padX) 12px;
  gap: v-bind(rowGap);
}

/* Links mehr: 3 px Zustandskanal plus 6 px Luft. Feste px, weil der Kanal
   selbst fest ist. */
.un-rail-row {
  padding: 6px 7px 6px 9px;
  gap: 8px;
}

.un-rail-row.is-current {
  --sr-color: v-bind(hereColor);
}

/* Die gewaehlte Bahn traegt den Ton DIESES Universums, nicht den einer
   Zustandsfarbe — `universeTint.spec.ts` haelt beide auseinander. */
.un-rail-row.is-picked {
  --sr-color: var(--un-row-tint);
  background: color-mix(in srgb, var(--un-row-tint) 20%, var(--sr-row-bg));
  border-color: var(--un-row-tint);
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
  font-size: 0.87em;
  font-weight: 900;
  line-height: 1.1;
  color: var(--sr-accent-hi);
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

.un-rail-row.is-current .sr-row-note {
  color: v-bind(hereColor);
}

/* ══ Kompakte Stufe ══
   Nur die Polsterung; Schrift und Zeilenhoehe fallen von selbst, weil
   `.sr--compact` die Einheit senkt und die SCHEIBE die Zeile treibt
   (`discPx` schaltet mit). Gemessen passen damit zehn Zeilen in 543 von
   553 px — dem flachsten Referenzfall. Die Differenz zahlen Polsterung und
   Zeilenabstand, NICHT die Scheibe: sie traegt die Zeile, und kleiner waere
   die Drehung wieder unsichtbar.
   Die Schwelle steht in `UNIVERSE_RAIL_COMPACT_MAX_VH`. */
.sr--compact .un-rail-list {
  padding: 6px v-bind(padX) 10px;
}
.sr--compact .un-rail-row {
  padding: 6px 6px 6px 8px;
  gap: 7px;
}

@media (prefers-reduced-motion: reduce) {
  .un-rail-pulse {
    animation: none;
    opacity: 0.7;
  }
}
</style>
