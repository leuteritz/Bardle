<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import {
  CHIME_ART_ALPHA_SCALE,
  CURRENCY_ART,
  JOURNEY_OVERVIEW_KPI_GRID,
  JOURNEY_OVERVIEW_KPI_HERO_COUNT,
  JOURNEY_OVERVIEW_KPI_TILES,
  UNIVERSE_TOOLTIP_MEEP_SCALE,
  WIN_LOSS_TONE,
} from '@/config/constants'
import { useBattleStore } from '@/stores/battle/battleStore'
import { rankEmblemImage, rankTierColor } from '@/utils/game/rankEmblem'
import type { StatCategoryId, StatCategoryView } from '@/types'

/** Core metrics from the catalog in the responsive overview grid. */
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
  JOURNEY_OVERVIEW_KPI_TILES.flatMap((t) => {
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
// die Box: alle Kacheln halten dieselbe Textkante.
const chimeScale = `${CHIME_ART_ALPHA_SCALE}`
const meepScale = `${UNIVERSE_TOOLTIP_MEEP_SCALE}`

const gridStyle = {
  '--cols': JOURNEY_OVERVIEW_KPI_GRID.COLS,
  '--rows': JOURNEY_OVERVIEW_KPI_GRID.ROWS,
  '--tracks': JOURNEY_OVERVIEW_KPI_GRID.TRACKS,
}
</script>

<template>
  <section class="jt-kpis" aria-label="Stats">
    <div class="jt-kpis-head">
      <Icon icon="lucide:list" width="18" height="18" class="jt-kpis-sys" aria-hidden="true" />
      <span v-ink-center class="jt-kpis-title">Stats</span>
      <button type="button" class="jt-kpis-more" @click="emit('open', null)">
        All stats →
      </button>
    </div>
    <div class="jt-kpi-grid" role="list" :style="gridStyle">
      <button
        v-for="(t, index) in tiles"
        :key="t.key"
        type="button"
        role="listitem"
        class="jt-kpi"
        :class="{ 'jt-kpi--hero': index < JOURNEY_OVERVIEW_KPI_HERO_COUNT }"
        :style="{ '--accent': t.accent }"
        v-tip="t.hint ?? `${t.fullLabel} — open Stats`"
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
  gap: 12px;
  min-height: 0;
  min-width: 0;
  padding: 16px 18px 18px;
  background: #1a1008;
  border: 1px solid #2c1806;
  border-radius: 4px;
}

.jt-kpis-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #2c1806;
}
.jt-kpis-sys {
  color: var(--rpg-gold);
  flex-shrink: 0;
}
.jt-kpis-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-gold);
}
.jt-kpis-more {
  padding: 6px 11px;
  font-size: 12px;
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
  grid-template-columns: repeat(var(--tracks), minmax(0, 1fr));
  grid-template-rows: minmax(100px, 1.25fr) repeat(2, minmax(64px, 1fr));
  gap: 8px;
}

.jt-kpi {
  position: relative;
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: clamp(10px, 2.8cqh, 16px);
  min-width: 0;
  min-height: 0;
  padding: clamp(10px, 2.4cqh, 16px) clamp(10px, 3cqh, 18px);
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
  width: clamp(22px, 10cqh, 32px);
  height: clamp(22px, 10cqh, 32px);
  color: var(--accent);
}

.jt-kpi--hero {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 7px;
  padding: 14px 16px;
}

.jt-kpi--hero .jt-kpi-icon {
  width: clamp(30px, 12cqh, 42px);
  height: clamp(30px, 12cqh, 42px);
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
  font-size: clamp(16px, 6.3cqh, 23px);
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jt-kpi--hero .jt-kpi-val {
  font-size: clamp(20px, 8cqh, 32px);
}
/* Sieg und Niederlage im Zweiklang der Bottom-Leiste, nebeneinander statt
   gestapelt: hier traegt die Kachel eine Zeile, keine Spalte. Drei Zahlen
   teilen sich die Zeile, die übrigen Kacheln tragen eine einzelne Zahl. */
.jt-kpi-val--pair {
  font-size: clamp(12px, 4.8cqh, 17px);
}
.jt-kpi--hero .jt-kpi-val--pair {
  font-size: clamp(14px, 5.6cqh, 20px);
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
  font-size: clamp(10px, 4.2cqh, 12px);
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
    gap: 9px;
    padding: 13px 15px 14px;
  }
  .jt-kpi-grid {
    grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
  }
  .jt-kpi {
    gap: 8px;
    padding: 7px 9px;
  }
  .jt-kpi--hero {
    flex-direction: row;
    align-items: center;
    padding: 7px 9px;
  }
  .jt-kpi--hero .jt-kpi-icon {
    width: 26px;
    height: 26px;
  }
}
</style>
