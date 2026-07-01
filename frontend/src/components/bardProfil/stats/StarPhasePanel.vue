<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useUiStore } from '@/stores/uiStore'
import { STAR_PHASE_DATA, SOLAR_MAX_LEVELS } from '@/config/constants'
import type { SolarBranchId } from '@/stores/solarUpgradeStore'

const store = useSolarUpgradeStore()
const uiStore = useUiStore()

const totalPhases = STAR_PHASE_DATA.length
const phase = computed(() => STAR_PHASE_DATA[store.starPhase])
const isMax = computed(() => store.starPhase >= totalPhases - 1)

const progressPct = computed(() => {
  if (isMax.value) return 100
  return Math.min((store.minBranchLevel / (store.starPhase + 1)) * 100, 100)
})

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval>
onMounted(() => {
  if (!store.phaseEnteredAt) store.phaseEnteredAt = Date.now()
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(ticker))

const phaseAge = computed(() => {
  if (!store.phaseEnteredAt) return null
  const secs = Math.floor((now.value - store.phaseEnteredAt) / 1000)
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
})

/* Step indicator — one dot per star phase */
const phaseDots = computed(() =>
  STAR_PHASE_DATA.map((p, i) => ({
    name: p.name,
    color: p.phasePrimary,
    glow: p.phaseGlow,
    done: i < store.starPhase,
    current: i === store.starPhase,
  })),
)

/* Branch progression toward next phase */
const BRANCHES: Array<{ id: SolarBranchId; label: string; color: string }> = [
  { id: 'flightSpeed', label: 'Flight', color: '#60a8e8' },
  { id: 'maxHp', label: 'HP', color: '#e06060' },
  { id: 'chimesPerClick', label: 'CpC', color: '#e8c040' },
  { id: 'chimesPerSecond', label: 'CpS', color: '#52b830' },
  { id: 'dmgPerClick', label: 'DMG', color: '#c060a0' },
]

function branchBarPct(id: SolarBranchId): number {
  if (isMax.value) return 100
  const lv = store.branchLevel(id)
  const required = store.starPhase + 1
  return Math.min((lv / required) * 100, 100)
}
</script>

<template>
  <div
    class="spp-root"
    @click="uiStore.setBardTab('shop')"
    :style="{
      '--sun-core': phase.core,
      '--sun-mid': phase.mid,
      '--sun-edge': phase.edge,
      '--sun-glow1': phase.glow1,
      '--sun-glow2': phase.glow2,
      '--sun-glow3': phase.glow3,
      '--phase-primary': phase.phasePrimary,
      '--phase-glow': phase.phaseGlow,
      '--pulse-speed': phase.pulseSpeed,
    }"
  >
    <div class="spp-gold-line" />
    <div class="spp-header">
      <span class="spp-title">Star Phase</span>
      <span class="spp-header-count">{{ store.starPhase + 1 }} / {{ totalPhases }}</span>
    </div>

    <div class="spp-body">
      <!-- ── Hero sun + phase name ── -->
      <div class="spp-sun-area">
        <div class="spp-sun-container">
          <div class="spp-corona spp-corona--outer" />
          <div class="spp-corona spp-corona--inner" />
          <div class="spp-sun" />
        </div>
        <div class="spp-phase-name">{{ phase.name }}</div>
        <div class="spp-time">
          <Icon icon="game-icons:sand-clock" width="13" height="13" :style="{ color: 'var(--phase-primary)' }" />
          <span class="spp-time-lbl">Time in phase</span>
          <span class="spp-time-val">{{ phaseAge ?? '—' }}</span>
        </div>
      </div>

      <!-- ── Phase step indicator ── -->
      <div class="spp-steps">
        <div
          v-for="(dot, i) in phaseDots"
          :key="i"
          class="spp-step"
          :class="{ 'is-done': dot.done, 'is-current': dot.current }"
          :style="{ '--dot-color': dot.color, '--dot-glow': dot.glow }"
          :title="dot.name"
        />
      </div>

      <!-- ── Progress toward next phase ── -->
      <div class="spp-progress">
        <div class="spp-progress-head">
          <span>{{ isMax ? 'Fully Evolved' : 'To next phase' }}</span>
          <span v-if="isMax" class="spp-badge spp-badge--max">MAX</span>
          <span v-else-if="store.canUpgradeStar" class="spp-badge spp-badge--ready">READY</span>
        </div>
        <div class="spp-bar-track">
          <div class="spp-bar-fill" :style="{ width: progressPct + '%' }">
            <span class="spp-bar-shine" />
          </div>
        </div>
      </div>

      <!-- ── Branch progression ── -->
      <div v-if="!isMax" class="spp-branches">
        <div class="spp-branch-header">
          Branches
          <span class="spp-branch-req">need ≥ {{ store.starPhase + 1 }}</span>
        </div>
        <div v-for="b in BRANCHES" :key="b.id" class="spp-branch-row">
          <span class="spp-branch-name">{{ b.label }}</span>
          <div class="spp-branch-track">
            <div
              class="spp-branch-fill"
              :style="{ width: branchBarPct(b.id) + '%', '--branch-color': b.color }"
            />
          </div>
          <span
            class="spp-branch-lvl"
            :class="{ 'spp-branch-lvl--max': store.branchLevel(b.id) >= SOLAR_MAX_LEVELS }"
            :style="{ color: b.color }"
          >
            <template v-if="store.branchLevel(b.id) >= SOLAR_MAX_LEVELS">MAX</template>
            <template v-else>{{ store.branchLevel(b.id) }}/{{ store.starPhase + 1 }}</template>
          </span>
        </div>
      </div>

      <div class="spp-shop-hint">→ Open in Shop</div>
    </div>
  </div>
</template>

<style scoped>
/* ══ Star Phase Panel ══════════════════════════════ */
.spp-root {
  width: 100%;
  border: 2px solid #7a4e20;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--phase-glow) 40%, #5c3310);
  background: #111008;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.spp-root:hover {
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--phase-glow) 60%, #5c3310),
    0 0 22px color-mix(in srgb, var(--phase-glow) 24%, transparent);
}

.spp-gold-line {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

.spp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #1e1006;
  border-bottom: 2px solid #5c3310;
}

.spp-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
}

.spp-header-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  color: var(--phase-primary);
  background: #111008;
  border: 1px solid color-mix(in srgb, var(--phase-glow) 40%, #3e200a);
  border-radius: 4px;
  padding: 2px 7px;
}

.spp-body {
  padding: 16px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Hero sun ── */
.spp-sun-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spp-sun-container {
  position: relative;
  width: 132px;
  height: 132px;
  flex-shrink: 0;
}

.spp-sun {
  position: absolute;
  inset: 18px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 35%,
    var(--sun-core) 0%,
    color-mix(in srgb, var(--sun-core) 50%, var(--sun-mid)) 20%,
    var(--sun-mid) 45%,
    color-mix(in srgb, var(--sun-mid) 30%, var(--sun-edge)) 70%,
    var(--sun-edge) 100%
  );
  box-shadow:
    0 0 20px 8px color-mix(in srgb, var(--sun-glow1) 80%, transparent),
    0 0 44px 18px color-mix(in srgb, var(--sun-glow1) 55%, transparent),
    0 0 72px 30px color-mix(in srgb, var(--sun-glow2) 32%, transparent),
    0 0 110px 44px color-mix(in srgb, var(--sun-glow3) 16%, transparent);
  animation: spp-sun-pulse var(--pulse-speed) ease-in-out infinite;
}

@keyframes spp-sun-pulse {
  0%,
  100% {
    box-shadow:
      0 0 20px 8px color-mix(in srgb, var(--sun-glow1) 80%, transparent),
      0 0 44px 18px color-mix(in srgb, var(--sun-glow1) 55%, transparent),
      0 0 72px 30px color-mix(in srgb, var(--sun-glow2) 32%, transparent),
      0 0 110px 44px color-mix(in srgb, var(--sun-glow3) 16%, transparent);
  }
  50% {
    box-shadow:
      0 0 30px 14px color-mix(in srgb, var(--sun-glow1) 100%, transparent),
      0 0 62px 28px color-mix(in srgb, var(--sun-glow1) 75%, transparent),
      0 0 100px 44px color-mix(in srgb, var(--sun-glow2) 48%, transparent),
      0 0 160px 64px color-mix(in srgb, var(--sun-glow3) 22%, transparent);
  }
}

.spp-corona {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.spp-corona--outer {
  inset: 4px;
  border: 1px solid color-mix(in srgb, var(--phase-glow) 28%, transparent);
  animation: spp-corona-cw 14s linear infinite;
}
.spp-corona--inner {
  inset: 11px;
  border: 1px dashed color-mix(in srgb, var(--phase-glow) 18%, transparent);
  animation: spp-corona-ccw 9s linear infinite;
}
@keyframes spp-corona-cw {
  to {
    transform: rotate(360deg);
  }
}
@keyframes spp-corona-ccw {
  to {
    transform: rotate(-360deg);
  }
}

.spp-phase-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--phase-primary);
  text-align: center;
  line-height: 1;
  animation: spp-name-pulse var(--pulse-speed) ease-in-out infinite;
}
@keyframes spp-name-pulse {
  0%,
  100% {
    text-shadow: 0 0 10px var(--phase-glow), 0 0 22px var(--phase-glow);
  }
  50% {
    text-shadow: 0 0 3px var(--phase-glow);
  }
}

.spp-time {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  background: #0e0d07;
  border: 1px solid #2a1a08;
  border-radius: var(--bp-radius);
}
.spp-time-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}
.spp-time-val {
  font-size: 12px;
  font-weight: 700;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
}

/* ── Phase step indicator ── */
.spp-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.spp-step {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1c1c18;
  border: 1px solid #3e200a;
  transition: all 0.2s ease;
}
.spp-step.is-done {
  background: var(--dot-color);
  border-color: var(--dot-color);
  opacity: 0.5;
}
.spp-step.is-current {
  width: 14px;
  height: 14px;
  background: var(--dot-color);
  border-color: var(--dot-color);
  box-shadow: 0 0 8px var(--dot-glow), 0 0 14px var(--dot-glow);
  animation: spp-dot-pulse var(--pulse-speed) ease-in-out infinite;
}
@keyframes spp-dot-pulse {
  0%,
  100% {
    box-shadow: 0 0 6px var(--dot-glow), 0 0 12px var(--dot-glow);
  }
  50% {
    box-shadow: 0 0 12px var(--dot-glow), 0 0 22px var(--dot-glow);
  }
}

/* ── Progress bar ── */
.spp-progress {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.spp-progress-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rpg-wood);
}
.spp-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 3px;
}
.spp-badge--ready {
  background: #1a2a10;
  border: 1px solid #52b830;
  color: #52b830;
}
.spp-badge--max {
  background: #1e1a06;
  border: 1px solid #e8c040;
  color: #e8c040;
}
.spp-bar-track {
  height: 7px;
  background: #1c1c18;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid #3e200a;
}
.spp-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to right, var(--phase-glow), var(--phase-primary));
  transition: width 0.6s ease;
  position: relative;
  overflow: hidden;
}
.spp-bar-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 28%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.35), transparent);
  animation: spp-shine 2.6s ease-in-out infinite;
}
@keyframes spp-shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

/* ── Branch progression ── */
.spp-branches {
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: #0e0d07;
  border: 1px solid #2a1a08;
  border-radius: var(--bp-radius);
  padding: 10px 12px;
}
.spp-branch-header {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  margin-bottom: 2px;
}
.spp-branch-req {
  font-weight: 400;
  color: var(--rpg-text-dim);
  letter-spacing: 0;
  text-transform: none;
  margin-left: 4px;
}
.spp-branch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.spp-branch-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--rpg-text-muted);
  min-width: 34px;
  flex-shrink: 0;
}
.spp-branch-track {
  flex: 1;
  height: 5px;
  background: #1c1c18;
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid #2a1a08;
}
.spp-branch-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--branch-color);
  transition: width 0.5s ease;
  opacity: 0.85;
}
.spp-branch-lvl {
  font-size: 11px;
  font-weight: 700;
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.spp-branch-lvl--max {
  font-size: 10px;
  letter-spacing: 0.05em;
}

/* ── Shop affordance ── */
.spp-shop-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
  text-align: right;
  transition: color 0.15s;
}
.spp-root:hover .spp-shop-hint {
  color: var(--phase-primary);
}
</style>
