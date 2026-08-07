<script setup lang="ts">
/**
 * Who is available and how strong they are — the bottom rail of the tab.
 *
 * Expeditions read champion stats now, which means "who should I send" has an
 * answer that changes as champions level. This is where that answer lives: the
 * whole roster, sorted by expedition strength, with everyone currently in the
 * field greyed out. Without it the crew picker would be the only place that
 * number is visible, one seat at a time.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { getChampionRoles } from '@/config/champions/championData'
import { getOriginColor } from '@/config/champions/championOrigins'
import type { ChampionRole } from '@/types'

const expeditionStore = useExpeditionStore()
const battleStore = useBattleStore()
const levelStore = useChampionLevelStore()

interface RosterEntry {
  name: string
  power: number
  level: number
  role: ChampionRole
  away: boolean
}

const roster = computed<RosterEntry[]>(() => {
  const away = expeditionStore.championsOnExpedition
  return battleStore.ownedChampions
    .filter((c: string) => c !== 'Bard')
    .map((name: string) => ({
      name,
      power: Math.round(expeditionStore.crewPowerOf([name])),
      level: levelStore.levelOf(name),
      role: (getChampionRoles(name)[0] ?? 'mid') as ChampionRole,
      away: away.includes(name),
    }))
    .sort((a, b) => {
      if (a.away !== b.away) return a.away ? 1 : -1
      return b.power - a.power
    })
})

const availableCount = computed(() => roster.value.filter((r) => !r.away).length)

function championImage(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}
function roleImg(role: ChampionRole): string {
  return `/img/roles/${role === 'support' ? 'supp' : role}-128.png`
}
</script>

<template>
  <section class="ers-rail">
    <header class="ers-head">
      <Icon icon="game-icons:meeple-group" width="17" height="17" class="ers-head-ico" />
      <span class="ers-head-title">Crew</span>
      <span class="ers-head-count">{{ availableCount }} ready</span>
      <span class="ers-head-hint">sorted by expedition strength</span>
    </header>

    <div class="ers-list">
      <div
        v-for="r in roster"
        :key="r.name"
        class="ers-chip"
        :class="{ 'ers-chip--away': r.away }"
        :title="`${r.name} — Lv ${r.level}${r.away ? ' — in the field' : ''}`"
      >
        <img :src="championImage(r.name)" :alt="r.name" class="ers-img" />
        <img :src="roleImg(r.role)" :alt="r.role" class="ers-role" />
        <div class="ers-text">
          <span class="ers-name" :style="{ color: getOriginColor(r.name) }">{{ r.name }}</span>
          <span class="ers-power">{{ r.power }}</span>
        </div>
        <Icon
          v-if="r.away"
          icon="game-icons:camping-tent"
          width="13"
          height="13"
          class="ers-away-ico"
        />
      </div>

      <div v-if="!roster.length" class="ers-empty">No champions recruited yet</div>
    </div>
  </section>
</template>

<style scoped>
.ers-rail {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px 10px;
  background: #16100a;
  border-top: 2px solid #5c3310;
}
.ers-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ers-head-ico {
  color: #c89040;
  align-self: center;
  flex-shrink: 0;
}
.ers-head-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
}
.ers-head-count {
  font-size: 11px;
  font-weight: 700;
  color: rgba(160, 240, 208, 0.75);
  font-variant-numeric: tabular-nums;
}
.ers-head-hint {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(200, 144, 64, 0.4);
}

.ers-list {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.ers-list::-webkit-scrollbar {
  height: 4px;
}
.ers-list::-webkit-scrollbar-track {
  background: #111;
}
.ers-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.ers-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 4px 9px 4px 4px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.ers-chip--away {
  opacity: 0.42;
  filter: grayscale(55%);
}
.ers-img {
  width: 26px;
  height: 26px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  flex-shrink: 0;
}
.ers-role {
  width: 14px;
  height: 14px;
  object-fit: contain;
  opacity: 0.65;
  flex-shrink: 0;
}
.ers-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ers-name {
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ers-power {
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.ers-away-ico {
  color: rgba(200, 144, 64, 0.7);
  flex-shrink: 0;
}
.ers-empty {
  padding: 14px 6px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.4);
}
</style>
