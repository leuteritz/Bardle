<script setup lang="ts">
/**
 * A mission that has already left — running, or back and waiting to be collected.
 *
 * The returned state is where the haul is shown: chimes AND the materials the
 * run brought back, because those are now the reason the mission was worth
 * sending. A failed run shows the same frame with the spoils row absent, so the
 * gap itself reads as the loss.
 *
 * The progress bar animates `transform: scaleX()` rather than `width` — a width
 * transition is layout work every frame, and up to five of these run at once
 * while the orbit keeps drawing behind the panel.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { MATERIALS } from '@/config/economy/materials'
import { EXPEDITION_COLORS, EXPEDITION_HAZARD_BY_ID } from '@/config/constants'
import type { ExpeditionMission } from '@/types'

const props = defineProps<{ mission: ExpeditionMission; now: number }>()
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

const hazards = computed(() =>
  (props.mission.hazards ?? []).map((id) => EXPEDITION_HAZARD_BY_ID[id]).filter(Boolean),
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
    :class="done ? (success ? 'efc-card--success' : 'efc-card--failure') : 'efc-card--running'"
    :style="cardStyle"
  >
    <div class="efc-accent" />

    <header class="efc-head">
      <Icon
        :icon="mission.icon || 'game-icons:rolled-cloth'"
        width="26"
        height="26"
        class="efc-head-ico"
      />
      <span class="efc-name">{{ mission.name }}</span>
      <span v-if="done" class="efc-badge" :class="success ? 'efc-badge--ok' : 'efc-badge--fail'">
        {{ success ? '✓ Returned' : '✕ Lost' }}
      </span>
      <span v-else class="efc-time">
        <Icon icon="lucide:timer" width="13" height="13" />
        {{ remaining }}
      </span>
    </header>

    <!-- Crew -->
    <div class="efc-crew">
      <span
        v-for="c in mission.assignedChampions"
        :key="c.name"
        class="efc-member"
        :title="`${c.name} — ${c.role}`"
      >
        <img :src="championImage(c.name)" :alt="c.name" class="efc-member-img" />
        <span class="efc-member-name" :style="{ color: getOriginColor(c.name) }">{{ c.name }}</span>
      </span>
    </div>

    <!-- Running: progress + what it is up against -->
    <template v-if="!done">
      <div class="efc-progress">
        <div class="efc-track">
          <div class="efc-fill" :style="{ transform: `scaleX(${progress})` }" />
        </div>
        <div class="efc-meta">
          <span>{{ Math.round(progress * 100) }}%</span>
          <!-- Named, not just pictured: a bare glyph here meant nothing without
               a hover, and the run is already underway — this is the record of
               what it went up against. -->
          <span class="efc-hazard-list">
            <span v-for="h in hazards" :key="h.id" class="efc-hazard">
              <Icon :icon="h.icon" width="13" height="13" />
              {{ h.name }}
            </span>
          </span>
          <span>{{ Math.round(mission.successChance * 100) }}% odds</span>
        </div>
      </div>
    </template>

    <!-- Returned: the haul + collect -->
    <template v-else>
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
          <Icon icon="game-icons:musical-notes" width="15" height="15" />
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
  </article>
</template>

<style scoped>
.efc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 0 11px;
  border: 1px solid;
  border-radius: 4px;
  overflow: hidden;
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
  gap: 8px;
  padding: 8px 12px 0;
}
.efc-head-ico {
  flex-shrink: 0;
  color: var(--exp-d);
}
.efc-name {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.efc-time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: rgba(200, 144, 64, 0.78);
  font-variant-numeric: tabular-nums;
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

/* ── Crew ─────────────────────────────────────────────────── */
.efc-crew {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
  padding: 0 12px;
}
.efc-member {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.efc-member-img {
  width: 25px;
  height: 25px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  flex-shrink: 0;
}
.efc-member-name {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Progress ─────────────────────────────────────────────── */
.efc-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 12px;
}
.efc-track {
  width: 100%;
  height: 10px;
  background: #111008;
  border: 1px solid rgba(92, 51, 16, 0.55);
  border-radius: 4px;
  overflow: hidden;
}
.efc-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, var(--exp-d), var(--exp-p));
  transition: transform 1s linear;
}
.efc-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.48);
  font-variant-numeric: tabular-nums;
}
.efc-hazard-list {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}
.efc-hazard {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(216, 144, 96, 0.82);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* ── Haul ─────────────────────────────────────────────────── */
.efc-haul {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding: 0 12px;
}
.efc-chimes {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 17px;
  font-weight: 800;
  color: #ffd060;
  font-variant-numeric: tabular-nums;
}
.efc-chimes--fail {
  color: #cc6050;
  font-size: 15px;
}
.efc-chime-img {
  width: 19px;
  height: 19px;
  object-fit: contain;
}
.efc-mat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 800;
  color: #a0f0d0;
  font-variant-numeric: tabular-nums;
}
.efc-mat-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.efc-collect {
  align-self: stretch;
  margin: 0 12px;
  padding: 8px 0;
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
