<template>
  <div class="section-nav">
    <!-- Linker Pfeil: korrekt disabled bei Sektion 1, kein Glow nötig -->
    <button
      class="nav-arrow"
      :disabled="activeSectionId <= 1"
      @click="navigate(-1)"
      aria-label="Vorherige Galaxis"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <div class="nav-content">
      <div class="nav-galaxy-row">
        <span class="nav-galaxy-name">{{ activeSection?.name ?? '—' }}</span>
        <span v-if="sectionStore.pendingSectionBoss" class="nav-boss-badge" role="status">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
          </svg>
          Boss
        </span>
      </div>

      <div class="nav-planets-row">
        <svg
          class="nav-planet-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
        </svg>
        <span class="nav-planets-label">Gerettete Planeten</span>
        <span class="nav-planets-count">
          <span class="nav-count-current">{{ rescueCount }}</span>
          <span class="nav-count-sep">/</span>
          <span class="nav-count-total">{{ requiredRescues }}</span>
        </span>
      </div>

      <div class="nav-dots" role="presentation" aria-hidden="true">
        <span
          v-for="i in requiredRescues"
          :key="i"
          class="nav-dot"
          :class="{
            'nav-dot--filled': i <= rescueCount,
            'nav-dot--boss': sectionStore.pendingSectionBoss && i <= rescueCount,
          }"
        />
      </div>
    </div>

    <!-- Rechter Pfeil: leuchtet auf wenn nächste Sektion freigeschaltet -->
    <button
      class="nav-arrow"
      :class="{ 'nav-arrow--next-ready': canAdvance }"
      :disabled="activeSectionId >= 10 || !isNextUnlocked"
      @click="navigate(1)"
      aria-label="Nächste Galaxis"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
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
    const isNextUnlocked = computed(() => sectionStore.isSectionUnlocked(activeSectionId.value + 1))

    // Leuchtet auf: nächste Sektion verfügbar UND noch nicht die letzte
    const canAdvance = computed(() => isNextUnlocked.value && activeSectionId.value < 10)

    function navigate(delta: -1 | 1) {
      sectionStore.navigateToSection(activeSectionId.value + delta)
    }

    return {
      sectionStore,
      activeSectionId,
      activeSection,
      rescueCount,
      requiredRescues,
      isNextUnlocked,
      canAdvance,
      navigate,
    }
  },
})
</script>

<style scoped>
/* ─── Wrapper ─── */
.section-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  width: 100%;
  border: none;
  background: none;
}

/* ─── Pfeil-Buttons ─── */
.nav-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--rpg-text-dim);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}

.nav-arrow:hover:not(:disabled) {
  color: var(--rpg-gold-dim);
  border-color: rgba(200, 144, 64, 0.25);
  background: rgba(200, 144, 64, 0.06);
}

.nav-arrow:disabled {
  color: #333;
  cursor: not-allowed;
}

/* ─── Rechter Pfeil: Glow wenn nächste Sektion freigeschaltet ─── */
.nav-arrow--next-ready {
  color: var(--rpg-gold);
  border-color: rgba(232, 192, 64, 0.45);
  background: rgba(232, 192, 64, 0.08);
  animation: next-ready-glow 1.6s ease-in-out infinite alternate;
}

.nav-arrow--next-ready:hover:not(:disabled) {
  color: var(--rpg-gold-bright);
  border-color: rgba(232, 192, 64, 0.7);
  background: rgba(232, 192, 64, 0.15);
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.35);
  animation: none;
}

@keyframes next-ready-glow {
  from {
    box-shadow: 0 0 4px rgba(232, 192, 64, 0.15);
    border-color: rgba(232, 192, 64, 0.3);
  }
  to {
    box-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
    border-color: rgba(232, 192, 64, 0.65);
  }
}

/* ─── Mittelteil ─── */
.nav-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  min-width: 0;
}

/* ─── Galaxis-Zeile ─── */
.nav-galaxy-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
}

.nav-galaxy-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--rpg-gold-dim);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

/* ─── Boss-Badge ─── */
.nav-boss-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ff6040;
  border: 1px solid rgba(204, 64, 32, 0.6);
  border-radius: 4px;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
  animation: boss-pulse 0.9s ease-in-out infinite alternate;
}

@keyframes boss-pulse {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.4;
  }
}

/* ─── Planeten-Zeile ─── */
.nav-planets-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  justify-content: center;
}

.nav-planet-icon {
  color: var(--rpg-text-dim);
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-planets-label {
  font-size: 0.8rem;
  color: var(--rpg-text-dim);
  letter-spacing: 0.03em;
}

.nav-planets-count {
  display: inline-flex;
  align-items: baseline;
  gap: 0.18rem;
  margin-left: 0.1rem;
}

.nav-count-current {
  font-size: 1rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
  line-height: 1;
}

.nav-count-sep {
  font-size: 1rem;
  color: var(--rpg-text-dim);
  line-height: 1;
}

.nav-count-total {
  font-size: 1rem;
  font-weight: 500;
  color: var(--rpg-text-dim);
  line-height: 1;
}

/* ─── Punkt-Reihe ─── */
.nav-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
  max-width: 200px;
}

.nav-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2a2a22;
  border: 1px solid #333;
  transition:
    background 0.25s,
    border-color 0.25s;
}

.nav-dot--filled {
  background: var(--rpg-green-bottom);
  border-color: var(--rpg-green-top);
}

.nav-dot--boss {
  background: var(--rpg-gold-dim);
  border-color: var(--rpg-gold);
}
</style>
