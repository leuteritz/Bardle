<script setup lang="ts">
/**
 * Ein Ziel auf der Sternenkarte — eine befreite Galaxie.
 *
 * Das Bild ist die ECHTE Minimap dieses Durchlaufs, aus Seed und Verlauf
 * nachgezeichnet. Sie wird erst gerendert, wenn die Karte ins Sichtfeld kommt:
 * `renderGalaxySnapshot` zeichnet 640×400 px synchron, und dreissig davon im
 * ersten Frame sind der teuerste Moment, den dieser Reiter haben kann. Der
 * modulweite Cache im Renderer macht es danach einmal je Sitzung.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { renderGalaxySnapshot } from '@/utils/fx/galaxySnapshot'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { EXPEDITION_CHART_MAX, ARCHIVE_SNAPSHOT_ROOT_MARGIN } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { DestinationProgress } from '@/types'

const props = defineProps<{
  record: CompletedGalaxyRecord
  progress: DestinationProgress
  selected: boolean
  contracts: number
}>()
const emit = defineEmits<{ select: [number] }>()

const dest = computed(() => destinationFor(props.record))

const root = ref<HTMLElement | null>(null)
const painted = ref(false)
const snapshot = computed(() => (painted.value ? renderGalaxySnapshot(props.record) : ''))

let observer: IntersectionObserver | null = null
onMounted(() => {
  if (!root.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      painted.value = true
      observer?.disconnect()
      observer = null
    },
    { rootMargin: ARCHIVE_SNAPSHOT_ROOT_MARGIN },
  )
  observer.observe(root.value)
})
onUnmounted(() => {
  observer?.disconnect()
  observer = null
})

const rescued = computed(() => props.record.attemptResults.filter((r) => r === 'rescued').length)
const chartPct = computed(() => props.progress.charted / EXPEDITION_CHART_MAX)
</script>

<template>
  <button
    ref="root"
    class="edc"
    :class="[`edc--${dest.tier}`, { 'edc--on': selected }]"
    :aria-pressed="selected"
    :title="`${dest.name} — Galaxy ${dest.galaxy}`"
    @click="emit('select', dest.galaxy)"
  >
    <span class="edc-frame">
      <img v-if="snapshot" :src="snapshot" class="edc-img" alt="" />
      <span v-else class="edc-img edc-img--holding" />
      <span class="edc-veil" />
      <span class="edc-no">{{ dest.galaxy }}</span>
      <span v-if="contracts > 0" class="edc-contracts">
        <Icon icon="ph:scroll-fill" width="11" height="11" />
        {{ contracts }}
      </span>
    </span>

    <span class="edc-name">{{ dest.name }}</span>

    <span class="edc-meta">
      <span class="edc-stat">
        <Icon icon="ph:star-fill" width="11" height="11" />
        {{ rescued }}
      </span>
      <span class="edc-stat">
        <Icon icon="game-icons:caravel" width="11" height="11" />
        {{ progress.runs }}
      </span>
      <span class="edc-tier">{{ dest.tier }}</span>
    </span>

    <span class="edc-chart" :title="`Charted ${progress.charted} / ${EXPEDITION_CHART_MAX}`">
      <span class="edc-chart-fill" :style="{ transform: `scaleX(${chartPct})` }" />
    </span>
  </button>
</template>

<style scoped>
.edc {
  position: relative;
  flex-shrink: 0;
  width: 148px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 6px 7px;
  /* Pergament — die Karte ist die eine helle Fläche des Spiels. */
  background: linear-gradient(180deg, #e3d5b4 0%, #d2c096 100%);
  border: 1px solid #8a6b3c;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.32);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.edc:hover {
  border-color: #4a3820;
}
.edc--on {
  border-color: #2e2415;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.32),
    0 0 0 2px #e8c040;
}

.edc-frame {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid #6b5330;
  border-radius: 3px;
  background: #0b0806;
}
.edc-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.edc-img--holding {
  background: #0b0806;
}
/* Der untere Rand des Bildes trägt die Ziffer — ohne Schleier verschwindet sie
   in einem hellen Spiralarm. */
.edc-veil {
  position: absolute;
  inset: auto 0 0 0;
  height: 46%;
  background: linear-gradient(to top, rgba(11, 8, 6, 0.92), transparent);
  pointer-events: none;
}
.edc-no {
  position: absolute;
  left: 5px;
  bottom: 3px;
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 17px;
  line-height: 1;
  color: #e8c040;
  text-shadow: 0 1px 3px #000;
}
.edc-contracts {
  position: absolute;
  right: 4px;
  top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(11, 8, 6, 0.85);
  border: 1px solid #c89040;
  color: #e8c040;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.edc-name {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 13.5px;
  line-height: 1.1;
  color: #2e2415;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: #5c4c30;
  font-variant-numeric: tabular-nums;
}
.edc-stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.edc-tier {
  margin-left: auto;
  padding: 0 5px;
  border: 1px solid #8a6b3c;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4a3820;
}
.edc--rare .edc-tier {
  border-color: #3a5a8a;
  color: #24405e;
}
.edc--epic .edc-tier {
  border-color: #6b3a86;
  color: #46215a;
}

.edc-chart {
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(46, 36, 21, 0.22);
}
.edc-chart-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a6b3c, #4a3820);
  transition: transform 0.35s ease;
}
</style>
