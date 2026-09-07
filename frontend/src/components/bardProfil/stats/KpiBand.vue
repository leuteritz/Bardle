<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { JOURNEY_KPI_TILES } from '@/config/constants'
import type { StatCategoryId, StatCategoryView } from '@/types'

/** Acht Kennzahlen aus dem Katalog — bereits formatiert, ein Klick öffnet Records. */
const props = defineProps<{ categories: StatCategoryView[] }>()
const emit = defineEmits<{ open: [category: StatCategoryId] }>()

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
</script>

<template>
  <div class="jt-kpis" role="list">
    <button
      v-for="t in tiles"
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
</template>

<style scoped>
.jt-kpis {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 16px 12px;
  border-top: 1px solid #2c1806;
}

.jt-kpi {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  text-align: left;
  color: inherit;
  background: #1a1008;
  border: 1px solid #2c1806;
  border-bottom: 2px solid var(--accent);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.jt-kpi:hover {
  border-color: color-mix(in srgb, var(--accent) 55%, #2c1806);
  border-bottom-color: var(--accent);
}

.jt-kpi-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  color: var(--accent);
}

.jt-kpi-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.jt-kpi-val {
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jt-kpi-sub {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--rpg-text-muted);
}

.jt-kpi-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.2;
  text-transform: uppercase;
  color: #8a7a58;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-height: 1100px) {
  .jt-kpis {
    gap: 6px;
    padding: 8px 14px 10px;
  }
  .jt-kpi {
    padding: 7px 10px;
    gap: 8px;
  }
  .jt-kpi-icon {
    width: 24px;
    height: 24px;
  }
  .jt-kpi-val {
    font-size: 19px;
  }
}
</style>
