<template>
  <Transition name="boss-entrance">
    <div
      v-if="bossStore.bossModalOpen"
      class="battle-backdrop"
      :class="{ 'battle-backdrop--shaking': isShaking }"
      aria-modal="true"
      role="dialog"
      @click.self="bossStore.closeBossModal()"
    >
      <div class="atmosphere" :class="{ 'atmosphere--galaxy': isGalaxyBoss }">
        <span v-for="i in 24" :key="i" class="ember" :style="emberStyle(i)" />
      </div>

      <div
        class="battle-modal"
        :class="{
          'battle-modal--galaxy': isGalaxyBoss,
        }"
      >
        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />

        <!-- ── Boss Name Banner ──────────────────────────────────────────── -->
        <div
          class="name-banner"
          :class="{
            'name-banner--galaxy': isGalaxyBoss,
          }"
        >
          <div v-if="isGalaxyBoss" class="boss-type-badge boss-type-badge--galaxy">
            ✦ GALAXIE-BOSS ✦
          </div>
          <h2
            class="boss-name"
            :class="{
              'boss-name--galaxy': isGalaxyBoss,
            }"
          >
            {{ bossStore.activeBoss?.bossName ?? 'Planet Boss' }}
          </h2>
        </div>

        <!-- ── Rewards Preview ───────────────────────────────────────────── -->
        <div class="reward-preview" :class="{ 'reward-preview--galaxy': isGalaxyBoss }">
          <div class="reward-header">
            <span class="reward-header-line" />
            <span class="reward-header-text">✦ Besiege den Champion und erhalte ✦</span>
            <span class="reward-header-line" />
          </div>
          <div class="reward-slots">
            <div
              v-for="(slot, i) in rewardSlots"
              :key="i"
              class="reward-slot"
              :class="{
                'reward-slot--material': slot.type === 'material',
                'reward-slot--galaxy': isGalaxyBoss,
              }"
            >
              <div class="slot-icon-wrap">
                <img
                  v-if="slot.type === 'material' && slotMaterial(slot)"
                  :src="slotMaterial(slot)!.image"
                  :alt="slotMaterial(slot)!.name"
                  class="slot-mat-img"
                />
                <img
                  v-else
                  src="/img/BardAbilities/BardChime.png"
                  alt="Chimes"
                  class="slot-chimes-img"
                />
              </div>
              <div class="slot-body">
                <span class="slot-type-label">{{
                  slot.type === 'material' ? 'Material' : 'Chimes'
                }}</span>
                <span
                  class="slot-name"
                  :class="
                    slot.type === 'material'
                      ? `rarity--${slotMaterial(slot)?.rarity}`
                      : 'slot-chimes-val'
                  "
                >
                  {{ slot.type === 'material' ? slotMaterial(slot)?.name : `${slot.amount}` }}
                </span>
              </div>
              <span class="slot-guaranteed">✓</span>
            </div>
          </div>
          <div v-if="homePlanetChampion" class="champion-unlock-row">
            <img
              v-if="homePlanetChampionImage"
              :src="homePlanetChampionImage"
              :alt="homePlanetChampion"
              class="champion-portrait"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
            <div class="loot-info">
              <span class="loot-label">Champion</span>
              <span class="champion-name">{{ homePlanetChampion }}</span>
            </div>
            <span class="loot-hint">freischaltbar</span>
          </div>
        </div>

        <!-- ── Battle Arena ──────────────────────────────────────────────── -->
        <BossArenaSection
          :is-galaxy-boss="isGalaxyBoss"
          :boss-h-p-percent="bossStore.bossHPPercent"
          :seconds-remaining="secondsRemaining"
          :enrage-percent="enragePercent"
          :team-champions="teamChampions"
          :get-champion-image="battleStore.getChampionImage"
          :active-boss="bossStore.activeBoss"
          @shake="handleShake"
        />

        <!-- ── HP Bar ────────────────────────────────────────────────────── -->
        <div class="hp-section">
          <div class="hp-header">
            <span class="stat-label">❤ LEBEN</span>
            <span class="hp-numbers">
              {{ formatNumber(bossStore.activeBoss?.currentHP ?? 0) }}
              <span class="hp-sep">／</span>
              {{ formatNumber(bossStore.activeBoss?.maxHP ?? 0) }}
            </span>
          </div>
          <div
            class="hp-track"
            :class="{
              'hp-track--critical': bossStore.bossHPPercent < 25,
              'hp-track--galaxy': isGalaxyBoss,
            }"
          >
            <div
              class="hp-fill"
              :class="{
                'hp-fill--galaxy': isGalaxyBoss,
                'hp-fill--low': bossStore.bossHPPercent < 50 && !isGalaxyBoss,
                'hp-fill--critical': bossStore.bossHPPercent < 25,
              }"
              :style="{ width: bossStore.bossHPPercent + '%' }"
            />
            <div class="hp-segments">
              <div v-for="i in 9" :key="i" class="hp-seg-line" :style="{ left: i * 10 + '%' }" />
            </div>
          </div>
        </div>

        <div class="scanlines" aria-hidden="true" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import { MATERIALS } from '@/config/materials'
import BossArenaSection from '@/components/idle/planet/BossArenaSection.vue'
import type { PlanetBossRewardSlot } from '@/types'

const bossStore = usePlanetBossStore()
const battleStore = useBattleStore()

const teamChampions = computed<string[]>(() => battleStore.selectedChampions.slice(0, 4))

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

const secondsRemaining = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  return Math.max(0, Math.ceil((boss.enrageTimerMs - (now.value - boss.startTime)) / 1000))
})

const enragePercent = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  const remaining = Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
  return (remaining / boss.enrageTimerMs) * 100
})

const isGalaxyBoss = computed(() => bossStore.activeBoss?.isGalaxyBoss ?? false)

const rewardSlots = computed(() => bossStore.activeBoss?.rewardSlots ?? [])

function slotMaterial(slot: PlanetBossRewardSlot) {
  return slot.materialId ? (MATERIALS.find((m) => m.id === slot.materialId) ?? null) : null
}

const homePlanetChampion = computed(() => bossStore.activeBoss?.homePlanetChampion ?? null)
const homePlanetChampionImage = computed(() => {
  const name = homePlanetChampion.value
  if (!name) return null
  return name === 'Bard' ? '/img/BardAbilities/Bard.png' : `/img/champion/${name}.jpg`
})

function emberStyle(i: number): Record<string, string> {
  const duration = 1.8 + (i % 6) * 0.7
  const delay = (i % 11) * -0.35
  const left = (i * 4.17) % 100
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

watch(
  () => bossStore.isBossActive,
  (active) => {
    if (!active) bossStore.closeBossModal()
  },
)

function handleShake(ms: number) {
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, ms)
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════════
   BACKDROP
══════════════════════════════════════════════════════════════════════════════ */
.battle-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(20, 4, 0, 0.92) 0%, rgba(0, 0, 0, 0.97) 100%);
  pointer-events: auto;
}

.battle-backdrop--shaking {
  animation: screen-shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes screen-shake {
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

/* ══════════════════════════════════════════════════════════════════════════════
   ATMOSPHERIC EMBERS
══════════════════════════════════════════════════════════════════════════════ */
.atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ember {
  position: absolute;
  bottom: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff8800 0%, #ff3300 60%, transparent 100%);
  animation: ember-rise linear infinite;
  filter: blur(0.5px);
}

.atmosphere--galaxy .ember {
  background: radial-gradient(circle, #cc55ff 0%, #8800cc 60%, transparent 100%);
}

@keyframes ember-rise {
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

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL CARD
══════════════════════════════════════════════════════════════════════════════ */
.battle-modal {
  position: relative;
  pointer-events: auto;
  width: clamp(360px, 44vw, 520px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  background: linear-gradient(180deg, #0e0800 0%, #140c04 40%, #0a0600 100%);
  border: 2px solid #6b3a10;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px #3a1e06,
    inset 0 0 40px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(200, 80, 0, 0.25),
    0 0 70px rgba(150, 40, 0, 0.12),
    0 20px 60px rgba(0, 0, 0, 0.9);
}

.battle-modal--galaxy {
  border-color: #7a1888;
  box-shadow:
    inset 0 0 0 1px #3a0848,
    inset 0 0 40px rgba(80, 0, 100, 0.4),
    0 0 40px rgba(180, 40, 220, 0.3),
    0 0 80px rgba(120, 20, 160, 0.15),
    0 20px 60px rgba(0, 0, 0, 0.9);
}

/* ── Corner Rune Decorations ─────────────────────────────────────────────── */
.corner {
  position: absolute;
  width: 18px;
  height: 18px;
  z-index: 10;
  pointer-events: none;
}
.corner--tl {
  top: 0;
  left: 0;
  border-top: 2px solid var(--rpg-gold, #c8922a);
  border-left: 2px solid var(--rpg-gold, #c8922a);
}
.corner--tr {
  top: 0;
  right: 0;
  border-top: 2px solid var(--rpg-gold, #c8922a);
  border-right: 2px solid var(--rpg-gold, #c8922a);
}
.corner--bl {
  bottom: 0;
  left: 0;
  border-bottom: 2px solid var(--rpg-gold, #c8922a);
  border-left: 2px solid var(--rpg-gold, #c8922a);
}
.corner--br {
  bottom: 0;
  right: 0;
  border-bottom: 2px solid var(--rpg-gold, #c8922a);
  border-right: 2px solid var(--rpg-gold, #c8922a);
}

.battle-modal--galaxy .corner {
  border-color: #cc44ff;
}

/* ══════════════════════════════════════════════════════════════════════════════
   BOSS NAME BANNER
══════════════════════════════════════════════════════════════════════════════ */
.name-banner {
  position: relative;
  text-align: center;
  padding: 0.7rem 1.2rem 0.5rem;
  background: linear-gradient(180deg, rgba(60, 20, 0, 0.9) 0%, rgba(20, 6, 0, 0.5) 100%);
  border-bottom: 1px solid #4a2508;
  overflow: hidden;
}

.name-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 40px,
    rgba(200, 100, 0, 0.04) 40px,
    rgba(200, 100, 0, 0.04) 41px
  );
  pointer-events: none;
}

.name-banner--galaxy {
  background: linear-gradient(180deg, rgba(40, 0, 60, 0.95) 0%, rgba(10, 0, 20, 0.5) 100%);
  border-bottom-color: #4a0860;
}

.boss-type-badge {
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-gold, #c8922a);
  opacity: 0.75;
  margin-bottom: 0.2rem;
  animation: badge-pulse 2s ease-in-out infinite alternate;
}

.boss-type-badge--galaxy {
  color: #cc44ff;
}

@keyframes badge-pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

.boss-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-danger, #ff3c00);
  text-shadow:
    0 0 8px rgba(255, 60, 0, 0.7),
    0 0 20px rgba(255, 60, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.9);
  animation: name-flicker 4s ease-in-out infinite;
}

.boss-name--galaxy {
  color: #d060f8;
  text-shadow:
    0 0 12px rgba(200, 60, 255, 0.9),
    0 0 30px rgba(200, 60, 255, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.9);
  animation: galaxy-name-pulse 1.8s ease-in-out infinite alternate;
}

@keyframes name-flicker {
  0%,
  95%,
  100% {
    opacity: 1;
  }
  96% {
    opacity: 0.7;
  }
  97% {
    opacity: 1;
  }
  98% {
    opacity: 0.6;
  }
  99% {
    opacity: 1;
  }
}

@keyframes galaxy-name-pulse {
  from {
    text-shadow:
      0 0 12px rgba(200, 60, 255, 0.9),
      0 0 30px rgba(200, 60, 255, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.9);
  }
  to {
    text-shadow:
      0 0 20px rgba(220, 100, 255, 1),
      0 0 50px rgba(200, 60, 255, 0.6),
      0 2px 4px rgba(0, 0, 0, 0.9);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   HP BAR
══════════════════════════════════════════════════════════════════════════════ */
.hp-section {
  padding: 0.55rem 0.9rem 0.4rem;
  background: rgba(0, 0, 0, 0.35);
  border-top: 1px solid rgba(255, 100, 0, 0.15);
}

.hp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.stat-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(200, 180, 140, 0.65);
}

.hp-numbers {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--rpg-gold, #c8922a);
  letter-spacing: 0.03em;
}

.hp-sep {
  color: rgba(200, 180, 140, 0.4);
  margin: 0 0.12rem;
}

.hp-track {
  position: relative;
  height: 12px;
  background: #0d0804;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(100, 50, 10, 0.6);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 0 6px rgba(255, 80, 0, 0.1);
}

.hp-track--critical {
  border-color: rgba(255, 40, 0, 0.5);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 0 8px rgba(255, 40, 0, 0.3);
  animation: track-critical-pulse 0.6s ease-in-out infinite alternate;
}

.hp-track--galaxy {
  border-color: rgba(160, 40, 200, 0.5);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 0 8px rgba(160, 40, 200, 0.2);
}

@keyframes track-critical-pulse {
  from {
    border-color: rgba(255, 40, 0, 0.3);
  }
  to {
    border-color: rgba(255, 40, 0, 0.8);
  }
}

.hp-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to bottom, #6de030 0%, #3aaa10 50%, #2a8808 100%);
  box-shadow:
    0 0 8px rgba(80, 200, 40, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: width 0.25s linear;
  position: relative;
}

.hp-fill::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
}

.hp-fill--low {
  background: linear-gradient(to bottom, #f0c030 0%, #c08010 50%, #906010 100%);
  box-shadow:
    0 0 8px rgba(200, 160, 40, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
.hp-fill--critical {
  background: linear-gradient(to bottom, #ff4020 0%, #cc1a00 50%, #a01000 100%);
  box-shadow:
    0 0 12px rgba(255, 60, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  animation: hp-critical-flash 0.45s ease-in-out infinite alternate;
}
.hp-fill--galaxy {
  background: linear-gradient(to bottom, #b840e8 0%, #7a10b0 50%, #5a0888 100%);
  box-shadow:
    0 0 10px rgba(160, 40, 220, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

@keyframes hp-critical-flash {
  from {
    box-shadow: 0 0 8px rgba(255, 60, 0, 0.5);
  }
  to {
    box-shadow: 0 0 16px rgba(255, 60, 0, 0.9);
  }
}

.hp-segments {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hp-seg-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.4);
  transform: translateX(-50%);
}

/* ══════════════════════════════════════════════════════════════════════════════
   REWARD PREVIEW
══════════════════════════════════════════════════════════════════════════════ */
.reward-preview {
  border-bottom: 1px solid rgba(100, 60, 10, 0.5);
  padding: 0.75rem 0.9rem 0.8rem;
  background: rgba(0, 0, 0, 0.35);
  animation: rewardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

.reward-preview--galaxy {
  border-bottom-color: rgba(120, 40, 160, 0.5);
}

@keyframes rewardReveal {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.reward-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.reward-header-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(200, 146, 42, 0.5));
}

.reward-header-line:last-child {
  background: linear-gradient(to left, transparent, rgba(200, 146, 42, 0.5));
}

.reward-header-text {
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--rpg-gold, #c8922a);
  white-space: nowrap;
}

.reward-slots {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.reward-slot {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.65rem;
  background: rgba(200, 146, 42, 0.05);
  border: 1px solid rgba(120, 78, 32, 0.55);
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgba(200, 146, 42, 0.06);
}

.reward-slot--material {
  background: rgba(120, 40, 180, 0.07);
  border-color: rgba(140, 60, 200, 0.45);
  box-shadow: inset 0 1px 0 rgba(160, 80, 220, 0.08);
}

.reward-slot--galaxy.reward-slot--material {
  border-color: rgba(180, 60, 255, 0.5);
}

.slot-icon-wrap {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 1px solid rgba(120, 78, 32, 0.6);
  border-radius: 4px;
}

.reward-slot--material .slot-icon-wrap {
  border-color: rgba(140, 60, 200, 0.5);
}

.slot-mat-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.slot-chimes-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.7));
}

.slot-body {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  flex: 1;
  min-width: 0;
}

.slot-type-label {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(200, 180, 140, 0.5);
}

.slot-name {
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.2;
}

.slot-chimes-val {
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

.slot-guaranteed {
  font-size: 0.9rem;
  font-weight: 900;
  color: #52b830;
  flex-shrink: 0;
  text-shadow: 0 0 6px rgba(82, 184, 48, 0.6);
}

/* Champion Unlock Row */
.champion-unlock-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.65rem;
  margin-top: 0.4rem;
  background: rgba(60, 100, 200, 0.07);
  border: 1px solid rgba(60, 100, 160, 0.4);
  border-radius: 4px;
}

.champion-portrait {
  height: 40px;
  width: auto;
  object-fit: contain;
  border-radius: 3px;
  border: 1px solid rgba(60, 100, 160, 0.5);
  flex-shrink: 0;
}

.champion-name {
  color: var(--rpg-blue, #4a90d9);
  font-weight: 700;
  font-size: 0.95rem;
}

/* Shared info/label/hint helpers */
.loot-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}

.loot-label {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(200, 180, 140, 0.5);
}

.loot-hint {
  font-size: 0.65rem;
  color: rgba(200, 180, 140, 0.45);
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* ── Rarity Colors ───────────────────────────────────────────────────────── */
.rarity--common {
  color: var(--rpg-rarity-common, #aaaaaa);
}
.rarity--uncommon {
  color: var(--rpg-rarity-uncommon, #1eff00);
}
.rarity--rare {
  color: var(--rpg-rarity-rare, #0070dd);
}
.rarity--epic {
  color: var(--rpg-rarity-epic, #a335ee);
}

/* ══════════════════════════════════════════════════════════════════════════════
   SCANLINES OVERLAY
══════════════════════════════════════════════════════════════════════════════ */
.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.06) 2px,
    rgba(0, 0, 0, 0.06) 4px
  );
  z-index: 50;
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL ENTRANCE ANIMATION
══════════════════════════════════════════════════════════════════════════════ */
.boss-entrance-enter-active {
  animation: epicEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.boss-entrance-leave-active {
  animation: epicExit 0.28s ease-in forwards;
}

@keyframes epicEntrance {
  0% {
    opacity: 0;
    transform: scale(1.12) translateY(-12px);
    filter: blur(8px) brightness(2);
  }
  40% {
    opacity: 1;
    filter: blur(0) brightness(1.3);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0) brightness(1);
  }
}

@keyframes epicExit {
  0% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.88);
    filter: blur(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ember {
    animation: none;
  }
}
</style>
