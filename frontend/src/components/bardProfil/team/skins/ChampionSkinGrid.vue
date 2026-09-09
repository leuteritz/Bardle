<script setup lang="ts">
/**
 * The RIGHT column while the skin gallery is open: every bundled appearance as
 * a splash card, wrapping down the column instead of scrolling sideways out of
 * sight. Hovering one shows it on the stage; clicking wears it and leaves the
 * gallery open, because a skin costs nothing and trying them on IS the task.
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
  /** Skin the champion is wearing right now. */
  worn: string
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
            'csg-card--worn': entry.id === worn,
          }"
          :aria-pressed="entry.id === worn"
          @mouseenter="emit('preview', entry.id)"
          @focus="emit('preview', entry.id)"
          @click="emit('select', entry.id)"
        >
          <img :src="entry.image" :alt="entry.label" class="csg-art" loading="lazy" />
          <span class="csg-fade" aria-hidden="true" />
          <span class="csg-bottom">
            <span class="csg-name">{{ entry.label }}</span>
            <span v-if="entry.id === worn" class="csg-mark csg-mark--worn">Worn</span>
            <span v-else class="csg-mark csg-mark--cta">Wear</span>
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
.csg-card.csg-card--worn {
  --csg-edge: #e8c040;
}
.csg-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
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
.csg-mark {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.csg-mark--worn {
  border-color: #8b632c;
  background: rgba(17, 16, 8, 0.86);
  color: #e8c040;
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
