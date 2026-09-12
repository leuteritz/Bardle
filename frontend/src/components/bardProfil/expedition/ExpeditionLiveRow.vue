<script setup lang="ts">
/** Live galaxy selection row; no snapshot exists before completion. */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { toRoman } from '@/utils/ui/format'
import {
  LANDMARK_FREED_CORE,
  VOYAGE_LIVE_RAIL_LABEL,
  VOYAGE_LIVE_RAIL_TITLE,
  VOYAGE_LIVE_ROW_H,
  VOYAGE_LIVE_STARS_LABEL,
} from '@/config/constants'

defineProps<{ selected: boolean }>()
const emit = defineEmits<{ select: [] }>()

const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()

const rowH = `${VOYAGE_LIVE_ROW_H}px`

const accent = computed(
  () => `rgb(${minimapAccentForTheme(galaxyStore.currentThemeIndex, gameStore.currentUniverse)})`,
)

const starScale = computed(() => {
  const need = Math.max(1, galaxyStore.starsRequired)
  return Math.min(1, galaxyStore.starsRescued / need)
})
</script>

<template>
  <button
    type="button"
    class="sr-row elr"
    :class="{ 'is-picked': selected }"
    :style="{ '--elr-accent': accent, '--elr-freed': LANDMARK_FREED_CORE }"
    :title="VOYAGE_LIVE_RAIL_TITLE"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <span class="elr-main">
      <span class="elr-sigil" aria-hidden="true">
        <Icon icon="game-icons:galaxy" class="elr-sigil-icon" />
      </span>
      <span class="elr-body">
        <span class="elr-kicker">{{ VOYAGE_LIVE_RAIL_LABEL }}</span>
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
  gap: 0.5em;
  height: v-bind(rowH);
  margin-top: -4px;
  align-items: stretch;
  flex-direction: column;
  padding: 0.65em 0.8em 0.75em 0.9em;
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

.elr-sigil {
  display: grid;
  flex: 0 0 2.2em;
  place-items: center;
  width: 2.2em;
  height: 2.2em;
  border: 1px solid #6b5330;
  border-radius: 4px;
  background: #141410;
  color: var(--elr-accent);
}
.elr-sigil-icon {
  width: 1.55em;
  height: 1.55em;
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
  font-size: 0.76em;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
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
  gap: 0.28em;
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
