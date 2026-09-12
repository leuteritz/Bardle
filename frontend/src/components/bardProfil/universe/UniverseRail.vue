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
 * Ziffer, der Puls auf „du bist hier", die Toenung der gewaehlten Bahn, die
 * Ablesungszeile und der Fortschrittsbalken.
 *
 * **Die Zeile ist eine KARTE, und die Leiste ROLLT.** Zehn Karten passen auf
 * keiner Zielaufloesung unter 4K; gebunden ist deshalb ein BODEN
 * (`UNIVERSE_RAIL_MIN_VISIBLE`), nicht die Vollzahl. Die Hoehe ist gerechnet,
 * nicht geraten — `UNIVERSE_RAIL_ROW_H` summiert Polsterung, Scheibe und
 * Ablesungskasten, und `universeLayout.spec.ts` zaehlt mit derselben Summe.
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
  UNIVERSE_RAIL_BAR_H,
  UNIVERSE_RAIL_CARD_GAP_Y,
  UNIVERSE_RAIL_CARD_GAP_Y_COMPACT,
  UNIVERSE_RAIL_CARD_MAX_H,
  UNIVERSE_RAIL_CARD_PAD_B,
  UNIVERSE_RAIL_CARD_PAD_B_COMPACT,
  UNIVERSE_RAIL_CARD_PAD_L,
  UNIVERSE_RAIL_CARD_PAD_R,
  UNIVERSE_RAIL_CARD_PAD_T,
  UNIVERSE_RAIL_CARD_PAD_T_COMPACT,
  UNIVERSE_RAIL_COMPACT_MAX_VH,
  UNIVERSE_RAIL_CURRENT_ROW_H,
  UNIVERSE_RAIL_READ_H,
  UNIVERSE_RAIL_READ_H_COMPACT,
  UNIVERSE_RAIL_ROW_GAP,
  UNIVERSE_RAIL_ROW_GAP_COMPACT,
  UNIVERSE_RAIL_ROW_H,
  UNIVERSE_RAIL_ROW_H_COMPACT,
  UNIVERSE_RAIL_TINT_BAR_W,
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
 * CSS-Regel nur mit `!important` ankaeme; und sie treibt die Kartenhoehe, also
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
const railLabel = computed(() => `${UNIVERSE_MAP_RAIL_HANDLE_LABEL} — the paths you have walked`)

const px = (n: number) => `${n}px`
const padX = px(UNIVERSE_MAP_RAIL_PAD_X)
const rowGap = computed(() =>
  px(compact.value ? UNIVERSE_RAIL_ROW_GAP_COMPACT : UNIVERSE_RAIL_ROW_GAP),
)
const cardH = computed(() => px(compact.value ? UNIVERSE_RAIL_ROW_H_COMPACT : UNIVERSE_RAIL_ROW_H))
const currentRowH = px(UNIVERSE_RAIL_CURRENT_ROW_H)
const cardMaxH = px(UNIVERSE_RAIL_CARD_MAX_H)
const cardGapY = computed(() =>
  px(compact.value ? UNIVERSE_RAIL_CARD_GAP_Y_COMPACT : UNIVERSE_RAIL_CARD_GAP_Y),
)
const cardPad = computed(() => {
  const t = compact.value ? UNIVERSE_RAIL_CARD_PAD_T_COMPACT : UNIVERSE_RAIL_CARD_PAD_T
  const b = compact.value ? UNIVERSE_RAIL_CARD_PAD_B_COMPACT : UNIVERSE_RAIL_CARD_PAD_B
  return `${t}px ${UNIVERSE_RAIL_CARD_PAD_R}px ${b}px ${UNIVERSE_RAIL_CARD_PAD_L}px`
})
const headMinH = computed(() => px(discPx.value))
const readH = computed(() =>
  px(compact.value ? UNIVERSE_RAIL_READ_H_COMPACT : UNIVERSE_RAIL_READ_H),
)
const barH = px(UNIVERSE_RAIL_BAR_H)
const tintBarW = px(UNIVERSE_RAIL_TINT_BAR_W)
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
        <span class="un-rail-head">
          <span class="un-rail-disc">
            <UniverseDisc :universe="row.id" :state="row.discState" :px="discPx" />
            <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre
                 Deckkraft. Nur „du bist hier" atmet. -->
            <span v-if="row.current" class="un-rail-pulse" aria-hidden="true" />
          </span>

          <span class="sr-row-body">
            <span class="sr-row-name">Universe {{ row.roman }}</span>
            <span class="sr-row-note">{{ row.state }}</span>
          </span>
        </span>

        <!-- Grad, Farbe und Ellipse kommen von `.sr-row-note` — eine zweite
             Textzeile ohne zweite Schriftskala. -->
        <span class="sr-row-note un-rail-read">
          <span class="un-rail-v">{{ row.galaxies }}</span> freed<span class="un-rail-sep">·</span
          ><span class="un-rail-v">{{ row.rescued }}</span
          ><span class="un-rail-slash">/</span
          ><span class="un-rail-lost">{{ row.lost }}</span> stars<span class="un-rail-sep">·</span
          ><span class="un-rail-t">{{ row.elapsed }}</span>
        </span>

        <span class="un-rail-bar" aria-hidden="true">
          <span class="un-rail-fill" :style="{ transform: `scaleX(${row.progress})` }" />
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

/* Die Zeilenkarte ist eine SPALTE: Kopf, Ablesung, Balken. `flex: 1 0 <ROW_H>`
   ist ihr ganzer Groessenmechanismus — Basis ist die Zahl, mit der die Spec
   rechnet, und `grow: 1` verteilt nur POSITIVEN Rest: passen zehn nicht, gibt es
   keinen, und die Rechnung der Spec bleibt wahr. */
.un-rail-row {
  flex: 1 0 v-bind(cardH);
  max-height: v-bind(cardMaxH);
  flex-direction: column;
  align-items: stretch;
  gap: v-bind(cardGapY);
  padding: v-bind(cardPad);
}

/* Die laufende Bahn ist die Live-Karte des Reiters und bleibt als erste Karte
   sichtbar; der Rest der Leiste verteilt nur den verbleibenden Platz. */
.un-rail-row.is-current {
  flex: 0 0 v-bind(currentRowH);
}

.un-rail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-height: v-bind(headMinH);
  min-width: 0;
}

.un-rail-row.is-current {
  --sr-color: v-bind(hereColor);
}
.un-rail-row.is-current:not(.is-picked),
.un-rail-row.is-current.is-picked {
  background: color-mix(in srgb, v-bind(hereColor) 10%, var(--sr-row-bg));
  border-color: color-mix(in srgb, v-bind(hereColor) 55%, var(--sr-row-border));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, v-bind(hereColor) 28%, transparent),
    0 0 12px color-mix(in srgb, v-bind(hereColor) 12%, transparent);
}

/* Die gewaehlte Bahn traegt den Ton DIESES Universums, nicht den einer
   Zustandsfarbe — `universeTint.spec.ts` haelt beide auseinander. Flaeche und
   Kante rechnet `.sr-row.is-picked` daraus selbst. Sie steht NACH `is-current`:
   bei gleicher Spezifitaet entscheidet die Reihenfolge, und die Wahl gewinnt. */
.un-rail-row.is-picked {
  --sr-color: var(--un-row-tint);
}
.un-rail-row.is-current.is-picked {
  --sr-color: v-bind(hereColor);
  --sr-picked: v-bind(hereColor);
  background: color-mix(in srgb, v-bind(hereColor) 18%, var(--sr-row-bg));
  border-color: color-mix(in srgb, v-bind(hereColor) 82%, var(--sr-row-border));
}

.un-rail-disc {
  position: relative;
  flex-shrink: 0;
  display: block;
  line-height: 0;
}

/* Statischer Schein, animierte Deckkraft — Performance-Regel 11. */
.un-rail-pulse {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 10px 2px color-mix(in srgb, v-bind(hereColor) 55%, transparent);
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

.un-rail-row.is-current .un-rail-head .sr-row-note {
  color: v-bind(hereColor);
}

/* ══ Die Ablesungszeile ══
   Fester Kasten, damit `UNIVERSE_RAIL_ROW_H` wahr bleibt. KEIN Flex: die
   Ellipse von `.sr-row-note` ist das Netz, wenn die Zahlen wachsen, und in einem
   Flex-Container greift sie nicht. Die Zeilenhoehe zentriert stattdessen. */
.un-rail-read {
  flex: 0 0 v-bind(readH);
  line-height: v-bind(readH);
}
.un-rail-v {
  color: var(--sr-text);
}
.un-rail-lost {
  color: #e08a7a;
}
.un-rail-sep {
  color: #5c4a30;
  padding: 0 0.34em;
}
.un-rail-slash {
  color: #5c4a30;
}
.un-rail-t {
  color: #ffd88a;
}
.un-rail-row.is-dim .un-rail-v,
.un-rail-row.is-dim .un-rail-lost,
.un-rail-row.is-dim .un-rail-slash,
.un-rail-row.is-dim .un-rail-t {
  color: #5c4e34;
}

/* ══ Der Ton dieser Bahn auf der AEUSSEREN Kante ══
   Rezept der Planetenkarte (`.ps-slot-btn::before`). Hier `::after`, weil
   `::before` dem Zustandskanal der Sprache gehoert. Bewegt wird nur die
   Deckkraft. */
.un-rail-row::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: v-bind(tintBarW);
  background: var(--un-row-tint);
  opacity: 0.4;
  pointer-events: none;
  transition: opacity 180ms ease;
}
.un-rail-row.is-current::after {
  background: v-bind(hereColor);
  opacity: 0.9;
}
.un-rail-row:not(.is-inert):not(.is-picked):hover::after {
  opacity: 0.8;
}
.un-rail-row.is-picked::after {
  opacity: 1;
}
.un-rail-row.is-dim::after {
  opacity: 0.18;
}

/* ══ Der Fortschrittsbalken ══
   Er liegt AUF der Unterkante im Polster und kostet keine Layout-Hoehe; im Fluss
   laege die Karte bei 102. Gefahren wird `transform`, nie `width`. */
.un-rail-bar {
  position: absolute;
  left: 0;
  right: v-bind(tintBarW);
  bottom: 0;
  height: v-bind(barH);
  background: #14100a;
  pointer-events: none;
}
.un-rail-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--un-row-tint);
  opacity: 0.85;
  transition: transform 220ms ease;
}

/* ══ Kompakte Stufe ══
   Nur Polsterung, Abstand und der Ablesungskasten; Schrift und Kopfhoehe fallen
   von selbst, weil `.sr--compact` die Einheit senkt und die SCHEIBE den Kopf
   treibt (`discPx` schaltet mit). Sie kauft im flachsten Fenster eine Karte
   zurueck — 6 statt 5 — und haelt damit den Boden, den die grosse Stufe dort
   verliert. Die Schwelle steht in `UNIVERSE_RAIL_COMPACT_MAX_VH`. */
.sr--compact .un-rail-list {
  padding: 6px v-bind(padX) 10px;
}

@media (prefers-reduced-motion: reduce) {
  .un-rail-pulse {
    animation: none;
    opacity: 0.7;
  }
  .un-rail-fill,
  .un-rail-row::after {
    transition: none;
  }
}
</style>
