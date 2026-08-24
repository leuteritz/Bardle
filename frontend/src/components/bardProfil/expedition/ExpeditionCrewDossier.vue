<script setup lang="ts">
/**
 * Wer unterwegs ist — und womit.
 *
 * Die Reihe Avatare, die hier stand, sagte nur „drei Leute". Was die Reise
 * entschieden hat, sind die Statwerte: die Zeile markiert deshalb den Wert, der
 * eine Gefahr DIESER Mission beantwortet, und in der kurzen Spalte bleibt nur
 * er stehen (per Media Query, nicht per Zweitzustand in JS).
 *
 * Die Schiene unter jeder Zeile ist der Anteil an der Crew-Stärke —
 * `transform: scaleX()`, kein `width`.
 */
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { CHAMPION_STATS } from '@/config/champions/championLevels'
import { EXPEDITION_HAZARD_BY_ID } from '@/config/constants'
import type { ChampionRole, ChampionStatKey, ExpeditionHazardId } from '@/types'

const props = defineProps<{
  crew: { name: string; role: ChampionRole }[]
  hazards: ExpeditionHazardId[]
}>()

const battleStore = useBattleStore()
const levelStore = useChampionLevelStore()

/** Die Stats, an denen diese Mission hängt. Kinship/Diversity nennen keinen. */
const counterStats = computed(
  () =>
    new Set(
      props.hazards
        .map((id) => EXPEDITION_HAZARD_BY_ID[id]?.counterStat)
        .filter((s): s is ChampionStatKey => !!s),
    ),
)

const rows = computed(() => {
  const members = props.crew.map((c) => {
    const stats = levelStore.effectiveStatsOf(c.name)
    const total = stats.power + stats.vitality + stats.focus + stats.fortune
    return { ...c, stats, total }
  })
  const crewTotal = members.reduce((sum, m) => sum + m.total, 0)

  return members.map((m) => {
    // Nennt keine Gefahr einen Stat, trägt der eigene stärkste die Zeile — sonst
    // bliebe die kurze Spalte leer.
    const own = [...CHAMPION_STATS].sort((a, b) => m.stats[b.key] - m.stats[a.key])[0].key
    return {
      name: m.name,
      role: m.role,
      level: levelStore.levelOf(m.name),
      image: battleStore.getChampionImage(m.name, { size: 'sm' }),
      color: getOriginColor(m.name),
      share: crewTotal > 0 ? m.total / crewTotal : 0,
      stats: CHAMPION_STATS.map((def) => ({
        key: def.key,
        short: def.short,
        color: def.color,
        value: Math.round(m.stats[def.key]),
        keyStat: counterStats.value.size ? counterStats.value.has(def.key) : def.key === own,
      })),
    }
  })
})
</script>

<template>
  <ul class="ecd-list">
    <li v-for="row in rows" :key="row.name" class="ecd-row">
      <img :src="row.image" :alt="row.name" class="ecd-img" />
      <span class="ecd-who">
        <span class="ecd-name" :style="{ color: row.color }">{{ row.name }}</span>
        <span class="ecd-sub">{{ row.role }} · Lv {{ row.level }}</span>
      </span>
      <span class="ecd-stats">
        <span
          v-for="s in row.stats"
          :key="s.key"
          class="ecd-stat"
          :class="{ 'is-key': s.keyStat }"
          :style="{ '--sc': s.color }"
          :title="`${s.short} ${s.value}`"
        >
          <b class="ecd-stat-tag">{{ s.short }}</b>{{ s.value }}
        </span>
      </span>
      <span class="ecd-share" aria-hidden="true">
        <span class="ecd-share-fill" :style="{ transform: `scaleX(${row.share})` }" />
      </span>
    </li>
  </ul>
</template>

<style scoped>
.ecd-list {
  flex: 1 0 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ecd-row {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 42px;
}
.ecd-img {
  width: 34px;
  height: 34px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
}
.ecd-who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ecd-name {
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecd-sub {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecd-stats {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ecd-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 5px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  background: #141410;
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}
.ecd-stat-tag {
  font-size: 8.5px;
  letter-spacing: 0.06em;
  color: var(--sc);
  opacity: 0.75;
}
.ecd-stat.is-key {
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(232, 192, 64, 0.45);
}
.ecd-stat.is-key .ecd-stat-tag {
  opacity: 1;
}

.ecd-share {
  position: absolute;
  left: 43px;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgba(92, 51, 16, 0.35);
  border-radius: 2px;
  overflow: hidden;
}
.ecd-share-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: rgba(200, 144, 64, 0.7);
}

/* Kurze Spalte: nur der Wert, an dem diese Mission hängt. */
@media (max-height: 1100px) {
  .ecd-row {
    min-height: 32px;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 7px;
  }
  .ecd-img {
    width: 26px;
    height: 26px;
  }
  .ecd-name {
    font-size: 12px;
  }
  .ecd-sub {
    font-size: 9.5px;
  }
  .ecd-stat:not(.is-key) {
    display: none;
  }
  .ecd-share {
    left: 35px;
  }
}
@media (min-height: 1601px) {
  .ecd-row {
    min-height: 52px;
  }
  .ecd-img {
    width: 42px;
    height: 42px;
  }
  .ecd-name {
    font-size: 14px;
  }
  .ecd-stat {
    font-size: 12px;
  }
}
</style>
