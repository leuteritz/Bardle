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
  '--tracks': JOURNEY_OVERVIEW_KPI_GRID.TRACKS,
  '--detail-rows': JOURNEY_OVERVIEW_KPI_GRID.ROWS - 1,
}
</script>

<template>
  <section class="jt-kpis" aria-label="Stats">
    <div class="jt-kpis-head">
      <Icon icon="lucide:list" width="18" height="18" class="jt-kpis-sys" aria-hidden="true" />
      <span v-ink-center class="jt-kpis-title">Stats</span>
      <span class="jt-kpis-count">{{ tiles.length }} signals</span>
      <button type="button" class="jt-kpis-more" @click="emit('open', null)">View all →</button>
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
            :class="{ 'jt-kpi-val--pair': t.pair, 'jt-kpi-val--rank': t.emblem }"
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
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
  padding: 16px 18px 18px;
  background: #111008;
  border: 1px solid #2c1806;
  border-radius: 4px;
}
.jt-kpis::after {
  position: absolute;
  top: 12px;
  right: 20px;
  width: 2px;
  height: 2px;
  content: '';
  pointer-events: none;
  background: #7a4e20;
  box-shadow:
    28px 18px 0 #3e200a,
    56px 8px 0 #5c3310,
    88px 30px 0 #3e200a,
    120px 12px 0 #7a4e20,
    148px 42px 0 #3e200a,
    184px 20px 0 #5c3310,
    220px 50px 0 #3e200a;
  opacity: 0.8;
  z-index: 0;
}
.jt-kpis > * {
  position: relative;
  z-index: 1;
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
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-gold);
}
.jt-kpis-count {
  margin-right: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a58;
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
  grid-template-rows: minmax(76px, 1.1fr) repeat(var(--detail-rows), minmax(48px, 0.9fr));
  gap: 6px;
  padding: 7px;
  background: #141410;
  border: 1px solid #2c1806;
}

.jt-kpi {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(6px, 1.4cqh, 10px);
  min-width: 0;
  min-height: 0;
  flex: 1;
  padding: clamp(8px, 1.5cqh, 12px) clamp(8px, 1.8cqh, 13px);
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
.jt-kpi::after {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 3px;
  height: 3px;
  content: '';
  background: var(--accent);
  opacity: 0.85;
}
.jt-kpi:hover {
  border-color: color-mix(in srgb, var(--accent) 55%, #3e200a);
  border-left-color: var(--accent);
}

.jt-kpi-icon {
  flex-shrink: 0;
  width: clamp(20px, 7cqh, 28px);
  height: clamp(20px, 7cqh, 28px);
  color: var(--accent);
}

.jt-kpi--hero {
  align-items: center;
  justify-content: center;
  gap: clamp(7px, 1.6cqh, 11px);
  padding: 10px 12px;
}

.jt-kpi--hero .jt-kpi-icon {
  width: clamp(26px, 8cqh, 34px);
  height: clamp(26px, 8cqh, 34px);
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
  flex: 1;
}

.jt-kpi-val {
  font-size: clamp(13px, 3.6cqh, 18px);
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jt-kpi--hero .jt-kpi-val {
  font-size: clamp(16px, 5.4cqh, 24px);
}
/* Sieg und Niederlage im Zweiklang der Bottom-Leiste, nebeneinander statt
   gestapelt: hier traegt die Kachel eine Zeile, keine Spalte. Drei Zahlen
   teilen sich die Zeile, die übrigen Kacheln tragen eine einzelne Zahl. */
.jt-kpi-val--pair {
  font-size: clamp(11px, 3.4cqh, 15px);
}
.jt-kpi-val--rank {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.3em;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
.jt-kpi-val--rank .jt-kpi-sub {
  margin-left: 0;
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
  font-size: clamp(8px, 2.9cqh, 11px);
  font-weight: 700;
  color: var(--rpg-text-muted);
}

.jt-kpi-lbl {
  font-size: clamp(8px, 2.5cqh, 10px);
  font-weight: 700;
  letter-spacing: 0.08em;
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
    grid-template-rows: minmax(64px, 1.05fr) repeat(var(--detail-rows), minmax(44px, 0.95fr));
    padding: 6px;
  }
  .jt-kpi {
    gap: 8px;
    padding: 7px 8px;
  }
  .jt-kpi--hero {
    align-items: center;
    padding: 7px 9px;
  }
  .jt-kpi--hero .jt-kpi-icon {
    width: 25px;
    height: 25px;
  }
}
</style>
