<template>
  <Transition name="sf-entrance">
    <div
      v-if="starGroupStore.starFightModalOpen"
      class="sf-backdrop"
      :class="{ 'sf-backdrop--shaking': isShaking }"
      role="dialog"
      aria-modal="true"
      @click.self="handleClose"
    >
      <!-- ── Ember Atmosphere ───────────────────────────────────────────── -->
      <div class="sf-atmosphere" :class="{ 'sf-atmosphere--galaxy': isGalaxyBoss }">
        <span v-for="i in 22" :key="i" class="sf-ember" :style="emberStyle(i)" />
      </div>

      <!-- ── Modal ─────────────────────────────────────────────────────── -->
      <div class="sf-modal" :class="{ 'sf-modal--galaxy': isGalaxyBoss }">
        <!-- ── Gold Topbar ─────────────────────────────────────────────── -->
        <div class="sf-topbar" />

        <!-- ── Cosmic Background (shared, wie Shop/Team/Planets) ───────── -->
        <CosmicStageBackground />

        <!-- ── Star-Despawn-Ringe — synchron links & rechts ────────────── -->
        <div
          v-for="side in starSecsLeft !== null ? ['left', 'right'] : []"
          :key="side"
          class="sf-star-ring"
          :class="[`sf-star-ring--${side}`, starTimerStateClass]"
          title="Time until the star vanishes"
        >
          <svg viewBox="0 0 100 100" class="sf-star-ring-svg" aria-hidden="true">
            <circle cx="50" cy="50" r="46" class="sf-star-ring-disc" />
            <circle cx="50" cy="50" r="44" class="sf-star-ring-track" />
            <circle
              cx="50"
              cy="50"
              r="44"
              class="sf-star-ring-arc"
              :style="{ strokeDasharray: starRingDashArray }"
            />
          </svg>
          <div class="sf-star-ring-inner">
            <span class="sf-star-ring-secs">{{ starSecsLeft }}</span>
            <span class="sf-star-ring-label">SEC</span>
          </div>
        </div>

        <!-- ── Floating Controls (kein Header mehr) ────────────────────── -->
        <div class="sf-corner-controls">
          <button
            v-if="activeBoss"
            class="sf-admin-kill-btn"
            :class="{ 'sf-admin-kill-btn--flash': adminKillFlashing }"
            title="Admin: instantly defeat all bosses in this star"
            @click="adminKillAllBosses"
          >
            <Icon icon="game-icons:skull" width="12" height="12" />
            ADMIN
          </button>
          <button class="sf-close-btn" aria-label="Close" @click="handleClose">✕</button>
        </div>

        <!-- ── Main Layout ──────────────────────────────────────────────── -->
        <div class="sf-main">
          <!-- Section 1: Planet + Boss zentriert (größter Bereich) -->
          <div class="sf-arena-wrap">
            <!-- Planet-Hintergrund — zentriert im Arena-Bereich, Boss steht mittig darauf -->
            <div
              ref="modalPlanetBgRef"
              class="sf-modal-planet-bg"
              :class="{ 'sf-modal-planet-bg--galaxy': isGalaxyBoss }"
            />

            <BossArenaSection
              v-if="activeBoss"
              @shake="handleShake"
            />

            <!-- ── Ziel-HUD: Bossname + HP-Datenstreifen (rahmenlos, oben) ── -->
            <div v-if="activeBoss" class="sf-hud">
              <span v-if="isGalaxyBoss" class="sf-boss-galaxy-badge">✦ GALAXY BOSS ✦</span>
              <div class="sf-name-row">
                <span class="sf-name-line" />
                <span class="sf-boss-name" :class="{ 'sf-boss-name--galaxy': isGalaxyBoss }">
                  {{ activeBoss.bossName }}
                </span>
                <span class="sf-name-line" />
              </div>
              <div
                class="sf-hp-track"
                :class="{
                  'sf-hp-track--critical': hpPct < 25,
                  'sf-hp-track--galaxy': isGalaxyBoss,
                }"
              >
                <div class="sf-hp-ghost" :style="{ width: hpPct + '%' }" />
                <div
                  class="sf-hp-fill"
                  :class="{
                    'sf-hp-fill--galaxy': isGalaxyBoss,
                    'sf-hp-fill--low': hpPct < 50 && !isGalaxyBoss,
                    'sf-hp-fill--critical': hpPct < 25,
                  }"
                  :style="{ width: hpPct + '%' }"
                />
              </div>
              <div class="sf-hp-readout">
                <span class="sf-hp-numbers">
                  {{ formatNumber(activeBoss.currentHP) }}
                  <span class="sf-hp-sep">/</span>
                  {{ formatNumber(activeBoss.maxHP) }}
                </span>
                <span class="sf-hp-pct" :class="{ 'sf-hp-pct--critical': hpPct < 25 }">
                  {{ Math.round(hpPct) }}%
                </span>
              </div>
            </div>

            <!-- ── Bottom-Dock: Loot-Karte (dieser Boss) + Up-Next-Karte ── -->
            <div class="sf-bottom-dock">
              <BossRewardSection v-if="activeBoss" />
              <BossPlanetList />
            </div>
          </div>
        </div>

        <!-- ── Curse Overlay ────────────────────────────────────────────── -->
        <Transition name="curse-fade">
          <div
            v-if="activeCurse"
            class="sf-curse-overlay"
            :class="{ 'sf-curse-overlay--galaxy': isGalaxyBoss }"
          >
            <div class="sf-curse-inner">
              <Icon v-if="curseDef?.icon?.includes(':')" :icon="curseDef.icon" class="sf-curse-icon" />
              <span v-else class="sf-curse-icon">{{ curseDef?.icon }}</span>
              <div class="sf-curse-text">
                <span class="sf-curse-name">{{ curseDef?.name }}</span>
                <span class="sf-curse-effect">{{ curseDef?.effect }}</span>
              </div>
              <div class="sf-curse-timer">
                <svg class="sf-curse-ring" viewBox="0 0 36 36">
                  <circle class="sf-curse-ring-bg" cx="18" cy="18" r="15" />
                  <circle
                    class="sf-curse-ring-fill"
                    cx="18"
                    cy="18"
                    r="15"
                    :stroke-dashoffset="
                      94.2 -
                      (curseSecsLeft /
                        (activeCurse?.activeUntil
                          ? Math.ceil(
                              (activeCurse.activeUntil -
                                (activeCurse.activeUntil - curseSecsLeft * 1000)) /
                                1000,
                            )
                          : 1)) *
                        94.2
                    "
                  />
                </svg>
                <span class="sf-curse-secs">{{ curseSecsLeft }}s</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useRoleBehaviorStore, CURSE_DEFS } from '@/stores/roleBehaviorStore'
import { formatNumber } from '@/config/numberFormat'
import {
  BOSS_REMOVAL_DELAY_MS,
  STAR_FIGHT_TIMER_WARNING_S,
  STAR_FIGHT_TIMER_CRITICAL_S,
} from '@/config/constants'
import { NS, drawPlanet } from '@/utils/planetDraw'
import BossArenaSection from '@/components/idle/planet/BossArenaSection.vue'
import BossRewardSection from '@/components/idle/planet/BossRewardSection.vue'
import BossPlanetList from '@/components/idle/planet/BossPlanetList.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'

// ── Stores ───────────────────────────────────────────────────────────────
const starGroupStore = useStarGroupStore()
const bossStore = usePlanetBossStore()
const roleBehaviorStore = useRoleBehaviorStore()

// ── Reactive values ───────────────────────────────────────────────────────
const isShaking = ref(false)
const now = ref(Date.now())
const modalPlanetBgRef = ref<HTMLDivElement | null>(null)
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

// ── Computed ──────────────────────────────────────────────────────────────
const activeBoss = computed(() => bossStore.activeBoss)
const isGalaxyBoss = computed(() => activeBoss.value?.isGalaxyBoss ?? false)
const hpPct = computed(() => Math.max(0, Math.min(100, bossStore.bossHPPercent)))

// ── Star-Despawn-Timer ────────────────────────────────────────────────────
const fightStar = computed(
  () => starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId) ?? null,
)

const starSecsLeft = computed<number | null>(() => {
  const s = fightStar.value
  if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return null
  return Math.max(0, Math.ceil((s.spawnedAt + s.durationMs - now.value) / 1000))
})

const starTimePct = computed(() => {
  const s = fightStar.value
  if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return 0
  const remaining = (s.spawnedAt + s.durationMs - now.value) / s.durationMs
  return Math.max(0, Math.min(100, remaining * 100))
})

// Ring-Geometrie: r=44 im 100er-viewBox → Umfang 2πr
const STAR_RING_CIRCUMFERENCE = 2 * Math.PI * 44

const starRingDashArray = computed(
  () =>
    `${(starTimePct.value / 100) * STAR_RING_CIRCUMFERENCE} ${STAR_RING_CIRCUMFERENCE}`,
)

const starTimerStateClass = computed(() => ({
  'sf-star-ring--warning':
    starSecsLeft.value !== null &&
    starSecsLeft.value <= STAR_FIGHT_TIMER_WARNING_S &&
    starSecsLeft.value > STAR_FIGHT_TIMER_CRITICAL_S,
  'sf-star-ring--critical':
    starSecsLeft.value !== null && starSecsLeft.value <= STAR_FIGHT_TIMER_CRITICAL_S,
}))

// ── Curse ─────────────────────────────────────────────────────────────────
const activeCurse = computed(() => {
  const c = roleBehaviorStore.activeCurse
  if (!c || now.value >= c.activeUntil) return null
  if (roleBehaviorStore.cursedStarId !== starGroupStore.activeFightStarId) return null
  return c
})
const curseSecsLeft = computed(() =>
  activeCurse.value
    ? Math.max(0, Math.ceil((activeCurse.value.activeUntil - now.value) / 1000))
    : 0,
)
const curseDef = computed(() => (activeCurse.value ? CURSE_DEFS[activeCurse.value.type] : null))

// ── Planet Background ─────────────────────────────────────────────────────
function renderModalPlanet() {
  if (!modalPlanetBgRef.value || !activeBoss.value) return
  modalPlanetBgRef.value.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('width', '600')
  svg.setAttribute('height', '600')
  svg.setAttribute('viewBox', '0 0 600 600')
  svg.style.width = '100%'
  svg.style.height = '100%'
  const radius = isGalaxyBoss.value ? 290 : 260
  drawPlanet(svg, `modal-bg-${Date.now()}`, activeBoss.value.planetType, 300, 300, radius)
  modalPlanetBgRef.value.appendChild(svg)
}

watch(
  () => activeBoss.value?.planetId,
  async (newId) => {
    if (newId) {
      await nextTick()
      renderModalPlanet()
    }
  },
  { immediate: true },
)

// ── Star-Watcher ──────────────────────────────────────────────────────────
watch(
  () => starGroupStore.activeStars.map((s) => s.id),
  (ids) => {
    if (starGroupStore.starFightModalOpen && starGroupStore.activeFightStarId) {
      if (!ids.includes(starGroupStore.activeFightStarId)) {
        starGroupStore.closeStarFightModal()
      }
    }
  },
)

// ── Admin ─────────────────────────────────────────────────────────────────
const adminKillFlashing = ref(false)

function adminKillAllBosses() {
  const star = starGroupStore.activeStars.find(
    (s) => s.id === starGroupStore.activeFightStarId,
  )
  if (!star) return

  for (const slot of star.planetSlots) {
    if (slot.cleared) continue
    const boss = bossStore.activeBosses.find(
      (b) => b.planetId === slot.planetId && !b.defeated && !b.expired,
    )
    if (!boss) continue
    boss.currentHP = 0
    boss.defeated = true
    bossStore.grantBossRewards(boss)
    const pid = boss.planetId
    setTimeout(() => bossStore.removeBoss(pid), BOSS_REMOVAL_DELAY_MS)
  }

  adminKillFlashing.value = true
  setTimeout(() => {
    adminKillFlashing.value = false
  }, 500)
}

// ── Methods ───────────────────────────────────────────────────────────────
function handleClose() {
  starGroupStore.closeStarFightModal()
}

function handleShake(ms: number) {
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, ms)
}

function emberStyle(i: number): Record<string, string> {
  const duration = 1.8 + (i % 6) * 0.7
  const delay = (i % 11) * -0.35
  const left = (i * 4.55) % 100
  const size = 1.5 + (i % 3)
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    opacity: `${0.4 + (i % 4) * 0.15}`,
  }
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.sf-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(18, 4, 0, 0.94) 0%, rgba(0, 0, 0, 0.98) 100%);
  pointer-events: auto;
}

.sf-backdrop--shaking {
  animation: sf-shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  will-change: transform;
}

@keyframes sf-shake {
  10%,
  90% {
    transform: translate(-2px, 0);
  }
  20%,
  80% {
    transform: translate(3px, 1px);
  }
  30%,
  50%,
  70% {
    transform: translate(-3px, -1px);
  }
  40%,
  60% {
    transform: translate(3px, 1px);
  }
}

/* ── Embers ───────────────────────────────────────────────────────────────── */
.sf-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.sf-ember {
  position: absolute;
  bottom: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff8800 0%, #ff3300 60%, transparent 100%);
  animation: sf-ember-rise linear infinite;
}

.sf-atmosphere--galaxy .sf-ember {
  background: radial-gradient(circle, #cc55ff 0%, #8800cc 60%, transparent 100%);
}

@keyframes sf-ember-rise {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-40vh) translateX(12px) scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: translateY(-90vh) translateX(-8px) scale(0.3);
    opacity: 0;
  }
}

/* ── Modal — Breite wie Bard-Profile-Menü, Höhe nutzt fast den ganzen Screen ── */
.sf-modal {
  position: fixed;
  pointer-events: auto;
  /* ein einheitlicher Abstand zu den Bottom-Bar-Nachbarn: links → MiniMap,
     rechts → CommandPanel, unten → Scoreboard-Streifen (wie BardProfileMenu) */
  --sf-gap: 10px;
  left: calc(var(--hud-panel-size, 330px) + var(--sf-gap));
  right: calc(var(--hud-panel-size, 330px) + var(--sf-gap));
  top: calc(var(--header-total-height, 50px) + 12px);
  bottom: calc(var(--bottom-center-strip-h, 79px) + var(--sf-gap));
  display: flex;
  flex-direction: column;
  /* flacher Deep-Space-Ton wie im Shop (#111008) — kein Verlauf, damit der
     geteilte CosmicStageBackground identisch wirkt */
  background: #111008;
  border: 1px solid rgba(120, 60, 10, 0.55);
  border-radius: 5px;
  box-shadow:
    0 0 60px rgba(200, 80, 0, 0.22),
    0 0 120px rgba(140, 40, 0, 0.12),
    0 24px 80px rgba(0, 0, 0, 0.97);
  overflow: hidden;
}

.sf-modal--galaxy {
  border-color: rgba(120, 20, 160, 0.55);
  box-shadow:
    0 0 70px rgba(160, 40, 220, 0.26),
    0 0 130px rgba(100, 10, 140, 0.14),
    0 24px 80px rgba(0, 0, 0, 0.97);
}

/* ── Gold Topbar ──────────────────────────────────────────────────────────── */
.sf-topbar {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  position: relative;
  z-index: 2;
}

/* ── Planet Background — zentriert im Arena-Bereich ──────────────────────── */
.sf-modal-planet-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.sf-modal-planet-bg--galaxy {
  /* Statischer Glow + Opacity-Pulse — animiertes drop-shadow würde das
     komplette Planet-SVG jeden Frame neu rastern (FPS-Killer) */
  filter: drop-shadow(0 0 35px rgba(180, 60, 230, 0.5));
  animation: modal-planet-glow 3s ease-in-out infinite alternate;
}

@keyframes modal-planet-glow {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 0.6;
  }
}

/* All modal children above the planet background ───────────────────────── */
.sf-topbar,
.sf-main,
.sf-curse-overlay {
  position: relative;
  z-index: 1;
}

/* ── prefers-reduced-motion ───────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sf-ember,
  .sf-modal-planet-bg--galaxy,
  .sf-hp-track--critical,
  .sf-star-ring--critical .sf-star-ring-secs,
  .sf-curse-icon,
  .sf-curse-overlay {
    animation: none;
  }
}

/* ── Floating Controls (ersetzen den Header) ─────────────────────────────── */
.sf-corner-controls {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sf-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid rgba(120, 60, 10, 0.55);
  background: rgba(16, 8, 0, 0.75);
  color: #c8a050;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.sf-close-btn:hover {
  border-color: rgba(200, 146, 42, 0.7);
  background: rgba(30, 16, 4, 0.9);
  color: #e8c040;
  box-shadow: 0 0 8px rgba(200, 146, 42, 0.3);
}

.sf-close-btn:active {
  transform: scale(0.94);
}

/* ── Star-Despawn-Ringe — synchron oben links + rechts ───────────────────── */
.sf-star-ring {
  position: absolute;
  top: 54px;
  width: 100px;
  height: 100px;
  z-index: 5;
  pointer-events: none;
}

.sf-star-ring--left {
  left: 18px;
}
.sf-star-ring--right {
  right: 18px;
}

.sf-star-ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.sf-star-ring-disc {
  fill: rgba(10, 5, 0, 0.62);
  stroke: rgba(120, 60, 10, 0.4);
  stroke-width: 1;
}

.sf-star-ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 5;
}

.sf-star-ring-arc {
  fill: none;
  stroke: #e8c040;
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dasharray 0.2s linear;
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.55));
}

.sf-star-ring-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.sf-star-ring-secs {
  font-size: 1.8rem;
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

.sf-star-ring-label {
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.26em;
  color: rgba(232, 192, 64, 0.6);
  text-transform: uppercase;
}

/* Warnung ≤ STAR_FIGHT_TIMER_WARNING_S */
.sf-star-ring--warning .sf-star-ring-arc {
  stroke: #e8a030;
  filter: drop-shadow(0 0 6px rgba(232, 160, 48, 0.6));
}
.sf-star-ring--warning .sf-star-ring-secs {
  color: #e8a030;
}
.sf-star-ring--warning .sf-star-ring-secs {
  text-shadow:
    0 0 14px rgba(232, 160, 48, 0.55),
    0 2px 4px rgba(0, 0, 0, 0.95);
}
.sf-star-ring--warning .sf-star-ring-label {
  color: rgba(232, 160, 48, 0.65);
}

/* Kritisch ≤ STAR_FIGHT_TIMER_CRITICAL_S */
.sf-star-ring--critical .sf-star-ring-arc {
  stroke: #ff5040;
  filter: drop-shadow(0 0 7px rgba(255, 60, 40, 0.7));
}
.sf-star-ring--critical .sf-star-ring-secs {
  color: #ff5040;
  text-shadow:
    0 0 14px rgba(255, 60, 40, 0.65),
    0 2px 4px rgba(0, 0, 0, 0.95);
  animation: sf-star-ring-crit-pulse 0.7s ease-in-out infinite alternate;
}
.sf-star-ring--critical .sf-star-ring-label {
  color: rgba(255, 80, 64, 0.7);
}

@keyframes sf-star-ring-crit-pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.12);
  }
}


/* ── Main Layout ──────────────────────────────────────────────────────────── */
.sf-main {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.sf-arena-wrap {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Arena füllt den ganzen Bereich — Boss steht mittig auf dem Planeten */
.sf-arena-wrap :deep(.arena) {
  flex: 1;
  min-height: 0;
  height: auto;
  aspect-ratio: auto;
  z-index: 1;
}

/* Boss etwas kompakter, damit der Planet dahinter voll sichtbar bleibt */
.sf-arena-wrap :deep(.boss-img) {
  height: 58%;
  max-width: 48%;
}

/* Bossname kommt jetzt oben ins HP-Overlay — Arena-eigenes Overlay ausblenden */
.sf-arena-wrap :deep(.boss-name-overlay) {
  display: none;
}

/* Arena-eigener Enrage-/Star-Ring aus — ersetzt durch die beiden
   synchronen .sf-star-ring-Countdowns oben links + rechts */
.sf-arena-wrap :deep(.enrage-ring) {
  display: none;
}

/* ── Ziel-HUD oben — rahmenlos, verdrängt keinen Platz ───────────────────── */
.sf-hud {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: min(500px, 60%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  pointer-events: none;
}

.sf-boss-galaxy-badge {
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  color: rgba(200, 60, 255, 0.85);
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(180, 40, 255, 0.5), 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Bossname zwischen dünnen HUD-Klammerlinien */
.sf-name-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
}

.sf-name-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.45));
}
.sf-name-line:last-child {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.45));
}

.sf-boss-name {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #e8c040;
  text-transform: uppercase;
  text-shadow:
    0 0 18px rgba(232, 192, 64, 0.6),
    0 0 40px rgba(200, 130, 20, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.95);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 78%;
}

.sf-boss-name--galaxy {
  color: #dd99ff;
  text-shadow:
    0 0 18px rgba(200, 100, 255, 0.65),
    0 0 40px rgba(160, 50, 255, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

/* Readout unter der Leiste: Zahlen links, Prozent rechts */
.sf-hp-readout {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.sf-hp-pct {
  font-size: 0.82rem;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5), 0 1px 3px rgba(0, 0, 0, 0.9);
}

.sf-hp-pct--critical {
  color: #ff5040;
  text-shadow: 0 0 10px rgba(255, 60, 40, 0.6), 0 1px 3px rgba(0, 0, 0, 0.9);
}

/* ── Bottom-Dock: Loot- und Up-Next-Karten nebeneinander ─────────────────── */
.sf-bottom-dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  display: flex;
  flex-direction: row;
  /* Sekundärkarte (Up Next) dockt unten an und bleibt niedriger als die
     Primärkarte — bewusste Größen-Hierarchie */
  align-items: flex-end;
  gap: 10px;
  padding: 1.6rem 0.9rem 0.75rem;
  background: linear-gradient(
    to top,
    rgba(8, 4, 0, 0.94) 0%,
    rgba(8, 4, 0, 0.6) 62%,
    transparent 100%
  );
}

/* ── HP-Datenstreifen — moderne Leiste mit Ghost-Trail ───────────────────── */
.sf-hp-numbers {
  font-size: 0.78rem;
  font-weight: 800;
  color: #d8b868;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.sf-hp-sep {
  opacity: 0.4;
  margin: 0 3px;
}

.sf-hp-track {
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(232, 192, 64, 0.12);
  overflow: hidden;
}

.sf-hp-track--critical {
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(200, 40, 40, 0.4),
    0 0 18px rgba(200, 20, 20, 0.35);
  animation: sf-hp-crit-pulse 0.7s ease-in-out infinite alternate;
}
.sf-hp-track--galaxy {
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(160, 40, 220, 0.35);
}

@keyframes sf-hp-crit-pulse {
  from {
    box-shadow:
      inset 0 1px 3px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(200, 40, 40, 0.4),
      0 0 6px rgba(180, 20, 20, 0.3);
  }
  to {
    box-shadow:
      inset 0 1px 3px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(220, 60, 60, 0.55),
      0 0 16px rgba(220, 40, 40, 0.65);
  }
}

/* Ghost-Trail: heller Balken zieht dem echten HP-Stand verzögert hinterher */
.sf-hp-ghost {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: rgba(255, 235, 200, 0.35);
  transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.sf-hp-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(to right, #1a6010, #40a020, #70d040);
  transition: width 0.15s ease-out;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.sf-hp-fill--low {
  background: linear-gradient(to right, #7a4808, #c07018, #e8a030);
}
.sf-hp-fill--critical {
  background: linear-gradient(to right, #620606, #c01818, #ff3030);
  box-shadow: 0 0 14px rgba(220, 30, 30, 0.55), inset 0 1px 0 rgba(255, 100, 100, 0.2);
}
.sf-hp-fill--galaxy {
  background: linear-gradient(to right, #420060, #8010c0, #cc30ff);
  box-shadow: 0 0 14px rgba(180, 40, 255, 0.5), inset 0 1px 0 rgba(220, 100, 255, 0.2);
}

/* ── Curse Overlay ────────────────────────────────────────────────────────── */
.sf-curse-overlay {
  display: flex;
  justify-content: center;
  padding: 0.5rem 1rem;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(40, 0, 65, 0.92) 20%,
    rgba(55, 0, 85, 0.96) 50%,
    rgba(40, 0, 65, 0.92) 80%,
    transparent 100%
  );
  border-top: 1px solid rgba(140, 30, 200, 0.45);
  border-bottom: 1px solid rgba(140, 30, 200, 0.45);
  animation: sf-curse-glow 1.6s ease-in-out infinite alternate;
  position: relative;
  z-index: 1;
}

.sf-curse-overlay--galaxy {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(60, 0, 90, 0.95) 20%,
    rgba(80, 0, 120, 0.98) 50%,
    rgba(60, 0, 90, 0.95) 80%,
    transparent 100%
  );
}

.sf-curse-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 520px;
}

.sf-curse-icon {
  font-size: 2.4rem;
  width: 2.4rem;
  height: 2.4rem;
  line-height: 1;
  flex-shrink: 0;
  color: #cc44ff;
  filter: drop-shadow(0 0 12px rgba(200, 60, 255, 0.8));
  animation: sf-curse-icon-pulse 1.2s ease-in-out infinite alternate;
}

@keyframes sf-curse-icon-pulse {
  from {
    transform: scale(0.95);
  }
  to {
    transform: scale(1.05);
  }
}

.sf-curse-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.sf-curse-name {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: #e060ff;
  text-shadow:
    0 0 12px rgba(210, 70, 255, 0.8),
    0 0 30px rgba(180, 40, 255, 0.4);
  text-transform: uppercase;
}

.sf-curse-effect {
  font-size: 0.78rem;
  font-weight: 600;
  color: #c050e8;
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.sf-curse-timer {
  position: relative;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
}

.sf-curse-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.sf-curse-ring-bg {
  fill: none;
  stroke: rgba(100, 20, 140, 0.4);
  stroke-width: 3;
}
.sf-curse-ring-fill {
  fill: none;
  stroke: #cc44ff;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 94.2;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.25s linear;
  filter: drop-shadow(0 0 4px rgba(200, 60, 255, 0.8));
}

.sf-curse-secs {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
  color: #dd88ff;
  letter-spacing: 0.02em;
}

@keyframes sf-curse-glow {
  from {
    box-shadow: inset 0 0 14px rgba(140, 20, 255, 0.12);
  }
  to {
    box-shadow: inset 0 0 30px rgba(190, 60, 255, 0.28);
  }
}

.curse-fade-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.curse-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.curse-fade-enter-from,
.curse-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Admin Kill Button ────────────────────────────────────────────────────── */
.sf-admin-kill-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #6a1818;
  background: linear-gradient(to bottom, #2a0808, #1a0404);
  color: #cc5040;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.sf-admin-kill-btn:hover {
  border-color: #cc3030;
  background: linear-gradient(to bottom, #3a0a0a, #220606);
  color: #e06050;
  box-shadow: 0 0 8px rgba(200, 40, 40, 0.35);
}

.sf-admin-kill-btn:active {
  transform: scale(0.95);
}

.sf-admin-kill-btn--flash {
  animation: admin-kill-flash 0.5s ease-out forwards;
}

@keyframes admin-kill-flash {
  0% {
    background: #cc3030;
    color: #fff;
    border-color: #ff5050;
    box-shadow: 0 0 14px rgba(220, 40, 40, 0.7);
  }
  100% {
    background: linear-gradient(to bottom, #2a0808, #1a0404);
    color: #cc5040;
    border-color: #6a1818;
    box-shadow: none;
  }
}

/* ── Entrance Transition ──────────────────────────────────────────────────── */
.sf-entrance-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.sf-entrance-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.sf-entrance-enter-from,
.sf-entrance-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
