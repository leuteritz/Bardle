<script setup lang="ts">
import { computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useUiStore } from '@/stores/uiStore'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  SUN_PHASE_DISPLAY_OFFSET,
  SUN_PHASE_DISPLAY_TOTAL,
} from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const uiStore = useUiStore()

const phaseData = computed(() =>
  solarStore.isCometState ? COMET_PHASE_DATA : STAR_PHASE_DATA[solarStore.starPhase],
)

// Comet counts as display phase 1; sun phases render as starPhase + offset.
const phaseLabel = computed(() => {
  const displayPhase = solarStore.isCometState
    ? 1
    : solarStore.starPhase + SUN_PHASE_DISPLAY_OFFSET
  return `Sun · Phase ${displayPhase}/${SUN_PHASE_DISPLAY_TOTAL}`
})

const glowColor = computed(() =>
  solarStore.isCometState ? COMET_PHASE_DATA.glow : STAR_PHASE_DATA[solarStore.starPhase].glow1,
)

const sunStyle = computed(() => {
  const p = phaseData.value
  return {
    background: `radial-gradient(circle at 38% 34%, ${p.core}, ${p.mid} 42%, ${p.edge} 100%)`,
    '--sun-glow': glowColor.value,
  }
})

/** Dwell progress 0–100. A phase with no dwell requirement counts as complete. */
const dwellProgress = computed(() => {
  const required = solarStore.phaseDwellRequiredMs
  if (required <= 0) return 100
  return Math.min(100, (solarStore.phaseDwellElapsedMs / required) * 100)
})

const dwellComplete = computed(() => solarStore.phaseDwellRemainingMs <= 0)

const dwellText = computed(() => {
  if (dwellComplete.value) return 'phase complete'
  const totalSec = Math.floor(solarStore.phaseDwellElapsedMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const t = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
  return `${t} in phase`
})
</script>

<template>
  <button
    class="sun-phase"
    :title="`${phaseData.name} — open Stats`"
    @click="uiStore.setBardTab('bard')"
  >
    <div class="sun-wrap">
      <div class="sun" :style="sunStyle"></div>
      <svg class="sun-ring" viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="22" fill="none" stroke="rgba(0, 0, 0, 0.55)" stroke-width="3" />
        <circle
          cx="25"
          cy="25"
          r="22"
          fill="none"
          :stroke="dwellComplete ? '#6ec040' : glowColor"
          stroke-width="3"
          stroke-linecap="round"
          pathLength="100"
          stroke-dasharray="100"
          :stroke-dashoffset="100 - dwellProgress"
          class="sun-ring-fill"
          :style="{ '--ring-glow': dwellComplete ? '#6ec040' : glowColor }"
        />
      </svg>
    </div>
    <div class="info-grp">
      <span class="info-lbl">{{ phaseLabel }}</span>
      <span class="info-name">{{ phaseData.name }}</span>
      <span class="dwell" :class="{ 'dwell--complete': dwellComplete }">
        <span class="dwell-dot"></span>{{ dwellText }}
      </span>
    </div>
  </button>
</template>

<style scoped>
.sun-phase {
  display: flex;
  align-items: center;
  gap: clamp(5px, 0.7vw, 9px);
  min-width: 0;
  flex-shrink: 0;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.sun-wrap {
  position: relative;
  width: clamp(34px, 3.6vw, 50px);
  height: clamp(34px, 3.6vw, 50px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sun {
  width: 68%;
  height: 68%;
  border-radius: 50%;
  box-shadow:
    0 0 11px 2px var(--sun-glow),
    inset -3px -4px 8px rgba(0, 0, 0, 0.45);
  animation: sun-pulse 5s ease-in-out infinite;
  transition: transform 0.2s;
}

.sun-phase:hover .sun {
  transform: scale(1.08);
}

.sun-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}

.sun-ring-fill {
  filter: drop-shadow(0 0 3px var(--ring-glow));
  transition: stroke-dashoffset 0.8s ease-out;
}

.info-grp {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-lbl {
  font-size: clamp(0.48rem, 0.5vw, 0.56rem);
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.5);
  line-height: 1;
  white-space: nowrap;
}

.info-name {
  font-size: clamp(0.72rem, 0.85vw, 0.92rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.3);
}

.dwell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(0.58rem, 0.65vw, 0.7rem);
  font-weight: 700;
  color: #ffd88a;
  line-height: 1;
  white-space: nowrap;
}

.dwell--complete {
  color: #8adc50;
}

.dwell-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd600;
  box-shadow: 0 0 6px rgba(255, 214, 0, 0.7);
  animation: dot-pulse 2.4s ease-in-out infinite;
  flex-shrink: 0;
}

.dwell--complete .dwell-dot {
  background: #6ec040;
  box-shadow: 0 0 6px rgba(110, 192, 64, 0.8);
}

@keyframes sun-pulse {
  0%,
  100% {
    box-shadow:
      0 0 11px 2px var(--sun-glow),
      inset -3px -4px 8px rgba(0, 0, 0, 0.45);
  }
  50% {
    box-shadow:
      0 0 19px 5px var(--sun-glow),
      inset -3px -4px 8px rgba(0, 0, 0, 0.45);
  }
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 11px rgba(255, 214, 0, 0.95);
  }
}
</style>
