<template>
  <button
    type="button"
    class="stop-fab"
    :class="{ 'stop-fab--armed': battleStore.stopRequested }"
    @click="battleStore.requestStopAutoBattle()"
  >
    <span class="stop-fab-icon">
      <Icon icon="game-icons:power-button" width="30" height="30" />
    </span>
    <span class="stop-fab-text">
      <span class="stop-fab-title">
        {{ battleStore.stopRequested ? 'STOPPING AFTER THIS MATCH' : 'STOP AUTO-BATTLE' }}
      </span>
      <span class="stop-fab-sub">
        {{
          battleStore.stopRequested
            ? 'Click to cancel — keep battling'
            : 'Finish match, then return to landing'
        }}
      </span>
    </span>
    <span v-if="battleStore.stopRequested" class="stop-fab-dot" />
  </button>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'

const battleStore = useBattleStore()
</script>

<style scoped>
/* Floating overlay pinned to the top-center of the board — absolute, so it
   takes NO flow height and the square rift map keeps its full size. */
.stop-fab {
  position: absolute;
  top: clamp(6px, 1.2cqh, 14px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  display: flex;
  align-items: center;
  gap: clamp(9px, 0.9cqw, 15px);
  min-height: clamp(40px, 5cqh, 56px);
  padding: clamp(6px, 0.8cqh, 11px) clamp(16px, 1.8cqw, 28px);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  background: #17110b;
  border: 2px solid #cc6050;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #4a1a12,
    0 4px 18px rgba(0, 0, 0, 0.65),
    0 0 20px rgba(204, 96, 80, 0.3);
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.1s;
}
.stop-fab:hover {
  background: #22140d;
  border-color: #e07862;
  box-shadow:
    inset 0 0 0 1px #5c221a,
    0 4px 18px rgba(0, 0, 0, 0.65),
    0 0 32px rgba(224, 120, 98, 0.5);
  transform: translateX(-50%) scale(1.02);
}
.stop-fab:active {
  transform: translateX(-50%) scale(0.98);
}

.stop-fab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #f0a090;
}

.stop-fab-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.1;
}
.stop-fab-title {
  font-size: clamp(14px, 1.8cqh, 20px);
  font-weight: 700;
  letter-spacing: 3px;
  color: #f2b0a0;
}
.stop-fab-sub {
  font-size: clamp(10px, 1.2cqh, 13px);
  letter-spacing: 1px;
  color: #b07868;
}

/* ── Armed: stop is queued, gold pulse, cancelable ── */
.stop-fab--armed {
  background: #1c1507;
  border-color: #e8c040;
  box-shadow:
    inset 0 0 0 1px #5c4410,
    0 4px 18px rgba(0, 0, 0, 0.65),
    0 0 24px rgba(232, 192, 64, 0.4);
  animation: stop-armed-glow 1.8s ease-in-out infinite;
}
.stop-fab--armed:hover {
  background: #241c09;
  border-color: #f0d060;
}
.stop-fab--armed .stop-fab-icon {
  color: #f0d878;
}
.stop-fab--armed .stop-fab-title {
  color: #f0d060;
}
.stop-fab--armed .stop-fab-sub {
  color: #b09848;
}

.stop-fab-dot {
  flex-shrink: 0;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #e8c040;
  box-shadow: 0 0 9px rgba(232, 192, 64, 0.9);
  animation: stop-dot-pulse 1.2s ease-in-out infinite;
}

@keyframes stop-armed-glow {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px #5c4410,
      0 4px 18px rgba(0, 0, 0, 0.65),
      0 0 18px rgba(232, 192, 64, 0.3);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px #5c4410,
      0 4px 18px rgba(0, 0, 0, 0.65),
      0 0 38px rgba(232, 192, 64, 0.6);
  }
}

@keyframes stop-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

/* Full HD: keep the pill tight so it covers as little of the map as possible */
@media (max-height: 1100px) {
  .stop-fab {
    min-height: 38px;
    padding: 5px clamp(16px, 1.8cqw, 28px);
  }
  .stop-fab-sub {
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stop-fab--armed {
    animation: none;
  }
  .stop-fab-dot {
    animation: none;
  }
}
</style>
