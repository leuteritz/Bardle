<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat'

const gameStore = useGameStore()
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
  gap: 7px;
  padding: 0 24px;
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
</style>
