<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import {
  CHIME_ART_ALPHA_SCALE,
  CURRENCY_ART,
  JOURNEY_KPI_GRID,
  JOURNEY_KPI_TILES,
  UNIVERSE_TOOLTIP_MEEP_SCALE,
  WIN_LOSS_TONE,
} from '@/config/constants'
import { useBattleStore } from '@/stores/battle/battleStore'
import { rankEmblemImage, rankTierColor } from '@/utils/game/rankEmblem'
import type { StatCategoryId, StatCategoryView } from '@/types'

/**
 * Zwölf Kennzahlen aus dem Katalog (bereits formatiert) in einem festen
 * 3×4-Raster. Die Zeilen teilen sich die Höhe, die Schrift wächst mit ihr —
 * jede Auflösung zeigt dieselben Zahlen, nur größer oder kleiner.
 */
const props = defineProps<{ categories: StatCategoryView[] }>()
const emit = defineEmits<{ open: [category: StatCategoryId | null] }>()

interface KpiTile {
  key: string
  category: StatCategoryId
  icon: string
  art?: keyof typeof CURRENCY_ART
  pair?: string
  emblem?: 'rank'
  label: string
  fullLabel: string
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
    const pair = t.pair ? cat.stats.find((s) => s.key === t.pair)?.value : undefined
    return [
      {
        key: `${t.category}/${t.key}`,
        category: t.category,
        icon: t.icon,
        art: t.art,
        pair,
        emblem: t.emblem,
        label: t.short ?? stat.label,
        fullLabel: stat.label,
        value: stat.value,
        sub,
        hint: stat.hint,
        accent: cat.accent,
      },
    ]
  }),
)

// Das Rangemblem der Kachel ist dasselbe wie unten in der Leiste.
const { currentRank } = storeToRefs(useBattleStore())
const rankEmblem = computed(() => rankEmblemImage(currentRank.value.tier))
const rankColor = computed(() => rankTierColor(currentRank.value.tier))

const winTone = WIN_LOSS_TONE.win
const lossTone = WIN_LOSS_TONE.loss

// Der Alpha-Rand der beiden Sprites wird per scale ausgeglichen, nicht ueber
// die Box: die Textspalte muss in allen zwoelf Kacheln gleich weit einruecken.
const chimeScale = `${CHIME_ART_ALPHA_SCALE}`
const meepScale = `${UNIVERSE_TOOLTIP_MEEP_SCALE}`

const gridStyle = {
  '--cols': JOURNEY_KPI_GRID.COLS,
  '--rows': JOURNEY_KPI_GRID.ROWS,
}
</script>

<template>
  <section class="jt-kpis" aria-label="Stats">
    <div class="jt-kpis-head">
      <Icon icon="lucide:list" width="18" height="18" class="jt-kpis-sys" aria-hidden="true" />
      <span v-ink-center class="jt-kpis-title">Stats</span>
      <button type="button" class="jt-kpis-more" @click="emit('open', null)">
        All records →
      </button>
    </div>
    <div class="jt-kpi-grid" role="list" :style="gridStyle">
      <button
        v-for="t in tiles"
        :key="t.key"
        type="button"
        role="listitem"
        class="jt-kpi"
        :style="{ '--accent': t.accent }"
        v-tip="t.hint ?? `${t.fullLabel} — open Records`"
        @click="emit('open', t.category)"
      >
        <img
          v-if="t.emblem"
          :src="rankEmblem"
          class="jt-kpi-icon jt-kpi-art"
          alt=""
          aria-hidden="true"
        />
        <img
          v-else-if="t.art"
          :src="CURRENCY_ART[t.art].src"
          class="jt-kpi-icon jt-kpi-art"
          :class="`jt-kpi-art--${t.art}`"
          alt=""
          aria-hidden="true"
        />
        <Icon v-else :icon="t.icon" class="jt-kpi-icon" aria-hidden="true" />
        <span class="jt-kpi-body">
          <span
            class="jt-kpi-val"
            :class="{ 'jt-kpi-val--pair': t.pair }"
            :style="t.emblem ? { color: rankColor } : undefined"
          >
            <template v-if="t.pair"
              ><span class="jt-kpi-win">{{ t.value }}W</span
              ><span class="jt-kpi-loss">{{ t.pair }}L</span></template
            ><template v-else>{{ t.value }}</template
            ><span v-if="t.sub" class="jt-kpi-sub">{{ t.sub }}</span>
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
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-gold);
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

/* Größen-Container: die Kacheln messen ihre Schrift an der Rasterhöhe (cqh).
   Eigene Eigenschaften hier NIE in cq-Einheiten. */
.jt-kpi-grid {
  container-type: size;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr));
  grid-template-rows: repeat(var(--rows, 4), minmax(0, 1fr));
  gap: 6px;
}

.jt-kpi {
  display: flex;
  align-items: center;
  gap: clamp(6px, 2.4cqh, 12px);
  min-width: 0;
  min-height: 0;
  padding: 0 clamp(6px, 2.6cqh, 14px);
  overflow: hidden;
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
  width: clamp(16px, 11cqh, 30px);
  height: clamp(16px, 11cqh, 30px);
  color: var(--accent);
}

/* Gleiche Box wie der Glyph, groesseres Motiv: der Ueberstand ist der
   transparente Rand des Sprites und kostet in der Breite nichts. */
.jt-kpi-art {
  object-fit: contain;
}
.jt-kpi-art--chimes {
  transform: scale(v-bind(chimeScale));
}
.jt-kpi-art--meeps {
  transform: scale(v-bind(meepScale));
}

.jt-kpi-body {
  display: flex;
  flex-direction: column;
  gap: clamp(2px, 1.2cqh, 5px);
  min-width: 0;
}

.jt-kpi-val {
  font-size: clamp(14px, 9.5cqh, 26px);
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Sieg und Niederlage im Zweiklang der Bottom-Leiste, nebeneinander statt
   gestapelt: hier traegt die Kachel eine Zeile, keine Spalte. Drei Zahlen
   teilen sich die Zeile, die die anderen elf mit einer fuellen — also kleiner,
   sonst schneidet die Kachel Niederlage und Quote ab (auf 2K gemessen). */
.jt-kpi-val--pair {
  font-size: clamp(11px, 6.6cqh, 18px);
}
.jt-kpi-win {
  color: v-bind(winTone);
}
.jt-kpi-loss {
  margin-left: 0.35em;
  color: v-bind(lossTone);
}

.jt-kpi-sub {
  margin-left: 0.3em;
  font-size: clamp(9px, 5cqh, 13px);
  font-weight: 700;
  color: var(--rpg-text-muted);
}

.jt-kpi-lbl {
  font-size: clamp(8.5px, 4.6cqh, 12px);
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
}
</style>
