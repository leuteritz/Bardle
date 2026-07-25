<template>
  <!-- Top ribbon of the landing stage: the ladder record at a glance.
       Secondary by design — it frames the stage without competing with it. -->
  <div class="record-ribbon">
    <span class="ribbon-kicker">SEASON RECORD</span>

    <div class="ribbon-cells">
      <div class="cell">
        <span class="cell-value cell-value--win">{{ $formatNumber(totalWins) }}</span>
        <span class="cell-label">WINS</span>
      </div>
      <span class="cell-sep" />
      <div class="cell">
        <span class="cell-value cell-value--loss">{{ $formatNumber(totalLosses) }}</span>
        <span class="cell-label">LOSSES</span>
      </div>
      <span class="cell-sep" />
      <div class="cell">
        <span class="cell-value cell-value--gold">{{ winRateStr }}%</span>
        <span class="cell-label">WINRATE</span>
      </div>
      <span class="cell-sep" />
      <div class="cell">
        <span class="cell-value" :class="{ 'streak-fire': currentWinStreak >= 3 }">
          {{ currentWinStreak }}W
        </span>
        <span class="cell-label">STREAK</span>
      </div>
      <span class="cell-sep" />
      <div class="cell">
        <span class="cell-value">{{ bestWinStreak }}W</span>
        <span class="cell-label">BEST</span>
      </div>
      <span class="cell-sep" />
      <div class="cell">
        <span class="cell-value">{{ $formatNumber(mmr) }}</span>
        <span class="cell-label">MMR</span>
      </div>
      <span class="cell-sep" />
      <div class="cell">
        <span class="cell-value">{{ $formatNumber(totalBattles) }}</span>
        <span class="cell-label">GAMES</span>
      </div>
    </div>

    <!-- Win/loss share as a single split bar -->
    <div class="wl-bar" :title="`${totalWins} W · ${totalLosses} L`">
      <div class="wl-win" :style="{ width: winSharePct + '%' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'

const battleStore = useBattleStore()
const { mmr, totalWins, totalLosses, totalBattles, currentWinStreak, bestWinStreak } =
  storeToRefs(battleStore)

const winRateStr = computed(() =>
  totalBattles.value === 0 ? '0.0' : ((totalWins.value / totalBattles.value) * 100).toFixed(1),
)

/** Bar sits at 50/50 before the first game so it never reads as a total loss. */
const winSharePct = computed(() =>
  totalBattles.value === 0 ? 50 : (totalWins.value / totalBattles.value) * 100,
)
</script>

<style scoped>
.record-ribbon {
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.2vw, 22px);
  flex-shrink: 0;
  padding: clamp(5px, 0.8vh, 9px) clamp(12px, 1.2vw, 20px);
  background: #0f0d08;
  border: 1px solid #241d10;
  border-radius: 5px;
}

.ribbon-kicker {
  flex-shrink: 0;
  font-size: clamp(9px, 1.1vh, 11px);
  font-weight: 700;
  letter-spacing: 3px;
  color: #8a7040;
}

.ribbon-cells {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 18px);
}

.cell {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.cell-sep {
  width: 1px;
  height: clamp(12px, 1.6vh, 18px);
  background: #241d10;
  flex-shrink: 0;
}

.cell-value {
  font-size: clamp(13px, 1.75vh, 18px);
  font-weight: 700;
  line-height: 1;
  color: #e8e2d0;
}
.cell-value--win {
  color: #52b830;
}
.cell-value--loss {
  color: #cc6050;
}
.cell-value--gold {
  color: #e8c040;
}

.streak-fire {
  color: #f06820;
  animation: streak-pulse 1.6s ease-in-out infinite;
}

.cell-label {
  font-size: clamp(8px, 0.95vh, 10px);
  letter-spacing: 1.5px;
  color: #8a8070;
  white-space: nowrap;
}

/* Win share bar takes whatever width is left over */
.wl-bar {
  flex: 1;
  min-width: 60px;
  height: clamp(5px, 0.7vh, 8px);
  background: #4a2018;
  border: 1px solid #241d10;
  border-radius: 4px;
  overflow: hidden;
}

.wl-win {
  height: 100%;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes streak-pulse {
  0%,
  100% {
    text-shadow: 0 0 12px rgba(240, 104, 32, 0.45);
  }
  50% {
    text-shadow: 0 0 28px rgba(240, 104, 32, 0.95);
  }
}

/* Full HD and flatter: drop the least important cells before anything wraps */
@media (max-height: 880px) {
  .ribbon-kicker {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .streak-fire {
    animation: none;
  }
}
</style>
