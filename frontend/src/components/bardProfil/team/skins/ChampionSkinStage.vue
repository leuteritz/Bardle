<script setup lang="ts">
/**
 * The LEFT column while the skin gallery is open: the appearance under the
 * cursor, shown at the size you actually judge it at.
 *
 * It replaces a popover that laid itself over the very splash art it was asking
 * about — 116x78 thumbnails above a 1280px image you could no longer see. The
 * preview is sticky like the swap picker's: the last hovered card stays here
 * after the cursor leaves the grid, so the Equip button is reachable without the
 * subject changing on the way to it.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { SKIN_GALLERY_GAP } from '@/config/constants'
import { formatSkinName, getSkinArtPath } from '@/utils/game/champions'

const props = defineProps<{
  champion: string
  /** Skin the champion has equipped right now. */
  equipped: string
  /** Skin under the cursor — null falls back to the equipped one. */
  preview: string | null
  /** Position of the shown skin in the gallery, 1-based. */
  index: number
  total: number
}>()

const emit = defineEmits<{ equip: [skin: string]; close: [] }>()

const gap = `${SKIN_GALLERY_GAP}px`

const shown = computed(() => props.preview ?? props.equipped)
const isActive = computed(() => shown.value === props.equipped)
const label = computed(() => formatSkinName(shown.value))

/* Full art for the stage, the gallery's own variant underneath it: the small
   one is already cached, so a switch never uncovers an empty frame. */
const art = computed(() => getSkinArtPath(props.champion, shown.value, 'full'))
const artUnder = computed(() => `url("${getSkinArtPath(props.champion, shown.value, 'lg')}")`)
</script>

<template>
  <section class="cst-stage">
    <div class="cst-frame" :style="{ backgroundImage: artUnder }">
      <img :src="art" :alt="label" class="cst-art" />
      <span class="cst-shade" aria-hidden="true" />
      <span class="cst-count">{{ index }} / {{ total }}</span>
      <button class="cst-close" type="button" aria-label="Close appearances" @click="emit('close')">
        ✕
      </button>
    </div>
    <div class="cst-foot">
      <div class="cst-text">
        <small>Appearance</small>
        <strong>{{ label }}</strong>
      </div>
      <span v-if="isActive" class="cst-active"
        ><Icon icon="lucide:check" width="15" height="15" />Active</span
      >
      <button v-else class="cst-equip" type="button" @click="emit('equip', shown)">
        Equip this
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Ohne eigene Polsterung — die setzt das Content-Grid fuer beide Spalten. */
.cst-stage {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: v-bind(gap);
}
.cst-frame {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-radius: 4px;
  outline: 2px solid #7a4e20;
  outline-offset: -2px;
  background: #111008 center top / cover no-repeat;
}
.cst-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}
.cst-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 7, 4, 0.55) 0%, transparent 22%);
}
.cst-count {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 8px;
  border: 1px solid #8b632c;
  border-radius: 3px;
  background: #111008;
  color: #e8c040;
  font-size: 11px;
  letter-spacing: 0.06em;
}
.cst-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #8b632c;
  border-radius: 3px;
  background: #111008;
  color: #e8c040;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}
.cst-close:hover {
  border-color: #e8c040;
  background: #1e1006;
}
.cst-foot {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cst-text {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;
}
.cst-text small {
  color: #a59675;
  font-size: 9px;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}
.cst-text strong {
  overflow: hidden;
  color: #f4e6bc;
  font-size: 22px;
  font-weight: 400;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Gold traegt den ZUSTAND, gruen die Aktion — deshalb ist die Marke satt und
   bleibt trotzdem kein Knopf. */
.cst-active {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid #e8c040;
  border-radius: 4px;
  background: rgba(232, 192, 64, 0.16);
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.22);
  color: #f7e6a8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.cst-equip {
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.cst-equip:hover {
  background: linear-gradient(to bottom, #60d038, #388e22);
}
.cst-equip:active {
  transform: scale(0.97);
}

@media (max-height: 1100px) {
  .cst-text strong {
    font-size: 19px;
  }
}
</style>
