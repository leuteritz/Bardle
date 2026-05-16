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
      <!-- ── Embers Atmosphäre ──────────────────────────────────────────── -->
      <div class="sf-atmosphere" :class="{ 'sf-atmosphere--galaxy': isGalaxyBoss }">
        <span v-for="i in 22" :key="i" class="sf-ember" :style="emberStyle(i)" />
      </div>

      <!-- ── Modal ─────────────────────────────────────────────────────── -->
      <div class="sf-modal" :class="{ 'sf-modal--galaxy': isGalaxyBoss }">
        <!-- ── Gold Topbar ─────────────────────────────────────────────── -->
        <div class="sf-topbar" />

        <!-- ── Planet Background (gesamtes Modal) ──────────────────────── -->
        <div
          ref="modalPlanetBgRef"
          class="sf-modal-planet-bg"
          :class="{ 'sf-modal-planet-bg--galaxy': isGalaxyBoss }"
        />

        <!-- ── Planet Overlay (Lesbarkeits-Dimmer) ─────────────────────── -->
        <div class="sf-planet-overlay" />

        <!-- ── Sternenfeld ─────────────────────────────────────────────── -->
        <div class="sf-starfield" aria-hidden="true">
          <span v-for="i in 40" :key="i" class="sf-star" :style="starStyle(i)" />
        </div>

        <!-- ── Header ──────────────────────────────────────────────────── -->
        <div class="sf-header" :class="{ 'sf-header--galaxy': isGalaxyBoss }">
          <span class="sf-star-type">{{ starTypeLabel }}</span>
          <button class="sf-close" @click="handleClose">✕</button>
        </div>

        <!-- ── Haupt-Layout ─────────────────────────────────────────────── -->
        <div class="sf-main">
          <!-- Sektion 1: Arena + HP (~60 %) -->
          <div class="sf-arena-wrap">
            <div v-if="isGalaxyBoss" class="sf-galaxy-badge">✦ GALAXIE-BOSS ✦</div>

            <BossArenaSection
              v-if="activeBoss"
              :is-galaxy-boss="isGalaxyBoss"
              :boss-h-p-percent="bossStore.bossHPPercent"
              :seconds-remaining="secondsRemaining"
              :enrage-percent="enragePercent"
              :team-champions="teamChampions"
              :get-champion-image="battleStore.getChampionImage"
              :active-boss="activeBoss"
              @shake="handleShake"
            />

            <!-- ── HP Bar ──────────────────────────────────────────── -->
            <div v-if="activeBoss" class="sf-hp-section">
              <div class="sf-hp-header">
                <span class="sf-stat-label">❤ LEBEN</span>
                <span class="sf-hp-numbers">
                  {{ formatNumber(activeBoss.currentHP) }}
                  <span class="sf-hp-sep">／</span>
                  {{ formatNumber(activeBoss.maxHP) }}
                </span>
              </div>
              <div
                class="sf-hp-track"
                :class="{
                  'sf-hp-track--critical': bossStore.bossHPPercent < 25,
                  'sf-hp-track--galaxy': isGalaxyBoss,
                }"
              >
                <div
                  class="sf-hp-fill"
                  :class="{
                    'sf-hp-fill--galaxy': isGalaxyBoss,
                    'sf-hp-fill--low': bossStore.bossHPPercent < 50 && !isGalaxyBoss,
                    'sf-hp-fill--critical': bossStore.bossHPPercent < 25,
                  }"
                  :style="{ width: bossStore.bossHPPercent + '%' }"
                />
                <div class="sf-hp-segments">
                  <div
                    v-for="seg in 9"
                    :key="seg"
                    class="sf-hp-seg"
                    :style="{ left: seg * 10 + '%' }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Sektion 2: Belohnungen (~20 %) -->
          <div class="sf-rewards-wrap">
            <BossRewardSection
              v-if="activeBoss"
              :is-galaxy-boss="isGalaxyBoss"
              :reward-slots="rewardSlots"
              :home-planet-champion="homePlanetChampion"
              :home-planet-champion-image="homePlanetChampionImage"
            />
          </div>

          <!-- Sektion 3: Planetenliste (~20 %, scrollbar) -->
          <div class="sf-planet-list-wrap">
            <BossPlanetList
              :planet-queue="starGroupStore.starFightPlanetQueue"
              :active-index="currentIndex"
              :is-galaxy-boss="isGalaxyBoss"
            />
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
              <span class="sf-curse-icon">{{ curseDef?.icon }}</span>
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

        <div class="sf-scanlines" aria-hidden="true" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore, CURSE_DEFS } from '@/stores/roleBehaviorStore'
import { formatNumber } from '@/config/numberFormat'
import { NS, drawPlanet } from '@/utils/planetDraw'
import BossArenaSection from '@/components/idle/planet/BossArenaSection.vue'
import BossRewardSection from '@/components/idle/planet/BossRewardSection.vue'
import BossPlanetList from '@/components/idle/planet/BossPlanetList.vue'

// ── Stores ───────────────────────────────────────────────────────────────
const starGroupStore = useStarGroupStore()
const bossStore = usePlanetBossStore()
const battleStore = useBattleStore()
const roleBehaviorStore = useRoleBehaviorStore()

// ── Reaktive Grundwerte ───────────────────────────────────────────────────
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
const currentIndex = computed(() => starGroupStore.starFightCurrentIndex)
const teamChampions = computed<string[]>(() => battleStore.selectedChampions.slice(0, 4))
const rewardSlots = computed(() => activeBoss.value?.rewardSlots ?? [])

const homePlanetChampion = computed(() => activeBoss.value?.homePlanetChampion ?? null)
const homePlanetChampionImage = computed(() => {
  const name = homePlanetChampion.value
  if (!name) return null
  return name === 'Bard' ? '/img/BardAbilities/Bard.png' : `/img/champion/${name}.jpg`
})

const secondsRemaining = computed(() => {
  const boss = activeBoss.value
  if (!boss) return 0
  return Math.max(0, Math.ceil((boss.enrageTimerMs - (now.value - boss.startTime)) / 1000))
})

const enragePercent = computed(() => {
  const boss = activeBoss.value
  if (!boss) return 0
  const remaining = Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
  return (remaining / boss.enrageTimerMs) * 100
})

const starTypeLabel = computed(() => {
  const star = starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId)
  if (!star) return 'STERN'
  if (star.starType === 'champion') return '♛ CHAMPION-STERN'
  if (star.starType === 'galaxy_boss') return '✦ GALAXIE-BOSS-STERN'
  return '⭐ RESSOURCE-STERN'
})

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

// ── Methoden ──────────────────────────────────────────────────────────────
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

function starStyle(i: number): Record<string, string> {
  const top = (i * 7.3 + 13) % 100
  const left = (i * 11.7 + 5) % 100
  const size = 1 + (i % 3)
  const duration = 2 + (i % 9) * 0.5
  const delay = (i % 13) * -0.4
  return {
    top: `${top}%`,
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
  }
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.sf-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(18, 4, 0, 0.94) 0%, rgba(0, 0, 0, 0.98) 100%);
  pointer-events: auto;
}

.sf-backdrop--shaking {
  animation: sf-shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
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
  filter: blur(0.5px);
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

/* ── Modal ────────────────────────────────────────────────────────────────── */
.sf-modal {
  position: relative;
  pointer-events: auto;
  width: min(960px, 95vw);
  height: min(960px, 90dvh);
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #100900 0%, #0a0600 60%, #070400 100%);
  border: 1px solid rgba(120, 60, 10, 0.55);
  border-radius: 5px;
  box-shadow:
    0 0 60px rgba(200, 80, 0, 0.22),
    0 0 120px rgba(140, 40, 0, 0.12),
    0 24px 80px rgba(0, 0, 0, 0.97);
  max-height: 90dvh;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
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

/* ── Modal Planet Background ──────────────────────────────────────────────── */
.sf-modal-planet-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.18;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  border-radius: 5px;
}

.sf-modal-planet-bg--galaxy {
  opacity: 0.26;
  animation: modal-planet-glow 3s ease-in-out infinite alternate;
}

@keyframes modal-planet-glow {
  from {
    filter: drop-shadow(0 0 20px rgba(140, 40, 200, 0.3));
  }
  to {
    filter: drop-shadow(0 0 50px rgba(200, 80, 255, 0.6));
  }
}

/* ── Planet Overlay (Lesbarkeits-Dimmer) ──────────────────────────────────── */
.sf-planet-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.5) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ── Sternenfeld ──────────────────────────────────────────────────────────── */
.sf-starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.sf-star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  animation: sf-star-twinkle ease-in-out infinite alternate;
}

@keyframes sf-star-twinkle {
  from {
    opacity: 0.04;
    transform: scale(0.8);
  }
  to {
    opacity: 0.55;
    transform: scale(1.2);
  }
}

/* Alle Modal-Kinder über dem Planet-Hintergrund ─────────────────────────── */
.sf-topbar,
.sf-header,
.sf-main,
.sf-curse-overlay {
  position: relative;
  z-index: 1;
}

/* ── prefers-reduced-motion ───────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sf-star,
  .sf-ember,
  .sf-modal-planet-bg--galaxy,
  .sf-hp-track--critical,
  .sf-curse-icon,
  .sf-curse-overlay,
  .bpl-active-bar {
    animation: none;
  }
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.sf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: rgba(16, 8, 0, 0.92);
  border-bottom: 2px solid rgba(90, 45, 10, 0.6);
  gap: 0.75rem;
  flex-shrink: 0;
}

.sf-header--galaxy {
  background: rgba(20, 0, 35, 0.92);
  border-bottom-color: rgba(80, 10, 110, 0.7);
}

.sf-star-type {
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.55);
  text-transform: uppercase;
  flex: 1;
}

.sf-close {
  background: none;
  border: 2px solid rgba(120, 60, 10, 0.7);
  color: #c8a040;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 5px 12px;
  border-radius: 4px;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    box-shadow 0.15s;
}
.sf-close:hover {
  background: rgba(200, 80, 0, 0.18);
  border-color: #e8c040;
  color: #e8c040;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.4);
}

/* ── Haupt-Layout ─────────────────────────────────────────────────────────── */
.sf-main {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.75rem 1.25rem 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.sf-arena-wrap {
  flex: 0 0 58%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}

.sf-rewards-wrap {
  flex: 0 0 auto;
}

.sf-planet-list-wrap {
  flex: 1;
  min-height: 120px;
  overflow: hidden;
  border-top: 1px solid rgba(90, 45, 10, 0.35);
  padding-top: 0.25rem;
  margin-top: 0.25rem;
}

.sf-galaxy-badge {
  text-align: center;
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  color: #cc44ff;
  text-shadow: 0 0 10px rgba(190, 60, 255, 0.6);
  opacity: 0.85;
  padding-bottom: 0.15rem;
  text-transform: uppercase;
}

/* ── HP Bar ───────────────────────────────────────────────────────────────── */
.sf-hp-section {
  padding: 0.4rem 0.5rem 0.3rem;
  background: transparent;
  border: none;
}

.sf-hp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 7px;
}

.sf-stat-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #cc5040;
  text-transform: uppercase;
}

.sf-hp-numbers {
  font-size: 0.9rem;
  font-weight: 800;
  color: #c8a050;
  letter-spacing: 0.04em;
}

.sf-hp-sep {
  opacity: 0.4;
  margin: 0 2px;
}

.sf-hp-track {
  position: relative;
  height: 22px;
  border-radius: 4px;
  background: rgba(4, 2, 0, 0.6);
  border: 1px solid rgba(50, 25, 5, 0.4);
  overflow: hidden;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
}

.sf-hp-track--critical {
  border-color: rgba(140, 20, 20, 0.5);
  box-shadow: 0 0 18px rgba(200, 20, 20, 0.35);
  animation: sf-hp-crit-pulse 0.7s ease-in-out infinite alternate;
}
.sf-hp-track--galaxy {
  border-color: rgba(90, 18, 104, 0.7);
}

@keyframes sf-hp-crit-pulse {
  from {
    box-shadow: 0 0 6px rgba(180, 20, 20, 0.3);
  }
  to {
    box-shadow: 0 0 16px rgba(220, 40, 40, 0.65);
  }
}

.sf-hp-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to right, #1a6010, #40a020, #70d040);
  transition: width 0.25s ease-out;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
.sf-hp-fill--low {
  background: linear-gradient(to right, #7a4808, #c07018);
}
.sf-hp-fill--critical {
  background: linear-gradient(to right, #620606, #c01818, #ff3030);
  box-shadow: 0 0 14px rgba(220, 30, 30, 0.55), inset 0 1px 0 rgba(255, 100, 100, 0.2);
}
.sf-hp-fill--galaxy {
  background: linear-gradient(to right, #420060, #8010c0, #cc30ff);
  box-shadow: 0 0 14px rgba(180, 40, 255, 0.5), inset 0 1px 0 rgba(220, 100, 255, 0.2);
}

.sf-hp-segments {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.sf-hp-seg {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.4);
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
  line-height: 1;
  flex-shrink: 0;
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

/* ── Scanlines ────────────────────────────────────────────────────────────── */
.sf-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.05) 3px,
    rgba(0, 0, 0, 0.05) 4px
  );
  z-index: 5;
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
