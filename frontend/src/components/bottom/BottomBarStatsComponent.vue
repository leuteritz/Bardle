<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { formatNumber } from '@/config/numberFormat'
import { ROLES } from '@/config/constants'

const gameStore = useGameStore()
const battleStore = useBattleStore()
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
</script>

<template>
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
</template>

<style scoped>
.bbstats {
  display: flex;
  align-items: center;
  gap: 0;
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
</style>
