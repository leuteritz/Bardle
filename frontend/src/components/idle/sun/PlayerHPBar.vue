<template>
  <div class="hp-bar-container" :class="{ 'hp-bar-container--hit': wasHit }">
    <div class="hp-header">
      <span class="hp-icon">♥</span>
      <span class="hp-value">
        {{ Math.ceil(playerStore.currentHP) }}<span class="hp-sep"> / </span>{{ playerStore.maxHP }}
      </span>
    </div>

    <div class="hp-track">
      <div
        class="hp-fill"
        :class="{ 'hp-fill--low': playerStore.isLow }"
        :style="{ width: playerStore.hpPercent + '%' }"
      />
    </div>

    <Teleport to="body">
      <div v-if="playerStore.isLow" class="hp-vignette" aria-hidden="true" />
      <div class="dmg-float-layer" aria-hidden="true">
        <span v-for="f in playerStore.damageFloats" :key="f.id" class="dmg-float"
          >-{{ f.value }}</span
        >
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../../../stores/playerStore'

export default defineComponent({
  name: 'PlayerHPBar',
  setup() {
    const playerStore = usePlayerStore()
    const wasHit = ref(false)
    let hitTimer: ReturnType<typeof setTimeout> | null = null
    let pruneInterval: ReturnType<typeof setInterval> | null = null

    watch(
      () => playerStore.currentHP,
      (newVal, oldVal) => {
        if (newVal < oldVal) {
          wasHit.value = true
          if (hitTimer) clearTimeout(hitTimer)
          hitTimer = setTimeout(() => {
            wasHit.value = false
          }, 350)
        }
      },
    )

    onMounted(() => {
      pruneInterval = setInterval(() => playerStore.pruneFloats(), 500)
    })

    onUnmounted(() => {
      if (pruneInterval) clearInterval(pruneInterval)
      if (hitTimer) clearTimeout(hitTimer)
    })

    return { playerStore, wasHit, Math }
  },
})
</script>

<style scoped>
/* ── Container – kein Background, kein Border ── */
.hp-bar-container {
  position: fixed;
  top: calc(50% - 116px);
  left: 50%;
  transform: translate(-50%, -100%);
  z-index: 20;
  pointer-events: none;
  width: 220px;
}

/* ── Header ── */
.hp-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-bottom: 5px;
}

.hp-icon {
  font-size: 0.9rem;
  color: #cc2010;
  line-height: 1;
  flex-shrink: 0;
  text-shadow:
    0 0 8px rgba(220, 40, 18, 0.9),
    0 0 20px rgba(200, 30, 10, 0.5);
}

.hp-value {
  font-size: 1rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  text-shadow:
    0 0 12px rgba(220, 175, 40, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

.hp-sep {
  color: #7a5820;
  font-weight: 400;
  letter-spacing: 0;
}

/* ── Bar Track ── */
.hp-track {
  position: relative;
  width: 100%;
  height: 7px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 1px;
  box-shadow:
    inset 0 1px 4px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(80, 40, 8, 0.45);
  overflow: hidden;
}

/* Segmentlinien bei 25 / 50 / 75 % */
.hp-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(25% - 0.5px),
    rgba(0, 0, 0, 0.45) calc(25% - 0.5px),
    rgba(0, 0, 0, 0.45) 25%
  );
  z-index: 2;
  pointer-events: none;
}

/* ── Bar Fill ── */
.hp-fill {
  position: relative;
  height: 100%;
  background: linear-gradient(90deg, #620b05 0%, #a81206 30%, #d41e0e 68%, #f83820 100%);
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(240, 52, 18, 0.65);
}

/* Sheen */
.hp-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 0%, transparent 100%);
  pointer-events: none;
}

/* Low-HP-Puls */
.hp-fill--low {
  animation: hp-pulse 0.75s ease-in-out infinite alternate;
}

@keyframes hp-pulse {
  from {
    box-shadow: 0 0 6px rgba(255, 48, 18, 0.5);
  }
  to {
    box-shadow:
      0 0 24px rgba(255, 48, 18, 1),
      0 0 8px rgba(255, 85, 20, 0.85),
      inset 0 0 5px rgba(255, 110, 50, 0.3);
  }
}

/* ── Vignette ── */
.hp-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  background: radial-gradient(
    ellipse at center,
    transparent 42%,
    rgba(165, 18, 0, 0.16) 70%,
    rgba(140, 8, 0, 0.33) 100%
  );
  animation: vignette-pulse 1.4s ease-in-out infinite alternate;
}

@keyframes vignette-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

/* ── Hit Flash ── */
.hp-bar-container--hit .hp-track {
  box-shadow:
    inset 0 1px 4px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 40, 10, 0.7),
    0 0 14px rgba(255, 40, 10, 0.5);
  transition: box-shadow 0.35s ease-out;
}

/* ── Damage Floats ── */
.dmg-float-layer {
  position: fixed;
  top: calc(50% - 116px);
  left: 50%;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 30;
  width: 0;
  height: 0;
}

.dmg-float {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.1rem;
  font-weight: 700;
  color: #f83820;
  text-shadow:
    0 0 8px rgba(255, 40, 10, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  animation: dmg-float-up 1.4s ease-out forwards;
  pointer-events: none;
}

@keyframes dmg-float-up {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-38px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hp-fill--low {
    animation: none;
  }
  .hp-vignette {
    animation: none;
  }
  .dmg-float {
    animation: none;
  }
}
</style>
