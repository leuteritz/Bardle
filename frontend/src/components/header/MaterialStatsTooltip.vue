<script setup lang="ts">
/**
 * Hover dashboard for one material in the header grid.
 *
 * The grid cell itself can only ever say "you have 1.2k of these". Everything a
 * player actually wants to know is history: is this pile growing or shrinking,
 * where does it come from, what am I burning it on. All of that lives in the
 * inventory ledger; this component only reads and arranges it.
 *
 * Rendered exclusively inside an open RpgBadgeTooltip (v-if'd behind the
 * teleport), so the 1s clock below exists for at most one material at a time —
 * hovering the header never costs a frame anywhere else.
 */
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { MATERIALS } from '@/config/economy/materials'
import { formatNumber, formatNumberCompact } from '@/config/ui/numberFormat'
import { formatCompactDuration } from '@/utils/ui/format'
import type { MaterialFlowShare } from '@/types'
import {
  MATERIAL_COLOR,
  MATERIAL_PLACEHOLDER_LABELS,
  MATERIAL_RARITY_COLOR,
  MATERIAL_SOURCE_LABELS,
  MATERIAL_SOURCE_ICONS,
  MATERIAL_SINK_LABELS,
  MATERIAL_SINK_ICONS,
  MATERIAL_RATE_BUCKET_COUNT,
  MATERIAL_RATE_BUCKET_MS,
  MATERIAL_RATE_MIN_SAMPLE_MS,
  MATERIAL_TOOLTIP_TICK_MS,
  MATERIAL_TOOLTIP_BREAKDOWN_ROWS,
  MATERIAL_SPARK_VIEW_H,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'

const props = defineProps<{ materialId: string }>()

const inventoryStore = useInventoryStore()

/* Live clock — "4m ago" and the per-hour figure would otherwise freeze at the
   value they had when the panel opened. */
const now = ref(gameNow())
let clock: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  clock = setInterval(() => (now.value = gameNow()), MATERIAL_TOOLTIP_TICK_MS)
})
onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
  clock = null
})

const material = computed(() => MATERIALS.find((m) => m.id === props.materialId))
const accent = computed(() => MATERIAL_COLOR[props.materialId] ?? '#e8c040')
const rarity = computed(() => material.value?.rarity ?? 'common')
const rarityColor = computed(() => MATERIAL_RARITY_COLOR[rarity.value] ?? '#c8c8c8')
const placeholder = computed(
  () =>
    MATERIAL_PLACEHOLDER_LABELS[props.materialId] ??
    (material.value?.name ?? '??').slice(0, 2).toUpperCase(),
)

const stock = computed(() => inventoryStore.collectedMaterials[props.materialId] ?? 0)
/* Admin cheats and pre-ledger saves write stock without touching the lifetime
   tally — the pile in hand is always a valid lower bound for "ever collected". */
const collected = computed(() =>
  Math.max(inventoryStore.lifetimeCollected[props.materialId] ?? 0, stock.value),
)
const spent = computed(() => inventoryStore.lifetimeSpent[props.materialId] ?? 0)
const peak = computed(() =>
  Math.max(inventoryStore.peakStock[props.materialId] ?? 0, stock.value),
)
const discovered = computed(() => collected.value > 0)

/** Share of every material unit the player has ever picked up. */
const share = computed(() => {
  const total = inventoryStore.totalMaterialsCollected
  return total > 0 ? collected.value / total : 0
})

/** How much of what was collected is still in hand — the pile's survival rate. */
const retained = computed(() => (collected.value > 0 ? stock.value / collected.value : 0))

const firstFoundAt = computed(() => inventoryStore.firstFoundAt[props.materialId] ?? 0)
const lastFoundAt = computed(() => inventoryStore.lastFoundAt[props.materialId] ?? 0)
const droughtMs = computed(() => inventoryStore.longestDroughtMs[props.materialId] ?? 0)

/* ── Intake window ───────────────────────────────────────────────────────── */

const buckets = computed<number[]>(
  () => inventoryStore.rateBuckets[props.materialId] ?? [],
)
const windowTotal = computed(() => buckets.value.reduce((sum, n) => sum + n, 0))

/** Measured span, capped to the window — a 3-minute session divides by 3 min. */
const measuredMs = computed(() =>
  Math.min(
    now.value - inventoryStore.rateStartedAt,
    MATERIAL_RATE_BUCKET_COUNT * MATERIAL_RATE_BUCKET_MS,
  ),
)
const rateReady = computed(() => measuredMs.value >= MATERIAL_RATE_MIN_SAMPLE_MS)
const perHour = computed(() =>
  measuredMs.value > 0 ? (windowTotal.value / measuredMs.value) * 3_600_000 : 0,
)

/* Sparkline geometry. Depends on the buckets alone, so the 1s clock above does
   not rebuild the path every second — only an actual drop does. */
const SPARK_H = MATERIAL_SPARK_VIEW_H
const sparkW = computed(() => Math.max(MATERIAL_RATE_BUCKET_COUNT - 1, 1))
const sparkPeak = computed(() => Math.max(...buckets.value, 1))
const sparkPoints = computed(() => {
  const b = buckets.value
  if (b.length === 0) return ''
  const step = sparkW.value / Math.max(b.length - 1, 1)
  return b
    .map((v, i) => `${(i * step).toFixed(2)},${(SPARK_H - (v / sparkPeak.value) * SPARK_H).toFixed(2)}`)
    .join(' ')
})
const sparkArea = computed(() =>
  sparkPoints.value ? `0,${SPARK_H} ${sparkPoints.value} ${sparkW.value},${SPARK_H}` : '',
)

/* ── Source / sink breakdown ─────────────────────────────────────────────── */

function toShares(
  tally: Record<string, number> | undefined,
  labels: Record<string, string>,
  icons: Record<string, string>,
): MaterialFlowShare[] {
  const entries = Object.entries(tally ?? {}).filter(([, amount]) => amount > 0)
  if (entries.length === 0) return []
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0)
  entries.sort((a, b) => b[1] - a[1])

  // Long tail folds into one row so the panel height stays predictable —
  // except when exactly one row would be folded, where "1 more" costs the same
  // line as simply naming it.
  const cut = entries.length === MATERIAL_TOOLTIP_BREAKDOWN_ROWS + 1
    ? entries.length
    : MATERIAL_TOOLTIP_BREAKDOWN_ROWS
  const head = entries.slice(0, cut)
  const tail = entries.slice(cut)
  if (tail.length > 0) {
    const rest = tail.reduce((sum, [, amount]) => sum + amount, 0)
    head.push(['__rest', rest])
  }

  const peakAmount = head[0][1]
  return head.map(([id, amount]) => ({
    id,
    label: id === '__rest' ? `${tail.length} more` : (labels[id] ?? id),
    icon: id === '__rest' ? 'game-icons:stone-pile' : (icons[id] ?? 'game-icons:stone-pile'),
    amount,
    fraction: peakAmount > 0 ? amount / peakAmount : 0,
    share: total > 0 ? amount / total : 0,
  }))
}

const sources = computed(() =>
  toShares(inventoryStore.sourceTally[props.materialId], MATERIAL_SOURCE_LABELS, MATERIAL_SOURCE_ICONS),
)
const sinks = computed(() =>
  toShares(inventoryStore.sinkTally[props.materialId], MATERIAL_SINK_LABELS, MATERIAL_SINK_ICONS),
)

/* ── Formatting helpers ──────────────────────────────────────────────────── */

function pct(value: number): string {
  if (value <= 0) return '0%'
  if (value < 0.001) return '<0.1%'
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`
}

function ago(timestamp: number): string {
  if (!timestamp) return 'never'
  const elapsed = now.value - timestamp
  return elapsed < 60_000 ? 'just now' : `${formatCompactDuration(elapsed)} ago`
}

const dropRateText = computed(() => {
  const chance = material.value?.dropChance ?? 0
  return `${(chance * 100).toFixed(chance < 0.1 ? 1 : 0)}% drop weight`
})

const rateText = computed(() => {
  if (!rateReady.value) return '—'
  const value = perHour.value
  if (value > 0 && value < 1) return '<1'
  return formatNumberCompact(Math.round(value))
})

const windowLabel = computed(() =>
  measuredMs.value >= MATERIAL_RATE_BUCKET_COUNT * MATERIAL_RATE_BUCKET_MS
    ? 'Last hour'
    : `Last ${formatCompactDuration(measuredMs.value)}`,
)
</script>

<template>
  <div v-if="material" class="mst" :style="{ '--accent': accent, '--rarity': rarityColor }">

    <!-- ════════ Kopf: Icon, Name, Seltenheit ════════ -->
    <header class="mst-head">
      <img v-if="material.image" :src="material.image" class="mst-art" :alt="material.name" />
      <span v-else class="mst-art mst-art--ph">{{ placeholder }}</span>
      <div class="mst-head-text">
        <div class="mst-name">{{ material.name }}</div>
        <div class="mst-meta">
          <span class="mst-rarity">{{ rarity }}</span>
          <span class="mst-dot">·</span>
          <span class="mst-droprate">{{ dropRateText }}</span>
        </div>
      </div>
    </header>

    <p class="mst-desc">{{ material.description }}</p>

    <!-- ════════ Noch nie gefunden ════════ -->
    <div v-if="!discovered" class="mst-locked">
      <Icon icon="game-icons:falling-rocks" width="20" height="20" />
      <span>Not discovered yet — keep the orbit running.</span>
    </div>

    <template v-else>
      <!-- ════════ Kernzahlen ════════ -->
      <div class="mst-tiles">
        <div class="mst-tile">
          <span class="mst-tile-k">In stock</span>
          <span class="mst-tile-v mst-tile-v--accent" :title="formatNumber(stock)">
            {{ formatNumberCompact(stock) }}
          </span>
        </div>
        <div class="mst-tile">
          <span class="mst-tile-k">Collected</span>
          <span class="mst-tile-v" :title="formatNumber(collected)">
            {{ formatNumberCompact(collected) }}
          </span>
        </div>
        <div class="mst-tile">
          <span class="mst-tile-k">Spent</span>
          <span class="mst-tile-v" :title="formatNumber(spent)">
            {{ formatNumberCompact(spent) }}
          </span>
        </div>
      </div>

      <!-- ════════ Zulauf der letzten Stunde ════════ -->
      <section class="mst-block">
        <div class="mst-block-head">
          <span class="mst-block-title">{{ windowLabel }}</span>
          <span class="mst-rate">
            <span class="mst-rate-v">{{ rateText }}</span>
            <span class="mst-rate-u">/h</span>
          </span>
        </div>
        <svg
          class="mst-spark"
          :viewBox="`0 0 ${sparkW} ${SPARK_H}`"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon v-if="sparkArea" class="mst-spark-fill" :points="sparkArea" />
          <polyline
            v-if="sparkPoints"
            class="mst-spark-line"
            :points="sparkPoints"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <div v-if="!rateReady" class="mst-hint">Measuring since this session started…</div>
      </section>

      <!-- ════════ Detailzeilen ════════ -->
      <dl class="mst-rows">
        <div class="mst-row">
          <dt>Share of all loot</dt>
          <dd>{{ pct(share) }}</dd>
        </div>
        <div class="mst-row">
          <dt>Still in hand</dt>
          <dd>{{ pct(retained) }}</dd>
        </div>
        <div class="mst-row">
          <dt>Peak stock</dt>
          <dd :title="formatNumber(peak)">{{ formatNumberCompact(peak) }}</dd>
        </div>
        <div class="mst-row">
          <dt>Last found</dt>
          <dd>{{ ago(lastFoundAt) }}</dd>
        </div>
        <div class="mst-row">
          <dt>First found</dt>
          <dd>{{ ago(firstFoundAt) }}</dd>
        </div>
        <div v-if="droughtMs > 0" class="mst-row">
          <dt>Longest drought</dt>
          <dd>{{ formatCompactDuration(droughtMs) }}</dd>
        </div>
      </dl>

      <!-- ════════ Herkunft ════════ -->
      <section v-if="sources.length" class="mst-block">
        <div class="mst-block-title mst-block-title--solo">Where it comes from</div>
        <div v-for="row in sources" :key="`src-${row.id}`" class="mst-flow">
          <Icon :icon="row.icon" class="mst-flow-icon" width="15" height="15" />
          <span class="mst-flow-label">{{ row.label }}</span>
          <span class="mst-flow-track">
            <span class="mst-flow-bar" :style="{ transform: `scaleX(${row.fraction})` }"></span>
          </span>
          <span class="mst-flow-value" :title="`${formatNumber(row.amount)} collected`">
            {{ pct(row.share) }}
          </span>
        </div>
      </section>

      <!-- ════════ Verwendung ════════ -->
      <section v-if="sinks.length" class="mst-block">
        <div class="mst-block-title mst-block-title--solo">Where it goes</div>
        <div v-for="row in sinks" :key="`sink-${row.id}`" class="mst-flow">
          <Icon :icon="row.icon" class="mst-flow-icon" width="15" height="15" />
          <span class="mst-flow-label">{{ row.label }}</span>
          <span class="mst-flow-track">
            <span
              class="mst-flow-bar mst-flow-bar--sink"
              :style="{ transform: `scaleX(${row.fraction})` }"
            ></span>
          </span>
          <span class="mst-flow-value" :title="`${formatNumber(row.amount)} spent`">
            {{ formatNumberCompact(row.amount) }}
          </span>
        </div>
      </section>

      <div v-else-if="discovered" class="mst-hint mst-hint--pad">Nothing spent yet.</div>
    </template>
  </div>
</template>

<style scoped>
/* ================================================================
   Material-Tooltip — Panel-Innenleben. Der Rahmen (Holz + Schatten)
   kommt von RpgBadgeTooltip; hier nur der Inhalt.

   Alle Maße hängen an der Wurzel-font-size, die mit dem Viewport
   skaliert — dieselbe Kachel liest sich damit auf Full HD kompakt
   und auf 4K großzügig, ohne zweites Layout.
   ================================================================ */
.mst {
  font-size: clamp(11px, 0.58vw, 15px);
  color: #d8cfc0;
  line-height: 1.35;
  border-radius: 2px;
  /* Safety net only: the tallest panel measures ~570px on Full HD and clears
     the header with room to spare. It exists so a future extra section can
     never push the panel off the shortest reference viewport. */
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ── Kopf ──────────────────────────────────────────────────────── */
.mst-head {
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 0.75em 0.9em;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.mst-art {
  width: 2.9em;
  height: 2.9em;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.7));
}

.mst-art--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: linear-gradient(to bottom, #241b12, #16110b);
  border: 1px solid #4a3418;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.95em;
  font-weight: 700;
  color: var(--accent);
}

.mst-head-text {
  min-width: 0;
}

.mst-name {
  font-size: 1.32em;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.01em;
  line-height: 1.15;
}

.mst-meta {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  margin-top: 0.15em;
  font-size: 0.92em;
}

.mst-rarity {
  color: var(--rarity);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.mst-dot,
.mst-droprate {
  color: #8a7c66;
}

.mst-desc {
  padding: 0.6em 0.9em;
  margin: 0;
  font-size: 0.98em;
  color: #a99b83;
  font-style: italic;
  background: #1a1008;
  border-bottom: 1px solid #33220e;
}

/* ── Unentdeckt ────────────────────────────────────────────────── */
.mst-locked {
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.9em;
  color: #7f7360;
}

/* ── Kernzahlen ────────────────────────────────────────────────── */
.mst-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: #33220e;
  border-bottom: 1px solid #33220e;
}

.mst-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15em;
  padding: 0.7em 0.3em;
  background: #141410;
}

.mst-tile-k {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #8a7c66;
}

.mst-tile-v {
  font-size: 1.45em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8dccb;
  line-height: 1;
}

.mst-tile-v--accent {
  color: var(--accent);
}

/* ── Blöcke ────────────────────────────────────────────────────── */
.mst-block {
  padding: 0.7em 0.9em;
  border-bottom: 1px solid #26190c;
}

.mst-block:last-child {
  border-bottom: none;
}

.mst-block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6em;
  margin-bottom: 0.45em;
}

.mst-block-title {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #8a7c66;
}

.mst-block-title--solo {
  display: block;
  margin-bottom: 0.5em;
}

.mst-rate {
  display: flex;
  align-items: baseline;
  gap: 0.15em;
}

.mst-rate-v {
  font-size: 1.25em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  line-height: 1;
}

.mst-rate-u {
  font-size: 0.9em;
  color: #8a7c66;
}

/* ── Sparkline ─────────────────────────────────────────────────── */
.mst-spark {
  display: block;
  width: 100%;
  height: 2.6em;
  background: #100d08;
  border: 1px solid #2c1e0e;
  border-radius: 4px;
}

.mst-spark-fill {
  fill: var(--accent);
  opacity: 0.16;
}

.mst-spark-line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.mst-hint {
  margin-top: 0.4em;
  font-size: 0.88em;
  color: #6f634f;
  font-style: italic;
}

.mst-hint--pad {
  padding: 0.6em 0.9em;
}

/* ── Detailzeilen ──────────────────────────────────────────────── */
.mst-rows {
  margin: 0;
  padding: 0.5em 0.9em 0.6em;
  border-bottom: 1px solid #26190c;
}

.mst-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.8em;
  padding: 0.16em 0;
}

.mst-row dt {
  color: #93866f;
  font-size: 0.98em;
}

.mst-row dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

/* ── Herkunft / Verwendung ─────────────────────────────────────── */
.mst-flow {
  display: grid;
  grid-template-columns: 1.3em minmax(0, auto) 1fr auto;
  align-items: center;
  gap: 0.5em;
  padding: 0.18em 0;
}

/* Overrides the attribute size so the glyph tracks the panel's font-size —
   fixed 15px would read as a speck next to the larger type on 2K/4K. */
.mst-flow-icon {
  width: 1.3em;
  height: 1.3em;
  color: #a08a5e;
  flex-shrink: 0;
}

.mst-flow-label {
  font-size: 0.98em;
  color: #b8ab94;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mst-flow-track {
  height: 0.55em;
  min-width: 2em;
  border-radius: 4px;
  background: #1c1610;
  border: 1px solid #2c1e0e;
  overflow: hidden;
}

.mst-flow-bar {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--accent);
  opacity: 0.75;
  transform-origin: left center;
}

.mst-flow-bar--sink {
  background: #c89040;
  opacity: 0.85;
}

.mst-flow-value {
  font-size: 0.98em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #d8cfc0;
  white-space: nowrap;
}
</style>
