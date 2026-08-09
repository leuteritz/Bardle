<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { STATS_TAB_DECK_RESIZE } from '@/config/constants'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import JourneyStatsColumn from './JourneyStatsColumn.vue'
import SolarEvolutionColumn from './SolarEvolutionColumn.vue'
import GalaxyArchiveColumn from './GalaxyArchiveColumn.vue'
import AugmentBuffPanel from './AugmentBuffPanel.vue'

/**
 * Bard Stats — the "Command Deck". This component owns nothing but the deck
 * itself: the shared backdrop, the three-column grid and the drag handles that
 * rebalance it. Every panel is a self-contained column component that reads its
 * own stores and keeps its own search.
 */

/* ── Resizable deck columns — drag the two dividers to rebalance the
   three panels. Side columns are px-driven; the middle flexes and is
   protected by MIN_MIDDLE so it can never collapse. ────────────────── */
const deckEl = ref<HTMLElement | null>(null)
const col1Width = ref<number>(STATS_TAB_DECK_RESIZE.DEFAULT_LEFT)
const col3Width = ref<number>(STATS_TAB_DECK_RESIZE.DEFAULT_RIGHT)
const resizeSide = ref<'left' | 'right' | null>(null)

const deckStyle = computed(() => ({
  gridTemplateColumns: `${col1Width.value}px minmax(0, 1fr) ${col3Width.value}px`,
}))

let resizeStartX = 0
let resizeStartW = 0
let resizeDeckWidth = 0

function startResize(side: 'left' | 'right', e: PointerEvent) {
  resizeSide.value = side
  resizeStartX = e.clientX
  resizeStartW = side === 'left' ? col1Width.value : col3Width.value
  resizeDeckWidth = deckEl.value?.clientWidth ?? 0
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

function onResizeMove(e: PointerEvent) {
  const R = STATS_TAB_DECK_RESIZE
  const delta = e.clientX - resizeStartX
  if (resizeSide.value === 'left') {
    const maxByMiddle = resizeDeckWidth - col3Width.value - R.MIN_MIDDLE
    const max = Math.min(R.MAX_LEFT, maxByMiddle)
    col1Width.value = Math.max(R.MIN_SIDE, Math.min(resizeStartW + delta, max))
  } else if (resizeSide.value === 'right') {
    const maxByMiddle = resizeDeckWidth - col1Width.value - R.MIN_MIDDLE
    const max = Math.min(R.MAX_RIGHT, maxByMiddle)
    col3Width.value = Math.max(R.MIN_SIDE, Math.min(resizeStartW - delta, max))
  }
}

function stopResize() {
  resizeSide.value = null
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// drop any in-flight drag listeners + restore the body cursor
onUnmounted(stopResize)
</script>

<template>
  <div class="sf-root">
    <!-- ══ Shared cosmic backdrop — same component as Shop / Team / Planets ══ -->
    <CosmicStageBackground />

    <!-- ══ Panel deck: journey | sun + chronicle | archive over augments ══ -->
    <div ref="deckEl" class="sf-deck" :style="deckStyle">
      <JourneyStatsColumn />
      <SolarEvolutionColumn />
      <!-- Rechte Spalte trägt zwei Panels übereinander, exakt halbe Höhe je
           Panel: beide zeigen eine wachsende Sammlung, die auf ihrer Hälfte
           scrollt. Der Trennstrich sitzt damit auf der Mitte der Spalte. -->
      <div class="sf-stack">
        <GalaxyArchiveColumn />
        <AugmentBuffPanel />
      </div>

      <!-- Drag handles sitting on the two column dividers -->
      <div
        class="sf-deck-handle sf-deck-handle--left"
        :class="{ 'is-active': resizeSide === 'left' }"
        :style="{ left: col1Width + 'px' }"
        title="Drag to resize the Journey column"
        @pointerdown="startResize('left', $event)"
      >
        <span class="sf-deck-handle-grip" />
      </div>
      <div
        class="sf-deck-handle sf-deck-handle--right"
        :class="{ 'is-active': resizeSide === 'right' }"
        :style="{ right: col3Width + 'px' }"
        title="Drag to resize the Galaxy Archive column"
        @pointerdown="startResize('right', $event)"
      >
        <span class="sf-deck-handle-grip" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   BARD STATS — "Command Deck": a fixed-height dashboard of three equal-height
   panels — Journey | Solar Evolution | Galaxy Archive.
   The middle one is the stage: the live sun on its phase dial, with the
   augment deck folded into a short strip beneath it.
   The page itself NEVER scrolls; long lists scroll inside their panel.
   Each panel lives in its own component — only the grid and its drag handles
   are owned here.
══════════════════════════════════════════════════════════════ */

.sf-root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 12px;
  background: #111008; /* same deep-space base as Shop / Team / Planets */
  color: var(--rpg-text);
}

.sf-deck {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  /* grid-template-columns is driven inline by deckStyle (drag-resizable);
     this is only the pre-hydration fallback */
  grid-template-columns: 360px minmax(0, 1fr) 440px;
  gap: 0;
}
/* Frameless panels: the areas are set apart by these hairlines alone, and the
   shared cosmic backdrop shows through everywhere else. Die Spalten sind
   Kindkomponenten — hier werden also deren Wurzelelemente getroffen. */
.sf-deck > .sf-col + .sf-col,
.sf-deck > .sf-stack {
  border-left: 1px solid #4a2c12;
}

/* Zwei Panels in der rechten Spalte, jedes exakt die halbe Höhe. `flex-basis: 0`
   plus `flex: 1` teilt die Spalte hälftig UNABHÄNGIG vom Inhalt — mit
   `flex-basis: auto` würde die längere Sammlung die Mitte verschieben, und die
   Trennlinie läge je Spielstand woanders. `min-height: 0` ist Pflicht, damit
   beide innen scrollen statt sich aufzublähen. */
.sf-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.sf-stack > * {
  flex: 1 1 0;
  min-height: 0;
}

/* Die Trennlinie ist bewusst KEIN border: ein Rahmen zählt zur Höhe seines
   Panels, und damit wäre die untere Hälfte um genau diesen Pixel höher als die
   obere (gemessen 316,5 gegen 317,6). Als absolut gesetzte Linie auf der
   Grenzfuge liegt sie exakt auf der Mitte und beide Hälften sind gleich hoch. */
.sf-stack > *:first-child {
  position: relative;
}

.sf-stack > *:first-child::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: #4a2c12;
  pointer-events: none;
}

/* ─ Resizable column dividers ─ */
.sf-deck-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
}
.sf-deck-handle--left {
  transform: translateX(-50%);
}
.sf-deck-handle--right {
  transform: translateX(50%);
}
/* the visible grip pill, centered on the divider line */
.sf-deck-handle-grip {
  width: 4px;
  height: 34px;
  border-radius: 3px;
  background: #4a2c12;
  transition:
    background 0.15s,
    box-shadow 0.15s,
    height 0.15s;
}
.sf-deck-handle:hover .sf-deck-handle-grip,
.sf-deck-handle.is-active .sf-deck-handle-grip {
  background: #c89040;
  box-shadow: 0 0 9px rgba(200, 144, 64, 0.55);
  height: 48px;
}
</style>
