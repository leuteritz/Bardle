<template>
  <div
    ref="wrapperEl"
    class="galaxy-progress"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <Teleport to="body">
      <Transition name="tooltip-fade">
        <div v-if="showTooltip" class="galaxy-tooltip-positioner" :style="tooltipStyle">
          <GalaxyMapTooltipComponent
            :total-planets="galaxyStore.planetsRequired"
            :rescued-count="galaxyStore.planetsRescued"
            :galaxy-key="galaxyStore.currentGalaxy"
            :needs-final-boss="galaxyStore.needsFinalBoss"
          />
        </div>
      </Transition>
    </Teleport>
    <div class="nav-content">
      <div class="nav-galaxy-row">
        <span class="nav-galaxy-name">Galaxie {{ galaxyStore.currentGalaxy }}</span>
        <!-- Galaxy final boss indicator -->
        <span v-if="galaxyStore.needsFinalBoss" class="nav-galaxy-boss-badge" role="status">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
          </svg>
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
          <span class="nav-count-current">{{ galaxyStore.planetsRescued }}</span>
          <span class="nav-count-sep">/</span>
          <span class="nav-count-total">{{ galaxyStore.planetsRequired }}</span>
        </span>
      </div>

      <div class="nav-dots" role="presentation" aria-hidden="true">
        <span
          v-for="i in galaxyStore.planetsRequired"
          :key="i"
          class="nav-dot"
          :class="{ 'nav-dot--filled': i <= galaxyStore.planetsRescued }"
        />
        <!-- Extra dot for the galaxy boss -->
        <span
          v-if="galaxyStore.planetsRescued >= galaxyStore.planetsRequired"
          class="nav-dot nav-dot--boss-slot"
          :class="{ 'nav-dot--boss-done': galaxyStore.galaxyBossDefeated }"
        />
      </div>

      <!-- Galaxy boss pending hint -->
      <div v-if="galaxyStore.needsFinalBoss" class="nav-galaxy-boss-hint">
        Besiege den Galaxie-Boss, um fortzufahren!
      </div>

      <button
        v-if="galaxyStore.isComplete"
        class="nav-galaxy-advance-btn"
        :class="{ 'nav-galaxy-advance-btn--glow': !galaxyStore.pendingTransition }"
        :disabled="galaxyStore.pendingTransition"
        @click="galaxyStore.requestTransition()"
      >
        Nächste Galaxie →
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useGalaxyStore } from '../../stores/galaxyStore'
import GalaxyMapTooltipComponent from './GalaxyMapTooltipComponent.vue'

export default defineComponent({
  name: 'GalaxyProgressComponent',
  components: { GalaxyMapTooltipComponent },
  setup() {
    const galaxyStore = useGalaxyStore()
    const wrapperEl = ref<HTMLElement | null>(null)
    const showTooltip = ref(false)

    const tooltipStyle = computed(() => {
      if (!wrapperEl.value) return {}

      // Vertical: header bottom via CSS var, fallback to direct DOM query
      const cssVarRaw = getComputedStyle(document.documentElement).getPropertyValue(
        '--header-total-height',
      )
      const headerBottom =
        parseFloat(cssVarRaw) ||
        document.querySelector('.header-bar')?.getBoundingClientRect().bottom ||
        wrapperEl.value.getBoundingClientRect().bottom

      // Horizontal: right edge of tooltip flush with left edge of .header-center
      const tooltipWidth = 400
      const headerCenterRect = document.querySelector('.header-center')?.getBoundingClientRect()
      const left = headerCenterRect
        ? Math.max(8, headerCenterRect.left - tooltipWidth)
        : Math.max(8, window.innerWidth / 2 - 240 - tooltipWidth)

      return {
        position: 'fixed' as const,
        top: `${headerBottom}px`,
        left: `${left}px`,
        zIndex: '9999',
      }
    })

    return {
      galaxyStore,
      wrapperEl,
      showTooltip,
      tooltipStyle,
    }
  },
})
</script>

<style scoped>
/* ─── Wrapper ─── */
.galaxy-progress {
  display: flex;
  align-items: center;
  padding: 0.35rem 0.5rem;
  width: 100%;
  border: none;
  background: none;
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

/* ─── Galaxie-Boss Badge ─── */
.nav-galaxy-boss-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ffb040;
  border: 1px solid rgba(255, 160, 40, 0.7);
  border-radius: 4px;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
  background: rgba(255, 120, 20, 0.08);
  animation: galaxy-boss-pulse 0.7s ease-in-out infinite alternate;
}

@keyframes galaxy-boss-pulse {
  from {
    opacity: 1;
    box-shadow: 0 0 4px rgba(255, 130, 30, 0.3);
  }
  to {
    opacity: 0.6;
    box-shadow: 0 0 10px rgba(255, 150, 40, 0.7);
  }
}

/* ─── Galaxy Boss Hint ─── */
.nav-galaxy-boss-hint {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255, 160, 60, 0.85);
  text-align: center;
  line-height: 1.2;
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

/* Galaxy boss slot dot */
.nav-dot--boss-slot {
  background: #2a1a0a;
  border-color: rgba(255, 120, 40, 0.5);
  border-style: dashed;
  animation: boss-slot-pulse 1.1s ease-in-out infinite alternate;
}

.nav-dot--boss-done {
  background: var(--rpg-gold-dim, #c89040);
  border-color: var(--rpg-gold, #e8c040);
  border-style: solid;
  animation: none;
}

@keyframes boss-slot-pulse {
  from {
    border-color: rgba(255, 80, 20, 0.4);
  }
  to {
    border-color: rgba(255, 140, 40, 0.9);
  }
}

/* ─── Nächste Galaxie Button ─── */
.nav-galaxy-advance-btn {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  white-space: nowrap;
  transition: all 0.1s;
  width: 100%;
}

.nav-galaxy-advance-btn--glow {
  box-shadow:
    0 0 8px rgba(80, 200, 40, 0.65),
    0 0 18px rgba(80, 200, 40, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: galaxy-btn-pulse 1.4s ease-in-out infinite alternate;
}

@keyframes galaxy-btn-pulse {
  from {
    box-shadow:
      0 0 6px rgba(80, 200, 40, 0.5),
      0 0 14px rgba(80, 200, 40, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  to {
    box-shadow:
      0 0 12px rgba(80, 200, 40, 0.85),
      0 0 28px rgba(80, 200, 40, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
}

.nav-galaxy-advance-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  animation: none;
}

.nav-galaxy-advance-btn:not(:disabled):hover {
  background: linear-gradient(to bottom, #60d038, #388e22);
}

.nav-galaxy-advance-btn:not(:disabled):active {
  transform: scale(0.97);
}

/* ─── Tooltip Transition ─── */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
