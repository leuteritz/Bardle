<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
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
onMounted(() => {
  if (!store.phaseEnteredAt) store.phaseEnteredAt = Date.now()
  ticker = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => clearInterval(ticker))

const phaseAgeParts = computed(() => {
  if (!store.phaseEnteredAt) return null
  const secs = Math.floor((now.value - store.phaseEnteredAt) / 1000)
  return {
    d: Math.floor(secs / 86400),
    h: Math.floor((secs % 86400) / 3600),
    m: Math.floor((secs % 3600) / 60),
    s: secs % 60,
  }
})

const totalAgeParts = computed(() => {
  const secs = store.totalPhaseSeconds + Math.floor((now.value - store.phaseEnteredAt) / 1000)
  return {
    d: Math.floor(secs / 86400),
    h: Math.floor((secs % 86400) / 3600),
    m: Math.floor((secs % 3600) / 60),
    s: secs % 60,
  }
})

function compactTime(secs: number): string {
  if (secs < 60) return '< 1m'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const phaseHistory = computed(() => {
  if (store.starPhase === 0) return []
  const total = store.totalPhaseSeconds + Math.floor((now.value - store.phaseEnteredAt) / 1000)
  return Array.from({ length: store.starPhase }, (_, i) => {
    const secs = store.phaseTimeHistory[i] ?? 0
    const pct = total > 0 ? (secs / total) * 100 : 0
    return { phase: STAR_PHASE_DATA[i], secs, pct }
  })
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

    <!-- ─ Phase Duration ─ -->
    <div class="spp-duration">
      <div class="spp-duration-header">
        <Icon icon="game-icons:empty-hourglass" width="14" height="14" :style="{ color: 'var(--phase-primary)' }" />
        <span>Time in Phase</span>
      </div>
      <div v-if="!phaseAgeParts" class="spp-duration-unknown">Not tracked yet</div>
      <div v-else class="spp-duration-clock">
        <template v-if="phaseAgeParts.d > 0">
          <div class="spp-seg">
            <span class="spp-seg-val">{{ phaseAgeParts.d }}</span>
            <span class="spp-seg-lbl">d</span>
          </div>
          <span class="spp-seg-sep">:</span>
        </template>
        <div class="spp-seg">
          <span class="spp-seg-val">{{ String(phaseAgeParts.h).padStart(2, '0') }}</span>
          <span class="spp-seg-lbl">h</span>
        </div>
        <span class="spp-seg-sep">:</span>
        <div class="spp-seg">
          <span class="spp-seg-val">{{ String(phaseAgeParts.m).padStart(2, '0') }}</span>
          <span class="spp-seg-lbl">m</span>
        </div>
        <span class="spp-seg-sep">:</span>
        <div class="spp-seg">
          <span class="spp-seg-val">{{ String(phaseAgeParts.s).padStart(2, '0') }}</span>
          <span class="spp-seg-lbl">s</span>
        </div>
      </div>
      <div class="spp-total-wrap">
        <div class="spp-total">
          <span class="spp-total-label">Total</span>
          <span class="spp-total-val">
            <template v-if="totalAgeParts.d > 0">{{ totalAgeParts.d }}d </template>{{ String(totalAgeParts.h).padStart(2, '0') }}h {{ String(totalAgeParts.m).padStart(2, '0') }}m {{ String(totalAgeParts.s).padStart(2, '0') }}s
          </span>
          <span v-if="phaseHistory.length" class="spp-total-hint">▾</span>
        </div>
        <div v-if="phaseHistory.length" class="spp-chronicle">
          <div class="spp-chronicle-header">
            <Icon icon="game-icons:scroll-unfurled" width="11" height="11" style="color: #5c4a30" />
            <span>Phase Chronicle</span>
          </div>
          <div v-for="(row, i) in phaseHistory" :key="i" class="spp-chr-row">
            <span class="spp-chr-dot" :style="{ background: row.phase.phasePrimary, 'box-shadow': `0 0 5px ${row.phase.phaseGlow}` }" />
            <span class="spp-chr-name">{{ row.phase.name.split(' ')[0] }}</span>
            <div class="spp-chr-track">
              <div class="spp-chr-fill" :style="{ width: row.pct + '%', background: row.phase.phasePrimary }" />
            </div>
            <span class="spp-chr-time">{{ compactTime(row.secs) }}</span>
          </div>
        </div>
      </div>
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
        <span class="spp-cell-lbl">Pulse</span>
        <span class="spp-cell-val">{{ phase.pulseSpeed }}</span>
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
  border-radius: var(--bp-radius);
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

/* ─ Phase Duration ──────────────────────────────── */
.spp-duration {
  background: #0e0d07;
  border: 1px solid color-mix(in srgb, var(--phase-glow) 35%, #3e200a);
  border-radius: var(--bp-radius);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spp-duration-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--rpg-wood);
}

.spp-duration-unknown {
  font-size: 12px;
  color: var(--rpg-text-dim);
  font-style: italic;
  text-align: center;
  padding: 4px 0;
}

.spp-duration-clock {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
}

.spp-seg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: #111008;
  border: 1px solid color-mix(in srgb, var(--phase-glow) 22%, #3e200a);
  border-radius: var(--bp-radius);
  padding: 6px 10px;
  min-width: 44px;
}

.spp-seg-val {
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  color: var(--phase-primary);
  text-shadow: 0 0 8px color-mix(in srgb, var(--phase-glow) 60%, transparent);
  font-variant-numeric: tabular-nums;
}

.spp-seg-lbl {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}

.spp-seg-sep {
  font-size: 20px;
  font-weight: 900;
  color: color-mix(in srgb, var(--phase-glow) 40%, transparent);
  padding-bottom: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.spp-total-wrap {
  position: relative;
  cursor: default;
}

.spp-total {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #2a1a08;
}

.spp-total-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5c4a30;
  flex-shrink: 0;
}

.spp-total-val {
  font-size: 15px;
  font-weight: 700;
  color: #9a8060;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.spp-total-hint {
  font-size: 12px;
  color: #4a3820;
  margin-left: auto;
  flex-shrink: 0;
  line-height: 1;
  transition: transform 0.25s ease, color 0.2s ease;
  display: inline-block;
}

.spp-total-wrap:hover .spp-total-hint {
  transform: rotate(180deg);
  color: #9a8060;
}

/* ─ Phase Chronicle ─────────────────────────────── */
.spp-chronicle {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  padding-top: 0;
  border-top: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: max-height 0.35s ease, opacity 0.25s ease, padding-top 0.25s ease;
}

.spp-total-wrap:hover .spp-chronicle {
  max-height: 320px;
  opacity: 1;
  padding-top: 8px;
  border-top: 1px solid #1e1208;
}

.spp-chronicle-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #5c4a30;
  margin-bottom: 2px;
}

.spp-chr-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.spp-chr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.spp-chr-name {
  font-size: 10px;
  font-weight: 700;
  color: #7a6848;
  min-width: 52px;
  flex-shrink: 0;
  letter-spacing: 0.04em;
}

.spp-chr-track {
  flex: 1;
  height: 4px;
  background: #1c1a10;
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid #2a1e08;
}

.spp-chr-fill {
  height: 100%;
  border-radius: 2px;
  opacity: 0.7;
  transition: width 0.5s ease;
}

.spp-chr-time {
  font-size: 10px;
  font-weight: 700;
  color: #9a8060;
  min-width: 36px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
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
  border-radius: var(--bp-radius);
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
