<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useUiStore } from '@/stores/uiStore'
import { STAR_PHASE_DATA, SOLAR_MAX_LEVELS } from '@/config/constants'
import type { SolarBranchId } from '@/stores/solarUpgradeStore'

const store = useSolarUpgradeStore()
const uiStore = useUiStore()
const phase = computed(() => STAR_PHASE_DATA[store.starPhase])
const isMax = computed(() => store.starPhase >= STAR_PHASE_DATA.length - 1)

const progressPct = computed(() => {
  if (isMax.value) return 100
  return Math.min((store.minBranchLevel / (store.starPhase + 1)) * 100, 100)
})

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval>
onMounted(() => { ticker = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(ticker))

const phaseAge = computed(() => {
  if (!store.phaseEnteredAt) return '–'
  const secs = Math.floor((now.value - store.phaseEnteredAt) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
})

const BRANCHES: Array<{ id: SolarBranchId; label: string; color: string }> = [
  { id: 'flightSpeed',     label: 'Flight', color: '#60a8e8' },
  { id: 'maxHp',           label: 'HP',     color: '#e06060' },
  { id: 'chimesPerClick',  label: 'CpC',    color: '#e8c040' },
  { id: 'chimesPerSecond', label: 'CpS',    color: '#52b830' },
  { id: 'dmgPerClick',     label: 'DMG',    color: '#c060a0' },
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
    class="spp-root spp-root--clickable"
    @click="uiStore.setBardTab('shop')"
    :style="{
      '--sun-core':      phase.core,
      '--sun-mid':       phase.mid,
      '--sun-edge':      phase.edge,
      '--sun-glow1':     phase.glow1,
      '--sun-glow2':     phase.glow2,
      '--sun-glow3':     phase.glow3,
      '--phase-primary': phase.phasePrimary,
      '--phase-glow':    phase.phaseGlow,
      '--pulse-speed':   phase.pulseSpeed,
    }"
  >
    <div class="spp-section-label">Star Phase</div>

    <!-- ─ Sonne + Phasenname ─ -->
    <div class="spp-sun-area">
      <div class="spp-sun-container">
        <div class="spp-corona spp-corona--outer" />
        <div class="spp-corona spp-corona--inner" />
        <div class="spp-sun" />
      </div>
      <div class="spp-phase-name">{{ phase.name }}</div>
    </div>

    <!-- ─ Fortschrittsbalken ─ -->
    <div class="spp-progress-wrap">
      <div class="spp-bar-track">
        <div class="spp-bar-fill" :style="{ width: progressPct + '%' }">
          <span class="spp-bar-shine" />
        </div>
      </div>
      <span v-if="isMax" class="spp-badge spp-badge--max">MAX</span>
      <span v-else-if="store.canUpgradeStar" class="spp-badge spp-badge--ready">READY</span>
    </div>

    <!-- ─ Info-Grid 2×2 ─ -->
    <div class="spp-info-grid">
      <div class="spp-cell">
        <span class="spp-cell-lbl">Phase Age</span>
        <span class="spp-cell-val">{{ phaseAge }}</span>
      </div>
      <div class="spp-cell">
        <span class="spp-cell-lbl">Factor</span>
        <span class="spp-cell-val">×{{ phase.factor }}</span>
      </div>
      <div class="spp-cell">
        <span class="spp-cell-lbl">Radius</span>
        <span class="spp-cell-val">{{ phase.radius }}<span class="spp-cell-unit">u</span></span>
      </div>
      <div class="spp-cell">
        <span class="spp-cell-lbl">Phase</span>
        <span class="spp-cell-val">{{ store.starPhase + 1 }}<span class="spp-cell-unit"> / {{ STAR_PHASE_DATA.length }}</span></span>
      </div>
    </div>

    <!-- ─ Branch-Fortschritt ─ -->
    <div v-if="!isMax" class="spp-branches">
      <div class="spp-branch-header">
        Branches to next phase
        <span class="spp-branch-req">(need ≥ {{ store.starPhase + 1 }})</span>
      </div>
      <div
        v-for="b in BRANCHES"
        :key="b.id"
        class="spp-branch-row"
      >
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
</template>

<style scoped>
/* ══ Star Phase Panel ══════════════════════════════ */

.spp-root {
  background: #111008;
  border: 1px solid var(--phase-glow);
  border-radius: 4px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 0 14px color-mix(in srgb, var(--phase-glow) 18%, transparent);
  margin-bottom: 28px;
}

/* ─ Header-Label ────────────────────────────────── */
.spp-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rpg-wood-inner);
}

/* ─ Sonne ───────────────────────────────────────── */
.spp-sun-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spp-sun-container {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.spp-sun {
  position: absolute;
  inset: 16px;
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
    0 0 20px 8px  color-mix(in srgb, var(--sun-glow1) 80%, transparent),
    0 0 44px 18px color-mix(in srgb, var(--sun-glow1) 55%, transparent),
    0 0 72px 30px color-mix(in srgb, var(--sun-glow2) 32%, transparent),
    0 0 110px 44px color-mix(in srgb, var(--sun-glow3) 16%, transparent);
  animation: spp-sun-pulse var(--pulse-speed) ease-in-out infinite;
}

@keyframes spp-sun-pulse {
  0%, 100% {
    box-shadow:
      0 0 20px 8px  color-mix(in srgb, var(--sun-glow1) 80%, transparent),
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

/* Corona-Ringe */
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
  inset: 10px;
  border: 1px dashed color-mix(in srgb, var(--phase-glow) 18%, transparent);
  animation: spp-corona-ccw 9s linear infinite;
}

@keyframes spp-corona-cw  { to { transform: rotate(360deg); } }
@keyframes spp-corona-ccw { to { transform: rotate(-360deg); } }

/* ─ Phasenname ──────────────────────────────────── */
.spp-phase-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--phase-primary);
  text-align: center;
  line-height: 1;
  animation: spp-name-pulse var(--pulse-speed) ease-in-out infinite;
}

@keyframes spp-name-pulse {
  0%, 100% {
    text-shadow: 0 0 10px var(--phase-glow), 0 0 22px var(--phase-glow);
  }
  50% {
    text-shadow: 0 0 3px var(--phase-glow);
  }
}

/* ─ Fortschrittsbalken ──────────────────────────── */
.spp-progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spp-bar-track {
  flex: 1;
  height: 6px;
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
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent);
  animation: spp-shine 2.6s ease-in-out infinite;
}

@keyframes spp-shine {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

.spp-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 3px;
  flex-shrink: 0;
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

/* ─ Info-Grid 2×2 ───────────────────────────────── */
.spp-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.spp-cell {
  background: #1a1008;
  border: 1px solid #3e200a;
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.spp-cell-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}

.spp-cell-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--phase-primary);
  line-height: 1;
}

.spp-cell-unit {
  font-size: 11px;
  font-weight: 700;
  color: var(--rpg-text-dim);
}

/* ─ Branch-Fortschritt ──────────────────────────── */
.spp-branches {
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: #0e0d07;
  border: 1px solid #2a1a08;
  border-radius: 4px;
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
}

.spp-branch-lvl--max {
  font-size: 10px;
  letter-spacing: 0.05em;
}

/* ─ Klick-Affordance ────────────────────────────── */
.spp-root--clickable {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.spp-root--clickable:hover {
  border-color: color-mix(in srgb, var(--phase-glow) 80%, #fff 20%);
  box-shadow: 0 0 22px color-mix(in srgb, var(--phase-glow) 30%, transparent);
}

.spp-shop-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
  text-align: right;
  transition: color 0.15s;
}

.spp-root--clickable:hover .spp-shop-hint {
  color: var(--phase-primary);
}
</style>
