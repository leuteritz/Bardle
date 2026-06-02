<template>
  <div class="shop-frame">
    <!-- Animated star field -->
    <span
      v-for="star in stars"
      :key="star.id"
      class="star"
      :style="{
        left: star.x + '%',
        top: star.y + '%',
        width: star.size + 'px',
        height: star.size + 'px',
        opacity: star.opacity,
        '--drift-duration': starDriftDuration(star.id),
        '--star-dx': star.dx + 'px',
        '--star-dy': star.dy + 'px',
      }"
    />

    <!-- Cosmic arena -->
    <div class="cosmic-arena">
      <div class="arena-stage">

        <!-- SVG branch rays -->
        <svg class="branch-svg" viewBox="0 0 760 760" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter v-for="branch in BRANCHES" :key="'f-' + branch.id" :id="'glow-' + branch.id">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <template v-for="branch in BRANCHES" :key="branch.id + '-ray'">
            <!-- Dim background ray -->
            <line
              :x1="svgPt(branch.angleDeg, SUN_EDGE_R).x"
              :y1="svgPt(branch.angleDeg, SUN_EDGE_R).y"
              :x2="svgPt(branch.angleDeg, ICON_DIST).x"
              :y2="svgPt(branch.angleDeg, ICON_DIST).y"
              stroke="#2a1a08"
              stroke-width="5"
              stroke-linecap="round"
            />
            <!-- Colored progress ray -->
            <line
              v-if="solarStore.branchLevel(branch.id) > 0"
              :x1="svgPt(branch.angleDeg, SUN_EDGE_R).x"
              :y1="svgPt(branch.angleDeg, SUN_EDGE_R).y"
              :x2="svgPt(branch.angleDeg, ICON_DIST).x"
              :y2="svgPt(branch.angleDeg, ICON_DIST).y"
              :stroke="branch.color"
              stroke-width="4"
              stroke-linecap="round"
              :opacity="0.25 + (solarStore.branchLevel(branch.id) / SOLAR_MAX_LEVELS) * 0.75"
              :filter="`url(#glow-${branch.id})`"
            />
          </template>
        </svg>

        <!-- Sun -->
        <div class="sun-wrapper" :style="sunStyle">
          <div class="sun-trail" />
          <div
            class="cosmic-sun"
            :class="{ 'sun-burst': purchaseFlash }"
            :style="{ transform: `scale(${currentStage.factor})` }"
          />
          <!-- Next phase preview overlay — shown when evolve is ready -->
          <div
            v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
            class="next-phase-preview"
            :style="nextPhasePreviewStyle"
          />
          <div class="sun-hp-text">
            <span class="hp-label">HP</span>
            <span class="hp-value" :class="{ 'hp-value--low': playerStore.isLow }">
              {{ Math.ceil(playerStore.currentHP) }}
            </span>
            <span class="hp-max">/ {{ playerStore.maxHP }}</span>
          </div>
        </div>

        <!-- Evolve Star button — centered below the sun -->
        <div
          v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
          class="evolve-btn-wrap"
        >
          <button
            class="evolve-btn"
            :class="{ 'evolve-btn--upgrading': solarStore.isUpgrading }"
            :style="evolveBtnStyle"
            :disabled="solarStore.isUpgrading"
            @click="handleUpgradeStar"
          >
            <span v-if="!solarStore.isUpgrading">
              ✦ Evolve to {{ nextStage.name }}
            </span>
            <span v-else class="evolve-in-progress">Evolving…</span>
          </button>
        </div>

        <!-- Branch icon + info card -->
        <div
          v-for="branch in BRANCHES"
          :key="branch.id + '-node'"
          class="branch-node"
          :style="getNodePos(branch.angleDeg, ICON_DIST)"
        >
          <!-- Icon circle -->
          <div
            class="icon-circle"
            :class="getIconClass(branch.id)"
            :style="{ '--branch-color': branch.color }"
            @click="handleClick(branch.id)"
          >
            <Icon :icon="branch.icon" width="38" height="38" :style="{ color: branch.color }" />
            <span v-if="solarStore.branchLevel(branch.id) < SOLAR_MAX_LEVELS" class="icon-level-badge">
              {{ solarStore.branchLevel(branch.id) }}/{{ SOLAR_MAX_LEVELS }}
            </span>
            <span v-else class="icon-maxed-badge">MAX</span>
          </div>

          <!-- Info card -->
          <div class="branch-info" :class="isCardBelow(branch.angleDeg) ? 'branch-info--below' : 'branch-info--above'">
            <div class="info-name">{{ branch.name }}</div>

            <!-- Level pips -->
            <div class="info-pips">
              <span
                v-for="n in SOLAR_MAX_LEVELS"
                :key="n"
                class="pip"
                :class="n <= solarStore.branchLevel(branch.id) ? 'pip--filled' : 'pip--empty'"
                :style="n <= solarStore.branchLevel(branch.id) ? { '--pip-color': branch.color } : {}"
              />
            </div>

            <!-- Stat row -->
            <div class="info-stat-row">
              <span class="info-stat-label">{{ branch.statLabel }}:</span>
              <span class="info-stat-val">{{ solarStore.statDisplay(branch.id, solarStore.branchLevel(branch.id)) }}</span>
            </div>

            <!-- Next cost, capped notice, or MAXED -->
            <template v-if="solarStore.branchLevel(branch.id) >= SOLAR_MAX_LEVELS">
              <div class="info-maxed">✦ MAXED</div>
            </template>
            <template v-else-if="solarStore.branchLevel(branch.id) >= solarStore.maxAllowedLevel">
              <div class="info-capped">⟳ Sync others first</div>
            </template>
            <template v-else>
              <div class="info-next-row">
                <span class="info-arrow">→</span>
                <span class="info-stat-next">{{ solarStore.statDisplay(branch.id, solarStore.branchLevel(branch.id) + 1) }}</span>
              </div>
              <div
                class="info-cost"
                :class="solarStore.canAfford(branch.id) ? 'info-cost--can' : 'info-cost--cant'"
              >
                {{ formatNumber(solarStore.branchCost(branch.id)) }} G
              </div>
            </template>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/solarUpgradeStore'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber } from '@/config/numberFormat'
import { SOLAR_MAX_LEVELS, STAR_PHASE_DATA } from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const playerStore = usePlayerStore()

// ── Layout constants ──────────────────────────────────────────────────────────
const SUN_EDGE_R = 110
const ICON_DIST = 285

// ── Branch definitions ────────────────────────────────────────────────────────
interface BranchDef {
  id: SolarBranchId
  name: string
  icon: string
  angleDeg: number
  color: string
  statLabel: string
}

const BRANCHES: BranchDef[] = [
  { id: 'flightSpeed',     name: 'Flight Speed',  icon: 'game-icons:feathered-wing',  angleDeg: 270, color: '#e8c040', statLabel: 'CpS Mult.' },
  { id: 'maxHp',           name: 'Max HP',         icon: 'game-icons:health-increase', angleDeg: 342, color: '#e05050', statLabel: 'HP Bonus'  },
  { id: 'chimesPerClick',  name: 'Chimes / Click', icon: 'game-icons:gold-nuggets',    angleDeg: 54,  color: '#52b830', statLabel: 'CpC Bonus' },
  { id: 'chimesPerSecond', name: 'Chimes / Sec',   icon: 'game-icons:metronome',       angleDeg: 126, color: '#e89840', statLabel: 'CpS Bonus' },
  { id: 'dmgPerClick',     name: 'DMG / Click',    icon: 'game-icons:fist',            angleDeg: 198, color: '#c060a0', statLabel: 'Dmg Mult.' },
]

// ── Star phase system (driven by solarStore.starPhase) ────────────────────────
const currentStage = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
const nextStage = computed(() => STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, 5)])

const sunStyle = computed(() => {
  const s = currentStage.value
  return {
    '--sun-core': s.core,
    '--sun-mid': s.mid,
    '--sun-edge': s.edge,
    '--sun-glow1': s.glow1,
    '--sun-glow2': s.glow2,
    '--sun-glow3': s.glow3,
    '--trail-opacity': (solarStore.flightSpeedLevel / SOLAR_MAX_LEVELS).toFixed(2),
    '--trail-color': s.glow1,
  }
})

const evolveBtnStyle = computed(() => ({
  '--evolve-primary': nextStage.value.phasePrimary,
  '--evolve-glow': nextStage.value.phaseGlow,
}))

const nextPhasePreviewStyle = computed(() => ({
  background: `radial-gradient(circle at 38% 35%, ${nextStage.value.core} 0%, ${nextStage.value.mid} 45%, ${nextStage.value.edge} 100%)`,
  boxShadow: `0 0 40px 16px ${nextStage.value.glow1}88, 0 0 80px 30px ${nextStage.value.glow2}55`,
}))

// ── Purchase flash ────────────────────────────────────────────────────────────
const purchaseFlash = ref(false)

// ── Static star field ─────────────────────────────────────────────────────────
const stars = Array.from({ length: 70 }, (_, i) => {
  let s = (i * 1664525 + 1013904223) & 0x7fffffff
  s = (s * 1664525 + 1013904223) & 0x7fffffff
  const s2 = (s * 1664525 + 1013904223) & 0x7fffffff
  const s3 = (s2 * 1664525 + 1013904223) & 0x7fffffff
  const s4 = (s3 * 1664525 + 1013904223) & 0x7fffffff
  const s5 = (s4 * 1664525 + 1013904223) & 0x7fffffff
  return {
    id: i,
    x: (s % 1000) / 10,
    y: (s2 % 1000) / 10,
    size: 1 + (s3 % 3),
    opacity: (3 + (s % 6)) / 10,
    dx: -8 + (s4 % 17),
    dy: -8 + (s5 % 17),
  }
})

// ── Drift speed tied to flight speed ─────────────────────────────────────────
function starDriftDuration(starId: number): string {
  const base = 13 - solarStore.flightSpeedLevel * 1.8
  const jitter = (starId % 5) * 0.6
  return Math.max(2.5, base + jitter).toFixed(1) + 's'
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

function svgPt(angleDeg: number, dist: number): { x: number; y: number } {
  return {
    x: 380 + Math.cos(rad(angleDeg)) * dist,
    y: 380 + Math.sin(rad(angleDeg)) * dist,
  }
}

function getNodePos(angleDeg: number, dist: number): Record<string, string> {
  const x = Math.cos(rad(angleDeg)) * dist
  const y = Math.sin(rad(angleDeg)) * dist
  return {
    left: `calc(50% + ${Math.round(x)}px)`,
    top: `calc(50% + ${Math.round(y)}px)`,
  }
}

function getIconClass(branchId: SolarBranchId): string {
  const level = solarStore.branchLevel(branchId)
  if (level >= SOLAR_MAX_LEVELS) return 'icon-circle--maxed'
  if (level >= solarStore.maxAllowedLevel) return 'icon-circle--capped'
  if (solarStore.canAfford(branchId)) return 'icon-circle--affordable'
  if (level > 0) return 'icon-circle--partial'
  return 'icon-circle--empty'
}

function isCardBelow(angleDeg: number): boolean {
  const n = ((angleDeg % 360) + 360) % 360
  return n > 0 && n < 180
}

function handleClick(branchId: SolarBranchId): void {
  if (solarStore.branchLevel(branchId) >= solarStore.maxAllowedLevel) return
  const beforeLevel = solarStore.branchLevel(branchId)
  solarStore.buyBranch(branchId)
  if (solarStore.branchLevel(branchId) > beforeLevel) {
    purchaseFlash.value = true
    setTimeout(() => { purchaseFlash.value = false }, 500)
  }
}

function handleUpgradeStar(): void {
  solarStore.upgradeStar()
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   FRAME
══════════════════════════════════════════════════ */
.shop-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 4px 20px rgba(0, 0, 0, 0.9);
  overflow: hidden;
  position: relative;
}

/* ══════════════════════════════════════════════════
   ANIMATED STARS
══════════════════════════════════════════════════ */
.star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  pointer-events: none;
  z-index: 0;
  animation: shop-star-drift var(--drift-duration) ease-in-out infinite alternate;
}

@keyframes shop-star-drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(var(--star-dx), var(--star-dy)); }
}

/* ══════════════════════════════════════════════════
   ARENA
══════════════════════════════════════════════════ */
.cosmic-arena {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  background: radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255, 200, 60, 0.06) 0%, transparent 70%);
}

.arena-stage {
  position: relative;
  width: 760px;
  height: 760px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   SVG OVERLAY
══════════════════════════════════════════════════ */
.branch-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* ══════════════════════════════════════════════════
   SUN
══════════════════════════════════════════════════ */
.sun-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 210px;
  height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.sun-trail {
  position: absolute;
  inset: -28%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse 48% 78% at 68% 50%,
    transparent 32%,
    var(--trail-color) 68%,
    transparent 100%
  );
  opacity: var(--trail-opacity);
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.8s ease;
}

.cosmic-sun {
  position: absolute;
  inset: 0;
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
    0 0 55px 22px color-mix(in srgb, var(--sun-glow1) 80%, transparent),
    0 0 120px 50px color-mix(in srgb, var(--sun-glow1) 55%, transparent),
    0 0 200px 90px color-mix(in srgb, var(--sun-glow2) 32%, transparent),
    0 0 300px 130px color-mix(in srgb, var(--sun-glow3) 16%, transparent);
  animation: sun-pulse 3.2s ease-in-out infinite;
  transition: transform 0.8s ease;
}

@keyframes sun-pulse {
  0%, 100% {
    box-shadow:
      0 0 55px 22px color-mix(in srgb, var(--sun-glow1) 80%, transparent),
      0 0 120px 50px color-mix(in srgb, var(--sun-glow1) 55%, transparent),
      0 0 200px 90px color-mix(in srgb, var(--sun-glow2) 32%, transparent),
      0 0 300px 130px color-mix(in srgb, var(--sun-glow3) 16%, transparent);
  }
  50% {
    box-shadow:
      0 0 80px 36px color-mix(in srgb, var(--sun-glow1) 100%, transparent),
      0 0 170px 75px color-mix(in srgb, var(--sun-glow1) 78%, transparent),
      0 0 280px 125px color-mix(in srgb, var(--sun-glow2) 48%, transparent),
      0 0 400px 175px color-mix(in srgb, var(--sun-glow3) 22%, transparent);
  }
}

.cosmic-sun.sun-burst {
  animation: sun-burst 0.45s ease-out, sun-pulse 3.2s ease-in-out infinite;
}

@keyframes sun-burst {
  0%   { filter: brightness(1) saturate(1); }
  35%  { filter: brightness(2.4) saturate(1.8); }
  100% { filter: brightness(1) saturate(1); }
}

.sun-hp-text {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  pointer-events: none;
}

.hp-label {
  font-size: 10px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 1);
}

.hp-value {
  font-size: 24px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  text-shadow:
    0 0 10px rgba(255, 200, 80, 0.7),
    0 2px 6px rgba(0, 0, 0, 1);
}

.hp-value--low {
  color: #cc6050;
  text-shadow:
    0 0 10px rgba(204, 96, 80, 0.8),
    0 2px 6px rgba(0, 0, 0, 1);
}

.hp-max {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 1);
}

/* ══════════════════════════════════════════════════
   BRANCH NODE (icon + info card)
══════════════════════════════════════════════════ */
.branch-node {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* ══════════════════════════════════════════════════
   ICON CIRCLE
══════════════════════════════════════════════════ */
.icon-circle {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 3px solid #2a1a08;
  background: #111008;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  gap: 2px;
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s;
  flex-shrink: 0;
}

.icon-level-badge {
  font-size: 9px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1;
  pointer-events: none;
}

.icon-maxed-badge {
  font-size: 8px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.5px;
  pointer-events: none;
}

/* States */
.icon-circle--empty {
  border-color: #2a1a08;
  opacity: 0.55;
}

.icon-circle--partial {
  border-color: #7a4e20;
  box-shadow: 0 0 6px rgba(200, 144, 64, 0.3);
}

.icon-circle--partial:hover {
  transform: scale(1.1);
  border-color: #c89040;
}

.icon-circle--affordable {
  border-color: var(--branch-color);
  box-shadow:
    0 0 12px color-mix(in srgb, var(--branch-color) 60%, transparent),
    0 0 24px color-mix(in srgb, var(--branch-color) 25%, transparent);
  animation: icon-pulse 2s ease-in-out infinite;
}

.icon-circle--affordable:hover {
  transform: scale(1.15);
  animation-play-state: paused;
  box-shadow:
    0 0 18px color-mix(in srgb, var(--branch-color) 80%, transparent),
    0 0 36px color-mix(in srgb, var(--branch-color) 40%, transparent);
}

.icon-circle--maxed {
  border-color: #c89040;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.5), 0 0 20px rgba(232, 192, 64, 0.2);
  cursor: default;
}

.icon-circle--maxed:hover {
  transform: scale(1.05);
}

@keyframes icon-pulse {
  0%, 100% { box-shadow: 0 0 12px color-mix(in srgb, var(--branch-color) 55%, transparent), 0 0 22px color-mix(in srgb, var(--branch-color) 22%, transparent); }
  50%       { box-shadow: 0 0 18px color-mix(in srgb, var(--branch-color) 80%, transparent), 0 0 35px color-mix(in srgb, var(--branch-color) 38%, transparent); }
}

/* ══════════════════════════════════════════════════
   INFO CARD
══════════════════════════════════════════════════ */
.branch-info {
  width: 155px;
  background: #16140e;
  border: 2px solid #3e200a;
  border-radius: 4px;
  padding: 8px 10px 9px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}

.branch-info--below {
  margin-top: 6px;
  border-top-color: #5c3310;
}

.branch-info--above {
  margin-bottom: 6px;
  order: -1;
  border-bottom-color: #5c3310;
}

.info-name {
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  text-align: center;
  letter-spacing: 0.3px;
}

.info-pips {
  display: flex;
  justify-content: center;
  gap: 3px;
}

.pip {
  width: 10px;
  height: 6px;
  border-radius: 2px;
}

.pip--filled {
  background: var(--pip-color, #e8c040);
  box-shadow: 0 0 4px color-mix(in srgb, var(--pip-color, #e8c040) 60%, transparent);
}

.pip--empty {
  background: #2a1a08;
  border: 1px solid #3e200a;
}

.info-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.info-stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.info-stat-val {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
}

.info-next-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.info-arrow {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
}

.info-stat-next {
  font-size: 10px;
  font-weight: 900;
  color: #52b830;
}

.info-cost {
  font-size: 12px;
  font-weight: 900;
  text-align: center;
  border-radius: 3px;
  padding: 2px 4px;
}

.info-cost--can {
  color: #a0ffa0;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.3);
}

.info-cost--cant {
  color: #cc6050;
  background: rgba(180, 40, 40, 0.12);
  border: 1px solid rgba(140, 40, 40, 0.3);
}

.info-maxed {
  font-size: 11px;
  font-weight: 900;
  color: #e8c040;
  text-align: center;
  letter-spacing: 1px;
}

.info-capped {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 200, 80, 0.55);
  text-align: center;
  letter-spacing: 0.3px;
}

.icon-circle--capped {
  border-color: #4a3010;
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-circle--capped:hover {
  transform: none;
}

/* ══════════════════════════════════════════════════
   NEXT PHASE PREVIEW OVERLAY
══════════════════════════════════════════════════ */
.next-phase-preview {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
  animation: phase-preview-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
  z-index: 3;
  transition: all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes phase-preview-pulse {
  0%, 100% { opacity: 0.12; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(1.06); }
}

/* ══════════════════════════════════════════════════
   EVOLVE STAR BUTTON
══════════════════════════════════════════════════ */
.evolve-btn-wrap {
  position: absolute;
  top: calc(50% + 115px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  justify-content: center;
}

.evolve-btn {
  padding: 9px 22px;
  border: 2px solid #7a4e20;
  border-radius: 4px;
  background: linear-gradient(to bottom, var(--evolve-primary), var(--evolve-glow));
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 18px color-mix(in srgb, var(--evolve-glow) 60%, transparent),
    0 0 40px color-mix(in srgb, var(--evolve-glow) 30%, transparent);
  color: #111008;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  animation: evolve-btn-glow 2s ease-in-out infinite;
}

.evolve-btn:hover:not(:disabled) {
  transform: scale(1.06);
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 28px color-mix(in srgb, var(--evolve-glow) 85%, transparent),
    0 0 60px color-mix(in srgb, var(--evolve-glow) 45%, transparent);
}

.evolve-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.evolve-btn--upgrading {
  animation: evolve-btn-upgrading 0.6s ease-in-out infinite alternate;
}

@keyframes evolve-btn-glow {
  0%, 100% {
    box-shadow:
      inset 0 0 0 1px #3e200a,
      0 0 18px color-mix(in srgb, var(--evolve-glow) 60%, transparent),
      0 0 40px color-mix(in srgb, var(--evolve-glow) 30%, transparent);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px #3e200a,
      0 0 28px color-mix(in srgb, var(--evolve-glow) 85%, transparent),
      0 0 60px color-mix(in srgb, var(--evolve-glow) 50%, transparent);
  }
}

@keyframes evolve-btn-upgrading {
  from { opacity: 0.6; transform: scale(0.98); }
  to   { opacity: 1;   transform: scale(1.02); }
}

.evolve-in-progress {
  letter-spacing: 2px;
}

/* ══════════════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .cosmic-sun,
  .icon-circle--affordable,
  .star {
    animation: none;
  }
}

/* ══════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════ */
@media (max-width: 560px) {
  .cosmic-arena {
    overflow-y: auto;
    overflow-x: hidden;
    align-items: flex-start;
  }

  .arena-stage {
    transform: scale(0.55);
    transform-origin: top center;
    margin: 0 auto;
  }
}
</style>
