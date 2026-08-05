<script setup lang="ts">
/**
 * The LEFT column while the inline picker is open: who sits in the seat now,
 * who is under the cursor over in the grid, and what the trade would cost.
 *
 * It exists because the modal it replaced could only answer "which champions do
 * I own" — never "is this one better than the one already there". Two portraits
 * stacked over the four stats and the team's threshold shifts answer that
 * without leaving the page.
 *
 * The preview is sticky: the last hovered card stays on screen after the cursor
 * leaves the grid, so the comparison can be read at leisure and the Assign
 * button below it is reachable without the subject changing on the way there.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { CHAMPION_STATS } from '@/config/champions/championLevels'
import { getChampionTier, getChampionStarLevel } from '@/config/champions/championTiers'
import { getChampionOrigin, getOriginColor, ORIGIN_SYNERGIES } from '@/config/champions/championOrigins'
import {
  ROLES,
  CHAMPION_REGALIA_SIZE_CHIP_MAIN,
  CHAMPION_SWAP_PORTRAIT_MIN_HEIGHT,
  CHAMPION_SWAP_PORTRAIT_MAX_HEIGHT,
} from '@/config/constants'
import { synergyShift } from '@/utils/game/synergyPreview'
import ChampionLevelBadge from '../ChampionLevelBadge.vue'
import type { ChampionStatKey } from '@/types'

const props = defineProps<{
  roleIndex: number
  /** -1 = the role's main seat, 0…n = an ally sub-slot. */
  subSlot: number
  /** Seat label as the roster strip writes it — "Main", "Sworn I", "Ally 3". */
  seatLabel: string
  /** Champion sitting in the seat right now, null when it is empty. */
  current: string | null
  /** Champion under the cursor in the grid, null until one has been hovered. */
  candidate: string | null
}>()

const emit = defineEmits<{
  cancel: []
  assign: [champion: string]
}>()

const portraitMinPx = `${CHAMPION_SWAP_PORTRAIT_MIN_HEIGHT}px`
const portraitMaxPx = `${CHAMPION_SWAP_PORTRAIT_MAX_HEIGHT}px`

const battleStore = useBattleStore()
const levelStore = useChampionLevelStore()

const roleDef = computed(() => ROLES[props.roleIndex])

/** Nothing to compare against — the seat is empty or no card was hovered yet. */
const hasCandidate = computed(() => !!props.candidate && props.candidate !== props.current)

function imageOf(name: string): string {
  return battleStore.getChampionImage(name)
}

interface Identity {
  name: string
  level: number
  star: number
  tierName: string
  tierColor: string
  origin: string | null
  originColor: string
  originIcon: string
}

function identityOf(name: string): Identity {
  const tier = getChampionTier(name)
  const origin = getChampionOrigin(name)
  return {
    name,
    level: levelStore.levelOf(name),
    star: getChampionStarLevel(name),
    tierName: tier.name,
    tierColor: tier.color,
    origin: origin ?? null,
    originColor: getOriginColor(name),
    originIcon: origin
      ? ((ORIGIN_SYNERGIES as Record<string, { icon: string } | undefined>)[origin]?.icon ?? '')
      : '',
  }
}

const currentIdentity = computed(() => (props.current ? identityOf(props.current) : null))
const candidateIdentity = computed(() =>
  props.candidate ? identityOf(props.candidate) : null,
)

/** Seat the candidate holds elsewhere on the board — the swap would move it. */
const candidateHeldBy = computed(() => {
  const name = props.candidate
  if (!name) return null
  const mainIdx = battleStore.headerSlots.indexOf(name)
  if (mainIdx >= 0 && !(mainIdx === props.roleIndex && props.subSlot === -1)) {
    return `${ROLES[mainIdx]?.label} main`
  }
  for (let r = 0; r < battleStore.secondarySlots.length; r++) {
    const sub = (battleStore.secondarySlots[r] ?? []).indexOf(name)
    if (sub >= 0 && !(r === props.roleIndex && sub === props.subSlot)) {
      return `${ROLES[r]?.label} bench`
    }
  }
  return null
})

// ── Stats ────────────────────────────────────────────────────────────────────
// Both sides are read with statsOf, the champion's OWN block: the sworn share a
// main receives comes from the allies beside it and stays whoever moves in, so
// including it would add the same number to both columns and to neither's
// credit. What the tiles show is what actually changes hands.
const currentStats = computed(() =>
  props.current ? levelStore.statsOf(props.current) : null,
)
const candidateStats = computed(() =>
  props.candidate ? levelStore.statsOf(props.candidate) : null,
)

interface StatRow {
  key: ChampionStatKey
  short: string
  label: string
  icon: string
  color: string
  from: number
  to: number | null
  delta: number
  /** Share of the row's own scale, for the two bars. */
  fromShare: number
  toShare: number
}

const statRows = computed<StatRow[]>(() =>
  CHAMPION_STATS.map((def) => {
    const from = currentStats.value?.[def.key] ?? 0
    const to = candidateStats.value ? candidateStats.value[def.key] : null
    // Bars are drawn against the larger of the two, so the winning side always
    // fills its rail and the gap between them IS the difference.
    const peak = Math.max(from, to ?? 0, 1)
    return {
      key: def.key,
      short: def.short,
      label: def.label,
      icon: def.icon,
      color: def.color,
      from,
      to,
      delta: to === null ? 0 : Math.round((to - from) * 10) / 10,
      fromShare: from / peak,
      toShare: (to ?? 0) / peak,
    }
  }),
)

// ── Team synergies ───────────────────────────────────────────────────────────
/** Every champion currently seated anywhere — the lineup the thresholds count. */
const lineup = computed(() => {
  const out: string[] = []
  battleStore.headerSlots.forEach((name) => {
    if (name) out.push(name)
  })
  battleStore.secondarySlots.forEach((row) => {
    for (const name of row ?? []) if (name) out.push(name)
  })
  return out
})

/** The same lineup with this seat's champion replaced by the candidate. */
const lineupAfter = computed(() => {
  const name = props.candidate
  if (!name) return lineup.value
  const out = [...lineup.value]
  if (props.current) {
    const i = out.indexOf(props.current)
    if (i >= 0) out.splice(i, 1)
  }
  // A candidate that sits elsewhere leaves that seat behind — it is one champion
  // either way, so it must not be counted twice.
  const held = out.indexOf(name)
  if (held >= 0) out.splice(held, 1)
  out.push(name)
  return out
})

const shifts = computed(() =>
  hasCandidate.value ? synergyShift(lineup.value, lineupAfter.value) : [],
)

// ── Action ───────────────────────────────────────────────────────────────────
const canAssign = computed(() => hasCandidate.value)
const assignLabel = computed(() => {
  if (!props.candidate) return 'Pick a champion'
  if (props.candidate === props.current) return 'Already in this seat'
  return `Assign ${props.candidate}`
})

function assign() {
  if (!canAssign.value || !props.candidate) return
  emit('assign', props.candidate)
}
</script>

<template>
  <div class="swc-root">
    <!-- ── head: the way back, and which seat is being filled ── -->
    <div class="swc-head">
      <button class="swc-back" type="button" title="Back to details" @click="emit('cancel')">
        <Icon icon="lucide:arrow-left" width="17" height="17" />
        <span>Cancel</span>
      </button>
      <span class="swc-seat">
        <span class="swc-seat-role">{{ roleDef.label }}</span>
        <span class="swc-seat-sep">·</span>
        <span class="swc-seat-name">{{ seatLabel }}</span>
      </span>
    </div>

    <!-- ── current ── -->
    <div class="swc-well swc-well--current">
      <template v-if="currentIdentity">
        <img
          :src="imageOf(currentIdentity.name)"
          :alt="currentIdentity.name"
          class="swc-well-img"
          decoding="async"
        />
        <span class="swc-well-fade" aria-hidden="true" />
        <ChampionLevelBadge
          :level="currentIdentity.level"
          :color="roleDef.color"
          :size="CHAMPION_REGALIA_SIZE_CHIP_MAIN"
          class="swc-well-badge"
        />
        <span class="swc-well-tag">In this seat</span>
        <span class="swc-well-body">
          <span class="swc-well-name">{{ currentIdentity.name }}</span>
          <span class="swc-well-chips">
            <span
              class="swc-chip"
              :style="{ borderColor: currentIdentity.tierColor, color: currentIdentity.tierColor }"
            >
              ★{{ currentIdentity.star }} {{ currentIdentity.tierName }}
            </span>
            <span
              v-if="currentIdentity.origin"
              class="swc-chip"
              :style="{
                borderColor: currentIdentity.originColor,
                color: currentIdentity.originColor,
              }"
            >
              <Icon
                v-if="currentIdentity.originIcon.includes(':')"
                :icon="currentIdentity.originIcon"
                width="13"
                height="13"
              />
              {{ currentIdentity.origin }}
            </span>
          </span>
        </span>
      </template>
      <div v-else class="swc-well-empty">
        <img :src="roleDef.image" :alt="roleDef.label" class="swc-well-empty-img" />
        <span class="swc-well-empty-text">Seat is empty</span>
      </div>
    </div>

    <!-- the trade itself — an arrow between the two, not a word -->
    <div class="swc-arrow" :class="{ 'swc-arrow--live': hasCandidate }">
      <span class="swc-arrow-rule" />
      <Icon icon="lucide:arrow-down" width="16" height="16" />
      <span class="swc-arrow-rule" />
    </div>

    <!-- ── candidate ── -->
    <div class="swc-well swc-well--candidate" :class="{ 'swc-well--idle': !candidateIdentity }">
      <template v-if="candidateIdentity">
        <img
          :src="imageOf(candidateIdentity.name)"
          :alt="candidateIdentity.name"
          class="swc-well-img"
          decoding="async"
        />
        <span class="swc-well-fade" aria-hidden="true" />
        <ChampionLevelBadge
          :level="candidateIdentity.level"
          :color="roleDef.color"
          :size="CHAMPION_REGALIA_SIZE_CHIP_MAIN"
          class="swc-well-badge"
        />
        <span v-if="candidateHeldBy" class="swc-well-tag swc-well-tag--moved">
          Moves from {{ candidateHeldBy }}
        </span>
        <span class="swc-well-body">
          <span class="swc-well-name">{{ candidateIdentity.name }}</span>
          <span class="swc-well-chips">
            <span
              class="swc-chip"
              :style="{
                borderColor: candidateIdentity.tierColor,
                color: candidateIdentity.tierColor,
              }"
            >
              ★{{ candidateIdentity.star }} {{ candidateIdentity.tierName }}
            </span>
            <span
              v-if="candidateIdentity.origin"
              class="swc-chip"
              :style="{
                borderColor: candidateIdentity.originColor,
                color: candidateIdentity.originColor,
              }"
            >
              <Icon
                v-if="candidateIdentity.originIcon.includes(':')"
                :icon="candidateIdentity.originIcon"
                width="13"
                height="13"
              />
              {{ candidateIdentity.origin }}
            </span>
          </span>
        </span>
      </template>
      <div v-else class="swc-well-empty">
        <Icon icon="lucide:mouse-pointer-click" width="26" height="26" class="swc-well-empty-icon" />
        <span class="swc-well-empty-text">Hover a champion to compare</span>
      </div>
    </div>

    <!-- ── the trade, stat by stat ──
         Every part of this block is present at all times, empty or not: the
         portraits above take whatever height is left, so a row that appears
         with the first hover would shove both of them upward. -->
    <div class="swc-stats">
      <div
        v-for="row in statRows"
        :key="row.key"
        class="swc-stat"
        :style="{ '--sc': row.color }"
        :title="row.label"
      >
        <Icon :icon="row.icon" width="18" height="18" class="swc-stat-icon" />
        <span class="swc-stat-short">{{ row.short }}</span>
        <span class="swc-stat-rails">
          <span class="swc-stat-rail">
            <span
              class="swc-stat-fill swc-stat-fill--from"
              :style="{ transform: `scaleX(${row.fromShare})` }"
            />
          </span>
          <!-- the candidate's rail stays in the layout while empty, scaled to
               nothing — one rail today and two tomorrow is a moving row -->
          <span class="swc-stat-rail">
            <span
              class="swc-stat-fill swc-stat-fill--to"
              :style="{ transform: `scaleX(${row.to === null ? 0 : row.toShare})` }"
            />
          </span>
        </span>
        <span class="swc-stat-nums">
          <span class="swc-stat-from">{{ row.from.toFixed(1) }}</span>
          <span class="swc-stat-to" :class="{ 'swc-stat-num--void': row.to === null }">
            {{ row.to === null ? '—' : row.to.toFixed(1) }}
          </span>
          <span
            class="swc-stat-delta"
            :class="{
              'swc-stat-delta--up': row.to !== null && row.delta > 0,
              'swc-stat-delta--down': row.to !== null && row.delta < 0,
              'swc-stat-num--void': row.to === null,
            }"
          >
            {{ row.to === null ? '—' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}` }}
          </span>
        </span>
      </div>
    </div>

    <!-- ── what the team's thresholds would do ──
         Fixed height, scrolled rather than grown: a champion whose swap moves
         four thresholds must not cost the portraits a row of their own. -->
    <div class="swc-synergy">
      <template v-if="hasCandidate && shifts.length">
        <span
          v-for="shift in shifts"
          :key="shift.key"
          class="swc-shift"
          :class="{
            'swc-shift--up': shift.toTier > shift.fromTier,
            'swc-shift--down': shift.toTier < shift.fromTier,
          }"
          :style="{ '--yc': shift.color }"
          :title="shift.bonus ?? `${shift.label} falls below its threshold`"
        >
          <Icon :icon="shift.icon" width="14" height="14" />
          {{ shift.label }}
          <span class="swc-shift-tier">
            {{ shift.fromTier || '–' }} → {{ shift.toTier || '–' }}
          </span>
        </span>
      </template>
      <span v-else class="swc-synergy-none">
        {{ hasCandidate ? 'No synergy thresholds change' : 'Team synergies' }}
      </span>
    </div>

    <!-- ── commit ── -->
    <button
      class="swc-assign"
      :class="{ 'swc-assign--locked': !canAssign }"
      :disabled="!canAssign"
      type="button"
      @click="assign"
    >
      <Icon icon="game-icons:switch-weapon" width="20" height="20" />
      <span>{{ assignLabel }}</span>
    </button>
  </div>
</template>

<style scoped>
.swc-root {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-height: 0;
  height: 100%;
  padding: 12px 14px 14px;
  overflow: hidden;
}

/* ── head ── */
.swc-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.swc-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 4px;
  cursor: pointer;
  background: #1c1c18;
  border: 1px solid #5c3310;
  color: #c8a860;
  font-size: 12.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition:
    color 0.15s,
    background 0.15s;
}
.swc-back:hover {
  background: #24180c;
  color: #e8c040;
}
.swc-seat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  margin-left: auto;
  font-size: 13px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
}
.swc-seat-role {
  color: var(--rc);
}
.swc-seat-sep {
  color: rgba(200, 164, 90, 0.4);
}
.swc-seat-name {
  color: #c8a860;
}

/* ── portrait wells ──
   Both split the column's spare height in equal parts — `flex-basis: 0`, not
   the floor, so the split depends on the COLUMN and never on what either well
   happens to contain. Everything below them is fixed in height for the same
   reason: the two portraits are the biggest things on the page, and a picker
   whose portraits resize as you move along the grid is unreadable.

   The floor and the ceiling only ever bind against the viewport — 118px on the
   flattest desktop, 260px before a 4K column turns them into posters. */
.swc-well {
  position: relative;
  flex: 1 1 0;
  min-height: v-bind(portraitMinPx);
  max-height: v-bind(portraitMaxPx);
  overflow: hidden;
  border-radius: 4px;
  background: #0a0704;
  border: 1px solid #3e3a30;
}
.swc-well--current {
  border-color: #c89040;
}
.swc-well--candidate {
  border-color: var(--rc);
}
.swc-well--idle {
  border-style: dashed;
  border-color: rgba(200, 164, 90, 0.35);
}
/* The well is a wide, short window on a tall splash — anchored near the top of
   the art, which is where champion portraits keep their faces. */
.swc-well-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 14%;
}
.swc-well-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 7, 4, 0.35) 0%,
    rgba(10, 7, 4, 0.15) 34%,
    rgba(10, 7, 4, 0.92) 100%
  );
}
.swc-well-badge {
  position: absolute;
  top: 7px;
  left: 7px;
  z-index: 2;
  pointer-events: none;
}
.swc-well-tag {
  position: absolute;
  top: 7px;
  right: 7px;
  z-index: 2;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.78);
  border: 1px solid #c89040;
  color: #e8c040;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.3;
  pointer-events: none;
}
.swc-well-tag--moved {
  border-color: #b8862f;
  color: #dcc99a;
}
.swc-well-body {
  position: absolute;
  left: 11px;
  right: 11px;
  bottom: 9px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.swc-well-name {
  font-size: 23px;
  line-height: 1;
  color: #f4e6bc;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.swc-well-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.swc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.68);
  border: 1px solid;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.swc-well-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
}
.swc-well-empty-img {
  width: 58px;
  height: 58px;
  object-fit: contain;
  opacity: 0.4;
}
.swc-well-empty-icon {
  color: rgba(200, 164, 90, 0.45);
}
.swc-well-empty-text {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.5);
}

/* ── the arrow between them ── */
.swc-arrow {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  color: rgba(200, 164, 90, 0.4);
  transition: color 0.2s;
}
.swc-arrow--live {
  color: var(--rc);
}
.swc-arrow-rule {
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.4;
}

/* ── stat comparison ──
   One row per stat: the seated champion's bar, the candidate's below it, and
   the two numbers with their difference. Bars scale inline on the fill itself,
   never through a variable on the row — the board keeps orbiting behind this
   panel and a variable would recalculate the whole subtree. */
.swc-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
}
.swc-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 9px;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--sc);
}
.swc-stat-icon {
  flex-shrink: 0;
  color: var(--sc);
}
.swc-stat-short {
  flex-shrink: 0;
  width: 30px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(200, 164, 90, 0.65);
}
.swc-stat-rails {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.swc-stat-rail {
  display: block;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.55);
}
.swc-stat-fill {
  display: block;
  height: 100%;
  transform-origin: left center;
  transition: transform 0.22s ease-out;
}
.swc-stat-fill--from {
  background: rgba(200, 164, 90, 0.55);
}
.swc-stat-fill--to {
  background: var(--sc);
}
.swc-stat-nums {
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.swc-stat-from {
  font-size: 13px;
  color: rgba(230, 220, 196, 0.55);
}
.swc-stat-to {
  min-width: 40px;
  text-align: right;
  font-size: 16px;
  color: #f4e6bc;
}
.swc-stat-delta {
  min-width: 46px;
  text-align: right;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(230, 220, 196, 0.4);
}
/* Placeholder for a column that has no candidate yet — it holds the width so
   the numbers never shift sideways once one arrives. */
.swc-stat-num--void {
  color: rgba(230, 220, 196, 0.22);
}
.swc-stat-delta--up {
  color: #6ec040;
}
.swc-stat-delta--down {
  color: #cc6050;
}

/* ── synergy shifts ──
   Two chip rows of reserved height, scrolled beyond that. A swap that moves
   four thresholds is rare and must not be paid for by every other swap: a
   block that grows with its content would take the room out of the portraits
   above it, which is exactly the movement this column is built to avoid. */
.swc-synergy {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  /* two chip rows and the gap between them, measured off the chip's own box —
     a couple of pixels short and every second swap gets a scrollbar it does
     not need */
  height: 57px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 transparent;
}
/* On the flattest desktops one row is all the column can spare — the portraits
   are already on their floor there. */
@media (max-height: 1100px) {
  .swc-synergy {
    height: 26px;
  }
}
.swc-shift {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--yc);
  color: var(--yc);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.swc-shift-tier {
  padding-left: 5px;
  border-left: 1px solid color-mix(in srgb, var(--yc) 40%, transparent);
  color: rgba(240, 228, 196, 0.75);
}
.swc-shift--up {
  box-shadow: inset 0 0 0 1px rgba(110, 192, 64, 0.35);
}
.swc-shift--down {
  box-shadow: inset 0 0 0 1px rgba(204, 96, 80, 0.4);
  opacity: 0.75;
}
.swc-synergy-none {
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: rgba(230, 220, 196, 0.35);
}

/* ── commit ── */
.swc-assign {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  flex-shrink: 0;
  padding: 11px 14px;
  border-radius: 4px;
  cursor: pointer;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #f0fbe8;
  font-size: 15px;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  transition:
    filter 0.15s,
    transform 0.15s;
}
.swc-assign:hover:not(:disabled) {
  transform: translateY(-1px);
}
/* One line, always — a long champion name wrapping to two would move the
   button's top edge and with it every portrait above it. */
.swc-assign span {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.swc-assign--locked {
  background: #1c1c18;
  border-color: #3e3a30;
  color: rgba(230, 220, 196, 0.4);
  cursor: not-allowed;
  text-shadow: none;
}
</style>
