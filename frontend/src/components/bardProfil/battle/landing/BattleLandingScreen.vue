<template>
  <div class="landing-screen">
    <!-- Shared cosmic backdrop, same as every other tab -->
    <CosmicStageBackground />
    <div class="stage-vignette" />

    <!-- Temporary admin tool, moved here from the admin tab so it sits next to
         the rank band it manipulates. Absolutely positioned: it must never
         take part in the layout. -->
    <button class="admin-rankup" title="Admin: force one rank promotion" @click="adminRankUp">
      <Icon icon="game-icons:upgrade" width="24" height="24" class="admin-rankup-icon" />
      RANK UP
    </button>

    <!-- ── Secondary: ladder record ribbon ── -->
    <LadderRecordRibbon class="landing-layer" />

    <!-- ── Focus 1: rank + LP, flanked by the headline career numbers ── -->
    <RankBandPanel class="landing-layer" :left-group="combatGroup" :right-group="conquestGroup" />

    <!-- ── Focus 2: team roster, full stage width ── -->
    <TeamRosterPanel class="roster-slot landing-layer" />

    <!-- ── Focus 3: the start button ── -->
    <div class="action-bar landing-layer">
      <div class="action-rule action-rule--left" />
      <button
        class="battle-btn"
        :class="{
          'battle-btn--locked': !hasFullTeam && !isBattleLive,
          'battle-btn--live': isBattleLive && !isStarting,
        }"
        :disabled="isStarting || (!hasFullTeam && !isBattleLive)"
        :title="!hasFullTeam && !isBattleLive ? `${5 - teamProgress} role(s) still open` : ''"
        @click="$emit('start')"
      >
        <span class="battle-btn-face">
          <Icon
            v-if="isStarting"
            icon="game-icons:sundial"
            width="24"
            height="24"
            class="battle-btn-icon"
            style="color: #e8c040"
          />
          <img
            v-else-if="!hasFullTeam && !isBattleLive"
            src="/img/lock.png"
            alt="Locked"
            class="battle-btn-lock"
          />
          <span v-else-if="isBattleLive" class="battle-btn-live-dot" />
          <img v-else src="/img/menu/BATTLE.png" alt="Battle" class="battle-btn-img" />

          <span v-if="isStarting">STARTING…</span>
          <span v-else-if="isBattleLive">RETURN TO LIVE BATTLE</span>
          <span v-else-if="!hasFullTeam">
            {{ 5 - teamProgress }} SLOT{{ 5 - teamProgress !== 1 ? 'S' : '' }} OPEN
          </span>
          <span v-else>START BATTLE</span>
        </span>
        <span class="battle-btn-sub">
          {{ buttonSubline }}
        </span>
      </button>
      <div class="action-rule action-rule--right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useBattleScoreboardStats } from '@/composables/useBattleScoreboardStats'
import { formatNumber } from '@/config/numberFormat'
import { BATTLE_STAT_GAME_ICONS, BATTLE_STAT_IMAGES } from '@/config/constants'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import LadderRecordRibbon from './LadderRecordRibbon.vue'
import RankBandPanel from './RankBandPanel.vue'
import { type RankStatGroup } from './RankStatColumn.vue'
import TeamRosterPanel from './TeamRosterPanel.vue'

const props = defineProps<{ isStarting: boolean }>()
defineEmits<{ start: [] }>()

const battleStore = useBattleStore()

// Battle action button state (mirrors headerSlots readiness)
const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
const hasFullTeam = computed(() => teamProgress.value >= 5)
const isBattleLive = computed(() => battleStore.isAutoBattleInitialized)

/** Second line inside the button — says what the click actually does. */
const buttonSubline = computed(() => {
  if (props.isStarting) return 'SEARCHING FOR A PLANET'
  if (isBattleLive.value) return 'BATTLE IN PROGRESS'
  if (!hasFullTeam.value) return 'FILL EVERY ROLE TO QUEUE UP'
  return `QUEUE WITH ${teamProgress.value} CHAMPIONS`
})

// Career totals merged with the running battle — shared with the bottom-bar
// scoreboard via useBattleScoreboardStats so both always show the same numbers.
const { live, kills, kdaStr } = useBattleScoreboardStats()

// The two flanks of the rank band. Deliberately short: four headline numbers a
// side, big enough to read at a glance — the full breakdown lives in Bard Stats.
const combatGroup = computed<RankStatGroup>(() => ({
  title: 'COMBAT',
  icon: 'game-icons:sword-clash',
  color: '#cc6050',
  rows: [
    {
      label: 'Kills',
      value: formatNumber(kills.value),
      color: '#6ee7b7',
      gameIcon: BATTLE_STAT_GAME_ICONS.kills,
    },
    { label: 'KDA', value: kdaStr.value, color: '#e8c040' },
    {
      label: 'Pentakills',
      value: formatNumber(
        battleStore.allTime.multikills.penta + battleStore.liveBattleStats.multikills.penta,
      ),
      color: '#ff9a40',
    },
    { label: 'MVP Awards', value: formatNumber(battleStore.allTime.mvpAwards), color: '#e8c040' },
  ],
}))

const conquestGroup = computed<RankStatGroup>(() => ({
  title: 'CONQUEST',
  icon: 'game-icons:crown-coin',
  color: '#e8c040',
  rows: [
    {
      label: 'Total Gold',
      value: formatNumber(battleStore.allTime.gold + live.value.gold),
      color: '#e8c040',
      image: BATTLE_STAT_IMAGES.gold,
    },
    {
      label: 'Champ Dmg',
      value: formatNumber(battleStore.allTime.damage + live.value.damage),
      gameIcon: BATTLE_STAT_GAME_ICONS.damage,
    },
    {
      label: 'Dragons',
      value: formatNumber(battleStore.allTime.dragons + live.value.dragons),
      color: '#6ee0a0',
      image: BATTLE_STAT_IMAGES.dragons,
    },
    {
      label: 'Barons',
      value: formatNumber(battleStore.allTime.barons + live.value.barons),
      color: '#c9a0f5',
      image: BATTLE_STAT_IMAGES.barons,
    },
  ],
}))
</script>

<style scoped>
/* Flat deep-space base — CosmicStageBackground paints its starfield on top of
   it (z-index 0), every content layer sits above via .landing-layer. */
.landing-screen {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 14px);
  padding: clamp(10px, 1.6vh, 18px) clamp(14px, 1.4vw, 26px);
  background: #0a0906;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Soft warm pool behind the centre spine, drawn over the stars but under the
   content — gives the rank/roster/button column its own light. */
.stage-vignette {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 55% at 50% 22%, rgba(200, 144, 64, 0.09), transparent 70%),
    radial-gradient(ellipse 90% 60% at 50% 120%, rgba(10, 9, 6, 0.9), transparent 70%);
}

.landing-layer {
  position: relative;
  z-index: 1;
}

/* ── Roster: takes the leftover height, but capped so the cards keep a card-like
   shape instead of stretching into thin columns on tall screens. ── */
.roster-slot {
  /* takes nearly all spare height — the rank band only sinks what is left over
     once the cards hit their cap */
  flex: 6 1 auto;
  min-width: 0;
  min-height: 0;
  max-height: clamp(260px, 38vh, 470px);
}

/* ── Focus 3: the start button ── */
.action-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(14px, 1.6vw, 26px);
}

.action-rule {
  flex: 1;
  height: 2px;
}
.action-rule--left {
  background: linear-gradient(to right, transparent, #5c3310 60%, #c89040);
}
.action-rule--right {
  background: linear-gradient(to left, transparent, #5c3310 60%, #c89040);
}

.battle-btn {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-width: clamp(250px, 21vw, 380px);
  padding: clamp(7px, 1vh, 11px) clamp(20px, 2vw, 32px);
  font-family: inherit;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #0e1a08,
    0 0 24px rgba(74, 138, 40, 0.35);
  color: #8ee060;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
  animation: battle-btn-glow 2.6s ease-in-out infinite;
}
.battle-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  box-shadow:
    inset 0 0 0 1px #0e1a08,
    0 0 44px rgba(82, 184, 48, 0.6);
}
.battle-btn:active:not(:disabled) {
  transform: scale(0.985);
}

.battle-btn-face {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 0.8vw, 13px);
  font-size: clamp(14px, 1.75vh, 20px);
  font-weight: 700;
  letter-spacing: 4px;
  line-height: 1.1;
}

.battle-btn-sub {
  font-size: clamp(7px, 0.9vh, 9px);
  font-weight: 700;
  letter-spacing: 2px;
  color: #5d8a44;
}

.battle-btn--locked {
  background: linear-gradient(to bottom, #150e06, #0e0904) !important;
  border-color: #3a2010 !important;
  color: #6a4a22 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  animation: none;
}
.battle-btn--locked .battle-btn-sub {
  color: #4a3018;
}
.battle-btn--locked .battle-btn-face {
  font-size: clamp(13px, 1.6vh, 18px);
}

.battle-btn--live {
  background: linear-gradient(to bottom, #2e1e08, #1c1204);
  border-color: #c89040;
  color: #e8c040;
  box-shadow:
    inset 0 0 0 1px #1a1004,
    0 0 24px rgba(200, 144, 64, 0.35);
  animation: battle-btn-glow-live 2.6s ease-in-out infinite;
}
.battle-btn--live .battle-btn-sub {
  color: #a08448;
}
.battle-btn--live .battle-btn-face {
  font-size: clamp(13px, 1.6vh, 18px);
}
.battle-btn--live:hover:not(:disabled) {
  background: linear-gradient(to bottom, #3e2a0c, #241806);
  border-color: #e8c060;
  box-shadow:
    inset 0 0 0 1px #1a1004,
    0 0 44px rgba(232, 192, 64, 0.5);
}

.battle-btn-img {
  width: clamp(20px, 2.4vh, 27px);
  height: clamp(20px, 2.4vh, 27px);
  object-fit: contain;
}
.battle-btn-icon {
  width: clamp(17px, 2.1vh, 23px);
  height: clamp(17px, 2.1vh, 23px);
}
.battle-btn-lock {
  width: clamp(16px, 1.9vh, 21px);
  height: clamp(16px, 1.9vh, 21px);
  object-fit: contain;
  opacity: 0.7;
}

.battle-btn-live-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.9);
  animation: live-dot-pulse 1.4s ease-in-out infinite;
}

@keyframes battle-btn-glow {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px #0e1a08,
      0 0 18px rgba(74, 138, 40, 0.3);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px #0e1a08,
      0 0 40px rgba(82, 184, 48, 0.55);
  }
}

@keyframes battle-btn-glow-live {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px #1a1004,
      0 0 18px rgba(200, 144, 64, 0.3);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px #1a1004,
      0 0 40px rgba(232, 192, 64, 0.5);
  }
}

@keyframes live-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

/* Full HD and flatter viewports: tighten the vertical rhythm */
@media (max-height: 1100px) {
  .landing-screen {
    gap: 8px;
    padding: 9px 16px;
  }
  .battle-btn {
    padding: 7px 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .battle-btn,
  .battle-btn--live,
  .battle-btn-live-dot {
    animation: none;
  }
}
</style>
