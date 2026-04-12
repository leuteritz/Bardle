<template>
  <div class="absolute inset-0 z-20 flex flex-col start-screen">
    <!-- ── HEADER ── -->
    <div class="start-header">
      <div class="start-crest">
        <img src="/img/menu/BATTLE.png" class="start-crest-img" alt="Battle" />
      </div>
      <div class="start-title">RANKED QUEUE</div>
    </div>

    <!-- ── INFO DASHBOARD ── -->
    <div class="info-dashboard">
      <div class="stat-col">
        <div class="stat-eyebrow">RANG</div>
        <div class="rank-main" :style="{ color: rankColor }">
          <span class="rank-tier-text">{{ battleStore.currentRank.tier }}</span>
          <span class="rank-div-text" v-if="!isHighTier">{{
            battleStore.currentRank.division
          }}</span>
        </div>
        <div class="lp-track">
          <div class="lp-fill" :style="{ width: lpPercent + '%', background: rankColor }" />
        </div>
        <div class="stat-foot">
          {{ battleStore.currentRank.lp }}&thinsp;LP
          <span class="foot-sep">·</span>
          {{ battleStore.mmr }}&thinsp;MMR
        </div>
      </div>

      <div class="stat-divider" />

      <div class="stat-col">
        <div class="stat-eyebrow">BILANZ</div>
        <div class="wl-main">
          <span class="val-win">{{ battleStore.totalWins }}<em>W</em></span>
          <span class="wl-slash">/</span>
          <span class="val-loss">{{ battleStore.totalLosses }}<em>L</em></span>
        </div>
        <div class="wr-track">
          <div class="wr-fill" :style="{ width: winRateStr + '%' }" />
        </div>
        <div class="stat-foot" :class="winRate >= 50 ? 'foot--pos' : 'foot--neg'">
          {{ winRateStr }}%&thinsp;WR
          <span class="foot-sep">·</span>
          {{ battleStore.totalBattles }}&thinsp;Kämpfe
        </div>
      </div>

      <div class="stat-divider" />

      <div class="stat-col">
        <div class="stat-eyebrow">SERIE</div>
        <div class="streak-main" :class="{ 'streak-on-fire': battleStore.currentWinStreak >= 3 }">
          <span v-if="battleStore.currentWinStreak >= 3" class="fire-emoji">🔥</span>
          <span class="streak-num">{{ battleStore.currentWinStreak }}</span>
          <span class="streak-unit">WIN</span>
        </div>
        <div class="stat-foot">
          Bestmarke&ensp;<strong>{{ battleStore.bestWinStreak }}</strong>
        </div>
      </div>

      <div class="stat-divider" />

      <div class="stat-col">
        <div class="stat-eyebrow">KDA</div>
        <div class="kda-ratio-display">{{ kdaRatio }}</div>
        <div class="kda-breakdown">
          <span class="kda-k">{{ battleStore.totalKills }}</span>
          <span class="kda-sep">/</span>
          <span class="kda-d">{{ battleStore.totalDeaths }}</span>
          <span class="kda-sep">/</span>
          <span class="kda-a">{{ battleStore.totalAssists }}</span>
        </div>
        <div class="stat-foot">Ø&thinsp;{{ avgBattleTime }}</div>
      </div>

      <div class="stat-divider" />

      <div class="stat-col">
        <div class="stat-eyebrow">KASSE</div>
        <div class="coins-main">
          <span class="coin-icon">🪙</span>
          <span class="coin-num">{{ battleStore.battleCoins }}</span>
        </div>
        <div class="stat-foot">{{ battleStore.totalCoinsEarned }}&thinsp;verdient</div>
        <div v-if="activePermanentCount > 0" class="perm-upgrades">
          <span class="perm-badge">{{ activePermanentCount }}&thinsp;Upgrades</span>
        </div>
        <div v-if="battleStore.purchasedBuffs.length > 0" class="buffs-row">
          <span
            v-for="buff in battleStore.purchasedBuffs"
            :key="buff.id"
            class="buff-pip"
            :title="buff.id"
            >{{ buff.remainingBattles }}×</span
          >
        </div>
      </div>
    </div>

    <!-- ── SIEGCHANCE ── -->
    <Transition name="prob-fade">
      <div v-if="showWinProb" class="win-prob-row">
        <span class="win-prob-eyebrow">SIEGCHANCE</span>
        <div class="win-prob-track">
          <div
            class="win-prob-fill"
            :style="{ width: winProbPercent + '%' }"
            :class="winProbClass"
          />
        </div>
        <span class="win-prob-value" :class="winProbClass">{{ winProbPercent }}%</span>
      </div>
    </Transition>

    <!-- ── TEAM ROSTER ── -->
    <div class="roster-wrap">
      <div class="roster-header">
        <span class="roster-label">DEIN TEAM</span>
        <div class="roster-progress-bar-wrap">
          <div
            class="roster-progress-bar"
            :style="{ width: `${(teamProgress / 5) * 100}%` }"
            :class="hasFullTeam ? 'bar--full' : 'bar--incomplete'"
          />
        </div>
        <span class="roster-count" :class="hasFullTeam ? 'count--full' : 'count--incomplete'">
          {{ teamProgress }}/5
        </span>
      </div>

      <div class="roster-slots">
        <div
          v-for="(role, idx) in ROLES"
          :key="role.key"
          class="roster-slot"
          :class="battleStore.headerSlots[idx] ? 'slot--filled' : 'slot--empty'"
        >
          <template v-if="battleStore.headerSlots[idx]">
            <img
              :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
              class="slot-champ-img"
              :alt="battleStore.headerSlots[idx]!"
            />
            <span class="slot-champ-name">{{ battleStore.headerSlots[idx] }}</span>
          </template>
          <template v-else>
            <span class="slot-empty-icon">{{ role.icon }}</span>
            <div class="slot-pulse-ring" />
          </template>
          <span
            class="slot-role-badge"
            :class="
              battleStore.headerSlots[idx] ? 'slot-role-badge--filled' : 'slot-role-badge--empty'
            "
            >{{ role.label }}</span
          >
        </div>
      </div>

      <Transition name="hint-fade" mode="out-in">
        <p v-if="!hasFullTeam" key="incomplete" class="roster-hint">
          Wähle im Header für jede Rolle einen Champion aus – erst dann öffnet sich die Queue.
        </p>
        <p v-else key="ready" class="roster-hint roster-hint--ready">
          ✓ Dein Team ist vollständig – bereit für die Arena!
        </p>
      </Transition>
    </div>

    <!-- ── START BUTTON ── -->
    <button
      class="start-btn"
      :class="{ 'start-btn--locked': !hasFullTeam }"
      :disabled="isStarting || !hasFullTeam"
      :title="!hasFullTeam ? `Noch ${5 - teamProgress} Rolle(n) offen` : ''"
      @click="$emit('start')"
    >
      <span class="start-btn-icon">
        <template v-if="isStarting">⏳</template>
        <template v-else-if="!hasFullTeam">🔒</template>
        <img v-else src="/img/menu/BATTLE.png" class="start-btn-img" alt="Battle" />
      </span>
      <span v-if="isStarting">WIRD GESTARTET…</span>
      <span v-else-if="!hasFullTeam">
        NOCH {{ 5 - teamProgress }} SLOT{{ 5 - teamProgress !== 1 ? 'S' : '' }} OFFEN
      </span>
      <span v-else>KAMPF STARTEN</span>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import {
  LP_NORMAL_PROMOTION_THRESHOLD,
  LP_MASTER_PROMOTION_THRESHOLD,
  LP_GRANDMASTER_PROMOTION_THRESHOLD,
} from '@/config/constants'

const ROLES = [
  { key: 'top', label: 'TOP', icon: '⚔️' },
  { key: 'jungle', label: 'JGL', icon: '🌿' },
  { key: 'mid', label: 'MID', icon: '🎯' },
  { key: 'bot', label: 'BOT', icon: '🏹' },
  { key: 'support', label: 'SUP', icon: '🛡️' },
] as const

const RANK_COLORS: Record<string, string> = {
  Iron: '#8a9098',
  Bronze: '#c87832',
  Silver: '#b0b8c4',
  Gold: '#d4a020',
  Platinum: '#4ab8c0',
  Emerald: '#3cbc78',
  Diamond: '#88d8f8',
  Master: '#b060f0',
  Grandmaster: '#f06028',
  Challenger: '#f0dc50',
}

export default defineComponent({
  name: 'BattleStartScreenComponent',
  props: { isStarting: { type: Boolean, default: false } },
  emits: ['start'],
  setup() {
    const battleStore = useBattleStore()
    const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
    const hasFullTeam = computed(() => teamProgress.value >= 5)
    const rankColor = computed(() => RANK_COLORS[battleStore.currentRank.tier] ?? '#d4a020')
    const isHighTier = computed(() =>
      ['Master', 'Grandmaster', 'Challenger'].includes(battleStore.currentRank.tier),
    )
    const lpPercent = computed(() => {
      const tier = battleStore.currentRank.tier
      if (tier === 'Challenger') return 100
      let cap = LP_NORMAL_PROMOTION_THRESHOLD
      if (tier === 'Master') cap = LP_MASTER_PROMOTION_THRESHOLD
      else if (tier === 'Grandmaster') cap = LP_GRANDMASTER_PROMOTION_THRESHOLD
      return Math.min(100, Math.max(0, (battleStore.currentRank.lp / cap) * 100))
    })
    const winRate = computed(() =>
      battleStore.totalBattles === 0 ? 0 : (battleStore.totalWins / battleStore.totalBattles) * 100,
    )
    const winRateStr = computed(() => winRate.value.toFixed(1))
    const kdaRatio = computed(() => {
      if (battleStore.totalDeaths === 0)
        return battleStore.totalKills + battleStore.totalAssists > 0 ? 'Perfect' : '—'
      return (
        (battleStore.totalKills + battleStore.totalAssists) /
        battleStore.totalDeaths
      ).toFixed(2)
    })
    const avgBattleTime = computed(() =>
      battleStore.totalBattles === 0 ? '—' : battleStore.getAvgBattleTime(),
    )
    const showWinProb = computed(() => battleStore.currentWinProbability > 0)
    const winProbPercent = computed(() => Math.round(battleStore.currentWinProbability * 100))
    const winProbClass = computed(() => {
      const p = battleStore.currentWinProbability
      if (p >= 0.65) return 'prob--high'
      if (p >= 0.45) return 'prob--mid'
      return 'prob--low'
    })
    const activePermanentCount = computed(
      () => Object.keys(battleStore.permanentBattleUpgrades).length,
    )
    return {
      battleStore,
      ROLES,
      teamProgress,
      hasFullTeam,
      rankColor,
      isHighTier,
      lpPercent,
      winRate,
      winRateStr,
      kdaRatio,
      avgBattleTime,
      showWinProb,
      winProbPercent,
      winProbClass,
      activePermanentCount,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   ROOT — füllt das komplette Modal
   ═══════════════════════════════════════════ */
.start-screen {
  background: #0e0d0a;
  overflow-y: auto;
  padding: 28px 28px 24px;
  gap: 16px;
  align-items: stretch;
}

/* ═══════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════ */
.start-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-shrink: 0;
}
.start-crest {
  animation: crestPulse 3s ease-in-out infinite;
  flex-shrink: 0;
}
.start-crest-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(212, 160, 32, 0.65));
}
.start-title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 8px;
  color: #d4a020;
  text-shadow: 0 0 24px rgba(212, 160, 32, 0.45);
}

/* ═══════════════════════════════════════════
   INFO DASHBOARD  —  ein einziger Panel
   ═══════════════════════════════════════════ */
.info-dashboard {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(212, 160, 32, 0.14);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(212, 160, 32, 0.09),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  padding: 20px 0 18px;
}

/* ── Einzelne Stat-Spalte ── */
.stat-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
}

/* ── Vertikaler Trennstrich ── */
.stat-divider {
  width: 1px;
  flex-shrink: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(212, 160, 32, 0.2) 20%,
    rgba(212, 160, 32, 0.2) 80%,
    transparent 100%
  );
}

/* ── Labels / Footer ── */
.stat-eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #6a5820;
  text-transform: uppercase;
}
.stat-foot {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.4;
}
.stat-foot strong {
  color: #d4a020;
  font-weight: 800;
}
.foot-sep {
  margin: 0 4px;
  opacity: 0.35;
}
.foot--pos {
  color: #52b830 !important;
}
.foot--neg {
  color: #cc6050 !important;
}

/* ── Rang ── */
.rank-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.05;
  gap: 2px;
}
.rank-tier-text {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.5px;
}
.rank-div-text {
  font-size: 14px;
  font-weight: 700;
  opacity: 0.65;
}
.lp-track {
  width: 85%;
  height: 4px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 99px;
  overflow: hidden;
}
.lp-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 6px currentColor;
}

/* ── Bilanz ── */
.wl-main {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.val-win {
  font-size: 32px;
  font-weight: 900;
  color: #52b830;
  letter-spacing: -1px;
}
.val-win em {
  font-size: 13px;
  font-style: normal;
  opacity: 0.55;
  margin-left: 2px;
}
.wl-slash {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.15);
}
.val-loss {
  font-size: 32px;
  font-weight: 900;
  color: #cc6050;
  letter-spacing: -1px;
}
.val-loss em {
  font-size: 13px;
  font-style: normal;
  opacity: 0.55;
  margin-left: 2px;
}
.wr-track {
  width: 85%;
  height: 4px;
  background: rgba(204, 96, 80, 0.18);
  border-radius: 99px;
  overflow: hidden;
}
.wr-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(to right, #cc5040, #52b830);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Serie ── */
.streak-main {
  display: flex;
  align-items: center;
  gap: 5px;
}
.streak-num {
  font-size: 40px;
  font-weight: 900;
  color: #d4a020;
  line-height: 1;
  text-shadow: 0 0 14px rgba(212, 160, 32, 0.45);
}
.streak-unit {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #6a5820;
  align-self: flex-end;
  margin-bottom: 6px;
}
.fire-emoji {
  font-size: 20px;
}
.streak-on-fire .streak-num {
  color: #f06820;
  text-shadow: 0 0 18px rgba(240, 104, 32, 0.7);
  animation: streakPulse 1.6s ease-in-out infinite;
}

/* ── KDA ── */
.kda-ratio-display {
  font-size: 34px;
  font-weight: 900;
  color: #d4a020;
  letter-spacing: 0.5px;
  line-height: 1;
}
.kda-breakdown {
  display: flex;
  align-items: center;
  gap: 3px;
}
.kda-k {
  font-size: 14px;
  font-weight: 700;
  color: #52b830;
}
.kda-d {
  font-size: 14px;
  font-weight: 700;
  color: #cc6050;
}
.kda-a {
  font-size: 14px;
  font-weight: 700;
  color: #5090cc;
}
.kda-sep {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.18);
  margin: 0 2px;
}

/* ── Kasse ── */
.coins-main {
  display: flex;
  align-items: center;
  gap: 6px;
}
.coin-icon {
  font-size: 22px;
}
.coin-num {
  font-size: 32px;
  font-weight: 900;
  color: #d4a020;
  line-height: 1;
}
.perm-upgrades {
  margin-top: 2px;
}
.perm-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #b070f8;
  background: rgba(160, 96, 240, 0.14);
  border: 1px solid rgba(160, 96, 240, 0.28);
  border-radius: 4px;
  padding: 2px 7px;
}
.buffs-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}
.buff-pip {
  font-size: 11px;
  font-weight: 800;
  color: #d4a020;
  background: rgba(212, 160, 32, 0.12);
  border: 1px solid rgba(212, 160, 32, 0.25);
  border-radius: 4px;
  padding: 2px 6px;
}

/* ═══════════════════════════════════════════
   SIEGCHANCE
   ═══════════════════════════════════════════ */
.win-prob-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 160, 32, 0.1);
  border-radius: 7px;
}
.win-prob-eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #6a5820;
  flex-shrink: 0;
  white-space: nowrap;
}
.win-prob-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 99px;
  overflow: hidden;
}
.win-prob-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.win-prob-value {
  font-size: 15px;
  font-weight: 900;
  flex-shrink: 0;
  min-width: 42px;
  text-align: right;
}
.prob--high {
  background: linear-gradient(to right, #2a7020, #52b830);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.5);
  color: #52b830;
}
.prob--mid {
  background: linear-gradient(to right, #7a6010, #d4a020);
  box-shadow: 0 0 10px rgba(212, 160, 32, 0.45);
  color: #d4a020;
}
.prob--low {
  background: linear-gradient(to right, #7a2010, #cc5030);
  box-shadow: 0 0 10px rgba(204, 80, 48, 0.45);
  color: #cc6050;
}

/* ═══════════════════════════════════════════
   TEAM ROSTER
   ═══════════════════════════════════════════ */
.roster-wrap {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  flex: 1;
  min-height: 0;
  padding: 18px 20px 16px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 160, 32, 0.1);
  border-radius: 8px;
}
.roster-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.roster-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #6a5820;
  text-transform: uppercase;
  flex-shrink: 0;
}
.roster-progress-bar-wrap {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 99px;
  overflow: hidden;
}
.roster-progress-bar {
  height: 100%;
  border-radius: 99px;
  transition:
    width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.4s;
}
.bar--incomplete {
  background: linear-gradient(to right, #7a3020, #cc6050);
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.5);
}
.bar--full {
  background: linear-gradient(to right, #2a7020, #52b830);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.6);
}
.roster-count {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  transition:
    color 0.3s,
    text-shadow 0.3s;
}
.count--incomplete {
  color: #cc6050;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}
.count--full {
  color: #52b830;
  text-shadow: 0 0 12px rgba(82, 184, 48, 0.6);
}

/* ── Slot-Grid ── */
.roster-slots {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.roster-slot {
  position: relative;
  flex: 1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow: hidden;
  transition:
    box-shadow 0.3s,
    border-color 0.3s,
    transform 0.2s;
  min-height: 90px;
}
.slot--filled {
  border: 1px solid #4a8a28;
  box-shadow:
    0 0 16px rgba(74, 138, 40, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.slot--filled:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 22px rgba(74, 138, 40, 0.55);
}
.slot--empty {
  background: rgba(14, 10, 4, 0.65);
  border: 1px dashed rgba(90, 60, 20, 0.4);
}

/* ── Champion-Bild füllt den gesamten Slot ── */
.slot-champ-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  border-radius: 0;
  border: none;
  display: block;
}

/* ── Gradient-Overlay für Lesbarkeit ── */
.slot--filled::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 35%, rgba(0, 0, 0, 0.72) 100%);
  pointer-events: none;
  border-radius: inherit;
}

/* ── Name & Badge über dem Bild ── */
.slot-champ-name {
  position: absolute;
  bottom: 22px;
  left: 4px;
  right: 4px;
  z-index: 1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #fff;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
}
.slot-role-badge {
  position: absolute;
  bottom: 6px;
  z-index: 1;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.2px;
  border-radius: 4px;
  padding: 2px 7px;
  line-height: 1.4;
}
.slot-role-badge--filled {
  color: #6ec040;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(74, 138, 40, 0.45);
}
.slot-role-badge--empty {
  position: static;
  color: #4a3a1a;
  background: rgba(30, 18, 6, 0.7);
  border: 1px solid rgba(70, 40, 12, 0.25);
}

/* ── Leerer Slot ── */
.slot-empty-icon {
  font-size: 26px;
  opacity: 0.28;
  line-height: 1;
}
.slot-pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 12px;
  border: 1px solid rgba(90, 60, 20, 0.22);
  animation: slotPulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

.roster-hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.28);
  text-align: center;
  line-height: 1.6;
  min-height: 20px;
}
.roster-hint--ready {
  color: #52b830;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.35);
}

/* ═══════════════════════════════════════════
   START BUTTON
   ═══════════════════════════════════════════ */
.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 16px 40px;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 3px;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 6px;
  color: #6ec040;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow:
    0 0 20px rgba(74, 138, 40, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);
  align-self: center;
  min-width: 260px;
}
.start-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  color: #8ee060;
  box-shadow:
    0 0 32px rgba(82, 184, 48, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: scale(1.04);
}
.start-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.start-btn--locked {
  background: linear-gradient(to bottom, #150e06, #0e0904) !important;
  border-color: #3a2010 !important;
  color: #4a3018 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  transform: none !important;
  letter-spacing: 2px;
  font-size: 14px;
  min-width: 240px;
}
.start-btn-icon {
  font-size: 20px;
  line-height: 1;
}
.start-btn-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: brightness(1.2);
}

/* ═══════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════ */
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.25s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
.prob-fade-enter-active,
.prob-fade-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.35s ease;
}
.prob-fade-enter-from,
.prob-fade-leave-to {
  opacity: 0;
  transform: scaleY(0.85);
}

/* ═══════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════ */
@keyframes crestPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(200, 150, 30, 0.4));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(210, 160, 20, 0.8));
    transform: scale(1.06);
  }
}
@keyframes streakPulse {
  0%,
  100% {
    text-shadow: 0 0 12px rgba(240, 104, 32, 0.4);
  }
  50% {
    text-shadow: 0 0 28px rgba(240, 104, 32, 0.95);
  }
}
@keyframes slotPulse {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(1.07);
  }
}
@media (prefers-reduced-motion: reduce) {
  .start-crest,
  .slot-pulse-ring,
  .streak-on-fire .streak-num {
    animation: none !important;
  }
}
</style>
