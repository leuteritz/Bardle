<script setup lang="ts">
/**
 * The RIGHT column while the skin gallery is open: every bundled appearance as
 * a splash card, wrapping down the column instead of scrolling sideways out of
 * sight. Hovering one shows it on the stage; clicking equips it and leaves the
 * gallery open, because a skin costs nothing and trying them on IS the task.
 *
 * The equipped card carries four signals at once — gold edge, a static outer
 * glow, a breathing layer and a gold name — because one of them is not enough
 * to find it in a grid of twenty. The other cards dim their art instead, which
 * does more for that than anything the active card could add.
 *
 * Two columns of exactly one art-table 'lg' edge, so twenty cards never pull
 * twenty 1280px splashes. Every distance in here is SKIN_GALLERY_GAP, and the
 * panel around it sets it — this component carries no padding of its own.
 */
import { computed } from 'vue'
import {
  CHAMPION_ART_LG_MAX_EDGE,
  SKIN_CARD_ASPECT_RATIO,
  SKIN_GALLERY_COLUMNS,
  SKIN_GALLERY_GAP,
} from '@/config/constants'
import { championSkinEntries } from '@/utils/game/champions'

const props = defineProps<{
  champion: string
  /** Skin the champion has equipped right now. */
  equipped: string
  /** Skin under the cursor — it keeps its ring after the cursor leaves. */
  preview: string | null
}>()

const emit = defineEmits<{ preview: [skin: string]; select: [skin: string] }>()

const entries = computed(() => championSkinEntries(props.champion))

const columns = `repeat(${SKIN_GALLERY_COLUMNS}, ${CHAMPION_ART_LG_MAX_EDGE}px)`
const gap = `${SKIN_GALLERY_GAP}px`
const cardAspect = SKIN_CARD_ASPECT_RATIO
</script>

<template>
  <section class="csg-panel">
    <div class="csg-scroll">
      <div class="csg-grid">
        <button
          v-for="entry in entries"
          :key="entry.id"
          type="button"
          class="csg-card"
          :class="{
            'csg-card--viewing': entry.id === preview,
            'csg-card--active': entry.id === equipped,
          }"
          :aria-pressed="entry.id === equipped"
          @mouseenter="emit('preview', entry.id)"
          @focus="emit('preview', entry.id)"
          @click="emit('select', entry.id)"
        >
          <img :src="entry.image" :alt="entry.label" class="csg-art" loading="lazy" />
          <span class="csg-fade" aria-hidden="true" />
          <span class="csg-bottom">
            <span class="csg-name">{{ entry.label }}</span>
            <span v-if="entry.id === equipped" class="csg-mark csg-mark--active"
              >Active</span
            >
            <span v-else class="csg-mark csg-mark--cta">Equip</span>
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.csg-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.csg-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.csg-scroll::-webkit-scrollbar {
  width: 6px;
}
.csg-scroll::-webkit-scrollbar-track {
  background: #111;
}
.csg-scroll::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}
.csg-grid {
  display: grid;
  grid-template-columns: v-bind(columns);
  gap: v-bind(gap);
}
.csg-card {
  position: relative;
  aspect-ratio: v-bind(cardAspect);
  overflow: hidden;
  padding: 0;
  border: 2px solid var(--csg-edge, rgba(122, 78, 32, 0.55));
  border-radius: 4px;
  background: #1a1008;
  cursor: pointer;
  text-align: left;
}
.csg-card:hover {
  --csg-edge: #c89040;
}
/* Innen, nicht aussen — der Scrollkasten hat keine Polsterung mehr. */
.csg-card:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}
/* Beide nach dem Hover und mit dessen Spezifitaet — sonst schluckt :hover die
   Zustandskante, und man sieht beim Darueberfahren nicht mehr, was man traegt. */
.csg-card.csg-card--viewing {
  --csg-edge: #d8b878;
}
.csg-card.csg-card--active {
  --csg-edge: #e8c040;
  box-shadow: 0 0 16px rgba(232, 192, 64, 0.3);
}
/* Der Atem liegt auf einer EIGENEN Ebene mit statischem Schein — animiert wird
   nur ihre Deckkraft. Ein pulsierender box-shadow waere hier der naheliegende
   und der verbotene Griff. Muster: champion-crest-breathe in main.css. */
.csg-card--active::after {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 0;
  border-radius: 2px;
  box-shadow: inset 0 0 20px rgba(232, 192, 64, 0.55);
  pointer-events: none;
  animation: csg-active-breathe 3200ms ease-in-out infinite alternate;
}
@keyframes csg-active-breathe {
  from {
    opacity: 0.3;
  }
  to {
    opacity: 0.9;
  }
}
@media (prefers-reduced-motion: reduce) {
  .csg-card--active::after {
    animation: none;
    opacity: 0.6;
  }
}
.csg-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  opacity: 0.82;
}
.csg-card:hover .csg-art,
.csg-card--active .csg-art {
  opacity: 1;
}
.csg-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 46%,
    rgba(10, 7, 4, 0.6) 74%,
    rgba(10, 7, 4, 0.96) 100%
  );
}
.csg-bottom {
  position: absolute;
  z-index: 2;
  right: 8px;
  bottom: 7px;
  left: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
}
.csg-name {
  min-width: 0;
  overflow: hidden;
  color: #f4e6bc;
  font-size: 14px;
  text-overflow: ellipsis;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}
.csg-card--active .csg-name {
  color: #e8c040;
}
.csg-mark {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.csg-mark--active {
  border-color: #f0d67a;
  background: #e8c040;
  color: #1a1008;
  font-weight: 700;
}
.csg-mark--cta {
  border-color: rgba(200, 144, 64, 0.55);
  background: rgba(0, 0, 0, 0.66);
  color: #e8c040;
  opacity: 0;
}
.csg-card:hover .csg-mark--cta,
.csg-card:focus-visible .csg-mark--cta {
  opacity: 1;
}


</style>
