<template>
  <div :class="['planet-label', { 'planet-label--galaxy': isGalaxyBoss }]">
    <!-- Galaxy Boss Badge -->
    <div v-if="isGalaxyBoss" class="planet-label__galaxy-badge">
      <span class="galaxy-badge__star">✦</span>
      GALAXY BOSS
      <span class="galaxy-badge__star">✦</span>
    </div>

    <!-- Boss Name -->
    <span class="planet-label__name">{{ bossName }}</span>

    <!-- HP Numbers -->
    <span class="planet-label__hp" :class="{ 'planet-label__hp--critical': isCritical }">
      <span class="hp__heart" :class="{ 'hp__heart--critical': isCritical }">♥</span>
      {{ formatNumber(currentHP) }}
      <span class="hp__separator">/</span>
      {{ formatNumber(maxHP) }}
    </span>

    <!-- HP Bar -->
    <div class="planet-label__hp-bar-track">
      <div
        class="planet-label__hp-bar-fill"
        :class="{ 'planet-label__hp-bar-fill--critical': isCritical }"
        :style="{ width: hpPct + '%' }"
      >
        <div class="hp-bar__shimmer" />
      </div>
    </div>

    <!-- Divider -->
    <div v-if="reward || materialImage" class="planet-label__divider" />

    <!-- Chimes Reward -->
    <div v-if="reward" class="planet-label__reward">
      <div class="reward__icon-wrap">
        <img v-if="chimesImage" :src="chimesImage" alt="Chimes" class="reward__icon" />
        <span v-else class="reward__icon-fallback">♪</span>
      </div>
      <div class="reward__text">
        <span class="reward__amount">{{ formatNumber(reward) }}</span>
        <span class="reward__label">Chimes</span>
      </div>
    </div>

    <!-- Material Loot -->
    <div v-if="materialImage" class="planet-label__material">
      <div class="material__icon-wrap">
        <img :src="materialImage" :alt="materialName" class="material__icon" />
        <div class="material__icon-glow" />
      </div>
      <div class="material__info">
        <span v-if="materialCount != null" class="material__count">
          <span class="material__count-x"></span>{{ formatNumber(materialCount) }}
        </span>
        <span class="material__name">{{ materialName }}</span>
      </div>
    </div>

    <!-- Champion -->
    <div v-if="championImage" class="planet-label__champion">
      <div class="champion__frame">
        <img :src="championImage" :alt="championName" />
        <div class="champion__border-glow" />
      </div>
      <span>{{ championName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@/config/numberFormat'

interface Props {
  bossName: string
  currentHP: number
  maxHP: number
  reward: number | null
  chimesImage?: string
  materialImage?: string
  materialName?: string
  materialCount?: number
  championImage?: string
  championName?: string
  isGalaxyBoss: boolean
}

const props = defineProps<Props>()

const hpPct = computed(() => Math.max(0, (props.currentHP / props.maxHP) * 100))
const isCritical = computed(() => hpPct.value < 25)
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   BASE LABEL
   ═══════════════════════════════════════════════════════════════════════════ */

.planet-label {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: left center;
  pointer-events: none;
  z-index: 5;

  background: linear-gradient(
    160deg,
    rgba(10, 6, 36, 0.97) 0%,
    rgba(22, 12, 52, 0.95) 60%,
    rgba(14, 8, 38, 0.97) 100%
  );

  border: 1px solid rgba(255, 165, 55, 0.55);
  border-radius: 6px;
  box-shadow:
    0 0 0 1px rgba(255, 160, 50, 0.08),
    0 0 16px rgba(255, 130, 30, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 40px rgba(255, 140, 20, 0.03);

  padding: 10px 14px;
  min-width: 155px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 5px;

  animation: labelFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Corner accents */
.planet-label::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 12px;
  height: 12px;
  border-top: 2px solid rgba(255, 195, 80, 0.95);
  border-left: 2px solid rgba(255, 195, 80, 0.95);
  border-radius: 6px 0 0 0;
  pointer-events: none;
}

.planet-label::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 12px;
  height: 12px;
  border-bottom: 2px solid rgba(255, 140, 50, 0.75);
  border-right: 2px solid rgba(255, 140, 50, 0.75);
  border-radius: 0 0 6px 0;
  pointer-events: none;
}

@keyframes labelFadeIn {
  0% {
    opacity: 0;
    filter: blur(5px) brightness(1.4);
  }
  100% {
    opacity: 1;
    filter: blur(0) brightness(1);
  }
}

/* ── Divider ── */
.planet-label__divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 165, 50, 0.35) 30%,
    rgba(255, 165, 50, 0.35) 70%,
    transparent
  );
  margin: 1px 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAME
   ═══════════════════════════════════════════════════════════════════════════ */

.planet-label__name {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 228, 182, 0.97);
  text-shadow:
    0 0 8px rgba(255, 200, 130, 0.45),
    0 0 20px rgba(255, 170, 80, 0.15);
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 165, 50, 0.22);
}

/* ═══════════════════════════════════════════════════════════════════════════
   HP
   ═══════════════════════════════════════════════════════════════════════════ */

.planet-label__hp {
  font-size: 12px;
  font-weight: 700;
  color: #e8c040;
  text-shadow: 0 0 7px rgba(232, 192, 64, 0.55);
  display: flex;
  align-items: center;
  gap: 4px;
}

.hp__heart {
  font-size: 11px;
  animation: heartbeat 1.8s ease-in-out infinite;
}

.hp__heart--critical {
  color: #cc6050;
  animation: heartbeat-fast 0.7s ease-in-out infinite;
}

.hp__separator {
  opacity: 0.5;
  font-weight: 400;
}

.planet-label__hp--critical {
  color: #cc6050;
  text-shadow: 0 0 7px rgba(204, 96, 80, 0.6);
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

@keyframes heartbeat-fast {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.8;
  }
}

/* ── HP Bar ── */
.planet-label__hp-bar-track {
  width: 100%;
  height: 7px;
  background: rgba(10, 8, 18, 0.9);
  border: 1px solid rgba(120, 78, 30, 0.7);
  border-radius: 4px;
  overflow: hidden;
}

.planet-label__hp-bar-fill {
  position: relative;
  height: 100%;
  background: linear-gradient(to right, #52b830, #2e7a1a);
  border-radius: 3px;
  transition:
    width 0.4s ease-out,
    background 0.3s;
  overflow: hidden;
}

.planet-label__hp-bar-fill--critical {
  background: linear-gradient(to right, #cc6050, #8b2020);
}

/* Shimmer on HP bar */
.hp-bar__shimmer {
  position: absolute;
  top: 0;
  left: -60%;
  width: 50%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.28), transparent);
  animation: barShimmer 2.4s ease-in-out infinite;
}

@keyframes barShimmer {
  0% {
    left: -60%;
  }
  100% {
    left: 130%;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   REWARD (CHIMES)
   ═══════════════════════════════════════════════════════════════════════════ */

.planet-label__reward {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 7px;
  border-radius: 4px;
  background: rgba(80, 255, 160, 0.05);
  border: 1px solid rgba(80, 255, 160, 0.14);
  box-shadow: inset 0 0 10px rgba(60, 255, 140, 0.05);
}

.reward__icon-wrap {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 3px;
}

.reward__icon {
  width: 35px;
  height: 35px;
  object-fit: contain;
  filter: drop-shadow(0 0 5px rgba(80, 255, 170, 0.85))
    drop-shadow(0 0 10px rgba(40, 220, 120, 0.5));
  animation: rewardIconGlow 2s ease-in-out infinite;
}

.reward__icon-fallback {
  font-size: 13px;
  color: rgba(100, 255, 175, 0.9);
  text-shadow: 0 0 8px rgba(80, 255, 160, 0.8);
  animation: rewardIconGlow 2s ease-in-out infinite;
}

@keyframes rewardIconGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 4px rgba(80, 255, 170, 0.7)) brightness(1);
  }
  50% {
    filter: drop-shadow(0 0 9px rgba(80, 255, 170, 1)) brightness(1.15);
  }
}

.reward__text {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.reward__amount {
  font-size: 13px;
  font-weight: 800;
  color: rgba(120, 255, 185, 0.97);
  text-shadow: 0 0 8px rgba(80, 255, 160, 0.6);
  letter-spacing: 0.03em;
  background: linear-gradient(to bottom, #a0ffcc, #50e89a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.reward__label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(80, 200, 140, 0.65);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MATERIAL
   ═══════════════════════════════════════════════════════════════════════════ */

.planet-label__material {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 7px;
  border-radius: 4px;
  background: rgba(255, 200, 80, 0.05);
  border: 1px solid rgba(255, 190, 60, 0.18);
  box-shadow: inset 0 0 10px rgba(255, 190, 60, 0.04);
}

.material__icon-wrap {
  position: relative;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}

.material__icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  border-radius: 3px;
  filter: drop-shadow(0 0 5px rgba(255, 200, 80, 0.8))
    drop-shadow(0 0 12px rgba(255, 170, 40, 0.45));
  animation: materialGlow 2.6s ease-in-out infinite;
}

.material__icon-glow {
  position: absolute;
  inset: -3px;
  border-radius: 5px;
  background: radial-gradient(ellipse at center, rgba(255, 200, 80, 0.2) 0%, transparent 70%);
  animation: materialGlow 2.6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes materialGlow {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.material__info {
  display: flex;
  flex-direction: row; /* ← war: column */
  align-items: baseline; /* ← war: flex-start */
  gap: 5px; /* ← war: 1px */
}

.material__name {
  font-size: 10px; /* ← war: 12px  → wie reward__label */
  font-weight: 500; /* ← war: 600   → wie reward__label */
  letter-spacing: 0.08em; /* ← wie reward__label */
  text-transform: uppercase; /* ← wie reward__label */
  color: rgba(200, 160, 60, 0.65); /* gedämpftes Gold → wie reward__label grün */
  text-shadow: none;
}

.material__count {
  font-size: 13px; /* ← war: 11px  → wie reward__amount */
  font-weight: 800; /* ← war: 700   → wie reward__amount */
  letter-spacing: 0.03em; /* ← wie reward__amount */
  background: linear-gradient(to bottom, #ffe580, #e8a820);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none; /* text-shadow + background-clip text vertragen sich nicht */
}

.material__count-x {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.6;
  margin-right: 1px;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAMPION
   ═══════════════════════════════════════════════════════════════════════════ */

.planet-label__champion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding-top: 7px;
  border-top: 1px solid rgba(195, 160, 255, 0.2);
}

.champion__frame {
  position: relative;
}

.planet-label__champion img {
  width: 46px;
  height: 46px;
  object-fit: cover;
  object-position: top;
  border-radius: 4px;
  border: 2px solid rgba(195, 160, 255, 0.75);
  box-shadow:
    0 0 10px rgba(180, 80, 255, 0.55),
    0 0 22px rgba(140, 40, 220, 0.25);
  display: block;
}

.champion__border-glow {
  position: absolute;
  inset: -4px;
  border-radius: 7px;
  background: radial-gradient(ellipse at center, rgba(195, 100, 255, 0.18) 0%, transparent 70%);
  animation: championPulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes championPulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.planet-label__champion span {
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 165, 255, 0.97);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-shadow: 0 0 6px rgba(190, 80, 255, 0.5);
}

/* ═══════════════════════════════════════════════════════════════════════════
   GALAXY BOSS
   ═══════════════════════════════════════════════════════════════════════════ */

.planet-label--galaxy {
  background: linear-gradient(
    160deg,
    rgba(8, 4, 28, 0.98) 0%,
    rgba(20, 8, 55, 0.96) 50%,
    rgba(10, 4, 32, 0.98) 100%
  );
  border: 1px solid rgba(185, 80, 255, 0.7);
  box-shadow:
    0 0 0 1px rgba(165, 60, 255, 0.12),
    0 0 20px rgba(165, 60, 255, 0.5),
    0 0 50px rgba(120, 20, 230, 0.22),
    0 8px 32px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(210, 155, 255, 0.1),
    inset 0 0 50px rgba(160, 40, 255, 0.03);
  animation:
    labelFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards,
    galaxyLabelPulse 2.2s ease-in-out infinite;
}

.planet-label--galaxy::before {
  border-top-color: rgba(210, 100, 255, 0.95);
  border-left-color: rgba(210, 100, 255, 0.95);
}

.planet-label--galaxy::after {
  border-bottom-color: rgba(185, 80, 255, 0.75);
  border-right-color: rgba(185, 80, 255, 0.75);
}

.planet-label--galaxy .planet-label__divider {
  background: linear-gradient(
    to right,
    transparent,
    rgba(185, 80, 255, 0.4) 30%,
    rgba(185, 80, 255, 0.4) 70%,
    transparent
  );
}

@keyframes galaxyLabelPulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(165, 60, 255, 0.12),
      0 0 20px rgba(165, 60, 255, 0.5),
      0 0 50px rgba(120, 20, 230, 0.22),
      0 8px 32px rgba(0, 0, 0, 0.8),
      inset 0 1px 0 rgba(210, 155, 255, 0.1);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(210, 105, 255, 0.22),
      0 0 32px rgba(190, 85, 255, 0.75),
      0 0 70px rgba(150, 40, 255, 0.38),
      0 8px 32px rgba(0, 0, 0, 0.8),
      inset 0 1px 0 rgba(230, 175, 255, 0.16);
  }
}

/* ── Galaxy Badge ── */
.planet-label__galaxy-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c060f5;
  text-shadow:
    0 0 8px rgba(210, 80, 255, 0.9),
    0 0 20px rgba(180, 40, 255, 0.45);
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(185, 80, 255, 0.3);
  animation: galaxyBadgeShimmer 3s ease-in-out infinite;
}

.galaxy-badge__star {
  font-size: 8px;
  opacity: 0.85;
  animation: starSpin 4s linear infinite;
  display: inline-block;
}

@keyframes starSpin {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}

@keyframes galaxyBadgeShimmer {
  0%,
  100% {
    opacity: 0.9;
  }
  50% {
    opacity: 1;
    text-shadow:
      0 0 12px rgba(210, 80, 255, 1),
      0 0 28px rgba(180, 40, 255, 0.6);
  }
}

.planet-label--galaxy .planet-label__name {
  color: rgba(225, 165, 255, 0.98);
  text-shadow:
    0 0 9px rgba(195, 80, 255, 0.6),
    0 0 22px rgba(160, 40, 255, 0.2);
  border-bottom-color: rgba(185, 80, 255, 0.28);
}

/* ═══════════════════════════════════════════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .planet-label,
  .planet-label--galaxy {
    animation: none;
    opacity: 1;
  }
  .hp-bar__shimmer,
  .hp__heart,
  .reward__icon,
  .reward__icon-fallback,
  .material__icon,
  .material__icon-glow,
  .champion__border-glow,
  .galaxy-badge__star {
    animation: none;
  }
}
</style>
