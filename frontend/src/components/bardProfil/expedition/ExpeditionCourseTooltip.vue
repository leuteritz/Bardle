<script setup lang="ts">
/**
 * Die Hover-Karte eines Kandidaten-Sterns: Rolle, Flugzeit, was die Rolle noch
 * hergibt — und das Verdikt „Click to set course".
 *
 * Die Roster-Zeilen stammen aus dem früheren Rollenwahl-Modal; gerechnet wird
 * in `utils/game/roleRoster.ts`, hier steht nur die Gestalt (`.tip-*`).
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import ExpeditionMarkTooltip, { type MarkChip } from './ExpeditionMarkTooltip.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { formatSpawnPercent, spawnOddsTitle, type RosterChampion } from '@/utils/game/roleRoster'
import { formatMinuteClock } from '@/utils/ui/format'
import {
  ROLE_BY_KEY,
  VOYAGE_COURSE_ACT_LABEL,
  VOYAGE_COURSE_FLIGHT_LABEL,
  VOYAGE_COURSE_LEFT_LABEL,
  VOYAGE_COURSE_ROSTER_MAX,
  VOYAGE_COURSE_TIP_STATE,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

const props = defineProps<{
  role: ChampionRole
  flightMs: number
  roster: RosterChampion[]
  accent: string
}>()

const battleStore = useBattleStore()
const def = computed(() => ROLE_BY_KEY[props.role])
const shown = computed(() => props.roster.slice(0, VOYAGE_COURSE_ROSTER_MAX))
const more = computed(() => Math.max(0, props.roster.length - shown.value.length))

const chips = computed<MarkChip[]>(() => [
  { text: def.value.label, color: props.accent, solid: true, icon: def.value.icon },
  {
    text: `${VOYAGE_COURSE_FLIGHT_LABEL} ${formatMinuteClock(props.flightMs)}`,
    icon: 'game-icons:hourglass',
    numeric: true,
  },
  { text: `${props.roster.length} ${VOYAGE_COURSE_LEFT_LABEL}` },
])

function portrait(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}
</script>

<template>
  <ExpeditionMarkTooltip
    :image="def.image"
    icon=""
    :accent="accent"
    :name="`${def.label} star`"
    :state="VOYAGE_COURSE_TIP_STATE"
    :chips="chips"
  >
    <template #foot>
      <ul v-if="shown.length" class="tip-rows ect-rows">
        <li
          v-for="c in shown"
          :key="c.name"
          class="tip-row"
          :style="{ '--cc': c.tierColor }"
          :title="spawnOddsTitle(c.spawnPercent)"
        >
          <img :src="portrait(c.name)" alt="" class="ect-face" draggable="false" />
          <span class="tip-row-name">{{ c.name }}</span>
          <Icon :icon="c.tierIcon" width="16" height="16" class="tip-row-ico" />
          <span v-if="c.spawnPercent != null" class="tip-row-val">
            {{ formatSpawnPercent(c.spawnPercent) }}
          </span>
        </li>
        <li v-if="more > 0" class="ect-more">+{{ more }} more</li>
      </ul>
      <p v-else class="ect-empty">All champions of this role are already yours</p>
      <p class="tip-effect ect-say">
        <Icon icon="ph:navigation-arrow-fill" width="20" height="20" class="ect-say-ico" />
        <b class="ect-say-label">{{ VOYAGE_COURSE_ACT_LABEL }}</b>
      </p>
    </template>
  </ExpeditionMarkTooltip>
</template>

<style scoped>
.ect-rows {
  margin-top: 0.5em;
}

.ect-face {
  flex-shrink: 0;
  width: 1.9em;
  height: 1.9em;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #2e2a20;
}

.ect-more,
.ect-empty {
  margin: 0;
  padding: 0.2em 0.6em;
  font-size: 0.85em;
  color: rgba(200, 200, 220, 0.5);
}

.ect-say {
  display: flex;
  align-items: center;
  gap: 0.44em;
  margin: 0.5em 0 0;
  --tip-color: #6ec040;
}

.ect-say-ico {
  width: 1em;
  height: 1em;
  color: var(--tip-color);
}

.ect-say-label {
  font-size: 1.08em;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--tip-color);
}
</style>
