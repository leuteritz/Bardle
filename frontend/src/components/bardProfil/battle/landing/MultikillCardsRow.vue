<template>
  <div class="mk-row">
    <div class="mk-card mk-card--double">
      <div class="mk-value mk-value--double">{{ $formatNumber(allTime.multikills.double) }}</div>
      <div class="mk-label mk-label--double">DOUBLE KILLS</div>
    </div>
    <div class="mk-card mk-card--triple">
      <div class="mk-value mk-value--triple">{{ $formatNumber(allTime.multikills.triple) }}</div>
      <div class="mk-label mk-label--triple">TRIPLE KILLS</div>
    </div>
    <div class="mk-card mk-card--quadra">
      <div class="mk-value mk-value--quadra">{{ $formatNumber(allTime.multikills.quadra) }}</div>
      <div class="mk-label mk-label--quadra">QUADRA KILLS</div>
    </div>
    <div class="mk-card mk-card--penta">
      <div class="mk-shimmer" />
      <div class="mk-value mk-value--penta">{{ $formatNumber(allTime.multikills.penta) }}</div>
      <div class="mk-label mk-label--penta">PENTA KILLS</div>
    </div>
    <div class="mk-card mk-card--mvp">
      <Icon icon="game-icons:laurels-trophy" width="24" height="24" class="mk-mvp-icon" />
      <div class="mk-value mk-value--mvp">{{ $formatNumber(allTime.mvpAwards) }}</div>
      <div class="mk-label mk-label--mvp">MVP AWARDS</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'

const { allTime } = storeToRefs(useBattleStore())
</script>

<style scoped>
.mk-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  flex-shrink: 0;
}

.mk-card {
  position: relative;
  padding: 10px 8px;
  text-align: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 5px;
  overflow: hidden;
}

.mk-card--double { border: 1px solid rgba(120, 140, 255, 0.3); }
.mk-card--triple { border: 1px solid rgba(120, 180, 120, 0.3); }
.mk-card--quadra { border: 1px solid rgba(200, 150, 60, 0.35); }
.mk-card--penta {
  border: 1px solid rgba(240, 104, 32, 0.5);
  background: linear-gradient(to bottom, rgba(240, 104, 32, 0.14), rgba(0, 0, 0, 0.4));
  box-shadow: 0 0 16px rgba(240, 104, 32, 0.2);
}
.mk-card--mvp {
  border: 1px solid rgba(212, 160, 32, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mk-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 180, 80, 0.2), transparent);
  animation: mk-shimmer 2.4s ease-in-out infinite;
  pointer-events: none;
}

.mk-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}
.mk-value--double { color: #93c5fd; }
.mk-value--triple { color: #7ce0a0; }
.mk-value--quadra { color: #e8c040; }
.mk-value--penta {
  color: #ff9a40;
  text-shadow: 0 0 12px rgba(240, 104, 32, 0.6);
}
.mk-value--mvp { color: #e8c040; }

.mk-label {
  font-size: 10px;
  letter-spacing: 1px;
  margin-top: 4px;
}
.mk-label--double { color: #6a7fb0; }
.mk-label--triple { color: #6aa080; }
.mk-label--quadra { color: #8a7040; }
.mk-label--penta { color: #c88040; }
.mk-label--mvp { color: #8a7040; }

.mk-mvp-icon {
  color: #e8c040;
  margin-bottom: 2px;
}

@keyframes mk-shimmer {
  0% { transform: translateX(-150%); }
  100% { transform: translateX(350%); }
}

@media (prefers-reduced-motion: reduce) {
  .mk-shimmer { animation: none; }
}
</style>
