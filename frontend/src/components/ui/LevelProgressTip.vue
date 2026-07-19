<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'

/* Tooltip body for the level badge / center chimes display: progress towards
   the next level (chimes collected this level + percent). */
const gameStore = useGameStore()

const progress = computed(() => Math.max(0, Math.min(1, (gameStore.levelProgress ?? 0) / 100)))
</script>

<template>
  <div class="lv-tt">
    <div class="lv-tt__title">Next Level</div>
    <div class="lv-tt__body">
      <div class="lv-tt__row">
        <span class="lv-tt__current">{{ gameStore.currentLevelChimes.toLocaleString('en-US') }}</span>
        <span class="lv-tt__sep">/</span>
        <span class="lv-tt__total">{{ gameStore.totalChimesThisLevel.toLocaleString('en-US') }}</span>
        <span class="lv-tt__unit">Chimes</span>
      </div>
      <div class="lv-tt__bar-track">
        <div class="lv-tt__bar-fill" :style="{ width: `${progress * 100}%` }" />
      </div>
    </div>
    <div class="lv-tt__hint">{{ Math.round(progress * 100) }} % to next level</div>
  </div>
</template>

<style scoped>
.lv-tt {
  padding: 8px 0 7px;
  min-width: 190px;
}

.lv-tt__title {
  padding: 0 12px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  border-bottom: 1px solid #3e200a;
}

.lv-tt__body {
  padding: 8px 12px 7px;
}

.lv-tt__row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.lv-tt__current {
  font-size: 0.9rem;
  font-weight: 900;
  color: #e8c040;
}

.lv-tt__sep {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.22);
}

.lv-tt__total {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.52);
}

.lv-tt__unit {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 3px;
}

.lv-tt__bar-track {
  height: 4px;
  background: rgba(255, 200, 80, 0.1);
  border-radius: 2px;
  margin-top: 7px;
  overflow: hidden;
}

.lv-tt__bar-fill {
  height: 100%;
  background: linear-gradient(to right, #c89040, #f0d060);
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(240, 208, 96, 0.5);
  transition: width 0.8s ease;
}

.lv-tt__hint {
  padding: 5px 12px 0;
  border-top: 1px solid #3e200a;
  font-size: 0.72rem;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}
</style>
