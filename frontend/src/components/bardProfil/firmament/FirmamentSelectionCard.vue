<script setup lang="ts">
/**
 * Was gerade gewaehlt ist — eine Ueberlagerung unten rechts, die der Buehne
 * keine Layoutbreite nimmt.
 *
 * Zwei Zustaende, EINE Karte: eine gewaehlte Galaxie, oder die BAHN selbst —
 * auf der eigenen die laufende Galaxie, auf einer vergangenen ihr Lauf. Keine
 * Auswahl ist kein Leerzustand; eine Karte, die verschwindet, liesse die Ecke
 * bei jeder Abwahl springen.
 *
 * Die Galaxie zeigt ihre ECHTE Platte als Miniatur (`renderGalaxyThumb`, derselbe
 * Cache wie Archiv und Voyages-Leiste) — derselbe Datensatz traegt im ganzen
 * Spiel dasselbe Gesicht.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { renderGalaxyThumb } from '@/utils/fx/galaxySnapshot'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { getUniverse } from '@/config/progression/universes'
import { formatNumber } from '@/config/ui/numberFormat'
import { formatCompactDuration, toRoman } from '@/utils/ui/format'
import { FIRMAMENT_GATE_COLOR, FIRMAMENT_HERE_COLOR, MS_PER_SECOND } from '@/config/constants'
import type { FirmamentDeparture, FirmamentNode } from '@/utils/ui/firmamentLayout'
import type { FirmamentSelection } from '@/types'

const props = defineProps<{
  nodes: FirmamentNode[]
  departure: FirmamentDeparture | null
  selection: FirmamentSelection
}>()

const gameStore = useGameStore()

const isHere = computed(() => props.selection.universe === gameStore.currentUniverse)

const node = computed(() => {
  const { galaxy } = props.selection
  if (galaxy !== null) return props.nodes.find((n) => n.galaxy === galaxy) ?? null
  return isHere.value ? (props.nodes.find((n) => n.state === 'current') ?? null) : null
})

/** Ohne gewaehlte Galaxie steht auf einer vergangenen Bahn ihr Lauf. */
const run = computed(() =>
  props.selection.galaxy === null && !isHere.value ? props.departure : null,
)

/** Die Platte rastert SYNCHRON — hier genau eine, beim Auswahlwechsel. Zwanzig
 *  auf einmal waeren das Problem, gegen das `useLazyGalaxySnapshot` gebaut ist. */
const thumb = computed(() => (node.value?.record ? renderGalaxyThumb(node.value.record) : null))

const accent = computed(() => {
  if (run.value) return FIRMAMENT_GATE_COLOR
  const t = node.value?.themeIndex ?? -1
  if (t < 0) return FIRMAMENT_HERE_COLOR
  return `rgb(${minimapAccentForTheme(t)})`
})

const title = computed(() => {
  if (run.value) return `Universe ${toRoman(props.selection.universe)}`
  return node.value ? `Galaxy ${toRoman(node.value.galaxy)}` : ''
})

const subtitle = computed(() => {
  if (run.value) {
    const name = getUniverse(props.selection.universe).name
    return run.value.visits > 1 ? `${name} · ${run.value.visits} visits` : name
  }
  const t = node.value?.themeIndex ?? -1
  return t >= 0 ? GALAXY_THEMES[t % GALAXY_THEMES.length].name : 'uncharted'
})

const line = computed(() => {
  const d = run.value
  if (d) {
    // Die Chimes MEHRERER Besuche werden nicht summiert — das waere keine Zahl,
    // die etwas bedeutet. Genannt wird der letzte Lauf.
    return (
      `${d.run.galaxiesFreed} galaxies · ${d.run.starsRescued} stars · ` +
      `${formatCompactDuration(d.run.durationSeconds * MS_PER_SECOND)} · ${formatNumber(d.run.chimes)} chimes`
    )
  }
  const n = node.value
  if (!n) return ''
  if (n.state === 'current') {
    return `${n.rescued} / ${n.stars} stars rescued · Universe ${toRoman(gameStore.currentUniverse)}`
  }
  const parts = [`${n.rescued} rescued`]
  if (n.lost > 0) parts.push(`${n.lost} lost`)
  if (n.landfalls > 0) parts.push(`${n.landfalls} landfall${n.landfalls === 1 ? '' : 's'}`)
  if (n.record) parts.push(formatCompactDuration(n.record.durationSeconds * MS_PER_SECOND))
  return parts.join(' · ')
})

const providence = computed(() => run.value?.run.providence ?? null)
</script>

<template>
  <div v-if="node || run" class="fm-sel" :style="{ '--fm-sel-accent': accent }">
    <span class="fm-sel-face">
      <img v-if="thumb" class="fm-sel-thumb" :src="thumb" alt="" />
      <Icon v-else-if="run" icon="game-icons:portal" width="26" height="26" />
      <Icon v-else icon="lucide:crosshair" width="26" height="26" />
    </span>
    <span class="fm-sel-body">
      <span class="fm-sel-title">
        {{ title }}
        <span class="fm-sel-sub">{{ subtitle }}</span>
      </span>
      <span class="fm-sel-line">{{ line }}</span>
      <span v-if="providence" class="fm-sel-prov">
        <Icon icon="game-icons:eye-of-horus" width="12" height="12" />
        {{ providence }}
      </span>
    </span>
  </div>
</template>

<style scoped>
.fm-sel {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 380px;
  padding: 8px 12px;
  background: rgba(12, 10, 6, 0.9);
  border: 1px solid var(--fm-sel-accent);
  border-radius: 4px;
}

.fm-sel-face {
  display: grid;
  place-items: center;
  width: 56px;
  height: 36px;
  flex-shrink: 0;
  overflow: hidden;
  color: var(--fm-sel-accent);
  background: #0b0806;
  border: 1px solid #3a2c14;
  border-radius: 4px;
}

.fm-sel-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fm-sel-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.fm-sel-title {
  font-size: 15px;
  line-height: 1;
  color: #f2ead2;
  white-space: nowrap;
}

.fm-sel-sub {
  font-size: 12px;
  color: var(--fm-sel-accent);
}

.fm-sel-line {
  font-size: 11.5px;
  color: #9a9184;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-sel-prov {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #c9a8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
