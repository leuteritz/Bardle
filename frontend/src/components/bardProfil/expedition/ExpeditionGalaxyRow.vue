<script setup lang="ts">
/**
 * Eine befreite Galaxie in der Seitenleiste.
 *
 * Das Bild IST das Wiedererkennen — eine befreite Galaxie hat keinen Namen,
 * den man vor ihrer Form behält.
 *
 * `renderGalaxyThumb` und nicht das volle Standbild: die Zeile zeigt 84×53 px,
 * ein 640×400-PNG hier zu dekodieren kostete gemessen 241 ms beim
 * Wiedereinblenden des Reiters. Und es wird erst gezeichnet, wenn die Zeile ins
 * Sichtfeld kommt — der modulweite Cache macht es danach einmal je Sitzung.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { renderGalaxyThumb } from '@/utils/fx/galaxySnapshot'
import { toRoman } from '@/utils/ui/format'
import { ARCHIVE_SNAPSHOT_ROOT_MARGIN, EXPEDITION_CHART_MAX } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageRailRow } from '@/types'

const props = defineProps<{
  row: VoyageRailRow
  record: CompletedGalaxyRecord
  selected: boolean
  folded: boolean
}>()
const emit = defineEmits<{ select: [number] }>()

const root = ref<HTMLElement | null>(null)
const painted = ref(false)
const snapshot = computed(() => (painted.value ? renderGalaxyThumb(props.record) : ''))

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
onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const chartPct = computed(() => props.row.charted / EXPEDITION_CHART_MAX)
const waiting = computed(() => props.row.contracts + props.row.ready)
const title = computed(
  () =>
    `${props.row.name} — Galaxy ${props.row.galaxy} · ${props.row.contracts} contract(s), ` +
    `${props.row.inField} in the field`,
)
</script>

<template>
  <button
    ref="root"
    class="egr"
    :class="[`egr--${row.tier}`, { 'egr--on': selected, 'egr--folded': folded }]"
    :style="{ '--gx-accent': `rgb(${row.accent})` }"
    :aria-pressed="selected"
    :aria-label="title"
    :title="title"
    @click="emit('select', row.galaxy)"
  >
    <span class="egr-thumb">
      <img v-if="snapshot" :src="snapshot" class="egr-img" alt="" />
      <span v-else class="egr-img egr-img--holding" />
      <span class="egr-no">{{ toRoman(row.galaxy) }}</span>
      <span v-if="!row.seen" class="egr-new">NEW</span>
    </span>

    <span v-if="!folded" class="egr-body">
      <span class="egr-name">{{ row.name }}</span>
      <span class="egr-meta">
        <span v-if="row.contracts" class="egr-chip egr-chip--offer">
          <Icon icon="ph:scroll-fill" width="11" height="11" />
          {{ row.contracts }}
        </span>
        <span v-if="row.inField" class="egr-chip egr-chip--field">
          <Icon icon="game-icons:caravel" width="11" height="11" />
          {{ row.inField }}
        </span>
        <span v-if="row.ready" class="egr-chip egr-chip--ready">
          <Icon icon="ph:treasure-chest-fill" width="11" height="11" />
          {{ row.ready }}
        </span>
        <span v-if="!waiting && !row.inField" class="egr-chip egr-chip--idle">quiet</span>
        <span class="egr-tier">{{ row.tier }}</span>
      </span>
      <span class="egr-chart" :title="`Charted ${row.charted} / ${EXPEDITION_CHART_MAX}`">
        <span class="egr-chart-fill" :style="{ transform: `scaleX(${chartPct})` }" />
      </span>
    </span>

    <!-- Eingeklappt bleibt die Zahl stehen: eine Spalte, die nicht mehr meldet,
         dass dort etwas wartet, wird vergessen. -->
    <span v-else-if="waiting" class="egr-stub-count">{{ waiting }}</span>
  </button>
</template>

<style scoped>
.egr {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.13s,
    border-color 0.13s;
}
.egr:hover {
  background: #1c1a12;
  border-left-color: var(--gx-accent, #c89040);
}
.egr--on {
  background: color-mix(in srgb, var(--gx-accent, #e8c040) 20%, #12100a);
  border-color: color-mix(in srgb, var(--gx-accent, #e8c040) 45%, transparent);
  border-left-color: var(--gx-accent, #e8c040);
}
.egr:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}

.egr-thumb {
  position: relative;
  flex-shrink: 0;
  display: block;
  width: 84px;
  height: 53px;
  overflow: hidden;
  border: 1px solid #6b5330;
  border-radius: 3px;
  background: #0b0806;
}
.egr--folded .egr-thumb {
  width: 34px;
  height: 34px;
}
.egr-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.egr-img--holding {
  background: #0b0806;
}
.egr-no {
  position: absolute;
  left: 3px;
  bottom: 1px;
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 12px;
  line-height: 1.1;
  color: #e8c040;
  text-shadow: 0 1px 3px #000;
}
.egr-new {
  position: absolute;
  right: 2px;
  top: 2px;
  padding: 0 3px;
  border-radius: 2px;
  background: #52b830;
  color: #0b0806;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.egr-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.egr-name {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 13px;
  line-height: 1.1;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.egr--on .egr-name {
  color: #fff4dc;
}

.egr-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
}
.egr-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 4px;
  border-radius: 3px;
  border: 1px solid #3e200a;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.5;
}
.egr-chip--offer {
  color: #e8c040;
  border-color: rgba(200, 144, 64, 0.5);
}
.egr-chip--field {
  color: rgba(230, 220, 196, 0.7);
}
.egr-chip--ready {
  color: #a0f0d0;
  border-color: rgba(100, 220, 180, 0.5);
}
.egr-chip--idle {
  color: rgba(200, 144, 64, 0.32);
  border-color: transparent;
  padding-left: 0;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.egr-tier {
  margin-left: auto;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.4);
}
.egr--rare .egr-tier {
  color: #7aa8e0;
}
.egr--epic .egr-tier {
  color: #c090e0;
}

.egr-chart {
  display: block;
  height: 3px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(200, 164, 90, 0.14);
}
.egr-chart-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8c060);
  transition: transform 0.35s ease;
}

.egr--folded {
  justify-content: center;
  padding: 6px 0;
}
.egr-stub-count {
  position: absolute;
  right: 4px;
  top: 3px;
  min-width: 14px;
  padding: 0 3px;
  border-radius: 3px;
  background: #7a4e20;
  color: #fff4dc;
  font-size: 9.5px;
  font-weight: 900;
  line-height: 14px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
