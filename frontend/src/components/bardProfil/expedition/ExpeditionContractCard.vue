<script setup lang="ts">
/**
 * One offer on the board — and the only place in the tab where a decision gets
 * made.
 *
 * The card carries three things the old row did not: the mission's hazards, the
 * crew as EDITABLE seats, and the success chance broken into the signed lines
 * that produce it. Those three exist for each other: a hazard is only
 * interesting if you can answer it, answering it means swapping a champion, and
 * a swap is only worth doing if you can see what it bought.
 */
import { computed, ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getChampionRoles } from '@/config/champions/championData'
import { getOriginColor } from '@/config/champions/championOrigins'
import { formatShortDuration } from '@/utils/ui/format'
import {
  EXPEDITION_COLORS,
  EXPEDITION_HAZARD_BY_ID,
  EXPEDITION_SPOILS,
  EXPEDITION_CHANCE_GOOD,
  EXPEDITION_CHANCE_MID,
  EXPEDITION_EXPIRY_WARNING_MS,
  EXPEDITION_HAZARD_PENALTY,
} from '@/config/constants'
import type { AvailableExpeditionSlot, ChampionRole } from '@/types'
import ExpeditionCrewPicker from './ExpeditionCrewPicker.vue'

const props = defineProps<{ offer: AvailableExpeditionSlot; now: number }>()
const emit = defineEmits<{ send: [AvailableExpeditionSlot] }>()

const expeditionStore = useExpeditionStore()
const battleStore = useBattleStore()

/** Which seat has its picker open, or null. */
const openSeat = ref<number | null>(null)
/** Where the open picker is pinned — measured off the seat button it belongs to. */
const anchor = ref({ x: 0, y: 0, flip: false })

/** Picker box, kept in sync with .ecp-pop so the flip decision is honest. */
const PICKER_W = 300
const PICKER_H = 340
const GAP = 4

const color = computed(
  () => EXPEDITION_COLORS.find((c) => c.key === props.offer.colorKey) ?? EXPEDITION_COLORS[0],
)
const cardStyle = computed(() => ({
  '--exp-p': color.value.primary,
  '--exp-d': color.value.dim,
  '--exp-glow': color.value.glowRgb,
}))

const crew = computed(() => expeditionStore.crewFor(props.offer))
const crewComplete = computed(() => crew.value.every((c): c is string => !!c))

const assigned = computed(() =>
  crew.value
    .map((name, i) => ({ name, role: props.offer.requiredRoles[i] }))
    .filter((c): c is { name: string; role: ChampionRole } => !!c.name),
)

const breakdown = computed(() =>
  crewComplete.value ? expeditionStore.chanceBreakdownFor(assigned.value, props.offer) : null,
)

const canSend = computed(() => crewComplete.value && expeditionStore.canStartExpedition)

/**
 * The breakdown as shown: the hazard lines collapse into one.
 *
 * Each hazard already has its own row above with its requirement and verdict.
 * Repeating them here would say the same thing twice in the same card — but
 * dropping them outright would break the promise that these lines add up to the
 * figure beside them, so they are summed instead.
 */
const chanceLines = computed(() => {
  const b = breakdown.value
  if (!b) return []
  const out = []
  let hazardTotal = 0
  let hazardCount = 0
  let hazardsMet = 0
  for (const e of b.entries) {
    if (!e.id.startsWith('hazard:')) {
      out.push(e)
      continue
    }
    hazardTotal += e.value
    hazardCount++
    if (e.value >= -0.001) hazardsMet++
  }
  if (hazardCount > 0) {
    out.push({
      id: 'hazards',
      label: hazardCount === 1 ? 'Hazard' : 'Hazards',
      icon: 'ph:warning-fill',
      value: hazardTotal,
      detail: `${hazardsMet} of ${hazardCount} met`,
    })
  }
  return out
})

/**
 * Hazards, each paired with how the staged crew is doing against it.
 *
 * The requirement and the verdict both sit ON the card. They used to be a name
 * plus a `title` tooltip, which meant the one thing the player has to act on —
 * "bring Focus" — was the one thing they could not see.
 */
const hazards = computed(() => {
  const lines = breakdown.value?.entries ?? []
  return (props.offer.hazards ?? [])
    .map((id) => EXPEDITION_HAZARD_BY_ID[id])
    .filter(Boolean)
    .map((def) => {
      const line = lines.find((e) => e.id === `hazard:${def.id}`)
      return {
        ...def,
        // No crew yet → unknown rather than failed.
        state: !line ? 'open' : line.value >= -0.001 ? 'met' : line.value > -EXPEDITION_HAZARD_PENALTY + 0.001 ? 'partial' : 'unmet',
        cost: line ? Math.round(line.value * 100) : null,
        detail: line?.detail ?? '',
      }
    })
})

const spoils = computed(() => EXPEDITION_SPOILS[props.offer.tier])

const expiring = computed(
  () => props.offer.availableUntil - props.now < EXPEDITION_EXPIRY_WARNING_MS,
)

const chanceTone = computed(() => {
  const t = breakdown.value?.total ?? 0
  if (t >= EXPEDITION_CHANCE_GOOD) return 'is-good'
  if (t >= EXPEDITION_CHANCE_MID) return 'is-mid'
  return 'is-bad'
})

function seatRoleImg(role: ChampionRole): string {
  return `/img/roles/${role === 'support' ? 'supp' : role}-128.png`
}
function championImage(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}
function seatMatches(name: string | null, role: ChampionRole): boolean {
  return !!name && getChampionRoles(name).includes(role)
}
function toggleSeat(i: number, event: MouseEvent) {
  if (openSeat.value === i) {
    openSeat.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  // Flip above the seat when the list would run off the bottom, and pull it back
  // from the right edge rather than let it hang off the viewport.
  const flip = rect.bottom + PICKER_H + GAP > window.innerHeight
  anchor.value = {
    x: Math.max(GAP, Math.min(rect.left, window.innerWidth - PICKER_W - GAP)),
    y: flip ? rect.top - GAP : rect.bottom + GAP,
    flip,
  }
  openSeat.value = i
}
function pickSeat(i: number, champion: string | null) {
  expeditionStore.setCrewMember(props.offer, i, champion)
  openSeat.value = null
}

/**
 * Dismissal for the teleported picker.
 *
 * Escape is marked handled so the profile modal's own Escape ladder does not
 * close the whole tab out from under a player who only wanted to back out of a
 * crew list — the same contract the team tab's other layers keep.
 */
function onDocumentClick() {
  openSeat.value = null
}
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || openSeat.value === null) return
  openSeat.value = null
  e.preventDefault()
  e.stopPropagation()
}
watch(openSeat, (open) => {
  if (open !== null) {
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('keydown', onKeydown, true)
  } else {
    document.removeEventListener('click', onDocumentClick)
    document.removeEventListener('keydown', onKeydown, true)
  }
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown, true)
})
function signed(v: number): string {
  const pts = Math.round(v * 100)
  return `${pts > 0 ? '+' : ''}${pts}`
}
function formatCountdown(ms: number): string {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}
</script>

<template>
  <article class="ecc-card" :class="{ 'ecc-card--expiring': expiring }" :style="cardStyle">
    <div class="ecc-accent" />

    <!-- ── Title row ─────────────────────────────────────────── -->
    <header class="ecc-head">
      <Icon :icon="offer.icon" width="30" height="30" class="ecc-head-ico" />
      <div class="ecc-head-text">
        <span class="ecc-name">{{ offer.name }}</span>
        <span class="ecc-sub">
          <Icon icon="lucide:hourglass" width="12" height="12" />
          {{ formatShortDuration(offer.durationSeconds) }}
        </span>
      </div>
      <span v-if="offer.tier !== 'common'" class="ecc-tier" :class="`ecc-tier--${offer.tier}`">
        {{ offer.tier === 'epic' ? 'EPIC' : 'RARE' }}
      </span>
    </header>

    <!-- ── Rewards ───────────────────────────────────────────── -->
    <div class="ecc-spoils">
      <span class="ecc-spoil ecc-spoil--chimes">
        <img src="/img/BardAbilities/BardChime-128.png" class="ecc-spoil-img" alt="" aria-hidden="true" />
        {{ $formatNumber(offer.baseReward) }}
      </span>
      <span v-if="spoils.materialRolls > 0" class="ecc-spoil">
        <Icon icon="ph:diamonds-four-fill" width="16" height="16" />
        {{ spoils.materialRolls }} material{{ spoils.materialRolls === 1 ? '' : 's' }}
      </span>
      <span v-if="spoils.meep > 0" class="ecc-spoil">
        <Icon icon="game-icons:meeple" width="16" height="16" />
        {{ spoils.meep }} meep
      </span>
      <span class="ecc-spoil-note">on success</span>
    </div>

    <!-- ── Hazards ───────────────────────────────────────────── -->
    <div v-if="hazards.length" class="ecc-hazards">
      <div v-for="h in hazards" :key="h.id" class="ecc-hazard" :class="`is-${h.state}`">
        <Icon :icon="h.icon" width="20" height="20" class="ecc-hazard-ico" />
        <div class="ecc-hazard-text">
          <span class="ecc-hazard-name">{{ h.name }}</span>
          <span class="ecc-hazard-req">{{ h.requirement }}</span>
        </div>
        <span class="ecc-hazard-verdict">
          <template v-if="h.state === 'met'">✓ met</template>
          <template v-else-if="h.state === 'open'">—</template>
          <template v-else>{{ h.cost }}%</template>
        </span>
      </div>
    </div>

    <!-- ── Crew seats ────────────────────────────────────────── -->
    <div class="ecc-crew">
      <div v-for="(role, i) in offer.requiredRoles" :key="`${role}-${i}`" class="ecc-seat-wrap">
        <button
          class="ecc-seat"
          :class="{
            'ecc-seat--empty': !crew[i],
            'ecc-seat--off': crew[i] && !seatMatches(crew[i], role),
            'ecc-seat--open': openSeat === i,
          }"
          :title="crew[i] ?? `Pick a ${role} champion`"
          @click.stop="toggleSeat(i, $event)"
        >
          <img v-if="crew[i]" :src="championImage(crew[i]!)" :alt="crew[i]!" class="ecc-seat-img" />
          <img v-else :src="seatRoleImg(role)" :alt="role" class="ecc-seat-img ecc-seat-img--role" />
          <span
            class="ecc-seat-name"
            :style="crew[i] ? { color: getOriginColor(crew[i]!) } : undefined"
          >
            {{ crew[i] ?? role }}
          </span>
          <img :src="seatRoleImg(role)" :alt="role" class="ecc-seat-badge" />
        </button>

        <ExpeditionCrewPicker
          v-if="openSeat === i"
          :offer="offer"
          :index="i"
          :current="crew[i] ?? null"
          :x="anchor.x"
          :y="anchor.y"
          :flip="anchor.flip"
          @pick="pickSeat(i, $event)"
          @close="openSeat = null"
        />
      </div>
    </div>

    <!-- ── Chance breakdown ──────────────────────────────────── -->
    <div v-if="breakdown" class="ecc-chance">
      <div class="ecc-chance-head" :class="chanceTone">
        <span class="ecc-chance-value">{{ Math.round(breakdown.total * 100) }}%</span>
        <span class="ecc-chance-label">success</span>
      </div>
      <ul class="ecc-lines">
        <li class="ecc-line">
          <Icon icon="ph:dice-three-fill" width="13" height="13" class="ecc-line-ico" />
          <span class="ecc-line-label">Base odds</span>
          <span class="ecc-line-value">{{ Math.round(breakdown.base * 100) }}</span>
        </li>
        <li
          v-for="e in chanceLines"
          :key="e.id"
          class="ecc-line"
          :class="e.value < 0 ? 'is-neg' : e.value > 0 ? 'is-pos' : 'is-zero'"
        >
          <Icon :icon="e.icon" width="13" height="13" class="ecc-line-ico" />
          <span class="ecc-line-label">{{ e.label }}</span>
          <span v-if="e.detail" class="ecc-line-detail">{{ e.detail }}</span>
          <span class="ecc-line-value">{{ signed(e.value) }}</span>
        </li>
      </ul>
    </div>
    <div v-else class="ecc-incomplete">
      <Icon icon="ph:warning-fill" width="15" height="15" />
      Fill every seat to see the odds
    </div>

    <!-- ── Footer ────────────────────────────────────────────── -->
    <footer class="ecc-foot">
      <span class="ecc-expiry" :class="{ 'ecc-expiry--warn': expiring }">
        <Icon :icon="expiring ? 'lucide:alarm-clock' : 'lucide:timer'" width="13" height="13" />
        {{ formatCountdown(offer.availableUntil - now) }}
      </span>
      <button
        class="ecc-send"
        :class="canSend ? 'ecc-send--ready' : 'ecc-send--off'"
        :disabled="!canSend"
        :title="
          !crewComplete
            ? 'Every seat needs a champion'
            : !expeditionStore.canStartExpedition
              ? 'No free expedition slot'
              : ''
        "
        @click.stop="emit('send', offer)"
      >
        <Icon icon="ph:tent-fill" width="16" height="16" />
        Send
      </button>
    </footer>
  </article>
</template>

<style scoped>
.ecc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 0 0 11px;
  background: linear-gradient(180deg, rgba(var(--exp-glow), 0.04) 0%, #1a1008 42%);
  border: 1px solid color-mix(in srgb, var(--exp-d) 55%, #241408);
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(62, 32, 10, 0.6);
}
.ecc-card--expiring {
  border-color: rgba(204, 96, 80, 0.55);
}
.ecc-accent {
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(
    to right,
    transparent,
    var(--exp-p) 30%,
    var(--exp-p) 70%,
    transparent
  );
  opacity: 0.45;
  flex-shrink: 0;
}

/* ── Head ─────────────────────────────────────────────────── */
.ecc-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 12px 0;
}
.ecc-head-ico {
  flex-shrink: 0;
  color: var(--exp-p);
  opacity: 0.9;
}
.ecc-head-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ecc-name {
  font-size: 15px;
  font-weight: 700;
  color: color-mix(in srgb, var(--exp-p) 62%, #cfc2a4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
}
.ecc-sub {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.65);
  font-variant-numeric: tabular-nums;
}
.ecc-tier {
  flex-shrink: 0;
  padding: 3px 8px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  border-radius: 4px;
  border: 1px solid var(--exp-d);
  color: var(--exp-p);
  background: rgba(var(--exp-glow), 0.15);
}
.ecc-tier--epic {
  box-shadow: 0 0 8px rgba(var(--exp-glow), 0.45);
}

/* ── Spoils ───────────────────────────────────────────────── */
.ecc-spoils {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
}
.ecc-spoil {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 800;
  color: rgba(200, 144, 64, 0.85);
  font-variant-numeric: tabular-nums;
}
.ecc-spoil--chimes {
  color: #ffd060;
  font-size: 15px;
}
/* Qualifies the row without repeating itself on every item in it. */
.ecc-spoil-note {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.4);
}
.ecc-spoil-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

/* ── Hazards ──────────────────────────────────────────────────
   A full row each, not a chip. The requirement is the point of the whole
   feature — it has to be readable at a glance, and the row has to say whether
   the staged crew answers it. Nothing here hides behind a hover. */
.ecc-hazards {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 12px;
}
.ecc-hazard {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 10px;
  border: 1px solid;
  border-radius: 4px;
  transition:
    border-color 0.18s,
    background 0.18s;
}
.ecc-hazard-ico {
  flex-shrink: 0;
}
.ecc-hazard-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ecc-hazard-name {
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecc-hazard-req {
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  color: rgba(230, 220, 196, 0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecc-hazard-verdict {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
}

/* Answered — the crew already covers it. */
.ecc-hazard.is-met {
  background: rgba(82, 184, 48, 0.1);
  border-color: rgba(82, 184, 48, 0.4);
}
.ecc-hazard.is-met .ecc-hazard-ico,
.ecc-hazard.is-met .ecc-hazard-name,
.ecc-hazard.is-met .ecc-hazard-verdict {
  color: #52b830;
}
/* Partly answered — a stat hazard mitigates on a ramp. */
.ecc-hazard.is-partial {
  background: rgba(200, 144, 64, 0.1);
  border-color: rgba(200, 144, 64, 0.4);
}
.ecc-hazard.is-partial .ecc-hazard-ico,
.ecc-hazard.is-partial .ecc-hazard-name,
.ecc-hazard.is-partial .ecc-hazard-verdict {
  color: #e8c040;
}
/* Not answered at all, or no crew staged yet. */
.ecc-hazard.is-unmet,
.ecc-hazard.is-open {
  background: rgba(160, 72, 40, 0.12);
  border-color: rgba(204, 96, 80, 0.4);
}
.ecc-hazard.is-unmet .ecc-hazard-ico,
.ecc-hazard.is-unmet .ecc-hazard-name,
.ecc-hazard.is-unmet .ecc-hazard-verdict,
.ecc-hazard.is-open .ecc-hazard-ico,
.ecc-hazard.is-open .ecc-hazard-name,
.ecc-hazard.is-open .ecc-hazard-verdict {
  color: #d89060;
}

/* ── Crew seats ───────────────────────────────────────────── */
.ecc-crew {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px;
}
.ecc-seat-wrap {
  position: relative;
}
.ecc-seat {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 4px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid #3e200a;
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 0.13s,
    background 0.13s;
}
.ecc-seat:hover {
  border-color: var(--exp-p);
  background: rgba(200, 144, 64, 0.1);
}
.ecc-seat--open {
  border-color: #e8c040;
  background: rgba(200, 144, 64, 0.14);
}
.ecc-seat--empty {
  border-style: dashed;
  border-color: rgba(204, 96, 80, 0.5);
}
.ecc-seat--off {
  border-color: rgba(204, 96, 80, 0.45);
}
.ecc-seat-img {
  width: 26px;
  height: 26px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  flex-shrink: 0;
}
.ecc-seat-img--role {
  object-fit: contain;
  padding: 4px;
  opacity: 0.55;
  border-style: dashed;
}
.ecc-seat-name {
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(204, 96, 80, 0.75);
  white-space: nowrap;
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecc-seat--empty .ecc-seat-name {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 11px;
}
.ecc-seat-badge {
  width: 15px;
  height: 15px;
  object-fit: contain;
  opacity: 0.7;
  flex-shrink: 0;
}

/* ── Chance breakdown ─────────────────────────────────────── */
.ecc-chance {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0 12px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.ecc-chance-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.ecc-chance-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.ecc-chance-head.is-good .ecc-chance-value {
  color: #52b830;
}
.ecc-chance-head.is-mid .ecc-chance-value {
  color: #e8c040;
}
.ecc-chance-head.is-bad .ecc-chance-value {
  color: #cc6050;
}
.ecc-chance-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
}
.ecc-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ecc-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(230, 220, 196, 0.62);
}
.ecc-line-ico {
  flex-shrink: 0;
  opacity: 0.75;
}
.ecc-line-label {
  white-space: nowrap;
}
.ecc-line-detail {
  flex: 1;
  min-width: 0;
  font-size: 10.5px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}
.ecc-line-value {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 26px;
  text-align: right;
}
.ecc-line-detail + .ecc-line-value {
  margin-left: 6px;
}
.ecc-line.is-pos .ecc-line-value {
  color: #52b830;
}
.ecc-line.is-neg .ecc-line-value {
  color: #cc6050;
}
.ecc-line.is-neg .ecc-line-ico {
  color: #cc6050;
}
.ecc-line.is-zero .ecc-line-value {
  color: rgba(230, 220, 196, 0.4);
}
.ecc-line.is-zero .ecc-line-ico {
  color: #52b830;
}

.ecc-incomplete {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 12px;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(204, 96, 80, 0.8);
  background: rgba(160, 40, 30, 0.1);
  border: 1px solid rgba(204, 96, 80, 0.3);
  border-radius: 4px;
}

/* ── Footer ───────────────────────────────────────────────── */
.ecc-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
}
.ecc-expiry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.6);
  font-variant-numeric: tabular-nums;
}
.ecc-expiry--warn {
  color: #cc6050;
  font-weight: 800;
}
.ecc-send {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  transition: box-shadow 0.16s;
}
.ecc-send--ready {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.ecc-send--ready:hover {
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.5);
}
.ecc-send--ready:active {
  transform: scale(0.97);
}
.ecc-send--off {
  background: #1c1408;
  border: 1px solid #3e200a;
  color: rgba(200, 144, 64, 0.25);
  cursor: not-allowed;
}
</style>
