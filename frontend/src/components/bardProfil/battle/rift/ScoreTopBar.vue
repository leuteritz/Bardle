<template>
  <div
    class="score-bar score-bar--clickable"
    title="View career stats"
    @click="battleStore.isViewingLanding = true"
  >
    <!-- Blue side -->
    <div class="side side--blue">
      <div class="side-stats">
        <span class="stat stat--obj" title="Turrets destroyed"><Icon icon="game-icons:watchtower" width="17" height="17" class="stat-icon" /> {{ battleStore.team1Turrets }}</span>
        <span class="stat stat--obj" title="Inhibitors destroyed"><Icon icon="game-icons:floating-crystal" width="17" height="17" class="stat-icon stat-icon--inhib" /> {{ battleStore.team1Inhibs }}</span>
        <span class="stat stat--obj" title="Drakes secured"><img src="/img/dragon.png" alt="Drakes" class="stat-img" /> {{ battleStore.team1Drakes }}</span>
        <span class="stat stat--obj" title="Barons secured"><img src="/img/baron.png" alt="Barons" class="stat-img" /> {{ battleStore.team1Barons }}</span>
        <span class="stat-divider" />
        <span class="stat stat--cs" title="Team creep score"><Icon icon="game-icons:minions" width="17" height="17" class="stat-icon stat-icon--cs" /> {{ formatNumber(team1CS) }}</span>
        <span class="stat stat--dmg" title="Total damage dealt"><Icon icon="game-icons:sabers-choc" width="17" height="17" class="stat-icon stat-icon--dmg" /> {{ formatNumber(team1Damage) }}</span>
        <span class="stat-divider" />
        <span class="stat stat--gold"><img src="/img/BardGold.png" alt="Gold" class="stat-img stat-img--gold" /> {{ formatNumber(battleStore.team1Gold) }}</span>
        <span class="stat-divider" />
        <span class="stat stat--level">Lv {{ battleStore.team1AvgLevel }}</span>
        <span class="alive-pips" title="Champions alive">
          <span
            v-for="(alive, i) in team1Alive"
            :key="i"
            class="pip pip--blue"
            :class="{ 'pip--dead': !alive }"
          />
        </span>
      </div>
    </div>

    <!-- Center: kills + timer -->
    <div class="center">
      <span class="kills kills--blue">{{ battleStore.team1Kills }}</span>
      <div class="timer-block">
        <div class="timer-eyebrow">GAME TIME</div>
        <div class="timer-value">{{ battleStore.formatTime(battleStore.battleTime) }}</div>
      </div>
      <span class="kills kills--red">{{ battleStore.team2Kills }}</span>
    </div>

    <!-- Red side -->
    <div class="side side--red">
      <div class="side-stats side-stats--red">
        <span class="alive-pips" title="Champions alive">
          <span
            v-for="(alive, i) in team2Alive"
            :key="i"
            class="pip pip--red"
            :class="{ 'pip--dead': !alive }"
          />
        </span>
        <span class="stat stat--level">Lv {{ battleStore.team2AvgLevel }}</span>
        <span class="stat-divider" />
        <span class="stat stat--gold">{{ formatNumber(battleStore.team2Gold) }} <img src="/img/BardGold.png" alt="Gold" class="stat-img stat-img--gold" /></span>
        <span class="stat-divider" />
        <span class="stat stat--dmg" title="Total damage dealt">{{ formatNumber(team2Damage) }} <Icon icon="game-icons:sabers-choc" width="17" height="17" class="stat-icon stat-icon--dmg" /></span>
        <span class="stat stat--cs" title="Team creep score">{{ formatNumber(team2CS) }} <Icon icon="game-icons:minions" width="17" height="17" class="stat-icon stat-icon--cs" /></span>
        <span class="stat-divider" />
        <span class="stat stat--obj" title="Barons secured">{{ battleStore.team2Barons }} <img src="/img/baron.png" alt="Barons" class="stat-img" /></span>
        <span class="stat stat--obj" title="Drakes secured">{{ battleStore.team2Drakes }} <img src="/img/dragon.png" alt="Drakes" class="stat-img" /></span>
        <span class="stat stat--obj" title="Inhibitors destroyed">{{ battleStore.team2Inhibs }} <Icon icon="game-icons:floating-crystal" width="17" height="17" class="stat-icon stat-icon--inhib" /></span>
        <span class="stat stat--obj" title="Turrets destroyed">{{ battleStore.team2Turrets }} <Icon icon="game-icons:watchtower" width="17" height="17" class="stat-icon" /></span>
      </div>
    </div>
  </div>

  <!-- Live victory momentum meter — presentation escalates with dominance:
       neutral around 50/50, the leading team's side lights up in tiers -->
  <div class="momentum-meter" :class="meterClasses">
    <div class="momentum-row">
      <div class="momentum-pct momentum-pct--blue">
        <span class="momentum-pct-value">{{ bluePercent }}%</span>
      </div>
      <div class="momentum-track">
        <div class="momentum-fill momentum-fill--blue" :style="{ width: bluePercent + '%' }" />
        <div class="momentum-fill momentum-fill--red" :style="{ width: 100 - bluePercent + '%' }" />
        <div class="momentum-center-tick" />
        <span class="momentum-marker" :style="{ left: bluePercent + '%' }">◆</span>
        <span
          v-if="lastDelta > 0"
          :key="deltaKey"
          class="momentum-delta momentum-delta--blue"
        >▲ +{{ lastDelta }}%</span>
        <span
          v-if="lastDelta < 0"
          :key="deltaKey"
          class="momentum-delta momentum-delta--red"
        >▲ +{{ -lastDelta }}%</span>
      </div>
      <div class="momentum-pct momentum-pct--red">
        <span class="momentum-pct-value">{{ 100 - bluePercent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import {
  MOMENTUM_HIGH_THRESHOLD,
  MOMENTUM_NEUTRAL_BAND,
  MOMENTUM_CRUSHING_THRESHOLD,
  MOMENTUM_DELTA_CHIP_MS,
} from '@/config/constants'

const battleStore = useBattleStore()
const bluePercent = computed(() => Math.round(battleStore.liveWinMomentum * 100))

/* Live team aggregates for the score bar */
const team1CS = computed(() => battleStore.team1.reduce((s, c) => s + c.cs, 0))
const team2CS = computed(() => battleStore.team2.reduce((s, c) => s + c.cs, 0))
const team1Damage = computed(() => battleStore.team1.reduce((s, c) => s + c.damage, 0))
const team2Damage = computed(() => battleStore.team2.reduce((s, c) => s + c.damage, 0))
const team1Alive = computed(() =>
  battleStore.team1.filter((c) => c.name).map((c) => c.respawnState === 'alive'),
)
const team2Alive = computed(() =>
  battleStore.team2.filter((c) => c.name).map((c) => c.respawnState === 'alive'),
)

/* Dominance tiers drive the meter's visual escalation:
   0 = neutral (within ±band of 50), 1 = leaning, 2 = dominant, 3 = crushing */
const leadPercent = computed(() => Math.max(bluePercent.value, 100 - bluePercent.value))
const leader = computed<'blue' | 'red' | null>(() => {
  if (leadPercent.value <= 50 + MOMENTUM_NEUTRAL_BAND * 100) return null
  return bluePercent.value > 50 ? 'blue' : 'red'
})
const dominanceTier = computed(() => {
  if (!leader.value) return 0
  if (leadPercent.value >= MOMENTUM_CRUSHING_THRESHOLD * 100) return 3
  if (leadPercent.value >= MOMENTUM_HIGH_THRESHOLD * 100) return 2
  return 1
})
const meterClasses = computed(() => ({
  'is-shifting': isShifting.value,
  [`lead-${leader.value}`]: leader.value !== null,
  [`tier-${dominanceTier.value}`]: dominanceTier.value > 0,
}))

const lastDelta = ref(0)
const deltaKey = ref(0)
const isShifting = ref(false)
let chipTimer: ReturnType<typeof setTimeout> | null = null

watch(bluePercent, (next, prev) => {
  const delta = next - prev
  if (delta === 0) return
  lastDelta.value = delta
  deltaKey.value += 1
  isShifting.value = true
  if (chipTimer) clearTimeout(chipTimer)
  chipTimer = setTimeout(() => {
    lastDelta.value = 0
    isShifting.value = false
  }, MOMENTUM_DELTA_CHIP_MS)
})
</script>

<style scoped>
/* Fluid sizing (cq units against .rift-board): the bar shrinks gently on small
   desktops and caps at the original design size on large ones. */
.score-bar {
  display: flex;
  align-items: stretch;
  height: clamp(36px, 6cqh, 48px);
  flex-shrink: 0;
  border-bottom: 2px solid #3e200a;
  background: #0d0c08;
}

.score-bar--clickable {
  cursor: pointer;
  transition: filter 0.15s;
}
.score-bar--clickable:hover {
  filter: brightness(1.25);
}

/* Team names dropped — each side is a single stats row hugging the center
   (blue right-aligned, red left-aligned) so both rows mirror around the
   kills block. */
.side {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 clamp(10px, 1.5cqw, 18px);
  min-width: 0;
}
.side--blue {
  justify-content: flex-end;
  background: linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.03));
}
.side--red {
  justify-content: flex-start;
  background: linear-gradient(to left, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.03));
}

.side-stats {
  display: flex;
  align-items: center;
  /* fill the whole half: stats spread edge to edge, the gap is only the
     minimum spacing — extra width turns into even breathing room */
  width: 100%;
  justify-content: space-between;
  gap: clamp(6px, 1.2cqw, 10px);
  font-size: clamp(13px, 1.3cqw, 15px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #a8c4e8;
  /* MedievalSharp metric fix — digits sit high in their em box */
  transform: translateY(0.08em);
}
.side-stats--red {
  color: #e8b0b0;
}

/* Fixed slot widths per stat type — growing values never push neighbors.
   Blue side anchors content left (icon first), red side anchors right. */
.stat {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  flex-shrink: 0;
  justify-content: flex-start;
}
.side-stats--red .stat {
  justify-content: flex-end;
}
/* slot widths grow with the container so the larger icons always fit,
   but stay fixed at any given size — values changing never shift the row */
.stat--obj { width: clamp(42px, 3.7cqw, 46px); }
.stat--cs { width: clamp(56px, 4.8cqw, 58px); }
.stat--dmg { width: clamp(60px, 5.3cqw, 66px); }
.stat--gold {
  width: clamp(66px, 5.8cqw, 76px);
  color: #e8c040;
  font-size: clamp(14px, 1.4cqw, 17px);
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.35);
}
.stat--level {
  width: 46px;
  color: #e8e2d0;
}

.stat-divider {
  width: 2px;
  height: clamp(16px, 3.2cqh, 22px);
  border-radius: 1px;
  /* soft-edged gold-brown blade — clearly visible, still subordinate to the stats */
  background: linear-gradient(to bottom, transparent, #8a5c22 25%, #c89040 50%, #8a5c22 75%, transparent);
  flex-shrink: 0;
  align-self: center;
  /* cancel the parent's baseline nudge — without this the bar sits lower than
     its siblings and reads as a "different" divider next to tall content */
  transform: translateY(-0.08em);
}

/* Icons & images share one identical, immutable box — big and readable,
   scaling with the bar height (cqh) so they never outgrow the row. As flex
   children they would otherwise get squeezed when the number next to them
   grows, hence the hard flex-shrink lock. */
.stat-icon,
.stat-img {
  width: clamp(19px, 3.8cqh, 26px);
  height: clamp(19px, 3.8cqh, 26px);
  flex-shrink: 0;
  /* Cancel the digit-baseline nudge of .side-stats (same trick as .alive-pips)
     so icons sit on the same optical centerline as the text next to them */
  transform: translateY(-0.08em);
}
.stat-icon { opacity: 0.85; }
.stat-icon--inhib { color: #e884d8; }
.stat-icon--cs { color: #b0a878; }
.stat-icon--dmg { color: #e08850; }

/* Alive pips — same skewed-bar shape as the objective-fight modal's
   alive strip, in team colors; dimmed while the champion is dead */
.alive-pips {
  display: flex;
  align-items: center;
  gap: 3px;
  /* Cancel the digit-baseline nudge of .side-stats for the bars */
  transform: translateY(-0.08em);
}
.pip {
  width: clamp(8px, 1cqw, 12px);
  height: clamp(4px, 0.9cqh, 6px);
  border-radius: 1px;
  transform: skewX(-18deg);
  transition:
    background 0.4s ease,
    box-shadow 0.4s ease;
}
.pip--blue {
  background: linear-gradient(to bottom, #60a5fa, #2563eb);
  box-shadow: 0 0 4px rgba(59, 130, 246, 0.6);
}
.pip--red {
  background: linear-gradient(to bottom, #f87171, #b91c1c);
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.6);
}
.pip--dead {
  background: #3a382e;
  box-shadow: none;
}
.stat-img {
  border-radius: 50%;
  object-fit: cover;
}
.stat-img--gold {
  border-radius: 0;
  object-fit: contain;
}

.center {
  display: flex;
  align-items: center;
  gap: clamp(9px, 1.1cqw, 14px);
  padding: 0 clamp(12px, 1.7cqw, 22px);
  background: #0d0c08;
  border-left: 2px solid #3e200a;
  border-right: 2px solid #3e200a;
  flex-shrink: 0;
}

.kills {
  font-size: clamp(22px, 4.4cqh, 30px);
  font-weight: 700;
  line-height: 1;
  min-width: clamp(30px, 5.4cqh, 40px);
  text-align: center;
  /* Same MedievalSharp metric fix as the momentum values: digits render high
     in their em box, nudge down for equal space above and below */
  transform: translateY(0.1em);
}
.kills--blue { color: #93c5fd; }
.kills--red { color: #fca5a5; }

.timer-block {
  text-align: center;
}
.timer-eyebrow {
  font-size: 8px;
  letter-spacing: 2.5px;
  line-height: 1;
  color: #8a7430;
}
.timer-value {
  font-size: clamp(15px, 2.9cqh, 20px);
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
}

/* ── Compact modes: on narrow boards every stat stays visible — fonts,
   icons, slots and gaps step down together instead of overflowing ── */
@container board (max-width: 1600px) {
  .side { padding: 0 8px; }
  .side-stats {
    font-size: 11px;
    gap: 5px;
  }
  .stat-icon,
  .stat-img { width: 16px; height: 16px; }
  .stat-divider { height: 12px; }
  .stat--obj { width: 34px; }
  .stat--cs { width: 46px; }
  .stat--dmg { width: 52px; }
  .stat--gold { width: 58px; font-size: 12px; }
  .stat--level { width: 38px; }
  .pip { width: 9px; height: 5px; }
  .alive-pips { gap: 2px; }
}

@container board (max-width: 1150px) {
  .side { padding: 0 5px; }
  .side-stats {
    font-size: 9.5px;
    gap: 3px;
  }
  .stat { gap: 3px; }
  .stat-icon,
  .stat-img { width: 13px; height: 13px; }
  .stat-divider { height: 10px; }
  .stat--obj { width: 26px; }
  .stat--cs { width: 36px; }
  .stat--dmg { width: 42px; }
  .stat--gold { width: 48px; font-size: 10.5px; }
  .stat--level { width: 30px; }
  .pip { width: 7px; height: 4px; }
  .alive-pips { gap: 1px; }
  .center {
    gap: 6px;
    padding: 0 8px;
  }
}

@container board (max-width: 900px) {
  .side { padding: 0 3px; }
  .side-stats {
    font-size: 8.5px;
    gap: 2px;
  }
  .stat { gap: 2px; }
  .stat-icon,
  .stat-img { width: 11px; height: 11px; }
  .stat-divider { height: 8px; }
  .stat--obj { width: 22px; }
  .stat--cs { width: 32px; }
  .stat--dmg { width: 38px; }
  .stat--gold { width: 44px; font-size: 9.5px; }
  .stat--level { width: 28px; }
  .pip { width: 6px; height: 4px; }
  .center {
    gap: 4px;
    padding: 0 6px;
  }
  .kills { min-width: 24px; }
}

/* ── Victory momentum meter ── */
.momentum-meter {
  position: relative;
  flex-shrink: 0;
  height: clamp(22px, 4cqh, 30px);
  display: flex;
  align-items: center;
  padding: 0 clamp(10px, 1.2cqw, 14px);
  background:
    linear-gradient(to right, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0) 30%),
    linear-gradient(to left, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0) 30%),
    #0d0c08;
  border-bottom: 2px solid #3e200a;
}

.momentum-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.momentum-pct {
  width: clamp(38px, 6.6cqh, 50px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.momentum-pct--red {
  justify-content: flex-start;
}

.momentum-pct-value {
  font-size: clamp(15px, 3cqh, 21px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  /* MedievalSharp digits sit high in their em box — nudge down so the number
     is visually centered on the momentum track at every size.
     Scale factor grows with the leading team's dominance tier. */
  transform: translateY(0.1em) scale(var(--pct-scale, 1));
  transition:
    transform 0.5s ease,
    opacity 0.5s ease,
    color 0.4s ease,
    filter 0.5s ease,
    text-shadow 0.4s ease;
}
/* Scale away from the track so the growing number keeps its gap */
.momentum-pct--blue .momentum-pct-value {
  transform-origin: right center;
  color: #93c5fd;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.35);
}
.momentum-pct--red .momentum-pct-value {
  transform-origin: left center;
  color: #fca5a5;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.35);
}

/* ── Dominance escalation: leading number grows + glows, trailing number fades ── */
.tier-1 .momentum-pct-value { --pct-scale: 1.06; }
.tier-2 .momentum-pct-value { --pct-scale: 1.14; }
.tier-3 .momentum-pct-value { --pct-scale: 1.24; }

.lead-blue .momentum-pct--blue .momentum-pct-value {
  text-shadow:
    0 0 10px rgba(59, 130, 246, 0.75),
    0 0 22px rgba(59, 130, 246, 0.4);
}
.lead-red .momentum-pct--red .momentum-pct-value {
  text-shadow:
    0 0 10px rgba(239, 68, 68, 0.75),
    0 0 22px rgba(239, 68, 68, 0.4);
}
.lead-blue.tier-3 .momentum-pct--blue .momentum-pct-value {
  color: #dbeafe;
  text-shadow:
    0 0 10px rgba(59, 130, 246, 1),
    0 0 26px rgba(59, 130, 246, 0.7);
  animation: momentum-value-pulse-blue 1.6s ease-in-out infinite;
}
.lead-red.tier-3 .momentum-pct--red .momentum-pct-value {
  color: #fee2e2;
  text-shadow:
    0 0 10px rgba(239, 68, 68, 1),
    0 0 26px rgba(239, 68, 68, 0.7);
  animation: momentum-value-pulse-red 1.6s ease-in-out infinite;
}
/* The trailing side steps back — dimmer and desaturated as the gap widens */
.lead-blue .momentum-pct--red .momentum-pct-value,
.lead-red .momentum-pct--blue .momentum-pct-value {
  --pct-scale: 1;
  opacity: 0.75;
}
.lead-blue.tier-2 .momentum-pct--red .momentum-pct-value,
.lead-red.tier-2 .momentum-pct--blue .momentum-pct-value {
  opacity: 0.55;
  filter: saturate(0.6);
}
.lead-blue.tier-3 .momentum-pct--red .momentum-pct-value,
.lead-red.tier-3 .momentum-pct--blue .momentum-pct-value {
  opacity: 0.4;
  filter: saturate(0.35);
}

@keyframes momentum-value-pulse-blue {
  50% {
    text-shadow:
      0 0 14px rgba(59, 130, 246, 1),
      0 0 36px rgba(59, 130, 246, 0.9);
  }
}
@keyframes momentum-value-pulse-red {
  50% {
    text-shadow:
      0 0 14px rgba(239, 68, 68, 1),
      0 0 36px rgba(239, 68, 68, 0.9);
  }
}

.momentum-delta {
  position: absolute;
  top: 50%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
  animation: momentum-delta-fade 1.2s ease-out forwards;
}
.momentum-delta--blue {
  left: 10px;
  transform-origin: left center;
  color: #dbeafe;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(59, 130, 246, 0.9);
}
.momentum-delta--red {
  right: 10px;
  transform-origin: right center;
  color: #fee2e2;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(239, 68, 68, 0.9);
}

@keyframes momentum-delta-fade {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(1.3);
  }
  25% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
  60% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(calc(-50% - 4px)) scale(0.95);
  }
}

.momentum-track {
  position: relative;
  flex: 1;
  height: clamp(12px, 2.4cqh, 16px);
  display: flex;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #16140e;
  overflow: visible;
}

.momentum-fill {
  height: 100%;
  transition:
    width 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.4s ease,
    filter 0.5s ease;
}
.momentum-fill--blue {
  background: linear-gradient(to right, #1d4ed8, #3b82f6);
  border-radius: 3px 0 0 3px;
  box-shadow: inset 0 1px 0 rgba(147, 197, 253, 0.4);
}
.momentum-fill--red {
  background: linear-gradient(to left, #b91c1c, #ef4444);
  border-radius: 0 3px 3px 0;
  box-shadow: inset 0 1px 0 rgba(252, 165, 165, 0.4);
}
.is-shifting .momentum-fill--blue {
  box-shadow:
    inset 0 1px 0 rgba(147, 197, 253, 0.4),
    0 0 12px rgba(59, 130, 246, 0.8);
}
.is-shifting .momentum-fill--red {
  box-shadow:
    inset 0 1px 0 rgba(252, 165, 165, 0.4),
    0 0 12px rgba(239, 68, 68, 0.8);
}

/* ── Dominance: the leading fill radiates, the trailing fill cools down ── */
.lead-blue.tier-1 .momentum-fill--blue {
  box-shadow:
    inset 0 1px 0 rgba(147, 197, 253, 0.4),
    0 0 8px rgba(59, 130, 246, 0.5);
}
.lead-red.tier-1 .momentum-fill--red {
  box-shadow:
    inset 0 1px 0 rgba(252, 165, 165, 0.4),
    0 0 8px rgba(239, 68, 68, 0.5);
}
.lead-blue.tier-2 .momentum-fill--blue {
  background: linear-gradient(to right, #2563eb, #60a5fa);
  box-shadow:
    inset 0 1px 0 rgba(191, 219, 254, 0.55),
    0 0 14px rgba(59, 130, 246, 0.75);
}
.lead-red.tier-2 .momentum-fill--red {
  background: linear-gradient(to left, #dc2626, #f87171);
  box-shadow:
    inset 0 1px 0 rgba(254, 202, 202, 0.55),
    0 0 14px rgba(239, 68, 68, 0.75);
}
/* Crushing: brightest gradient + light sweep across the leading fill */
.lead-blue.tier-3 .momentum-fill--blue {
  background:
    linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)
      0 0 / 200% 100% no-repeat,
    linear-gradient(to right, #3b82f6, #93c5fd);
  box-shadow:
    inset 0 1px 0 rgba(219, 234, 254, 0.7),
    0 0 20px rgba(59, 130, 246, 0.95);
  animation: momentum-shimmer 1.8s linear infinite;
}
.lead-red.tier-3 .momentum-fill--red {
  background:
    linear-gradient(-110deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)
      0 0 / 200% 100% no-repeat,
    linear-gradient(to left, #ef4444, #fca5a5);
  box-shadow:
    inset 0 1px 0 rgba(254, 226, 226, 0.7),
    0 0 20px rgba(239, 68, 68, 0.95);
  animation: momentum-shimmer 1.8s linear infinite;
}
.lead-blue .momentum-fill--red,
.lead-red .momentum-fill--blue {
  filter: saturate(0.75) brightness(0.85);
}
.lead-blue.tier-3 .momentum-fill--red,
.lead-red.tier-3 .momentum-fill--blue {
  filter: saturate(0.45) brightness(0.7);
}

@keyframes momentum-shimmer {
  to {
    background-position: 200% 0, 0 0;
  }
}

/* Crushing tier also haloes the whole track in the leading team's color */
.lead-blue.tier-3 .momentum-track {
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.35);
}
.lead-red.tier-3 .momentum-track {
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
}

/* Meter backdrop tilts toward the leading side once dominance is clear */
.momentum-meter.lead-blue.tier-2,
.momentum-meter.lead-blue.tier-3 {
  background:
    linear-gradient(to right, rgba(59, 130, 246, 0.28), rgba(59, 130, 246, 0) 45%),
    linear-gradient(to left, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0) 25%),
    #0d0c08;
}
.momentum-meter.lead-red.tier-2,
.momentum-meter.lead-red.tier-3 {
  background:
    linear-gradient(to left, rgba(239, 68, 68, 0.28), rgba(239, 68, 68, 0) 45%),
    linear-gradient(to right, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0) 25%),
    #0d0c08;
}

.momentum-center-tick {
  position: absolute;
  left: 50%;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  background: #e8c040;
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.7);
  pointer-events: none;
  z-index: 1;
}

.momentum-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  line-height: 1;
  color: #e8c040;
  text-shadow:
    0 0 6px rgba(232, 192, 64, 0.9),
    0 1px 2px rgba(0, 0, 0, 0.9);
  transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 2;
}

@media (prefers-reduced-motion: reduce) {
  .momentum-pct-value,
  .momentum-fill {
    animation: none !important;
  }
}
</style>
