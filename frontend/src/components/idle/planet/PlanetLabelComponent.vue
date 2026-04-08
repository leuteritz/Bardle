<template>
  <div :class="['planet-label', { 'planet-label--galaxy': isGalaxyBoss }]">
    <span v-if="isGalaxyBoss" class="planet-label__galaxy-badge">GALAXY BOSS</span>
    <span class="planet-label__name">{{ bossName }}</span>
    <span class="planet-label__hp" :class="{ 'planet-label__hp--critical': isCritical }">
      ♥ {{ formatNumber(currentHP) }} / {{ formatNumber(maxHP) }}
    </span>
    <div class="planet-label__hp-bar-track">
      <div
        class="planet-label__hp-bar-fill"
        :class="{ 'planet-label__hp-bar-fill--critical': isCritical }"
        :style="{ width: hpPct + '%' }"
      />
    </div>
    <span v-if="reward" class="planet-label__reward">{{ formatNumber(reward) }} Chimes</span>
    <div v-if="materialImage" class="planet-label__material">
      <img :src="materialImage" :alt="materialName" />{{ materialName }}
    </div>
    <div v-if="championImage" class="planet-label__champion">
      <img :src="championImage" :alt="championName" />
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
  materialImage?: string
  materialName?: string
  championImage?: string
  championName?: string
  isGalaxyBoss: boolean
}

const props = defineProps<Props>()

const hpPct = computed(() => Math.max(0, (props.currentHP / props.maxHP) * 100))
const isCritical = computed(() => hpPct.value < 25)
</script>

<style scoped>
/* ─── Planet Labels ────────────────────────────────────────────────────────── */

.planet-label {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: left center;
  pointer-events: none;
  z-index: 5;

  background: linear-gradient(135deg, rgba(8, 8, 32, 0.95) 0%, rgba(18, 10, 45, 0.92) 100%);

  border: 1px solid rgba(255, 165, 55, 0.55);
  border-radius: 4px;
  box-shadow:
    0 0 0 1px rgba(255, 160, 50, 0.08),
    0 0 14px rgba(255, 130, 30, 0.28),
    0 6px 28px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);

  padding: 8px 13px;
  min-width: 140px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* Kein transform in der Animation – JS-Positionierung bleibt unberührt */
  animation: labelFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.planet-label::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 11px;
  height: 11px;
  border-top: 2px solid rgba(255, 185, 80, 0.95);
  border-left: 2px solid rgba(255, 185, 80, 0.95);
  border-radius: 4px 0 0 0;
  pointer-events: none;
}

.planet-label::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 11px;
  height: 11px;
  border-bottom: 2px solid rgba(255, 140, 50, 0.75);
  border-right: 2px solid rgba(255, 140, 50, 0.75);
  border-radius: 0 0 4px 0;
  pointer-events: none;
}

@keyframes labelFadeIn {
  0% {
    opacity: 0;
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    filter: blur(0px);
  }
}

/* ── Name ── */
.planet-label__name {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.09em;
  text-transform: uppercase;

  color: rgba(255, 225, 180, 0.95);
  text-shadow: 0 0 6px rgba(255, 200, 130, 0.3);

  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 165, 50, 0.22);
  margin-bottom: 2px;
}

/* ── Material ── */
.planet-label__material {
  color: rgba(255, 215, 120, 0.95);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.planet-label__material img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(255, 200, 100, 0.65));
}

/* ── HP Numbers ── */
.planet-label__hp {
  font-size: 12px;
  font-weight: 700;
  color: #e8c040;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.5);
}

.planet-label__hp--critical {
  color: #cc6050;
  text-shadow: 0 0 6px rgba(204, 96, 80, 0.6);
}

/* ── HP Bar ── */
.planet-label__hp-bar-track {
  width: 100%;
  height: 6px;
  background: #1c1c18;
  border: 1px solid #7a4e20;
  border-radius: 3px;
  overflow: hidden;
}

.planet-label__hp-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #52b830, #2e7a1a);
  border-radius: 2px;
  transition: width 0.4s ease-out, background 0.3s;
}

.planet-label__hp-bar-fill--critical {
  background: linear-gradient(to right, #cc6050, #8b2020);
}

/* ── Reward ── */
.planet-label__reward {
  color: rgba(120, 255, 185, 0.92);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.planet-label__reward::before {
  content: '✦';
  font-size: 9px;
  opacity: 0.75;
  color: rgba(100, 255, 165, 0.85);
}

/* ── Champion ── */
.planet-label__champion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(195, 160, 255, 0.25);
}

.planet-label__champion img {
  width: 44px;
  height: 44px;
  object-fit: cover;
  object-position: top;
  border-radius: 3px;
  border: 2px solid rgba(195, 160, 255, 0.7);
  box-shadow: 0 0 8px rgba(180, 80, 255, 0.5);
}

.planet-label__champion span {
  font-size: 11px;
  font-weight: 700;
  color: rgba(195, 160, 255, 0.95);
  letter-spacing: 0.06em;
}

@media (prefers-reduced-motion: reduce) {
  .planet-label {
    display: none;
  }
}

/* ─── Galaxy Boss Label ────────────────────────────────────────────────────── */

.planet-label--galaxy {
  background: linear-gradient(135deg, rgba(8, 4, 28, 0.97) 0%, rgba(20, 8, 50, 0.95) 100%);
  border: 1px solid rgba(180, 80, 255, 0.7);
  box-shadow:
    0 0 0 1px rgba(160, 60, 255, 0.12),
    0 0 18px rgba(160, 60, 255, 0.45),
    0 0 40px rgba(120, 20, 220, 0.2),
    0 6px 28px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(200, 150, 255, 0.1);
  animation:
    labelFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards,
    galaxyLabelPulse 2s ease-in-out infinite;
}

.planet-label--galaxy::before {
  border-top-color: rgba(200, 100, 255, 0.95);
  border-left-color: rgba(200, 100, 255, 0.95);
}

.planet-label--galaxy::after {
  border-bottom-color: rgba(180, 80, 255, 0.75);
  border-right-color: rgba(180, 80, 255, 0.75);
}

@keyframes galaxyLabelPulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(160, 60, 255, 0.12),
      0 0 18px rgba(160, 60, 255, 0.45),
      0 0 40px rgba(120, 20, 220, 0.2),
      0 6px 28px rgba(0, 0, 0, 0.75),
      inset 0 1px 0 rgba(200, 150, 255, 0.1);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(200, 100, 255, 0.2),
      0 0 28px rgba(180, 80, 255, 0.7),
      0 0 60px rgba(140, 40, 255, 0.35),
      0 6px 28px rgba(0, 0, 0, 0.75),
      inset 0 1px 0 rgba(220, 170, 255, 0.15);
  }
}

.planet-label__galaxy-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c060f0;
  text-shadow: 0 0 8px rgba(200, 80, 255, 0.8);
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(180, 80, 255, 0.3);
  margin-bottom: 1px;
}

.planet-label--galaxy .planet-label__name {
  color: rgba(220, 160, 255, 0.98);
  text-shadow: 0 0 8px rgba(190, 80, 255, 0.55);
  border-bottom-color: rgba(180, 80, 255, 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .planet-label--galaxy {
    animation: labelFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
}
</style>
