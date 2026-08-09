<script setup lang="ts">
/**
 * Who fills one seat of a contract's crew.
 *
 * Deliberately does NOT filter by role. A mid in a support seat is a real move:
 * it costs the role-cover penalty but may still win on raw stats, and that
 * trade-off is the decision the expedition tab never used to offer. The list
 * says which champions play the seat's role and sorts them to the top; it does
 * not hide the rest.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { getChampionRoles } from '@/config/champions/championData'
import { getChampionOrigin, getOriginColor } from '@/config/champions/championOrigins'
import { ROLE_BY_KEY } from '@/config/constants'
import type { AvailableExpeditionSlot, ChampionRole } from '@/types'

const props = defineProps<{
  offer: AvailableExpeditionSlot
  /** Seat being filled — indexes into offer.requiredRoles. */
  index: number
  /** Champion already in the seat, so it can be shown as current. */
  current: string | null
  /** Viewport coordinates of the seat button — see `anchor` in the card. */
  x: number
  y: number
  /** Open upwards when the seat sits too low for the list to fit below it. */
  flip: boolean
}>()

const emit = defineEmits<{ pick: [string | null]; close: [] }>()

const expeditionStore = useExpeditionStore()
const battleStore = useBattleStore()
const levelStore = useChampionLevelStore()

const seatRole = computed<ChampionRole>(() => props.offer.requiredRoles[props.index])

interface Candidate {
  name: string
  power: number
  level: number
  matches: boolean
  role: ChampionRole
  origin: string | null
}

/** Everyone who could take this seat, role-correct first, then strongest. */
const candidates = computed<Candidate[]>(() => {
  const seatsElsewhere = expeditionStore
    .crewFor(props.offer)
    .filter((n, i): n is string => !!n && i !== props.index)

  return expeditionStore
    .eligibleChampions(seatsElsewhere)
    .map((name) => {
      const roles = getChampionRoles(name)
      return {
        name,
        power: Math.round(expeditionStore.crewPowerOf([name])),
        level: levelStore.levelOf(name),
        matches: roles.includes(seatRole.value),
        role: (roles[0] ?? seatRole.value) as ChampionRole,
        origin: getChampionOrigin(name),
      }
    })
    .sort((a, b) => {
      if (a.matches !== b.matches) return a.matches ? -1 : 1
      return b.power - a.power
    })
})

/**
 * Fixed to the viewport rather than to the card.
 *
 * Both columns scroll, and a scroll container clips absolutely positioned
 * children on BOTH axes — an in-flow popover would be cut off the moment it
 * reached the column edge or the bottom of the list. Teleporting to the body and
 * pinning to the seat's measured rect is what keeps it whole.
 */
const popStyle = computed(() => ({
  left: `${props.x}px`,
  ...(props.flip ? { bottom: `${window.innerHeight - props.y}px` } : { top: `${props.y}px` }),
}))

function championImage(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}
function roleColor(role: ChampionRole): string {
  return ROLE_BY_KEY[role]?.color ?? '#e8c040'
}
</script>

<template>
  <Teleport to="body">
    <div class="ecp-pop" :style="popStyle" @click.stop>
      <header class="ecp-head">
        <img
          :src="`/img/roles/${seatRole === 'support' ? 'supp' : seatRole}-128.png`"
          :alt="seatRole"
          class="ecp-head-role"
        />
        <span class="ecp-head-title">{{ seatRole }} seat</span>
        <button v-if="current" class="ecp-clear" @click="emit('pick', null)">Clear</button>
        <button class="ecp-close" aria-label="Close crew picker" @click="emit('close')">✕</button>
      </header>

      <div class="ecp-list">
        <button
          v-for="c in candidates"
          :key="c.name"
          class="ecp-row"
          :class="{ 'ecp-row--current': c.name === current, 'ecp-row--off': !c.matches }"
          @click="emit('pick', c.name)"
        >
          <img :src="championImage(c.name)" :alt="c.name" class="ecp-img" />
          <span class="ecp-name" :style="{ color: roleColor(c.role) }">{{ c.name }}</span>
          <span v-if="c.origin" class="ecp-origin" :style="{ color: getOriginColor(c.name) }">
            {{ c.origin }}
          </span>
          <span v-if="!c.matches" class="ecp-offrole" title="Does not play this role">
            <Icon icon="ph:warning-diamond-fill" width="13" height="13" />
          </span>
          <span class="ecp-lvl">Lv {{ c.level }}</span>
          <span class="ecp-power">{{ c.power }}</span>
        </button>

        <div v-if="!candidates.length" class="ecp-empty">
          Every champion is already in the field
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ecp-pop {
  position: fixed;
  /* above the team rail and the profile modal it sits in */
  z-index: 400;
  width: 300px;
  max-height: 340px;
  display: flex;
  flex-direction: column;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  overflow: hidden;
}
.ecp-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #1e1006;
  border-bottom: 2px solid #5c3310;
  flex-shrink: 0;
}
.ecp-head-role {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}
.ecp-head-title {
  flex: 1;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
}
.ecp-clear,
.ecp-close {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(14, 10, 4, 0.85);
  border: 1px solid #5c3310;
  color: #c89040;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.ecp-clear:hover,
.ecp-close:hover {
  color: #ffdddd;
  border-color: #cc6050;
}

.ecp-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.ecp-list::-webkit-scrollbar {
  width: 4px;
}
.ecp-list::-webkit-scrollbar-track {
  background: #111;
}
.ecp-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.ecp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #241408;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.ecp-row:hover {
  background: rgba(200, 144, 64, 0.1);
}
.ecp-row--current {
  background: rgba(82, 184, 48, 0.12);
}
.ecp-row--off {
  opacity: 0.62;
}
.ecp-img {
  width: 28px;
  height: 28px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  flex-shrink: 0;
}
.ecp-name {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}
.ecp-origin {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  opacity: 0.75;
  white-space: nowrap;
  flex-shrink: 0;
}
.ecp-offrole {
  color: #cc6050;
  display: flex;
  flex-shrink: 0;
}
.ecp-lvl {
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.6);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.ecp-power {
  font-size: 13px;
  font-weight: 800;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  min-width: 34px;
  text-align: right;
  flex-shrink: 0;
}
.ecp-empty {
  padding: 22px 12px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.45);
}
</style>
