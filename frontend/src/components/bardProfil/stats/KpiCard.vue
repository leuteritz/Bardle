<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { JOURNEY_KPI_GRID, JOURNEY_KPI_TILES } from '@/config/constants'
import type { StatCategoryId, StatCategoryView } from '@/types'

/**
 * Kennzahlen aus dem Katalog (bereits formatiert), priorisiert. Das Raster
 * misst sich und zeigt genau so viele Kacheln, wie ohne Scrollen hineinpassen.
 */
const props = defineProps<{ categories: StatCategoryView[] }>()
const emit = defineEmits<{ open: [category: StatCategoryId | null] }>()

interface KpiTile {
  key: string
  category: StatCategoryId
  icon: string
  label: string
  value: string
  sub?: string
  hint?: string
  accent: string
}

const tiles = computed<KpiTile[]>(() =>
  JOURNEY_KPI_TILES.flatMap((t) => {
    const cat = props.categories.find((c) => c.id === t.category)
    const stat = cat?.stats.find((s) => s.key === t.key)
    if (!cat || !stat) return []
    const sub = t.sub ? cat.stats.find((s) => s.key === t.sub)?.value : undefined
    return [
      {
        key: `${t.category}/${t.key}`,
        category: t.category,
        icon: t.icon,
        label: stat.label,
        value: stat.value,
        sub,
        hint: stat.hint,
        accent: cat.accent,
      },
    ]
  }),
)

/* ── Fit: nur bei Resize gerechnet, nie im Takt ── */
const G = JOURNEY_KPI_GRID
const gridEl = ref<HTMLElement | null>(null)
const cols = ref(2)
const rows = ref(4)
let observer: ResizeObserver | null = null

function measure(w: number, h: number): void {
  if (!w || !h || !gridEl.value) return
  // Zeilenhöhe aus der CSS-Variable: Media-Query und Script teilen EINE Zahl
  const rowH = parseFloat(getComputedStyle(gridEl.value).getPropertyValue('--kpi-row')) || 50
  cols.value = Math.max(1, Math.min(G.MAX_COLS, Math.floor((w + G.GAP) / (G.MIN_COL_W + G.GAP))))
  rows.value = Math.max(1, Math.floor((h + G.GAP) / (rowH + G.GAP)))
}

onMounted(() => {
  const el = gridEl.value
  if (!el) return
  measure(el.clientWidth, el.clientHeight)
  observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect
    measure(width, height)
  })
  observer.observe(el)
})
onUnmounted(() => observer?.disconnect())

const visible = computed(() => tiles.value.slice(0, cols.value * rows.value))
</script>

<template>
  <section class="jt-kpis" aria-label="Stats">
    <div class="jt-kpis-head">
      <Icon icon="lucide:list" width="18" height="18" class="jt-kpis-sys" aria-hidden="true" />
      <span v-ink-center class="jt-kpis-title">Stats</span>
      <span v-ink-center class="jt-kpis-count">{{ visible.length }} of {{ tiles.length }}</span>
      <button type="button" class="jt-kpis-more" @click="emit('open', null)">
        All records →
      </button>
    </div>
    <div
      ref="gridEl"
      class="jt-kpi-grid"
      role="list"
      :style="{ '--cols': cols, '--gap': G.GAP + 'px' }"
    >
      <button
        v-for="t in visible"
        :key="t.key"
        type="button"
        role="listitem"
        class="jt-kpi"
        :style="{ '--accent': t.accent }"
        v-tip="t.hint ?? `${t.label} — open Records`"
        @click="emit('open', t.category)"
      >
        <Icon :icon="t.icon" class="jt-kpi-icon" aria-hidden="true" />
        <span class="jt-kpi-body">
          <span class="jt-kpi-val">
            {{ t.value }}<span v-if="t.sub" class="jt-kpi-sub">{{ t.sub }}</span>
          </span>
          <span v-ink-center class="jt-kpi-lbl">{{ t.label }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.jt-kpis {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  min-width: 0;
  padding: 12px 14px;
  background: #1a1008;
  border: 1px solid #2c1806;
  border-radius: 4px;
}

.jt-kpis-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.jt-kpis-sys {
  color: var(--rpg-gold);
  flex-shrink: 0;
}
.jt-kpis-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-gold);
}
.jt-kpis-count {
  flex: 1;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #8a7a58;
  white-space: nowrap;
}
.jt-kpis-more {
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d8c890;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.jt-kpis-more:hover {
  border-color: #7a4e20;
  color: var(--rpg-gold);
}

/* Feste Zeilenhöhe; das Script füllt Spalten × Zeilen aus der gemessenen Fläche.
   overflow: hidden ist nur das Netz für den Frame zwischen Resize und Messung. */
.jt-kpi-grid {
  --kpi-row: 50px;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
  grid-auto-rows: var(--kpi-row);
  align-content: start;
  gap: var(--gap, 6px);
  overflow: hidden;
}

.jt-kpi {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  min-height: 0;
  padding: 0 10px;
  text-align: left;
  color: inherit;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.jt-kpi:hover {
  border-color: color-mix(in srgb, var(--accent) 55%, #3e200a);
  border-left-color: var(--accent);
}

.jt-kpi-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: var(--accent);
}

.jt-kpi-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.jt-kpi-val {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jt-kpi-sub {
  margin-left: 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--rpg-text-muted);
}

.jt-kpi-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.1;
  text-transform: uppercase;
  color: #8a7a58;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-height: 1100px) {
  .jt-kpis {
    gap: 6px;
    padding: 10px 12px;
  }
  .jt-kpi-grid {
    --kpi-row: 44px;
  }
  .jt-kpi {
    gap: 7px;
    padding: 0 8px;
  }
  .jt-kpi-icon {
    width: 20px;
    height: 20px;
  }
  .jt-kpi-val {
    font-size: 17px;
  }
}

@media (min-height: 1600px) {
  .jt-kpi-grid {
    --kpi-row: 58px;
  }
  .jt-kpi-val {
    font-size: 22px;
  }
  .jt-kpi-lbl {
    font-size: 11px;
  }
  .jt-kpi-icon {
    width: 26px;
    height: 26px;
  }
}
</style>
