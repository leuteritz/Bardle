<script setup lang="ts">
import { computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { STAR_PHASE_DATA } from '@/config/constants'

/* Tooltip body for the Star-Forge notify badge: shown while the sun can
   evolve into its next phase. */
const solarStore = useSolarUpgradeStore()

const nextPhase = computed(() => {
  if (solarStore.isCometState) return STAR_PHASE_DATA[0]
  return STAR_PHASE_DATA[solarStore.starPhase + 1] ?? null
})
</script>

<template>
  <div class="fg-tt">
    <div class="fg-tt__title">Sun Evolution Ready</div>
    <div class="fg-tt__body">
      <span class="fg-tt__spark">✦</span>
      <div class="fg-tt__lines">
        <span v-if="nextPhase" class="fg-tt__next">
          Next phase: <strong :style="{ color: nextPhase.phasePrimary }">{{ nextPhase.name }}</strong>
        </span>
        <span v-else class="fg-tt__next">Your sun has reached its final phase</span>
      </div>
    </div>
    <div class="fg-tt__hint">Open the Star Forge to evolve</div>
  </div>
</template>

<style scoped>
.fg-tt {
  padding: 8px 0 7px;
}

.fg-tt__title {
  padding: 0 12px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  border-bottom: 1px solid #3e200a;
}

.fg-tt__body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.fg-tt__spark {
  font-size: 1.25rem;
  color: #f0d060;
  text-shadow: 0 0 8px rgba(240, 208, 96, 0.7);
  flex-shrink: 0;
}

.fg-tt__lines {
  min-width: 0;
}

.fg-tt__next {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e8e0cc;
}

.fg-tt__hint {
  padding: 5px 12px 0;
  border-top: 1px solid #3e200a;
  font-size: 0.72rem;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}
</style>
