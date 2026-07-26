<script setup lang="ts">
import { computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useUiStore } from '@/stores/uiStore'
import { STAR_PHASE_DATA, COMET_PHASE_DATA, SUN_PHASE_DISPLAY_TOTAL } from '@/config/constants'
import { useSunPhaseDisplay } from '@/composables/useSunPhaseDisplay'

const solarStore = useSolarUpgradeStore()
const uiStore = useUiStore()
const { currentDisplayPhase } = useSunPhaseDisplay()

const isComet = computed(() => solarStore.isCometState)

const phaseData = computed(() =>
  isComet.value ? COMET_PHASE_DATA : STAR_PHASE_DATA[solarStore.starPhase],
)

const glowColor = computed(() =>
  isComet.value ? COMET_PHASE_DATA.glow : STAR_PHASE_DATA[solarStore.starPhase].glow1,
)

/** Identity colour of the phase — drives name, edge line and the segment track. */
const accentColor = computed(() =>
  isComet.value ? COMET_PHASE_DATA.accent : STAR_PHASE_DATA[solarStore.starPhase].phasePrimary,
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
  const totalSec = Math.floor(solarStore.phaseDwellElapsedMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
})

const plateStyle = computed(() => ({
  '--ph-accent': accentColor.value,
  '--ph-glow': glowColor.value,
}))
</script>

<template>
  <button
    class="sun-plate"
    :class="{ 'sun-plate--ready': dwellComplete }"
    :style="plateStyle"
    :title="`${phaseData.name} — ${phaseData.astroName} · open Stats`"
    @click="uiStore.setBardTab('bard')"
  >
    <span class="plate-edge" aria-hidden="true"></span>

    <!-- Row 1 — orb with dwell ring + phase counter + time in phase -->
    <div class="plate-top">
      <div class="orb-wrap">
        <div v-if="dwellComplete" class="orb-ripple" aria-hidden="true"></div>
        <div class="orb" :style="sunStyle"></div>
        <svg class="orb-ring" viewBox="0 0 50 50" aria-hidden="true">
          <circle cx="25" cy="25" r="23" fill="none" stroke="rgba(0, 0, 0, 0.6)" stroke-width="2.4" />
          <circle
            cx="25"
            cy="25"
            r="23"
            fill="none"
            :stroke="dwellComplete ? '#6ec040' : glowColor"
            stroke-width="2.4"
            stroke-linecap="round"
            pathLength="100"
            stroke-dasharray="100"
            :stroke-dashoffset="100 - dwellProgress"
            class="orb-ring-fill"
            :style="{ '--ring-glow': dwellComplete ? '#6ec040' : glowColor }"
          />
        </svg>
      </div>

      <div class="meta">
        <span class="meta-label">Phase</span>
        <span class="meta-count">
          <b>{{ currentDisplayPhase }}</b><i>/{{ SUN_PHASE_DISPLAY_TOTAL }}</i>
        </span>
        <span class="meta-dwell">{{ dwellComplete ? 'READY' : dwellText }}</span>
      </div>
    </div>

    <!-- Row 2 — the phase name, full plate width so it can run as large as possible -->
    <span class="plate-name">{{ phaseData.name }}</span>

    <!-- Row 3 — segmented progression across all sun phases -->
    <div class="track" aria-hidden="true">
      <span
        v-for="i in SUN_PHASE_DISPLAY_TOTAL"
        :key="i"
        class="seg"
        :class="{ 'seg--past': i < currentDisplayPhase, 'seg--now': i === currentDisplayPhase }"
      ></span>
    </div>
  </button>
</template>

<style scoped>
/* ================================================================
   PLATE — fills the full header height; width is the scarce axis
   (the header caps at 1400px, so ~150px is all that is free next
   to the universe-rescue block). Every size therefore derives from
   --header-height, not from vw: the header itself is height-driven.
   ================================================================ */
.sun-plate {
  --pad-y: clamp(2px, calc(var(--header-height) * 0.035), 5px);
  --pad-x: clamp(5px, 0.55vw, 9px);
  --row-gap: calc(var(--header-height) * 0.025);

  position: relative;
  align-self: stretch;
  flex: 0 1 auto;
  width: clamp(118px, 7.8vw, 150px);
  min-width: 112px;
  margin: clamp(2px, calc(var(--header-height) * 0.025), 4px) 0;
  padding: var(--pad-y) var(--pad-x);
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--row-gap);

  background: linear-gradient(to bottom, #1a1610, #111008);
  border: 1px solid #5c3310;
  border-radius: 5px;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.07),
    inset 0 -10px 16px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.sun-plate:hover {
  border-color: #7a4e20;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.12),
    inset 0 -10px 16px rgba(0, 0, 0, 0.35);
}

/* Phase-tinted signature line along the top edge of the plate */
.plate-edge {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(to right, transparent, var(--ph-accent), transparent);
  opacity: 0.85;
  pointer-events: none;
}

/* ================================================================
   ROW 1 — orb + counter
   ================================================================ */
.plate-top {
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.4vw, 8px);
  min-width: 0;
}

.orb-wrap {
  position: relative;
  width: calc(var(--header-height) * 0.46);
  height: calc(var(--header-height) * 0.46);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb {
  position: relative;
  width: 74%;
  height: 74%;
  border-radius: 50%;
  box-shadow:
    0 0 12px 2px var(--sun-glow),
    inset -3px -4px 9px rgba(0, 0, 0, 0.45);
  transition: transform 0.2s;
}

/* Der Atem der Sonne läuft über eine separate Glut-Ebene mit opacity statt
   über animiertes box-shadow: eine Paint-Animation im dauerhaft sichtbaren
   Header zwingt den Browser sonst jede Frame zum Repaint der ganzen Seite. */
.orb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 20px 5px var(--sun-glow);
  opacity: 0;
  animation: sun-pulse 5s ease-in-out infinite;
}

.sun-plate:hover .orb {
  transform: scale(1.07);
}

.orb-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}

.orb-ring-fill {
  filter: drop-shadow(0 0 3px var(--ring-glow));
  transition: stroke-dashoffset 0.8s ease-out;
}

.orb-ripple {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  border: 2px solid rgba(110, 192, 64, 0.8);
  pointer-events: none;
  animation: ripple-out 2.4s ease-out infinite;
}

/* ── Counter column ─────────────────────────────── */
.meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(var(--header-height) * 0.018);
  min-width: 0;
}

.meta-label {
  font-size: max(9px, calc(var(--header-height) * 0.115));
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.52);
  line-height: 1;
  white-space: nowrap;
}

.meta-count {
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.meta-count b {
  font-size: max(12px, calc(var(--header-height) * 0.165));
  font-weight: 900;
  color: #f4e0b0;
}

.meta-count i {
  font-style: normal;
  font-size: max(9px, calc(var(--header-height) * 0.115));
  font-weight: 700;
  color: rgba(200, 185, 140, 0.45);
}

.meta-dwell {
  font-size: max(10px, calc(var(--header-height) * 0.128));
  font-weight: 700;
  color: #ffd88a;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

/* ================================================================
   ROW 2 — the phase name, the element the whole plate is built around
   ================================================================ */
.plate-name {
  font-size: min(calc(var(--header-height) * 0.21), 24px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: 0.01em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ph-accent);
  text-shadow:
    0 0 9px var(--ph-glow),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

/* ================================================================
   ROW 3 — one segment per sun phase (comet included)
   ================================================================ */
.track {
  display: flex;
  align-items: stretch;
  gap: clamp(2px, 0.15vw, 4px);
  height: calc(var(--header-height) * 0.07);
  min-height: 5px;
}

.seg {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 2px;
  background: #241c12;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
}

.seg--past {
  background: var(--ph-accent);
  opacity: 0.45;
}

.seg--now {
  background: var(--ph-accent);
  box-shadow:
    0 0 7px var(--ph-glow),
    inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

/* ================================================================
   READY — dwell requirement met, the phase can be evolved
   ================================================================ */
.sun-plate--ready {
  border-color: #4a7a28;
}

.sun-plate--ready .plate-edge {
  background: linear-gradient(to right, transparent, #6ec040, transparent);
}

.sun-plate--ready .plate-name {
  color: #8adc50;
  text-shadow: 0 0 10px rgba(110, 192, 64, 0.6);
  animation: complete-pulse 2.4s ease-in-out infinite;
}

.sun-plate--ready .meta-dwell {
  color: #8adc50;
  letter-spacing: 0.12em;
}

.sun-plate--ready .seg--now {
  background: #6ec040;
  box-shadow:
    0 0 7px rgba(110, 192, 64, 0.9),
    inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

@keyframes ripple-out {
  0% {
    transform: scale(0.7);
    opacity: 0.9;
  }
  70% {
    transform: scale(1.25);
    opacity: 0;
  }
  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

@keyframes complete-pulse {
  0%,
  100% {
    text-shadow: 0 0 6px rgba(110, 192, 64, 0.5);
  }
  50% {
    text-shadow:
      0 0 14px rgba(110, 192, 64, 1),
      0 0 26px rgba(110, 192, 64, 0.5);
  }
}

@keyframes sun-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb::after,
  .orb-ripple,
  .sun-plate--ready .plate-name {
    animation: none;
  }
}
</style>
