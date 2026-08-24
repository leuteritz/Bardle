<script setup lang="ts">
/**
 * A mission that has already left — running, or back and waiting to be collected.
 *
 * Die Karte trägt EINE grosse Zahl (die Restzeit) und darunter die Etappen. Der
 * frühere Gesamtbalken samt Prozentzahl und flacher Hazard-Zeile ist entfallen:
 * die Leiter sagt beides genauer, und jede Gefahr steht an dem Abschnitt, an dem
 * sie wartet.
 *
 * Der zurückgekehrte Zustand ist, wo die Beute steht — Chimes UND Materialien.
 * Ein Fehlschlag zeigt denselben Rahmen ohne Beutezeile, die Lücke selbst liest
 * sich als Verlust.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { MATERIALS } from '@/config/economy/materials'
import { EXPEDITION_COLORS, EXPEDITION_HAZARD_BY_ID } from '@/config/constants'
import { voyageLegsOf } from '@/utils/game/voyageLegs'
import type { ExpeditionMission, VoyageTrackHazard } from '@/types'
import ExpeditionVoyageTrack from './ExpeditionVoyageTrack.vue'

const props = defineProps<{
  mission: ExpeditionMission
  now: number
  /** `column` — die Karte FÜLLT die Detailspalte, statt in einem Stapel zu
   *  stehen. Siehe dieselbe Variante in `ExpeditionContractCard`. */
  variant?: 'card' | 'column'
}>()
const emit = defineEmits<{ collect: [string] }>()

const battleStore = useBattleStore()

const done = computed(() => props.mission.status !== 'active')
const success = computed(() => props.mission.status === 'success')

const color = computed(
  () =>
    EXPEDITION_COLORS.find((c) => c.key === (props.mission.colorKey ?? 'gold')) ??
    EXPEDITION_COLORS[0],
)
const cardStyle = computed(() => ({
  '--exp-p': color.value.primary,
  '--exp-d': color.value.dim,
  '--exp-glow': color.value.glowRgb,
}))

const progress = computed(() => {
  const elapsed = props.now - props.mission.startTime
  return Math.min(1, Math.max(0, elapsed / (props.mission.durationSeconds * 1000)))
})

const remaining = computed(() => {
  const ms = Math.max(
    0,
    props.mission.durationSeconds * 1000 - (props.now - props.mission.startTime),
  )
  const secs = Math.ceil(ms / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
})

const legs = computed(() => voyageLegsOf(props.mission))

/** Unterwegs steht die Gefahr für sich — Requirement und Verdikt gehören dem
 *  Vertrag, hier ist die Crew längst gesetzt. */
const hazardInfo = computed<VoyageTrackHazard[]>(() =>
  (props.mission.hazards ?? [])
    .map((id) => EXPEDITION_HAZARD_BY_ID[id])
    .filter(Boolean)
    .map((def) => ({ id: def.id, name: def.name, icon: def.icon })),
)

/** Materials brought home, resolved to their display name and icon. */
const haul = computed(() =>
  (props.mission.spoils?.materials ?? []).map((m) => {
    const def = MATERIALS.find((x) => x.id === m.id)
    return { id: m.id, qty: m.qty, name: def?.name ?? m.id, image: def?.image ?? '' }
  }),
)

function championImage(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}
</script>

<template>
  <article
    class="efc-card"
    :class="[
      done ? (success ? 'efc-card--success' : 'efc-card--failure') : 'efc-card--running',
      `efc-card--${variant ?? 'card'}`,
    ]"
    :style="cardStyle"
  >
    <div v-if="(variant ?? 'card') === 'card'" class="efc-accent" />

    <header class="efc-head">
      <Icon
        :icon="mission.icon || 'game-icons:rolled-cloth'"
        width="28"
        height="28"
        class="efc-head-ico"
      />
      <span class="efc-name">{{ mission.name }}</span>
      <span v-if="done" class="efc-badge" :class="success ? 'efc-badge--ok' : 'efc-badge--fail'">
        {{ success ? '✓ Returned' : '✕ Lost' }}
      </span>
    </header>

    <!-- Die eine grosse Zahl. Reservierte Breite und tabular-nums, damit sie
         beim Stellenwechsel nicht wandert. -->
    <div v-if="!done" class="efc-clock">
      <span class="efc-clock-value">{{ remaining }}</span>
      <span class="efc-clock-unit">until they return</span>
    </div>

    <ExpeditionVoyageTrack
      class="efc-track"
      :legs="legs"
      :hazard-info="hazardInfo"
      :progress="done ? 1 : progress"
      :outcome="done ? (success ? 'success' : 'failure') : null"
    />

    <div class="efc-crew">
      <span
        v-for="c in mission.assignedChampions"
        :key="c.name"
        class="efc-member"
        :title="`${c.name} — ${c.role}`"
      >
        <img :src="championImage(c.name)" :alt="c.name" class="efc-member-img" />
        <span class="efc-member-text">
          <span class="efc-member-name" :style="{ color: getOriginColor(c.name) }">
            {{ c.name }}
          </span>
          <span class="efc-member-role">{{ c.role }}</span>
        </span>
      </span>
    </div>

    <!-- Returned: the haul + collect -->
    <template v-if="done">
      <div class="efc-haul">
        <span class="efc-chimes" :class="{ 'efc-chimes--fail': !success }">
          <img
            src="/img/BardAbilities/BardChime-128.png"
            class="efc-chime-img"
            alt=""
            aria-hidden="true"
          />
          +{{ $formatNumber(mission.reward) }}
        </span>
        <span v-for="m in haul" :key="m.id" class="efc-mat" :title="m.name">
          <img :src="m.image" :alt="m.name" class="efc-mat-img" />
          ×{{ m.qty }}
        </span>
        <span v-if="mission.spoils?.meep" class="efc-mat" title="Meep">
          <Icon icon="game-icons:meeple" width="16" height="16" />
          ×{{ mission.spoils.meep }}
        </span>
      </div>
      <button
        class="efc-collect"
        :class="success ? 'efc-collect--ok' : 'efc-collect--fail'"
        @click.stop="emit('collect', mission.id)"
      >
        Collect
      </button>
    </template>

    <span v-else class="efc-odds">{{ Math.round(mission.successChance * 100) }}% odds</span>
  </article>
</template>

<style scoped>
.efc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 0 11px;
  border: 1px solid;
  border-radius: 4px;
  overflow: hidden;
}
/* ── Als SPALTE ── siehe ExpeditionContractCard: die Spalte trägt den Rahmen,
   die Karte rollt in sich. */
.efc-card--column {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 13px;
  border: 0;
  border-radius: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.efc-card--column::-webkit-scrollbar {
  width: 4px;
}
.efc-card--column::-webkit-scrollbar-track {
  background: #111;
}
.efc-card--column::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.efc-card--running {
  background: #1a1008;
  border-color: rgba(92, 51, 16, 0.55);
}
.efc-card--success {
  background: #0e1a0e;
  border-color: rgba(82, 184, 48, 0.35);
}
.efc-card--failure {
  background: #1a0e0e;
  border-color: rgba(204, 96, 80, 0.35);
}
.efc-accent {
  height: 3px;
  flex-shrink: 0;
  opacity: 0.65;
}
.efc-card--running .efc-accent {
  background: linear-gradient(to right, transparent, var(--exp-p), transparent);
}
.efc-card--success .efc-accent {
  background: linear-gradient(to right, #2e7a1a, #52b830, #2e7a1a);
}
.efc-card--failure .efc-accent {
  background: linear-gradient(to right, #a04030, #cc6050, #a04030);
}

.efc-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 13px 0;
}
.efc-head-ico {
  flex-shrink: 0;
  color: var(--exp-d);
}
.efc-name {
  flex: 1;
  min-width: 0;
  font-size: 15.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.efc-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border: 1px solid;
  border-radius: 4px;
}
.efc-badge--ok {
  color: #52b830;
  border-color: rgba(82, 184, 48, 0.4);
  background: rgba(82, 184, 48, 0.12);
}
.efc-badge--fail {
  color: #cc6050;
  border-color: rgba(204, 96, 80, 0.4);
  background: rgba(204, 96, 80, 0.12);
}

/* ── Restzeit ─────────────────────────────────────────────── */
.efc-clock {
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 0 13px;
}
.efc-clock-value {
  min-width: 3.6ch;
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.efc-clock-unit {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.34);
}

.efc-track {
  padding: 0 13px;
}

/* ── Crew ─────────────────────────────────────────────────── */
.efc-crew {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 14px;
  padding: 0 13px;
}
.efc-member {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.efc-member-img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  flex-shrink: 0;
}
.efc-member-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.efc-member-name {
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
}
.efc-member-role {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
}

/* ── Haul ─────────────────────────────────────────────────── */
.efc-haul {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px 14px;
  padding: 0 13px;
}
.efc-chimes {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 20px;
  font-weight: 800;
  color: #ffd060;
  font-variant-numeric: tabular-nums;
}
.efc-chimes--fail {
  color: #cc6050;
  font-size: 16px;
}
.efc-chime-img {
  width: 21px;
  height: 21px;
  object-fit: contain;
}
.efc-mat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  font-size: 13px;
  font-weight: 800;
  color: #a0f0d0;
  background: #141410;
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}
.efc-mat-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.efc-odds {
  padding: 0 13px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.3);
  font-variant-numeric: tabular-nums;
}

.efc-collect {
  align-self: stretch;
  margin: 0 13px;
  padding: 9px 0;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.efc-collect--ok {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.efc-collect--ok:hover {
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.5);
}
.efc-collect--fail {
  background: #2a1410;
  border: 1px solid rgba(204, 96, 80, 0.4);
  color: #cc6050;
}
.efc-collect--fail:hover {
  box-shadow: 0 0 10px rgba(204, 96, 80, 0.3);
}
.efc-collect:active {
  transform: scale(0.98);
}
</style>
