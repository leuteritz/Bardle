<script setup lang="ts">
import { computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useUiStore } from '@/stores/core/uiStore'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  MS_PER_SECOND,
  STAR_EVOLUTION_TOOLTIP_WIDTH,
  HEADER_STAT_TOOLTIP_GAP_PX,
  HEADER_TOOLTIP_CLEAR_SELECTOR,
} from '@/config/constants'
import { splitDuration } from '@/utils/ui/format'
import RpgBadgeTooltip from '../ui/RpgBadgeTooltip.vue'
import StarEvolutionTooltip from './StarEvolutionTooltip.vue'

const solarStore = useSolarUpgradeStore()
const uiStore = useUiStore()

const isComet = computed(() => solarStore.isCometState)

/** Endphase: der Orb zeigt kein Plasma mehr, sondern das Schwarze Loch. */
const isCollapsed = computed(
  () => !isComet.value && solarStore.starPhase >= STAR_PHASE_FINAL_INDEX,
)

const phaseData = computed(() =>
  isComet.value ? COMET_PHASE_DATA : STAR_PHASE_DATA[solarStore.starPhase],
)

const glowColor = computed(() =>
  isComet.value ? COMET_PHASE_DATA.glow : STAR_PHASE_DATA[solarStore.starPhase].glow1,
)

/** Identity colour of the phase — the only colour the name carries. */
const accentColor = computed(() =>
  isComet.value ? COMET_PHASE_DATA.accent : STAR_PHASE_DATA[solarStore.starPhase].phasePrimary,
)

const sunStyle = computed(() => {
  const p = phaseData.value
  if (isCollapsed.value) {
    // Ein 30-px-Orb trägt keine gelinste Scheibe. Die Silhouette muss allein aus
    // drei Lagen lesbar bleiben: Photonenring, schwarzer Horizont darunter, und
    // ganz unten die fast von der Kante gesehene Akkretionsscheibe, die links und
    // rechts über den Horizont hinausragt. Reihenfolge = Malreihenfolge.
    return {
      background:
        `radial-gradient(circle at 50% 50%, transparent 0 43%, ${p.core} 45% 49%, transparent 53%),` +
        `radial-gradient(circle at 50% 50%, #000 0 44%, transparent 46%),` +
        `radial-gradient(ellipse 100% 22% at 50% 50%, ${p.core} 0%, ${p.mid} 30%, ${p.edge} 62%, transparent 82%)`,
      '--sun-glow': glowColor.value,
    }
  }
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

/** Time LEFT in the current phase before it may be evolved — the only label. */
const remainingText = computed(() => {
  const totalSec = Math.ceil(solarStore.phaseDwellRemainingMs / MS_PER_SECOND)
  const { hours: h, minutes: m, seconds: s } = splitDuration(totalSec)
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
})

/* Kein `title` mehr am Abzeichen: was der Orb verschweigt, sagt jetzt das
   Hover-Panel (StarEvolutionTooltip) — inklusive des zweiten Tors, das der
   Ring gar nicht zeigen kann. Ein nativer Tooltip legte sich sonst darüber. */
</script>

<template>
  <RpgBadgeTooltip
    :width="STAR_EVOLUTION_TOOLTIP_WIDTH"
    :gap="HEADER_STAT_TOOLTIP_GAP_PX"
    :clear-ancestor="HEADER_TOOLTIP_CLEAR_SELECTOR"
  >
    <button
      class="sun-phase"
      :class="{ 'sun-phase--ready': dwellComplete }"
      :style="{ '--ph-accent': accentColor, '--ph-glow': glowColor }"
      @click="uiStore.setBardTab('bard')"
    >
      <div class="orb-wrap">
        <div v-if="dwellComplete" class="orb-ripple" aria-hidden="true"></div>
        <div class="orb" :class="{ 'orb--collapse': isCollapsed }" :style="sunStyle"></div>
        <svg class="orb-ring" viewBox="0 0 50 50" aria-hidden="true">
          <circle
            cx="25"
            cy="25"
            r="23"
            fill="none"
            stroke="rgba(0, 0, 0, 0.5)"
            stroke-width="2.2"
          />
          <circle
            cx="25"
            cy="25"
            r="23"
            fill="none"
            :stroke="dwellComplete ? '#6ec040' : glowColor"
            stroke-width="2.2"
            stroke-linecap="round"
            pathLength="100"
            stroke-dasharray="100"
            :stroke-dashoffset="100 - dwellProgress"
            class="orb-ring-fill"
            :style="{ '--ring-glow': dwellComplete ? '#6ec040' : glowColor }"
          />
        </svg>
      </div>

      <span class="phase-timer">{{ dwellComplete ? 'READY' : remainingText }}</span>
    </button>

    <template #tip>
      <StarEvolutionTooltip />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
/* ================================================================
   Frameless badge: sun orb over the phase name, nothing else.
   Der Name steht in einer eigenen Zeile über die volle Breite —
   neben dem Orb blieben ihm nur ~86px und er müsste klein bleiben.
   Alle Maße hängen an --header-height, weil der Header selbst
   höhengetrieben ist (Breite deckelt bei 1400px, Höhe nicht).
   ================================================================ */
.sun-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--header-height) * 0.03);

  align-self: stretch;
  flex: 0 1 auto;
  /* Cap bei 118px statt 134px: die Restzeit braucht selbst im längsten Fall
     ("12h 34m") nur ~110px, und die frei werdende Breite geht an den
     Universe-Block nebenan, dessen drei Kacheln sich sonst auf 2K/4K
     eine schrumpfende Zeile teilen. */
  width: clamp(112px, 7.8vw, 118px);
  min-width: 104px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}

.orb-wrap {
  position: relative;
  width: min(calc(var(--header-height) * 0.6), 66px);
  height: min(calc(var(--header-height) * 0.6), 66px);
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
    0 0 13px 2px var(--sun-glow),
    inset -4px -5px 10px rgba(0, 0, 0, 0.45);
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
  box-shadow: 0 0 22px 5px var(--sun-glow);
  opacity: 0;
  animation: sun-pulse 5s ease-in-out infinite;
}

/* Das Schwarze Loch ist keine Kugel: der Inset-Schatten würde die eine Hälfte
   des Horizonts aufhellen und den Ring an dieser Seite auffressen. */
.orb--collapse {
  box-shadow: 0 0 13px 2px var(--sun-glow);
}

.sun-phase:hover .orb {
  transform: scale(1.07);
}

/* Der Ring ist die einzige verbliebene Fortschrittsanzeige — Dwell-Zeit
   der laufenden Phase, ohne Zahl. */
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
  inset: 6%;
  border-radius: 50%;
  border: 2px solid rgba(110, 192, 64, 0.8);
  pointer-events: none;
  animation: ripple-out 2.4s ease-out infinite;
}

/* Restzeit bis zum Evolve. tabular-nums, sonst springt die Breite jede
   Sekunde. Kein text-shadow-Glow: der las sich als heller Kasten hinter
   der Schrift — Lesbarkeit trägt allein der harte dunkle Schlagschatten. */
.phase-timer {
  width: 100%;
  font-size: min(calc(var(--header-height) * 0.27), 28px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: 0.01em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
  color: var(--ph-accent);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* ── Dwell erfüllt: die Phase kann weiterentwickelt werden ── */
.sun-phase--ready .phase-timer {
  color: #8adc50;
  letter-spacing: 0.06em;
  animation: ready-pulse 2.4s ease-in-out infinite;
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

/* Aufmerksamkeit über opacity statt über einen wachsenden Schein — ein
   pulsierendes text-shadow wäre wieder der helle Kasten (und eine
   Paint-Animation im Dauer-sichtbaren Header). */
@keyframes ready-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
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
  .sun-phase--ready .phase-timer {
    animation: none;
  }
}
</style>
