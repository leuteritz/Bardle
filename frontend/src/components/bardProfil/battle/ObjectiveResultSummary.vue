<template>
  <div class="obj-result" :class="verdictClass">
    <!-- ── Banner: what it was, who took it, how long it took ──────────────── -->
    <header class="res-banner">
      <img :src="objectiveImage" class="res-boss" :alt="objectiveName" />
      <div class="res-banner-text">
        <span class="res-obj-name">{{ objectiveName }}</span>
        <span class="res-verdict">{{ verdictLabel }}</span>
      </div>
      <div class="res-banner-meta">
        <span class="res-meta-chip">
          <Icon icon="lucide:timer" width="13" height="13" />
          {{ fightDurationText }}
        </span>
        <span class="res-meta-chip">
          <Icon icon="ph:gauge-fill" width="13" height="13" />
          {{ fmt(totalDps) }}/s
        </span>
      </div>
      <button class="res-close" title="Close summary" @click="battleStore.dismissObjectiveResult()">
        <Icon icon="lucide:x" width="16" height="16" />
      </button>
    </header>

    <!-- ── Win-chance swing: the actual consequence of the fight ───────────── -->
    <section class="res-swing">
      <div class="swing-row">
        <span class="swing-label">WIN CHANCE</span>
        <span class="swing-num swing-num--from">{{ probBefore }}%</span>
        <div class="swing-track">
          <div class="swing-base" :style="{ transform: `scaleX(${baseScale})` }" />
          <div
            class="swing-delta"
            :class="ownSecured ? 'swing-delta--gain' : 'swing-delta--loss'"
            :style="{ left: deltaLeft + '%', transform: `scaleX(${deltaScale})` }"
          />
        </div>
        <span class="swing-num swing-num--to">{{ probAfter }}%</span>
        <span class="swing-pill" :class="ownSecured ? 'swing-pill--gain' : 'swing-pill--loss'">
          {{ ownSecured ? '+' : '−' }}{{ gainedPercent }}%
        </span>
      </div>
      <!-- The buff rides with the objective, so it says plainly whose it is now. -->
      <div v-if="gainedEffect" class="swing-buff">
        <span class="buff-owner" :class="ownSecured ? 'buff-owner--own' : 'buff-owner--enemy'">
          {{ ownSecured ? 'YOUR TEAM GAINS' : 'ENEMY GAINS' }}
        </span>
        <span class="buff-text">{{ gainedEffect }}</span>
      </div>
    </section>

    <!-- ── Damage lead over time: where the fight was actually decided.
         Two cumulative totals would sit almost on top of each other; their
         DIFFERENCE around a zero line is what shows who led, by how much,
         and at which second it turned. ─────────────────────────────────── -->
    <section class="res-graph">
      <div class="res-sec-head">
        <span class="res-sec-title">DAMAGE LEAD</span>
        <span class="res-sec-note">
          <template v-if="leadChanges > 0">
            <Icon icon="ph:arrows-left-right-bold" width="12" height="12" />
            {{ leadChanges }} lead change{{ leadChanges === 1 ? '' : 's' }}
          </template>
          <template v-else>{{ wireToWire }}</template>
          <span class="res-sec-sep">·</span>
          peak {{ fmt(peakLead) }}
        </span>
      </div>
      <svg
        v-if="hasGraph"
        class="graph-svg"
        :viewBox="`0 0 ${GRAPH_W} ${GRAPH_H}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <!-- One fill for both halves: blue above the zero line, red below.
               userSpaceOnUse is essential — the default bounding-box units
               would anchor the flip to each path's own extent, so a purely
               positive lead would still get painted half red. -->
          <linearGradient
            id="objLeadFill"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="0"
            :y2="GRAPH_H"
          >
            <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.5" />
            <stop :offset="zeroOffset" stop-color="#60a5fa" stop-opacity="0.07" />
            <stop :offset="zeroOffset" stop-color="#f87171" stop-opacity="0.07" />
            <stop offset="100%" stop-color="#f87171" stop-opacity="0.45" />
          </linearGradient>
          <linearGradient
            id="objLeadStroke"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="0"
            :y2="GRAPH_H"
          >
            <stop offset="0%" stop-color="#60a5fa" />
            <stop :offset="zeroOffset" stop-color="#60a5fa" />
            <stop :offset="zeroOffset" stop-color="#f87171" />
            <stop offset="100%" stop-color="#f87171" />
          </linearGradient>
        </defs>
        <line
          v-for="g in gridLines"
          :key="'g' + g"
          class="graph-grid"
          x1="0"
          :y1="g"
          :x2="GRAPH_W"
          :y2="g"
        />
        <path class="graph-lead-area" :d="leadArea" />
        <line class="graph-zero" x1="0" :y1="midY" :x2="GRAPH_W" :y2="midY" />
        <path class="graph-lead-line" :d="leadLine" />
        <circle class="graph-dot" :class="ownSecured ? 'graph-dot--own' : 'graph-dot--enemy'" :cx="leadEnd.x" :cy="leadEnd.y" r="4" />
      </svg>
      <div v-else class="graph-empty">Fight ended too fast to chart</div>
      <div class="graph-legend">
        <span class="legend-item legend-item--own">
          <i class="legend-dot" />YOUR TEAM {{ fmt(ownDamage) }}
        </span>
        <span class="legend-split">{{ ownShare }}% / {{ 100 - ownShare }}%</span>
        <span class="legend-item legend-item--enemy">
          ENEMY {{ fmt(enemyDamage) }}<i class="legend-dot" />
        </span>
      </div>
    </section>

    <!-- ── Full scoreboard: every fighter, both sides ──────────────────────── -->
    <section class="res-boards">
      <div v-for="board in boards" :key="board.side" class="res-board" :class="`res-board--${board.side}`">
        <div class="board-head">
          <span class="board-title">{{ board.title }}</span>
          <span class="board-total">{{ fmt(board.total) }}</span>
        </div>
        <div v-for="row in board.rows" :key="row.f.idx" class="sb-row" :class="{ 'sb-row--out': row.out }">
          <div class="sb-portrait-wrap">
            <img :src="row.portrait" class="sb-portrait" :alt="row.f.name" />
            <span class="sb-role-dot" :style="{ background: row.roleColor }" />
            <span v-if="row.out" class="sb-out-mark">✕</span>
          </div>
          <div class="sb-body">
            <div class="sb-top">
              <span class="sb-name">{{ row.f.name }}</span>
              <span v-for="b in row.badges" :key="b.key" class="sb-badge" :title="b.title">
                <Icon :icon="b.icon" width="13" height="13" />
              </span>
              <span class="sb-dmg">{{ fmt(row.damage) }}</span>
            </div>
            <div class="sb-bar">
              <div class="sb-bar-fill" :style="{ transform: `scaleX(${row.share})` }" />
            </div>
            <!-- Labelled figures, not icons: at this size a game-icons glyph is
                 an unreadable smudge, and five of them per row across ten rows
                 would be fifty icon components mounting in the switch frame. -->
            <div class="sb-mini">
              <span v-for="m in row.mini" :key="m.key" class="sb-mini-item" :title="m.title">
                <span class="sb-mini-key">{{ m.label }}</span>{{ m.text }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Everything else worth knowing, one line ─────────────────────────── -->
    <footer class="res-chips">
      <span v-if="clickCount > 0" class="res-chip res-chip--gold">
        <Icon icon="ph:cursor-click-fill" width="12" height="12" />
        {{ clickCount }} clicks · {{ fmt(playerDamage) }} dmg · {{ playerShare }}% of your team
      </span>
      <span v-else class="res-chip res-chip--idle">
        <Icon icon="ph:cursor-click-fill" width="12" height="12" />
        No clicks — the pit is worth tapping
      </span>
      <span v-if="downsCount > 0" class="res-chip res-chip--red">
        <Icon icon="ph:skull-fill" width="12" height="12" />
        {{ downsCount }} down
      </span>
      <span v-if="curseTotal > 0" class="res-chip res-chip--purple">
        <Icon icon="ph:star-four-fill" width="12" height="12" />
        {{ fmt(curseTotal) }} hex
      </span>
      <span class="res-chip">
        <Icon icon="ph:gauge-fill" width="12" height="12" />
        peak {{ fmt(Math.round(peakDps.own)) }}/s vs {{ fmt(Math.round(peakDps.enemy)) }}/s
      </span>
    </footer>

    <!-- Drains over the summary display time — shows how long the stats stay -->
    <div class="res-timer">
      <div class="res-timer-fill" :style="{ animationDuration: OBJECTIVE_RESULT_DELAY_MS + 'ms' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ObjectiveFighter } from '@/types'
import { useBattleStore } from '@/stores/battle/battleStore'
import {
  OBJECTIVE_RESULT_DELAY_MS,
  OBJECTIVE_BARON_WIN_BONUS,
  OBJECTIVE_FIGHT_STATUS,
  OBJECTIVE_GRAPH_VIEW_W,
  OBJECTIVE_GRAPH_VIEW_H,
  OBJECTIVE_GRAPH_PAD_X,
  OBJECTIVE_GRAPH_PAD_TOP,
  OBJECTIVE_GRAPH_PAD_BOTTOM,
  OBJECTIVE_GRAPH_GRID_LINES,
  OBJECTIVE_RESULT_MAX_BADGES_PER_ROW,
  ROLE_BY_KEY,
} from '@/config/constants'
import { DRAKE_TYPES, BARON_BUFF } from '@/config/battle/drakes'

const battleStore = useBattleStore()

const GRAPH_W = OBJECTIVE_GRAPH_VIEW_W
const GRAPH_H = OBJECTIVE_GRAPH_VIEW_H

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

const isDrake = computed(() => battleStore.activeObjective === 'drake')
const drakeDef = computed(() => DRAKE_TYPES[battleStore.activeDrakeType ?? 'infernal'])

const objectiveName = computed(() =>
  isDrake.value ? drakeDef.value.label.toUpperCase() : 'BARON NASHOR',
)
const objectiveImage = computed(() =>
  isDrake.value ? OBJECTIVE_FIGHT_STATUS.drake.image : OBJECTIVE_FIGHT_STATUS.baron.image,
)

const ownSecured = computed(
  () => battleStore.objectiveResult === 'own' || battleStore.objectiveResult === 'player',
)

const verdictLabel = computed(() => {
  const r = battleStore.objectiveResult
  if (r === 'player') return 'SECURED BY YOUR CLICKS'
  if (r === 'own') return 'SECURED BY YOUR TEAM'
  return 'LOST TO THE ENEMY'
})

const verdictClass = computed(() => {
  const r = battleStore.objectiveResult
  if (r === 'player') return 'obj-result--player'
  if (r === 'own') return 'obj-result--own'
  return 'obj-result--enemy'
})

// ── Raw fight figures ───────────────────────────────────────────────────────
const ownDamage = computed(() => battleStore.objectiveOwnDamage)
const enemyDamage = computed(() => battleStore.objectiveEnemyDamage)
const playerDamage = computed(() => battleStore.objectivePlayerDamage)
const clickCount = computed(() => battleStore.objectiveClickCount)
const leadChanges = computed(() => battleStore.objectiveLeadChanges)
const peakDps = computed(() => battleStore.objectivePeakDps)
const curseTotal = computed(
  () => battleStore.objectiveCurseDamage.own + battleStore.objectiveCurseDamage.enemy,
)

const fightDurationSec = computed(() => battleStore.objectiveFightDurationMs / 1000)
const fightDurationText = computed(() => fightDurationSec.value.toFixed(1) + 's')
const totalDps = computed(() => {
  if (fightDurationSec.value <= 0) return 0
  return (ownDamage.value + enemyDamage.value) / fightDurationSec.value
})

const ownShare = computed(() => {
  const total = ownDamage.value + enemyDamage.value
  if (total === 0) return 50
  return Math.round((ownDamage.value / total) * 100)
})
const playerShare = computed(() => {
  if (ownDamage.value === 0) return 0
  return Math.min(100, Math.round((playerDamage.value / ownDamage.value) * 100))
})

/** Nobody ever caught up — the alternative headline when the lead never moved. */
const wireToWire = computed(() => (ownShare.value >= 50 ? 'Led wire to wire' : 'Behind throughout'))

const fightersAll = computed(() => [
  ...(battleStore.objectiveFighters?.t1 ?? []),
  ...(battleStore.objectiveFighters?.t2 ?? []),
])
const downsCount = computed(() => fightersAll.value.filter((f) => f.down).length)

// ── Win-chance swing ────────────────────────────────────────────────────────
/** Applied swing when available (interactive fight); nominal value on scripted results. */
const gainedPercent = computed(() => {
  const nominal = isDrake.value ? drakeDef.value.winDelta : OBJECTIVE_BARON_WIN_BONUS
  const d = battleStore.objectiveWinDelta !== 0 ? Math.abs(battleStore.objectiveWinDelta) : nominal
  return Math.round(d * 100)
})
const gainedEffect = computed(() =>
  isDrake.value ? drakeDef.value.effectText : BARON_BUFF.effectText,
)

const probAfter = computed(() => Math.round(battleStore.currentWinProbability * 100))
/**
 * The swing is already applied to currentWinProbability when the summary opens,
 * so "before" is reconstructed from the delta. A scripted result carries no
 * delta — then both ends read the same and only the flat bar shows.
 */
const probBefore = computed(() =>
  Math.round((battleStore.currentWinProbability - battleStore.objectiveWinDelta) * 100),
)
/** Unchanged part of the bar (0–1 scaleX), then the gained/lost slice on top of it. */
const baseScale = computed(() => Math.min(probBefore.value, probAfter.value) / 100)
const deltaLeft = computed(() => Math.min(probBefore.value, probAfter.value))
const deltaScale = computed(() => Math.abs(probAfter.value - probBefore.value) / 100)

// ── Damage-race graph ───────────────────────────────────────────────────────
const track = computed(() => battleStore.objectiveDamageTrack)
const hasGraph = computed(() => track.value.length >= 2)

const gridLines = computed(() => {
  const usable = GRAPH_H - OBJECTIVE_GRAPH_PAD_TOP - OBJECTIVE_GRAPH_PAD_BOTTOM
  return Array.from(
    { length: OBJECTIVE_GRAPH_GRID_LINES },
    (_, i) => OBJECTIVE_GRAPH_PAD_TOP + (usable / OBJECTIVE_GRAPH_GRID_LINES) * (i + 1),
  )
})

interface Pt {
  x: number
  y: number
}

/** The zero line the lead curve swings around. */
const midY = computed(
  () => OBJECTIVE_GRAPH_PAD_TOP + (GRAPH_H - OBJECTIVE_GRAPH_PAD_TOP - OBJECTIVE_GRAPH_PAD_BOTTOM) / 2,
)

/** Largest advantage either side ever held — also the graph's vertical scale. */
const peakLead = computed(() =>
  track.value.reduce((m, s) => Math.max(m, Math.abs(s.own - s.enemy)), 0),
)

/** Where the zero line sits as a 0–1 fraction — the gradients flip exactly there. */
const zeroOffset = computed(() => (midY.value / GRAPH_H).toFixed(4))

const leadPts = computed<Pt[]>(() => {
  const samples = track.value
  if (samples.length === 0) return []
  const lastT = samples[samples.length - 1].t || 1
  // Scale to the biggest swing so a close fight still reads as a close fight —
  // a fixed scale would flatten every one of them into a straight line.
  const peak = Math.max(peakLead.value, 1)
  const usableW = GRAPH_W - OBJECTIVE_GRAPH_PAD_X * 2
  const halfH = (GRAPH_H - OBJECTIVE_GRAPH_PAD_TOP - OBJECTIVE_GRAPH_PAD_BOTTOM) / 2
  // Implicit 0/0 origin: the first stored sample sits half a second in, and
  // without it the curve would start floating in mid-air off the left edge.
  const pts: Pt[] = [{ x: OBJECTIVE_GRAPH_PAD_X, y: midY.value }]
  for (const s of samples) {
    pts.push({
      x: OBJECTIVE_GRAPH_PAD_X + (s.t / lastT) * usableW,
      y: midY.value - ((s.own - s.enemy) / peak) * halfH,
    })
  }
  return pts
})

function toLine(pts: Pt[]): string {
  if (pts.length === 0) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

const leadLine = computed(() => toLine(leadPts.value))
/** Filled back along the zero line, so the gradient paints above/below it. */
const leadArea = computed(() => {
  const pts = leadPts.value
  if (pts.length === 0) return ''
  const m = midY.value
  return `${toLine(pts)} L ${pts[pts.length - 1].x.toFixed(1)},${m} L ${pts[0].x.toFixed(1)},${m} Z`
})

const leadEnd = computed<Pt>(
  () => leadPts.value[leadPts.value.length - 1] ?? { x: 0, y: midY.value },
)

// ── Scoreboard ──────────────────────────────────────────────────────────────
interface RowBadge {
  key: string
  icon: string
  title: string
}
interface RowMini {
  key: string
  label: string
  text: string
  title: string
}
interface BoardRow {
  f: ObjectiveFighter
  portrait: string
  roleColor: string
  damage: number
  /** Share of the side's total damage (0–1) — drives the bar's scaleX */
  share: number
  out: boolean
  badges: RowBadge[]
  mini: RowMini[]
}

/**
 * Award badges are decided per side, so both boards can crown their own best.
 * Whoever holds a side-wide maximum that is actually greater than zero earns it;
 * a row shows at most OBJECTIVE_RESULT_MAX_BADGES_PER_ROW so the name stays readable.
 */
function badgeMapFor(fighters: ObjectiveFighter[]): Record<number, RowBadge[]> {
  const map: Record<number, RowBadge[]> = {}
  const add = (idx: number, badge: RowBadge) => {
    ;(map[idx] ??= []).push(badge)
  }
  const best = (pick: (f: ObjectiveFighter) => number): ObjectiveFighter | null => {
    const pool = fighters.filter((f) => pick(f) > 0)
    if (pool.length === 0) return null
    return pool.reduce((b, f) => (pick(f) > pick(b) ? f : b))
  }

  const mvp = best((f) => f.damage)
  if (mvp) add(mvp.idx, { key: 'mvp', icon: 'ph:crown-fill', title: 'Top damage' })
  const wall = best((f) => f.damageDiverted)
  if (wall) add(wall.idx, { key: 'wall', icon: 'ph:shield-fill', title: 'Pulled the most damage off the pit' })
  const medic = best((f) => f.healingDone)
  if (medic) add(medic.idx, { key: 'medic', icon: 'ph:first-aid-kit-fill', title: 'Most healing' })
  const tank = best((f) => f.damageTaken)
  if (tank) add(tank.idx, { key: 'tank', icon: 'ph:heart-break-fill', title: 'Most punished' })

  for (const idx of Object.keys(map)) {
    map[Number(idx)] = map[Number(idx)].slice(0, OBJECTIVE_RESULT_MAX_BADGES_PER_ROW)
  }
  return map
}

/** Only non-zero figures make the mini row — an all-zero row would read as noise. */
function miniFor(f: ObjectiveFighter): RowMini[] {
  const out: RowMini[] = []
  if (f.damageTaken > 0) {
    out.push({
      key: 'taken',
      label: 'TAKEN',
      text: fmt(f.damageTaken),
      title: 'Fight damage taken (boss AoE + being challenged)',
    })
  }
  if (f.damageDiverted > 0) {
    out.push({
      key: 'pulled',
      label: 'PULLED',
      text: fmt(f.damageDiverted),
      title: 'Enemy damage pulled off the pit by Challenge',
    })
  }
  if (f.healingDone > 0) {
    out.push({
      key: 'heal',
      label: 'HEAL',
      text: fmt(f.healingDone),
      title: 'Fight HP restored to allies',
    })
  }
  if (f.casts > 0) {
    out.push({
      key: 'casts',
      label: 'CASTS',
      text: String(f.casts),
      title: 'Ability windows opened',
    })
  }
  if (f.alive && !f.down && f.fightMaxHp > 0) {
    out.push({
      key: 'hp',
      label: 'HP',
      text: Math.round((f.fightHp / f.fightMaxHp) * 100) + '%',
      title: 'HP left at the end of the fight',
    })
  }
  return out
}

function buildRows(fighters: ObjectiveFighter[], team: 1 | 2): BoardRow[] {
  const badges = badgeMapFor(fighters)
  const peak = fighters.reduce((m, f) => Math.max(m, f.damage), 0)
  return [...fighters]
    .sort((a, b) => b.damage - a.damage)
    .map((f) => ({
      f,
      // 'md' matches the fighter cards of the fight that just ended: the row is
      // only 32px, but taking 'sm' would fetch and decode the same ten portraits
      // a second time in the very frame the summary mounts (art-variant rule 6).
      portrait: battleStore.getChampionImage(f.name, { team, size: 'md' }),
      roleColor: ROLE_BY_KEY[f.role].color,
      damage: f.damage,
      // Scaled against the side's best row, not the side total — five rows
      // splitting one total would leave every bar a stub.
      share: peak > 0 ? f.damage / peak : 0,
      out: !f.alive || f.down,
      badges: badges[f.idx] ?? [],
      mini: miniFor(f),
    }))
}

const boards = computed(() => [
  {
    side: 'own' as const,
    title: 'YOUR TEAM',
    total: ownDamage.value,
    rows: buildRows(battleStore.objectiveFighters?.t1 ?? [], 1),
  },
  {
    side: 'enemy' as const,
    title: 'ENEMY TEAM',
    total: enemyDamage.value,
    rows: buildRows(battleStore.objectiveFighters?.t2 ?? [], 2),
  },
])
</script>

<style scoped>
/* The result replaces the fight inside the same modal shell: the arena is
   unmounted while this is up, so nothing animates behind it. */
.obj-result {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 0 14px;
  animation: res-in 0.28s ease both;
}

/* ── Banner ──────────────────────────────────────────────────────────────── */
.res-banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 46px 9px 16px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.res-boss {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}
.res-banner-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.res-obj-name {
  font-size: 13px;
  letter-spacing: 0.18em;
  color: var(--obj-color, #e8c040);
  white-space: nowrap;
}
.res-verdict {
  font-size: 27px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.05;
  white-space: nowrap;
}
.obj-result--player .res-verdict {
  color: #e8c040;
  text-shadow: 0 0 22px rgba(232, 192, 64, 0.75);
}
.obj-result--own .res-verdict {
  color: #60a5fa;
  text-shadow: 0 0 22px rgba(96, 165, 250, 0.7);
}
.obj-result--enemy .res-verdict {
  color: #f87171;
  text-shadow: 0 0 22px rgba(248, 113, 113, 0.7);
}

.res-banner-meta {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.res-meta-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  font-size: 12px;
  color: #c0b090;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.res-close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0b090;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
  cursor: pointer;
}
.res-close:hover {
  color: #e07060;
  border-color: #cc6050;
}

/* ── Win-chance swing ────────────────────────────────────────────────────── */
.res-swing {
  margin: 0 14px;
  padding: 7px 12px 6px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.swing-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.swing-label {
  font-size: 10px;
  letter-spacing: 0.16em;
  color: #8a8070;
  white-space: nowrap;
}
.swing-num {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: #a09060;
  min-width: 34px;
  text-align: right;
}
.swing-num--to {
  color: #e8c040;
  text-align: left;
}
.swing-track {
  position: relative;
  flex: 1;
  height: 10px;
  background: #0c0b06;
  border: 1px solid #3e200a;
  border-radius: 3px;
  overflow: hidden;
}
/* Both fills are laid out full-width and scaled — no per-value width in px. */
.swing-base,
.swing-delta {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  transform-origin: left center;
}
.swing-base {
  background: linear-gradient(to bottom, #4a5a70, #2e3a4a);
}
.swing-delta--gain {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
}
.swing-delta--loss {
  background: linear-gradient(to bottom, #cc6050, #7a2818);
}
.swing-pill {
  padding: 3px 10px;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.swing-pill--gain {
  color: #8ee060;
  border-color: #2e6018;
  background: rgba(46, 96, 24, 0.2);
}
.swing-pill--loss {
  color: #f08070;
  border-color: #7a3020;
  background: rgba(122, 48, 32, 0.2);
}
.swing-buff {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid #2a2418;
}
.buff-owner {
  font-size: 10px;
  letter-spacing: 0.14em;
  white-space: nowrap;
  flex-shrink: 0;
}
.buff-owner--own {
  color: #60a5fa;
}
.buff-owner--enemy {
  color: #f87171;
}
.buff-text {
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--obj-color, #e8c040);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Graph ───────────────────────────────────────────────────────────────── */
.res-graph {
  margin: 0 14px;
  padding: 6px 10px 7px;
  background: #1a1008;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.res-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}
.res-sec-title {
  font-size: 10px;
  letter-spacing: 0.16em;
  color: #8a8070;
}
.res-sec-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #a09060;
  font-variant-numeric: tabular-nums;
}
.res-sec-sep {
  color: #5c4a28;
}
.graph-svg {
  display: block;
  width: 100%;
  height: 92px;
}
.graph-empty {
  height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #6a6050;
}
.graph-grid {
  stroke: #2a2418;
  stroke-width: 1;
}
.graph-lead-area {
  stroke: none;
  fill: url(#objLeadFill);
}
/* The zero line is the reading aid: above it you led, below it you trailed. */
.graph-zero {
  stroke: #7a6030;
  stroke-width: 1;
  stroke-dasharray: 5 4;
}
.graph-lead-line {
  fill: none;
  stroke: url(#objLeadStroke);
  stroke-width: 2.5;
  stroke-linejoin: round;
  /* vector-effect keeps the stroke even under the non-uniform viewBox stretch */
  vector-effect: non-scaling-stroke;
}
.graph-dot--own {
  fill: #60a5fa;
}
.graph-dot--enemy {
  fill: #f87171;
}

.graph-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend-item--own {
  color: #60a5fa;
}
.legend-item--enemy {
  color: #f87171;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.legend-split {
  font-size: 12px;
  color: #a09060;
  letter-spacing: 0.06em;
}

/* ── Scoreboards ─────────────────────────────────────────────────────────── */
.res-boards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0 14px;
}
.res-board {
  padding: 6px 8px 7px;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.res-board--own {
  border-left: 3px solid #3b6ea5;
}
.res-board--enemy {
  border-right: 3px solid #a54040;
}
.board-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 4px;
  margin-bottom: 3px;
  border-bottom: 1px solid #2a2418;
}
.board-title {
  font-size: 10px;
  letter-spacing: 0.16em;
}
.res-board--own .board-title {
  color: #60a5fa;
}
.res-board--enemy .board-title {
  color: #f87171;
}
.board-total {
  font-size: 15px;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.sb-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 0;
}
.sb-row--out {
  opacity: 0.5;
  filter: grayscale(55%);
}

.sb-portrait-wrap {
  position: relative;
  flex-shrink: 0;
}
.sb-portrait {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #3e200a;
}
.sb-role-dot {
  position: absolute;
  left: -1px;
  bottom: -1px;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  border: 1px solid #111008;
}
.sb-out-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #f08070;
  background: rgba(10, 8, 6, 0.55);
  border-radius: 4px;
}

.sb-body {
  flex: 1;
  min-width: 0;
}
.sb-top {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sb-name {
  font-size: 12px;
  color: #d0c0a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: #e8c040;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 3px;
}
.sb-dmg {
  margin-left: auto;
  padding-left: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.sb-bar {
  height: 4px;
  margin: 2px 0;
  background: #0c0b06;
  border-radius: 2px;
  overflow: hidden;
}
.sb-bar-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
}
.res-board--own .sb-bar-fill {
  background: linear-gradient(to right, #2f5f96, #60a5fa);
}
.res-board--enemy .sb-bar-fill {
  background: linear-gradient(to right, #8a3030, #f87171);
}

.sb-mini {
  display: flex;
  flex-wrap: nowrap;
  gap: 7px;
  overflow: hidden;
}
.sb-mini-item {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: 11px;
  color: #b0a488;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* The label recedes so the eye lands on the number. */
.sb-mini-key {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #7a7060;
}

/* ── Chip footer ─────────────────────────────────────────────────────────── */
.res-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 0 14px;
}
.res-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #a09060;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.res-chip--gold {
  color: #e8c040;
}
.res-chip--red {
  color: #f08070;
}
.res-chip--purple {
  color: #c9a0f5;
}
.res-chip--idle {
  color: #6a6050;
}

/* ── Auto-close countdown ────────────────────────────────────────────────── */
.res-timer {
  height: 4px;
  margin: 2px 14px 0;
  background: #0c0b06;
  border-radius: 2px;
  overflow: hidden;
}
/* scaleX, never width: a width keyframe relayouts the bar on every frame
   for the whole display time (Performance rule 1). */
.res-timer-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #c89040, #e8c060);
  animation: res-drain linear forwards;
}

@keyframes res-in {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes res-drain {
  0% {
    transform: scaleX(1);
  }
  100% {
    transform: scaleX(0);
  }
}

/* Full HD is the flattest viewport — trim the tall blocks so the whole
   summary still fits the board without the modal scaling itself tiny. */
@media (max-height: 1100px) {
  .res-boss {
    width: 40px;
    height: 40px;
  }
  .res-verdict {
    font-size: 23px;
  }
  .graph-svg,
  .graph-empty {
    height: 74px;
  }
  .sb-portrait {
    width: 28px;
    height: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .obj-result,
  .res-timer-fill {
    animation: none !important;
  }
}
</style>
