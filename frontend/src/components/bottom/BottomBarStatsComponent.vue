<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useBattleStore } from '@/stores/battleStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { formatNumber } from '@/config/numberFormat'
import { ROLES } from '@/config/constants'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const playerStore = usePlayerStore()
const roleBehaviorStore = useRoleBehaviorStore()

function fmtCd(ms: number): string {
  const s = Math.ceil(ms / 1000)
  if (s <= 0) return ''
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const roleAbilities = computed(() =>
  ROLES.map((roleData, i) => {
    const role = roleData.key
    const hasChampion = battleStore.headerSlots[i] != null
    let cdMs = 0
    let isFlashing = false

    if (role === 'top') {
      cdMs = roleBehaviorStore.tankShieldBrokenMs
      isFlashing = roleBehaviorStore.tankShieldActive && cdMs <= 0
    } else if (role === 'jungle') {
      cdMs = roleBehaviorStore.jungleBuffCooldownMs
      isFlashing = roleBehaviorStore.jungleBuffFlashActive
    } else if (role === 'mid') {
      cdMs = roleBehaviorStore.midCurseCooldownMs
      isFlashing = roleBehaviorStore.midCurseFlashActive
    } else if (role === 'adc') {
      cdMs = roleBehaviorStore.adcBurstCooldownMs
      isFlashing = roleBehaviorStore.adcBurstActive
    } else {
      cdMs = roleBehaviorStore.supportHealCooldownMs
      isFlashing = roleBehaviorStore.supportPlanetHealActive
    }

    return {
      role,
      icon: roleData.icon,
      label: roleData.label.toUpperCase(),
      color: roleData.orbit.color,
      hasChampion,
      onCooldown: cdMs > 0 && !isFlashing,
      timer: fmtCd(cdMs),
      isFlashing,
    }
  }),
)

const { currentHP, maxHP } = storeToRefs(playerStore)
const { currentRank, currentWinStreak, totalWins, totalLosses } = storeToRefs(battleStore)

const rankLabel = computed(() => {
  const { tier, division } = currentRank.value
  if (tier === 'Master' || tier === 'Grandmaster' || tier === 'Challenger') return tier
  return `${tier} ${division}`
})

const isLowHP = computed(() => currentHP.value / maxHP.value < 0.25)
</script>

<template>
  <div class="stats-grid">
  <div class="bbstats">
    <div class="bbstat-item">
      <span class="bbstat-icon">♪</span>
      <span class="bbstat-label">C/CLICK</span>
      <span class="bbstat-val bbstat-val--gold">{{ formatNumber(gameStore.chimesPerClick) }}</span>
    </div>
    <div class="bbstat-divider" />
    <div class="bbstat-item">
      <span class="bbstat-icon bbstat-icon--green">⚡</span>
      <span class="bbstat-label">C/S</span>
      <span class="bbstat-val bbstat-val--green">{{ formatNumber(gameStore.chimesPerSecond) }}</span>
    </div>
    <div class="bbstat-divider" />
    <div class="bbstat-item">
      <span class="bbstat-icon bbstat-icon--red">⚔</span>
      <span class="bbstat-label">CLICK</span>
      <span class="bbstat-val bbstat-val--red">{{ formatNumber(gameStore.dmgPerClick) }}</span>
    </div>
    <div class="bbstat-divider" />
    <div class="bbstat-item">
      <span class="bbstat-icon bbstat-icon--red">🔥</span>
      <span class="bbstat-label">DPS</span>
      <span class="bbstat-val bbstat-val--red">{{ formatNumber(gameStore.dmgPerSecond) }}</span>
    </div>
    <template v-for="ab in roleAbilities" :key="ab.role">
      <div class="bbstat-divider" />
      <div
        class="bbstat-item ability-slot"
        :class="{
          'ability-slot--cooldown': ab.onCooldown && ab.hasChampion,
          'ability-slot--flash': ab.isFlashing,
          'ability-slot--inactive': !ab.hasChampion,
        }"
        :style="{ '--role-color': ab.color }"
      >
        <span class="bbstat-icon ability-role-icon">{{ ab.icon }}</span>
        <span class="bbstat-label">{{ ab.label }}</span>
        <span class="bbstat-val ability-cd-val">{{ ab.hasChampion ? (ab.timer || '—') : '—' }}</span>
      </div>
    </template>
  </div>

  <div class="title-center">BARDLE</div>

  <div class="stats-right">
    <div class="stat-item">
      <span class="stat-icon">❤</span>
      <span class="stat-label">HP</span>
      <span class="stat-value" :class="{ 'hp-low': isLowHP }">{{ currentHP }}/{{ maxHP }}</span>
    </div>
    <div class="stat-divider" />
    <div class="stat-item">
      <span class="stat-icon">⚔</span>
      <span class="stat-label">RANK</span>
      <span class="stat-value">{{ rankLabel }}</span>
    </div>
    <div class="stat-divider" />
    <div class="stat-item">
      <span class="stat-icon">▲</span>
      <span class="stat-label">W/L</span>
      <span class="stat-value">{{ totalWins }}</span>
      <span class="stat-sep">/</span>
      <span class="stat-value loss">{{ totalLosses }}</span>
    </div>
    <div class="stat-divider" v-if="currentWinStreak > 0" />
    <div class="stat-item" v-if="currentWinStreak > 0">
      <span class="stat-icon">🔥</span>
      <span class="stat-label">STREAK</span>
      <span class="stat-value streak">{{ currentWinStreak }}W</span>
    </div>
  </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
}

.bbstats {
  display: flex;
  align-items: center;
  gap: 0;
  justify-content: flex-start;
}

.bbstat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
}

.bbstat-divider {
  width: 1px;
  height: 18px;
  background: linear-gradient(
    to bottom,
    transparent,
    #5c3210 30%,
    #7a4818 50%,
    #5c3210 70%,
    transparent
  );
  flex-shrink: 0;
}

.bbstat-icon {
  font-size: 15px;
  color: #9a6830;
  line-height: 1;
  filter: drop-shadow(0 0 3px rgba(200, 140, 40, 0.7));
}
.bbstat-icon--green {
  color: #74d448;
  filter: drop-shadow(0 0 3px rgba(116, 212, 72, 0.7));
}
.bbstat-icon--red {
  color: #ff7a50;
  filter: drop-shadow(0 0 3px rgba(255, 100, 60, 0.7));
}

.bbstat-label {
  font-size: 10px;
  color: #6a4418;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  line-height: 1;
  margin-right: 1px;
}

.bbstat-val {
  font-size: 17px;
  color: #d4a838;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 4px rgba(220, 170, 50, 0.8),
    0 0 10px rgba(200, 140, 30, 0.5);
}
.bbstat-val--gold {
  color: #fbbf24;
  text-shadow:
    0 0 4px rgba(251, 191, 36, 0.8),
    0 0 10px rgba(251, 191, 36, 0.5);
}
.bbstat-val--green {
  color: #74d448;
  text-shadow:
    0 0 4px rgba(116, 212, 72, 0.8),
    0 0 10px rgba(116, 212, 72, 0.5);
}
.bbstat-val--red {
  color: #ff7a50;
  text-shadow:
    0 0 4px rgba(255, 100, 60, 0.8),
    0 0 10px rgba(255, 100, 60, 0.5);
}

/* ── Ability Cooldown Slots ───────────────────────────────────────────── */
.ability-role-icon {
  font-size: 16px;
  filter: drop-shadow(0 0 3px rgba(200, 160, 60, 0.7));
}

.ability-cd-val {
  font-size: 17px;
  color: #d4a838;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 4px rgba(220, 170, 50, 0.8),
    0 0 10px rgba(200, 140, 30, 0.5);
  transition: color 0.2s, text-shadow 0.2s;
}

.ability-slot--cooldown .ability-role-icon {
  filter: grayscale(55%) brightness(0.55) drop-shadow(0 0 2px rgba(100, 80, 20, 0.4));
  opacity: 0.7;
}

.ability-slot--cooldown .ability-cd-val {
  color: #7a5810;
  text-shadow: none;
}

.ability-slot--flash .ability-role-icon {
  filter: drop-shadow(0 0 6px var(--role-color, #e8c040)) drop-shadow(0 0 12px var(--role-color, #e8c040));
  animation: ability-icon-flash 0.45s ease-out;
}

.ability-slot--flash .ability-cd-val {
  color: var(--role-color, #e8c040);
  text-shadow: 0 0 8px var(--role-color, #e8c040);
  animation: ability-val-flash 0.45s ease-out;
}

.ability-slot--inactive {
  opacity: 0.3;
  filter: grayscale(80%);
}

@keyframes ability-icon-flash {
  0% { filter: drop-shadow(0 0 14px var(--role-color, #e8c040)) brightness(1.4); }
  100% { filter: drop-shadow(0 0 6px var(--role-color, #e8c040)); }
}

@keyframes ability-val-flash {
  0% { text-shadow: 0 0 16px var(--role-color, #e8c040), 0 0 32px var(--role-color, #e8c040); }
  100% { text-shadow: 0 0 8px var(--role-color, #e8c040); }
}

/* ── Right Stats ─────────────────────────────────────────────────────── */
.title-center {
  text-align: center;
  color: #e8c040;
  font-size: 30px;
  letter-spacing: 10px;
  white-space: nowrap;
  text-shadow:
    0 0 2px #fffbe8,
    0 0 5px #ffe060,
    0 0 12px rgba(232, 192, 64, 1),
    0 0 24px rgba(210, 155, 30, 0.85),
    0 0 45px rgba(180, 120, 16, 0.6),
    0 0 80px rgba(140, 90, 10, 0.35);
  animation: title-flicker 6s ease-in-out infinite;
}

.stats-right {
  display: flex;
  align-items: center;
  gap: 0;
  justify-content: flex-end;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 24px;
}

.stat-divider {
  width: 1px;
  height: 18px;
  background: linear-gradient(
    to bottom,
    transparent,
    #5c3210 30%,
    #7a4818 50%,
    #5c3210 70%,
    transparent
  );
  flex-shrink: 0;
}

.stat-icon {
  font-size: 15px;
  color: #9a6830;
  line-height: 1;
  filter: drop-shadow(0 0 3px rgba(200, 140, 40, 0.7));
}

.stat-label {
  font-size: 10px;
  color: #6a4418;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  line-height: 1;
  margin-right: 1px;
}

.stat-value {
  font-size: 17px;
  color: #d4a838;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow:
    0 0 4px rgba(220, 170, 50, 0.8),
    0 0 10px rgba(200, 140, 30, 0.5);
  transition:
    color 0.3s ease,
    text-shadow 0.3s ease;
}

.stat-sep {
  font-size: 12px;
  color: #5c3a14;
  line-height: 1;
}

.stat-value.hp-low {
  color: #e06050;
  text-shadow:
    0 0 6px rgba(220, 80, 60, 0.9),
    0 0 14px rgba(180, 50, 40, 0.6);
  animation: hp-pulse 1s ease-in-out infinite;
}

.stat-value.loss {
  color: #a04848;
  text-shadow: 0 0 4px rgba(160, 60, 60, 0.6);
}

.stat-value.streak {
  color: #f0d040;
  text-shadow:
    0 0 5px rgba(255, 210, 50, 0.9),
    0 0 12px rgba(230, 170, 30, 0.65);
}

@keyframes title-flicker {
  0%,
  92%,
  100% {
    opacity: 1;
  }
  94% {
    opacity: 0.85;
  }
  96% {
    opacity: 1;
  }
  98% {
    opacity: 0.9;
  }
}

@keyframes hp-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.65;
  }
}
</style>
