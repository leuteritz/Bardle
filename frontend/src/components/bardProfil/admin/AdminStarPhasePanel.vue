<script setup lang="ts">
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  COMET_PHASE_DATA,
  SUN_PHASE_DISPLAY_TOTAL,
} from '@/config/constants'
import { displaySunPhase, useSunPhaseDisplay } from '@/composables/orbit/useSunPhaseDisplay'
import AdminCollapsiblePanel from './AdminCollapsiblePanel.vue'
import { gameNow } from '@/utils/game/gameClock'

withDefaults(defineProps<{ dashboard?: boolean }>(), { dashboard: false })

const solarStore = useSolarUpgradeStore()
const { currentDisplayPhase } = useSunPhaseDisplay()

function setStarPhase(phase: number) {
  const elapsed = Math.floor((gameNow() - solarStore.phaseEnteredAt) / 1000)
  solarStore.totalPhaseSeconds += elapsed
  solarStore.phaseTimeHistory[solarStore.starPhase] =
    (solarStore.phaseTimeHistory[solarStore.starPhase] ?? 0) + elapsed
  // A star-phase override always means "be a star" — otherwise the comet
  // origin flag would keep rendering the comet for every phase.
  solarStore.isCometState = false
  solarStore.starPhase = Math.max(0, Math.min(STAR_PHASE_DATA.length - 1, phase))
  solarStore.phaseEnteredAt = gameNow()
  // Jumping straight to the final phase should look like the real thing —
  // and it doubles as the only way to replay the transition while testing.
  if (solarStore.starPhase === STAR_PHASE_FINAL_INDEX) solarStore.supernovaTrigger++
}

function setCometState() {
  const elapsed = Math.floor((gameNow() - solarStore.phaseEnteredAt) / 1000)
  solarStore.totalPhaseSeconds += elapsed
  solarStore.phaseTimeHistory[solarStore.starPhase] =
    (solarStore.phaseTimeHistory[solarStore.starPhase] ?? 0) + elapsed
  solarStore.isCometState = true
  solarStore.starPhase = 0
  solarStore.phaseEnteredAt = gameNow()
}
</script>

<template>
  <AdminCollapsiblePanel
    title="Star Phase Override"
    icon="game-icons:sun-radiations"
    :collapsible="!dashboard"
  >
    <template #meta>
      Current:
      {{
        solarStore.isCometState
          ? `Phase 1/${SUN_PHASE_DISPLAY_TOTAL} — ${COMET_PHASE_DATA.name}`
          : `Phase ${currentDisplayPhase}/${SUN_PHASE_DISPLAY_TOTAL} — ${STAR_PHASE_DATA[solarStore.starPhase].name}`
      }}
    </template>

    <div class="star-phase-btns" :class="{ 'star-phase-btns--dashboard': dashboard }">
      <button
        class="star-phase-btn"
        :class="{ 'star-phase-btn--active': solarStore.isCometState }"
        :style="{ '--phase-color': COMET_PHASE_DATA.accent }"
        @click="setCometState"
      >
        <span class="phase-btn-num">1</span>
        <span class="phase-btn-name">{{ COMET_PHASE_DATA.name }}</span>
      </button>
      <button
        v-for="(phase, idx) in STAR_PHASE_DATA"
        :key="idx"
        class="star-phase-btn"
        :class="{ 'star-phase-btn--active': !solarStore.isCometState && solarStore.starPhase === idx }"
        :style="{ '--phase-color': phase.phasePrimary }"
        @click="setStarPhase(idx)"
      >
        <span class="phase-btn-num">{{ displaySunPhase(idx) }}</span>
        <span class="phase-btn-name">{{ phase.name }}</span>
      </button>
    </div>
  </AdminCollapsiblePanel>
</template>

<style scoped>
.star-phase-btns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

/* Dashboard: 7 Phasen als 4×2-Raster. Ohne `fill` steht die Karte auf ihrer
   Inhaltshöhe — zwei Reihen à 52 px — statt die Spalte zu füllen; den Platz
   darunter braucht das Badge Lab. */
.star-phase-btns--dashboard {
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 52px;
  gap: 8px;
}
.star-phase-btns--dashboard .star-phase-btn {
  justify-content: center;
  padding: 6px;
}

.star-phase-btn {
  padding: 10px 6px 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  border-radius: var(--bp-radius);
  border: 2px solid #3e200a;
  background: #111008;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.15s;
}

.phase-btn-num {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: inherit;
}

.phase-btn-name {
  font-size: 8px;
  font-weight: 700;
  opacity: 0.75;
  text-align: center;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: inherit;
}

.star-phase-btn:hover {
  border-color: var(--phase-color);
  color: var(--phase-color);
  box-shadow: 0 0 8px color-mix(in srgb, var(--phase-color) 40%, transparent);
}

.star-phase-btn--active {
  background: color-mix(in srgb, var(--phase-color) 14%, #111008);
  border-color: var(--phase-color);
  color: var(--phase-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--phase-color) 55%, transparent);
}
</style>
