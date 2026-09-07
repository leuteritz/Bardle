<script setup lang="ts">
/**
 * Die erste Zeile der Zielliste: der laufende Lauf.
 *
 * Bewusst KEINE `ExpeditionGalaxyRow`: die lebt von ihrer Snapshot-Miniatur,
 * und für eine Galaxie, die noch läuft, gibt es kein Standbild — das entsteht
 * erst, wenn sie befreit ist. Sie ist deshalb schmaler, trägt statt der
 * Miniatur den Live-Punkt und statt der Zähler den Sternstand.
 */
import { computed } from 'vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { destinationName } from '@/config/economy/expeditionDestinations'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { toRoman } from '@/utils/ui/format'
import {
  LANDMARK_FREED_CORE,
  VOYAGE_LIVE_RAIL_LABEL,
  VOYAGE_LIVE_RAIL_TITLE,
  VOYAGE_LIVE_ROW_H,
} from '@/config/constants'

defineProps<{ selected: boolean }>()
const emit = defineEmits<{ select: [] }>()

const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()

const rowH = `${VOYAGE_LIVE_ROW_H}px`

const accent = computed(
  () => `rgb(${minimapAccentForTheme(galaxyStore.currentThemeIndex, gameStore.currentUniverse)})`,
)

const themeName = computed(() => destinationName(galaxyStore.currentThemeIndex))

const starScale = computed(() => {
  const need = Math.max(1, galaxyStore.starsRequired)
  return Math.min(1, galaxyStore.starsRescued / need)
})
</script>

<template>
  <button
    type="button"
    class="elr"
    :class="{ 'elr--on': selected }"
    :style="{ '--elr-accent': accent, '--elr-freed': LANDMARK_FREED_CORE }"
    :title="VOYAGE_LIVE_RAIL_TITLE"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <span class="elr-dot" aria-hidden="true" />

    <span class="elr-body">
      <span class="elr-kicker">{{ VOYAGE_LIVE_RAIL_LABEL }}</span>
      <span class="elr-name">Galaxy {{ toRoman(galaxyStore.currentGalaxy) }} · {{ themeName }}</span>
    </span>

    <span class="elr-stars">
      <span class="elr-freed">{{ galaxyStore.starsRescued }}</span
      ><span class="elr-of">/{{ galaxyStore.starsRequired }}</span>
    </span>

    <span class="elr-rail" aria-hidden="true">
      <span class="elr-fill" :style="{ transform: `scaleX(${starScale})` }" />
    </span>
  </button>
</template>

<style scoped>
.elr {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: v-bind(rowH);
  padding: 0 10px;
  text-align: left;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
}
/* Die Akzentkante der laufenden Galaxie — dieselbe Geste wie bei den Zeilen
   darunter, nur trägt sie hier die Farbe des Themas statt der Stufe. */
.elr::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--elr-accent, #c89040);
}
.elr:hover {
  border-color: #5c3310;
}
.elr--on {
  background: #221c10;
  border-color: #7a4e20;
}

/* Der Punkt RUHT: statischer Schein, animiert wird allein die Deckkraft. */
.elr-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-left: 3px;
  border-radius: 50%;
  background: var(--elr-freed);
  box-shadow: 0 0 7px rgba(92, 232, 180, 0.7);
  animation: elr-pulse 2.4s ease-in-out infinite alternate;
}
@keyframes elr-pulse {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

.elr-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.elr-kicker {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.6);
}

.elr-name {
  font-size: 12.5px;
  font-weight: 800;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.elr-stars {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
}
.elr-freed {
  color: var(--elr-freed);
}
.elr-of {
  color: rgba(216, 200, 160, 0.45);
}

.elr-rail {
  position: absolute;
  left: 3px;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgba(122, 78, 32, 0.24);
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
  .elr-dot {
    animation: none;
    opacity: 1;
  }
  .elr-fill {
    transition: none;
  }
}
</style>
