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
      <div class="sf-atmosphere" :class="{ 'sf-atmosphere--galaxy': isGalaxyBoss }">
        <span v-for="i in 18" :key="i" class="sf-ember" :style="emberStyle(i)" />
      </div>

      <div class="sf-modal" :class="{ 'sf-modal--galaxy': isGalaxyBoss }">
        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />

        <!-- ── Header ──────────────────────────────────────────────────────── -->
        <div class="sf-header" :class="{ 'sf-header--galaxy': isGalaxyBoss }">
          <span class="sf-star-type">{{ starTypeLabel }}</span>
          <span class="sf-progress">Boss {{ currentIndex + 1 }} / {{ totalPlanets }}</span>
          <button class="sf-close" @click="handleClose">✕</button>
        </div>

        <!-- ── Wave List ───────────────────────────────────────────────────── -->
        <div class="sf-waves">
          <div
            v-for="(planetId, i) in starGroupStore.starFightPlanetQueue"
            :key="planetId"
            class="sf-wave"
            :class="{
              'sf-wave--done': isCleared(planetId),
              'sf-wave--active': i === currentIndex && !isCleared(planetId),
              'sf-wave--pending': i > currentIndex && !isCleared(planetId),
            }"
          >
            <span class="sf-wave-num">{{ i + 1 }}</span>
            <span class="sf-wave-status">{{ waveStatusIcon(i, planetId) }}</span>
            <span class="sf-wave-label">{{ waveLabel(planetId, i) }}</span>
          </div>
        </div>

        <!-- ── Boss Name Banner ────────────────────────────────────────────── -->
        <div
          v-if="activeBoss"
          class="sf-boss-banner"
          :class="{ 'sf-boss-banner--galaxy': isGalaxyBoss }"
        >
          <div v-if="isGalaxyBoss" class="sf-galaxy-badge">✦ GALAXIE-BOSS ✦</div>
          <h2 class="sf-boss-name" :class="{ 'sf-boss-name--galaxy': isGalaxyBoss }">
            {{ activeBoss.bossName }}
          </h2>
        </div>

        <!-- ── Rewards Preview ─────────────────────────────────────────────── -->
        <BossRewardSection
          v-if="activeBoss"
          :is-galaxy-boss="isGalaxyBoss"
          :reward-slots="rewardSlots"
          :home-planet-champion="homePlanetChampion"
          :home-planet-champion-image="homePlanetChampionImage"
        />

        <!-- ── Fight Arena ─────────────────────────────────────────────────── -->
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

        <!-- ── HP Bar ──────────────────────────────────────────────────────── -->
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
              <div v-for="seg in 9" :key="seg" class="sf-hp-seg" :style="{ left: seg * 10 + '%' }" />
            </div>
          </div>
        </div>

        <div class="sf-scanlines" aria-hidden="true" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import BossArenaSection from '@/components/idle/planet/BossArenaSection.vue'
import BossRewardSection from '@/components/idle/planet/BossRewardSection.vue'

const starGroupStore = useStarGroupStore()
const bossStore = usePlanetBossStore()
const battleStore = useBattleStore()

const isShaking = ref(false)
const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

const activeBoss = computed(() => bossStore.activeBoss)
const isGalaxyBoss = computed(() => activeBoss.value?.isGalaxyBoss ?? false)
const currentIndex = computed(() => starGroupStore.starFightCurrentIndex)
const totalPlanets = computed(() => starGroupStore.starFightPlanetQueue.length)
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

function isCleared(planetId: string): boolean {
  const star = starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId)
  return star?.planetSlots.find((p) => p.planetId === planetId)?.cleared ?? false
}

function waveStatusIcon(index: number, planetId: string): string {
  if (isCleared(planetId)) return '✓'
  if (index === currentIndex.value) return '▶'
  return '◦'
}

function waveLabel(planetId: string, index: number): string {
  const boss = bossStore.activeBosses.find((b) => b.planetId === planetId)
  if (boss?.bossName) return boss.bossName
  const star = starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId)
  const slot = star?.planetSlots.find((p) => p.planetId === planetId)
  if (slot?.isChampionPlanet) return '♛ Champion'
  if (slot?.type) return slot.type.charAt(0).toUpperCase() + slot.type.slice(1)
  return `Welle ${index + 1}`
}

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
  const left = (i * 5.56) % 100
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

// Close modal if the active star disappears (e.g. timer expired externally)
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
  background: radial-gradient(ellipse at center, rgba(20, 4, 0, 0.92) 0%, rgba(0, 0, 0, 0.97) 100%);
  pointer-events: auto;
}

.sf-backdrop--shaking {
  animation: sf-shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes sf-shake {
  10%, 90% { transform: translate(-2px, 0); }
  20%, 80% { transform: translate(3px, 1px); }
  30%, 50%, 70% { transform: translate(-3px, -1px); }
  40%, 60% { transform: translate(3px, 1px); }
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
  0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.9; }
  50%  { transform: translateY(-40vh) translateX(12px) scale(0.8); opacity: 0.6; }
  100% { transform: translateY(-90vh) translateX(-8px) scale(0.3); opacity: 0; }
}

/* ── Modal Card ───────────────────────────────────────────────────────────── */
.sf-modal {
  position: relative;
  pointer-events: auto;
  width: clamp(360px, 44vw, 580px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  background: linear-gradient(180deg, #0e0800 0%, #140c04 40%, #0a0600 100%);
  border: 2px solid #6b3a10;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #3a1e06,
    inset 0 0 40px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(200, 80, 0, 0.25),
    0 0 70px rgba(150, 40, 0, 0.12),
    0 20px 60px rgba(0, 0, 0, 0.9);
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.sf-modal--galaxy {
  border-color: #7a1888;
  box-shadow:
    inset 0 0 0 1px #3a0848,
    inset 0 0 40px rgba(80, 0, 100, 0.4),
    0 0 40px rgba(180, 40, 220, 0.3),
    0 0 80px rgba(120, 20, 160, 0.15),
    0 20px 60px rgba(0, 0, 0, 0.9);
}

/* ── Corners ──────────────────────────────────────────────────────────────── */
.corner {
  position: absolute;
  width: 18px;
  height: 18px;
  z-index: 10;
  pointer-events: none;
}
.corner--tl { top: 0; left: 0; border-top: 2px solid #c8922a; border-left: 2px solid #c8922a; }
.corner--tr { top: 0; right: 0; border-top: 2px solid #c8922a; border-right: 2px solid #c8922a; }
.corner--bl { bottom: 0; left: 0; border-bottom: 2px solid #c8922a; border-left: 2px solid #c8922a; }
.corner--br { bottom: 0; right: 0; border-bottom: 2px solid #c8922a; border-right: 2px solid #c8922a; }
.sf-modal--galaxy .corner { border-color: #cc44ff; }

/* ── Header ───────────────────────────────────────────────────────────────── */
.sf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1rem;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  gap: 0.5rem;
}

.sf-header--galaxy {
  background: linear-gradient(180deg, rgba(40, 0, 60, 0.95) 0%, rgba(10, 0, 20, 0.5) 100%);
  border-bottom-color: #4a0860;
}

.sf-star-type {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
  text-transform: uppercase;
  flex: 1;
}

.sf-progress {
  font-size: 0.72rem;
  font-weight: 700;
  color: #c8922a;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.sf-close {
  background: none;
  border: 1px solid #5c3310;
  color: #e8c040;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
  padding: 2px 7px;
  border-radius: 3px;
  transition: background 0.15s, border-color 0.15s;
}
.sf-close:hover {
  background: rgba(200, 80, 0, 0.2);
  border-color: #c8922a;
}

/* ── Wave List ────────────────────────────────────────────────────────────── */
.sf-waves {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(10, 6, 0, 0.6);
  border-bottom: 1px solid #3a1e06;
}

.sf-wave {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 6px;
  border-radius: 3px;
  border: 1px solid #3a1e06;
  background: #1a1008;
  transition: border-color 0.2s, opacity 0.2s;
  min-width: 0;
}

.sf-wave--active {
  border-color: #e8c040;
  background: #241808;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.25);
}

.sf-wave--done {
  opacity: 0.45;
  border-color: #2e5218;
  background: #0e1a08;
}

.sf-wave--pending {
  opacity: 0.55;
}

.sf-wave-num {
  font-size: 0.62rem;
  font-weight: 700;
  color: #7a6030;
  min-width: 10px;
  text-align: center;
}

.sf-wave--active .sf-wave-num {
  color: #e8c040;
}

.sf-wave-status {
  font-size: 0.7rem;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.sf-wave--done .sf-wave-status {
  color: #52b830;
}

.sf-wave--active .sf-wave-status {
  color: #e8c040;
  animation: sf-wave-blink 0.9s ease-in-out infinite alternate;
}

@keyframes sf-wave-blink {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.sf-wave-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #b09060;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.sf-wave--active .sf-wave-label {
  color: #e8c040;
}

.sf-wave--done .sf-wave-label {
  color: #52b830;
  text-decoration: line-through;
}

/* ── Boss Name Banner ─────────────────────────────────────────────────────── */
.sf-boss-banner {
  text-align: center;
  padding: 0.55rem 1.2rem 0.4rem;
  background: linear-gradient(180deg, rgba(60, 20, 0, 0.9) 0%, rgba(20, 6, 0, 0.5) 100%);
  border-bottom: 1px solid #4a2508;
}

.sf-boss-banner--galaxy {
  background: linear-gradient(180deg, rgba(40, 0, 60, 0.95) 0%, rgba(10, 0, 20, 0.5) 100%);
  border-bottom-color: #4a0860;
}

.sf-galaxy-badge {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #cc44ff;
  opacity: 0.85;
  margin-bottom: 0.15rem;
}

.sf-boss-name {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #e8c040;
  text-shadow: 0 0 16px rgba(232, 192, 64, 0.5), 0 1px 3px rgba(0, 0, 0, 0.9);
  margin: 0;
  text-transform: uppercase;
}

.sf-boss-name--galaxy {
  color: #dd99ff;
  text-shadow: 0 0 16px rgba(200, 100, 255, 0.6), 0 1px 3px rgba(0, 0, 0, 0.9);
}

/* ── HP Bar ───────────────────────────────────────────────────────────────── */
.sf-hp-section {
  padding: 0.5rem 0.9rem 0.6rem;
  background: rgba(8, 4, 0, 0.5);
  border-top: 1px solid #3a1e06;
}

.sf-hp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.sf-stat-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #cc6050;
  text-transform: uppercase;
}

.sf-hp-numbers {
  font-size: 0.72rem;
  font-weight: 700;
  color: #c8a060;
}

.sf-hp-sep {
  opacity: 0.45;
  margin: 0 2px;
}

.sf-hp-track {
  position: relative;
  height: 14px;
  border-radius: 3px;
  background: #0e0a04;
  border: 1px solid #3a1e06;
  overflow: hidden;
}

.sf-hp-track--critical {
  border-color: #6b1010;
  box-shadow: 0 0 8px rgba(180, 20, 20, 0.4);
  animation: sf-hp-crit-pulse 0.7s ease-in-out infinite alternate;
}

.sf-hp-track--galaxy {
  border-color: #5a1268;
}

@keyframes sf-hp-crit-pulse {
  from { box-shadow: 0 0 6px rgba(180, 20, 20, 0.3); }
  to   { box-shadow: 0 0 14px rgba(220, 40, 40, 0.7); }
}

.sf-hp-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  transition: width 0.25s ease-out;
}

.sf-hp-fill--low {
  background: linear-gradient(to right, #8a5010, #c87820);
}

.sf-hp-fill--critical {
  background: linear-gradient(to right, #6b0808, #cc2020);
}

.sf-hp-fill--galaxy {
  background: linear-gradient(to right, #5a0880, #aa20cc);
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
  background: rgba(0, 0, 0, 0.45);
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
    rgba(0, 0, 0, 0.06) 3px,
    rgba(0, 0, 0, 0.06) 4px
  );
  z-index: 5;
}

/* ── Transition ───────────────────────────────────────────────────────────── */
.sf-entrance-enter-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.sf-entrance-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.sf-entrance-enter-from,
.sf-entrance-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
