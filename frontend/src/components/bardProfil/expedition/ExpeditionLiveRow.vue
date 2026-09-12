<script setup lang="ts">
/** Live galaxy selection row; no snapshot exists before completion. */
import { computed } from 'vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { liveGalaxyRecord } from '@/utils/game/liveGalaxyRecord'
import { toRoman } from '@/utils/ui/format'
import { useLazyGalaxySnapshot } from '@/composables/ui/useLazyGalaxySnapshot'
import {
  LANDMARK_FREED_CORE,
  VOYAGE_LIVE_RAIL_LABEL,
  VOYAGE_LIVE_RAIL_COURSE_LABEL,
  VOYAGE_LIVE_RAIL_TITLE,
  VOYAGE_LIVE_ROW_H,
  VOYAGE_LIVE_STARS_LABEL,
  VOYAGE_RAIL_THUMB_H,
  VOYAGE_RAIL_THUMB_W,
} from '@/config/constants'

defineProps<{ selected: boolean }>()
const emit = defineEmits<{ select: [] }>()

const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()

const kicker = computed(() =>
  galaxyStore.pendingRoleSelection ? VOYAGE_LIVE_RAIL_COURSE_LABEL : VOYAGE_LIVE_RAIL_LABEL,
)
const rowH = `${VOYAGE_LIVE_ROW_H}px`
const thumbW = `${VOYAGE_RAIL_THUMB_W}px`
const thumbH = `${VOYAGE_RAIL_THUMB_H}px`

const accent = computed(
  () => `rgb(${minimapAccentForTheme(galaxyStore.currentThemeIndex, gameStore.currentUniverse)})`,
)

const liveRecord = computed(() =>
  liveGalaxyRecord({
    galaxy: galaxyStore.currentGalaxy,
    mapSeed: galaxyStore.mapSeed,
    themeIndex: galaxyStore.currentThemeIndex,
    universe: gameStore.currentUniverse,
    attemptResults: galaxyStore.attemptResults,
    landfallResults: galaxyStore.landfallResults,
    incidentResults: galaxyStore.incidentResults,
    starManifests: galaxyStore.starManifests,
    starPositions: galaxyStore.starPositions,
  }),
)
const { root, snapshot } = useLazyGalaxySnapshot(liveRecord, 'thumb')

const starScale = computed(() => {
  const need = Math.max(1, galaxyStore.starsRequired)
  return Math.min(1, galaxyStore.starsRescued / need)
})
</script>

<template>
  <button
    ref="root"
    type="button"
    class="sr-row elr"
    :class="{ 'is-picked': selected }"
    :style="{ '--elr-accent': accent, '--elr-freed': LANDMARK_FREED_CORE }"
    :title="VOYAGE_LIVE_RAIL_TITLE"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <span class="elr-main">
      <span class="elr-thumb">
        <img v-if="snapshot" :src="snapshot" class="elr-img" alt="" />
        <span v-else class="elr-img elr-img--holding" />
      </span>
      <span class="elr-body">
        <span class="elr-kicker">{{ kicker }}</span>
        <span class="elr-name">
          <span class="elr-prefix">Galaxy</span>
          <span class="elr-number">{{ toRoman(galaxyStore.currentGalaxy) }}</span>
        </span>
      </span>
    </span>

    <span class="elr-progress">
      <span class="elr-progress-head">
        <span class="elr-stars-label">{{ VOYAGE_LIVE_STARS_LABEL }}</span>
        <span class="elr-stars-count">
          <span class="elr-freed">{{ galaxyStore.starsRescued }}</span
          ><span class="elr-of">/{{ galaxyStore.starsRequired }}</span>
        </span>
      </span>
      <span class="elr-rail" aria-hidden="true">
        <span class="elr-fill" :style="{ transform: `scaleX(${starScale})` }" />
      </span>
    </span>
  </button>
</template>

<style scoped>
.elr {
  gap: 0.2em;
  height: v-bind(rowH);
  margin-top: -4px;
  align-items: stretch;
  flex-direction: column;
  padding: 0.3em 0.8em 0.35em 0.9em;
  background: color-mix(in srgb, var(--elr-accent) 10%, var(--sr-row-bg));
  border-color: color-mix(in srgb, var(--elr-accent) 55%, var(--sr-row-border));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--elr-accent) 45%, transparent);
  --sr-color: var(--elr-accent, #c89040);
  --sr-pick: var(--elr-accent, #c89040);
}
.elr.is-picked {
  background: color-mix(in srgb, var(--elr-accent) 22%, var(--sr-row-bg));
}

.elr-main {
  display: flex;
  align-items: center;
  gap: 0.65em;
  min-height: 0;
  flex: 1;
}

.elr-thumb {
  position: relative;
  display: block;
  flex: 0 0 v-bind(thumbW);
  width: v-bind(thumbW);
  height: v-bind(thumbH);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--elr-accent) 60%, #6b5330);
  border-radius: 3px;
  background: #0b0806;
}
.elr-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.elr-img--holding {
  background: #0b0806;
}

.elr-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35em;
}

.elr-kicker {
  display: flex;
  align-items: center;
  gap: 0.45em;
  min-width: 0;
  overflow: hidden;
  font-size: 0.55em;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--elr-accent);
}
.elr-name {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  font-size: 1.3em;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.elr-prefix {
  color: var(--sr-text);
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.elr-number {
  color: #e8c040;
}

.elr-progress {
  display: flex;
  flex-direction: column;
  gap: 0.2em;
  min-width: 0;
}
.elr-progress-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75em;
}
.elr-stars-label {
  font-size: 0.7em;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--elr-accent);
}
.elr-stars-count {
  display: inline-flex;
  align-items: baseline;
  flex-shrink: 0;
  font-size: 1.3em;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
}
.elr-freed {
  color: var(--elr-freed);
}
.elr-of {
  color: #7a4e20;
}

.elr-rail {
  display: block;
  height: 5px;
  border: 1px solid #5c3310;
  border-radius: 2px;
  background: #3e200a;
  overflow: hidden;
}
.elr-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--elr-freed);
  transition: transform 0.4s ease;
}
@media (prefers-reduced-motion: reduce) {
  .elr-fill {
    transition: none;
  }
}
</style>
