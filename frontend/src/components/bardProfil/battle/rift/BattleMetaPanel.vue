<template>
  <!-- Meta readout in the board's bottom corner, in the team HUD's own column.
       Both sides carry the SAME four stats in a 2x2 grid — four values do not
       fit one row at the plate's width, and the grid keeps every number large
       instead of squeezing all of them. -->
  <div class="meta-panel" :class="`meta-panel--${side}`">
    <span class="meta-edge" aria-hidden="true" />
    <div class="meta-grid">
      <div
        v-for="cell in cells"
        :key="cell.label"
        class="meta-cell"
        :class="{ 'meta-cell--text': cell.text }"
      >
        <span class="meta-label">{{ cell.label }}</span>
        <span
          class="meta-value"
          :class="{ 'meta-value--text': cell.text, 'meta-value--compact': cell.compact }"
          >{{ cell.value }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import {
  APEX_RANK_TIERS,
  BATTLE_META_LABELS,
  BATTLE_META_EMPTY,
  BATTLE_META_RANK_COMPACT_LENGTH,
} from '@/config/constants'

interface MetaCell {
  label: string
  value: string
  /** word value (a rank name): gets the wider cell and tighter tracking */
  text?: boolean
  /** long word value — one size step down so it renders whole */
  compact?: boolean
}

const props = defineProps<{ side: 'blue' | 'red' }>()

const battleStore = useBattleStore()

const isOwn = computed(() => props.side === 'blue')

/** Apex tiers carry no division — "GRANDMASTER", not "GRANDMASTER I". */
const ownRank = computed(() => {
  const { tier, division } = battleStore.currentRank
  return (APEX_RANK_TIERS as readonly string[]).includes(tier)
    ? tier.toUpperCase()
    : `${tier.toUpperCase()} ${division}`
})

const rank = computed(() =>
  isOwn.value ? ownRank.value : battleStore.currentOpponentLabel.toUpperCase() || BATTLE_META_EMPTY,
)

const mmr = computed(() => (isOwn.value ? battleStore.mmr : battleStore.currentOpponentMmr))

/** The pre-battle chance is one split between the two teams, so the enemy's
 *  share is simply the remainder — both plates show a real, matching number. */
const odds = computed(() => {
  const own = Math.round(battleStore.initialWinProbability * 100)
  return isOwn.value ? own : 100 - own
})

const lp = computed(() =>
  isOwn.value ? battleStore.currentRank.lp : battleStore.currentOpponentLp,
)

const cells = computed<MetaCell[]>(() => {
  const rankCell: MetaCell = {
    label: BATTLE_META_LABELS.rank,
    value: rank.value,
    text: true,
    compact: rank.value.length > BATTLE_META_RANK_COMPACT_LENGTH,
  }
  const lpCell: MetaCell = { label: BATTLE_META_LABELS.lp, value: `${lp.value}` }
  const mmrCell: MetaCell = {
    label: BATTLE_META_LABELS.mmr,
    value: mmr.value > 0 ? Math.round(mmr.value).toLocaleString('en-US') : BATTLE_META_EMPTY,
  }
  const oddsCell: MetaCell = { label: BATTLE_META_LABELS.odds, value: `${odds.value}%` }
  // Red mirrors the pairs within each row, so both plates read outward-in —
  // the rank always leads from the board's outer edge.
  return isOwn.value
    ? [rankCell, lpCell, mmrCell, oddsCell]
    : [lpCell, rankCell, oddsCell, mmrCell]
})
</script>

<style scoped>
/* Flat floating plate in the same language as the team cards above it — no
   wood frame, the board's HUD layer stays frameless. Its own size container,
   so all three cells scale off the panel instead of off the board: one height
   value drives eyebrow and number together. */
.meta-panel {
  /* positioned and sized by .meta in RiftBattleBoard — only `relative` here, so
     .meta-edge has an anchor. Re-declaring inset would over-constrain the box
     and silently override the board's bottom-corner placement. */
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(
    to var(--meta-dir, right),
    rgba(var(--team-rgb), 0.16),
    rgba(var(--team-scrim), 0.9) 62%
  );
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  container-type: size;
  --team-rgb: 96, 165, 250;
  --team-scrim: 7, 14, 30;
}
/* Mirrored like the team column: the rank leads from the board's outer edge */
.meta-panel--red {
  --team-rgb: 248, 113, 113;
  --team-scrim: 30, 8, 10;
  --meta-dir: left;
}

/* 2x2: two rows of two stats, both rows equal height */
.meta-grid {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
}

/* Team edge on the board side — same marker the champion cards carry */
.meta-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: clamp(2px, 3.5cqh, 4px);
  background: rgba(var(--team-rgb), 0.9);
}
.meta-panel--blue .meta-edge {
  left: 0;
}
.meta-panel--red .meta-edge {
  right: 0;
}

.meta-cell {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: clamp(1px, 2cqh, 4px);
  padding: 0 clamp(5px, 6cqh, 13px);
}
.meta-panel--red .meta-cell {
  align-items: flex-end;
}
/* Hairlines: one between the columns, one between the rows — drawn on the
   trailing cell of each pair so they never double up */
.meta-cell:nth-child(even) {
  border-left: 1px solid rgba(var(--team-rgb), 0.22);
}
.meta-panel--red .meta-cell:nth-child(even) {
  border-left: none;
  border-right: 1px solid rgba(var(--team-rgb), 0.22);
}
.meta-cell:nth-child(n + 3) {
  border-top: 1px solid rgba(var(--team-rgb), 0.22);
}

.meta-label {
  font-size: clamp(8px, 14cqh, 15px);
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  color: rgba(var(--team-rgb), 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* The numbers are the point of the panel — as large as the plate allows */
.meta-value {
  font-size: clamp(12px, 30cqh, 34px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.35), 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
/* Rank names keep the full size when they fit ("GOLD II") … */
.meta-value--text {
  font-size: clamp(11px, 26cqh, 30px);
  letter-spacing: 0.01em;
}
/* … and only the long ones step down, so nothing is ever clipped */
.meta-value--compact {
  font-size: clamp(9px, 20cqh, 22px);
}
</style>
