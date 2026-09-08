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
    class="sr-row elr"
    :class="{ 'is-picked': selected }"
    :style="{ '--elr-accent': accent, '--elr-freed': LANDMARK_FREED_CORE }"
    :title="VOYAGE_LIVE_RAIL_TITLE"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <span class="elr-dot" aria-hidden="true" />

    <span class="elr-body">
      <span class="elr-name">
        <span class="elr-galaxy">Galaxy {{ toRoman(galaxyStore.currentGalaxy) }}</span>
        <span class="elr-separator" aria-hidden="true">·</span>
        <span class="elr-theme">{{ themeName }}</span>
      </span>
      <span class="elr-kicker">{{ VOYAGE_LIVE_RAIL_LABEL }}</span>
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
/* Flaeche, Rahmen, Radius, Hover, Auswahl und Fokus stehen als `.sr-row` im
   Theme — die laufende Galaxie ist dieselbe Karte wie die Zeilen darunter.
   Hier bleiben nur ihre Masse und ihre Farben. */
.elr {
  gap: 9px;
  height: v-bind(rowH);
  padding: 0 10px;
  /* Die Akzentkante der laufenden Galaxie — dieselbe Geste wie bei den Zeilen
     darunter, nur traegt sie hier die Farbe des THEMAS statt der Stufe. */
  --sr-color: var(--elr-accent, #c89040);
}
.elr.is-picked {
  --sr-pick: var(--rpg-wood);
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
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 15px;
  line-height: 1.05;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.elr-galaxy {
  color: #e8c040;
}
.elr-separator {
  color: #7a4e20;
}
.elr-theme {
  min-width: 0;
  overflow: hidden;
  color: #e8dcc0;
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
