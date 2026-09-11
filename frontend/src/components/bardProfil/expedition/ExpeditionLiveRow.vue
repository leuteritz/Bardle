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
    <span class="elr-body">
      <span class="elr-kicker">
        <span class="elr-status-dot" aria-hidden="true" />
        {{ VOYAGE_LIVE_RAIL_LABEL }}
      </span>
      <span class="elr-name">
        <span class="elr-number">{{ toRoman(galaxyStore.currentGalaxy) }}</span>
      </span>
    </span>

    <span class="elr-stars">
      <span class="elr-stars-label">{{ VOYAGE_LIVE_STARS_LABEL }}</span>
      <span class="elr-stars-count">
        <span class="elr-freed">{{ galaxyStore.starsRescued }}</span
        ><span class="elr-of">/{{ galaxyStore.starsRequired }}</span>
      </span>
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
  gap: 0.85em;
  height: v-bind(rowH);
  margin-top: -4px;
  align-items: stretch;
  padding: 0.85em 0.8em 0.95em 0.9em;
  background: color-mix(in srgb, var(--elr-accent) 10%, var(--sr-row-bg));
  border-color: color-mix(in srgb, var(--elr-accent) 55%, var(--sr-row-border));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--elr-accent) 45%, transparent);
  /* Die Akzentkante der laufenden Galaxie — dieselbe Geste wie bei den Zeilen
     darunter, nur traegt sie hier die Farbe des THEMAS statt der Stufe. */
  --sr-color: var(--elr-accent, #c89040);
  --sr-pick: var(--elr-accent, #c89040);
}
.elr.is-picked {
  background: color-mix(in srgb, var(--elr-accent) 22%, var(--sr-row-bg));
}

.elr-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5em;
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
.elr-status-dot {
  flex: 0 0 auto;
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: var(--elr-accent);
  box-shadow: 0 0 0 0.3em color-mix(in srgb, var(--elr-accent) 18%, transparent);
}

.elr-name {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15em;
  font-size: 1.28em;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.elr-number {
  color: #e8c040;
}

.elr-stars {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 0.25em;
  flex-shrink: 0;
  min-width: 4.7em;
  padding-left: 0.75em;
  border-left: 1px solid color-mix(in srgb, var(--elr-accent) 45%, var(--sr-row-border));
}
.elr-stars-label {
  max-width: 4.2em;
  font-size: 0.64em;
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1.1;
  text-transform: uppercase;
  text-align: right;
  color: var(--elr-accent);
}
.elr-stars-count {
  font-size: 1.5em;
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
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
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
