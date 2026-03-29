<template>
  <div class="section-nav-bar">
    <button
      class="section-nav-arrow"
      :disabled="activeSectionId <= 1"
      @click="navigate(-1)"
      aria-label="Vorherige Sektion"
    >
      ‹
    </button>

    <div class="section-nav-center">
      <div class="section-nav-title-row">
        <span class="section-nav-number">Sektion {{ activeSectionId }}</span>
        <span class="section-nav-name">{{ activeSection?.name }}</span>
        <span v-if="sectionStore.pendingSectionBoss" class="section-boss-badge">⚠ Boss</span>
      </div>

      <div class="section-progress-track">
        <div
          class="section-progress-fill"
          :class="{ 'section-progress-fill--complete': progressPercent >= 100 }"
          :style="{ width: progressPercent + '%' }"
        />
      </div>

      <div class="section-nav-progress-label">
        {{ rescueCount }} / {{ requiredRescues }} Gerettet
      </div>
    </div>

    <button
      class="section-nav-arrow"
      :disabled="activeSectionId >= 10 || !isNextUnlocked"
      @click="navigate(1)"
      aria-label="Nächste Sektion"
    >
      ›
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useSectionStore } from '../../../stores/sectionStore'
import { SECTIONS } from '../../../config/sections'

export default defineComponent({
  name: 'SectionNavigatorComponent',
  setup() {
    const sectionStore = useSectionStore()

    const activeSectionId = computed(() => sectionStore.activeSectionId)
    const activeSection = computed(() => SECTIONS.find((s) => s.id === activeSectionId.value))
    const rescueCount = computed(() => sectionStore.activeSectionProgress.rescueCount)
    const requiredRescues = computed(() => sectionStore.requiredRescues)
    const progressPercent = computed(() => sectionStore.progressPercent)
    const isNextUnlocked = computed(() => sectionStore.isSectionUnlocked(activeSectionId.value + 1))

    function navigate(delta: -1 | 1) {
      sectionStore.navigateToSection(activeSectionId.value + delta)
    }

    return {
      sectionStore,
      activeSectionId,
      activeSection,
      rescueCount,
      requiredRescues,
      progressPercent,
      isNextUnlocked,
      navigate,
    }
  },
})
</script>

<style scoped>
.section-nav-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem 0.35rem;
  background: #1c1c18;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
}

.section-nav-bar::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  border-radius: 4px 4px 0 0;
}

.section-nav-arrow {
  background: none;
  border: 1px solid #7a4e20;
  border-radius: 3px;
  color: #e8c040;
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.section-nav-arrow:hover:not(:disabled) {
  background: rgba(232, 192, 64, 0.12);
}

.section-nav-arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(55%);
}

.section-nav-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
}

.section-nav-title-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  justify-content: center;
}

.section-nav-number {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #c89040;
  flex-shrink: 0;
}

.section-nav-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 10rem;
}

.section-boss-badge {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ff6040;
  border: 1px solid #cc4020;
  border-radius: 3px;
  padding: 0.05rem 0.3rem;
  animation: pulse-boss 0.8s ease-in-out infinite alternate;
  flex-shrink: 0;
}

@keyframes pulse-boss {
  from { opacity: 1; }
  to   { opacity: 0.4; }
}

.section-progress-track {
  width: 100%;
  height: 5px;
  background: #111008;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(122, 78, 32, 0.6);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
}

.section-progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  box-shadow: 0 0 5px rgba(82, 184, 48, 0.4);
  transition: width 0.4s ease;
}

.section-progress-fill--complete {
  background: linear-gradient(to bottom, #e8c040, #c89040);
  box-shadow: 0 0 7px rgba(232, 192, 64, 0.6);
}

.section-nav-progress-label {
  font-size: 0.56rem;
  font-weight: 700;
  color: #9a8060;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
