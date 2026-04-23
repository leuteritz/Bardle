<template>
  <!-- ① Back-Layer -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-back" aria-hidden="true">
      <!-- Orbit hints for hidden stars -->
      <svg class="orbit-hints-svg" :viewBox="`0 0 ${screenW} ${screenH}`">
        <defs>
          <filter id="orbit-blur-champion" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="orbit-blur-resource" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="orbit-blur-galaxy_boss" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <ellipse
          v-for="star in backStars"
          :key="'hint-' + star.id"
          :cx="screenCx"
          :cy="screenCy"
          :rx="star.orbitRx"
          :ry="star.orbitRy"
          :transform="`rotate(${(star.orbitTilt * 180) / Math.PI} ${screenCx} ${screenCy})`"
          :stroke="orbitHintColor(star.starType)"
          :stroke-opacity="star.hintOpacity * 0.65"
          :filter="`url(#orbit-blur-${star.starType})`"
          fill="none"
          stroke-width="5"
        />
      </svg>
      <template v-for="star in backStars" :key="star.id">
        <div
          class="star-body"
          :class="`star-body--${star.starType}`"
          :style="starBodyStyle(star)"
        />
        <PlanetComponent
          v-for="p in star.planets.filter((p) => p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>
      <template v-for="star in frontStars" :key="'fb-' + star.id">
        <PlanetComponent
          v-for="p in star.planets.filter((p) => p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>
    </div>
  </Teleport>

  <!-- ② Front-Layer -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-front" aria-hidden="true">
      <template v-for="star in frontStars" :key="star.id">
        <div
          class="star-body"
          :class="`star-body--${star.starType}`"
          :style="starBodyStyle(star)"
        />
        <PlanetComponent
          v-for="p in star.planets.filter((p) => !p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>
      <template v-for="star in backStars" :key="'ff-' + star.id">
        <PlanetComponent
          v-for="p in star.planets.filter((p) => !p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="true"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>

      <!-- ③ Reward-Icons PRO PLANET -->
      <template v-for="star in frontStars" :key="'reward-star-' + star.id">
        <template
          v-for="planet in star.planets.filter((p) => !p.isBehind)"
          :key="'reward-planet-' + planet.planetId"
        >
          <template
            v-for="item in getPlanetRewardItems(planet)"
            :key="'ri-' + planet.planetId + '-' + item.key"
          >
            <div
              class="planet-reward-icon"
              :style="
                planetRewardIconStyle(planet, item.index, getPlanetRewardItems(planet).length)
              "
            >
              <img :src="item.image" :alt="item.name" class="reward-icon-img" />
            </div>
          </template>
        </template>
      </template>

      <!-- ④ Stern-Gesamt-Belohnung -->
      <template v-for="star in frontStars" :key="'summary-' + star.id">
        <div
          v-if="
            getStarRewardSummary(star).totalChimes > 0 ||
            getStarRewardSummary(star).materials.length > 0 ||
            getStarRewardSummary(star).champion
          "
          class="star-reward-summary"
          :style="rewardSummaryStyle(star)"
        >
          <!-- Champion section (dominant, on top) -->
          <div v-if="getStarRewardSummary(star).champion" class="summary-champion">
            <span class="summary-champion__crown">♛</span>
            <div class="summary-champion__icon-wrap">
              <img
                :src="getStarRewardSummary(star).champion!.image"
                :alt="getStarRewardSummary(star).champion!.name"
                class="summary-champion__icon"
              />
            </div>
            <span class="summary-champion__name">{{
              getStarRewardSummary(star).champion!.name
            }}</span>
          </div>
          <!-- Divider between champion and loot row -->
          <div
            v-if="
              getStarRewardSummary(star).champion &&
              (getStarRewardSummary(star).totalChimes > 0 ||
                getStarRewardSummary(star).materials.length > 0)
            "
            class="summary-divider"
          />
          <!-- Chimes + Materials row -->
          <div class="summary-loot-row">
            <div v-if="getStarRewardSummary(star).totalChimes > 0" class="summary-item">
              <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="summary-icon" />
              <span class="summary-count"
                >×{{ formatNumber(getStarRewardSummary(star).totalChimes) }}</span
              >
            </div>
            <div
              v-for="mat in getStarRewardSummary(star).materials"
              :key="mat.name"
              class="summary-item"
            >
              <img :src="mat.image" :alt="mat.name" class="summary-icon" />
              <span class="summary-count">×{{ mat.count }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStarSystem } from '../../../composables/useStarSystem'
import type { StarRenderEntry, PlanetRenderEntry } from '../../../composables/useStarSystem'
import PlanetComponent from '../planet/PlanetComponent.vue'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { MATERIALS } from '../../../config/materials'
import { formatNumber } from '../../../config/numberFormat'
import PlanetOrbit from './PlanetOrbit.vue'

const { starRenders } = useStarSystem()
const bossStore = usePlanetBossStore()

const backStars = computed(() => starRenders.value.filter((s) => s.isBehind))
const frontStars = computed(() => starRenders.value.filter((s) => !s.isBehind))
const screenW = window.innerWidth
const screenH = window.innerHeight
const screenCx = screenW / 2
const screenCy = screenH / 2

const HINT_COLORS: Record<string, string> = {
  champion: '#e8c040',
  resource: '#60b8ff',
  galaxy_boss: '#ff5030',
}

function orbitHintColor(starType: string): string {
  return HINT_COLORS[starType] ?? '#ffffff'
}

function starBodyStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x - s / 2}px, ${star.y - s / 2}px) scale(${star.scale.toFixed(4)})`,
    opacity: String(star.opacity.toFixed(3)),
    width: `${s}px`,
    height: `${s}px`,
  }
}

function starSize(type: string): number {
  if (type === 'galaxy_boss') return 82
  if (type === 'champion') return 72
  return 62
}

function getPlanetRewardItems(planet: PlanetRenderEntry) {
  if (planet.animState === 'saved') return []
  const boss = bossStore.activeBosses.find(
    (b) => b.planetId === planet.planetId && !b.defeated && !b.expired,
  )
  if (!boss) return []
  const items: { key: string; image: string; name: string; count: number; index: number }[] = []
  const totalChimes = boss.rewardSlots
    .filter((s) => s.type === 'chimes')
    .reduce((sum, s) => sum + (s.amount ?? 0), 0)
  if (totalChimes > 0) {
    items.push({
      key: 'chimes',
      image: '/img/BardAbilities/BardChime.png',
      name: 'Chimes',
      count: totalChimes,
      index: 0,
    })
  }
  for (const slot of boss.rewardSlots.filter((s) => s.type === 'material')) {
    if (slot.materialId) {
      const mat = MATERIALS.find((m) => m.id === slot.materialId)
      if (mat) {
        items.push({
          key: mat.id,
          image: mat.image ?? '',
          name: mat.name,
          count: 1,
          index: items.length,
        })
      }
    }
  }
  return items
}

const PLANET_ICON_SIZE = 36
const PLANET_ICON_GAP = 6

function planetRewardIconStyle(planet: PlanetRenderEntry, itemIndex: number, totalItems: number) {
  const match = planet.transform?.match(/translate\(([^,]+)px,\s*([^)]+)px\)/)
  const px = match ? parseFloat(match[1]) : 0
  const py = match ? parseFloat(match[2]) : 0
  const halfPlanet = (planet.size ?? 20) / 2
  const itemSlot = PLANET_ICON_SIZE + PLANET_ICON_GAP
  const totalW = totalItems * itemSlot - PLANET_ICON_GAP
  const offsetX = itemIndex * itemSlot - totalW / 2 + PLANET_ICON_SIZE / 2
  const offsetY = -(halfPlanet + 8 + PLANET_ICON_SIZE)
  return {
    transform: `translate(${px + offsetX}px, ${py + offsetY}px) translateX(-50%)`,
  }
}

function getStarRewardSummary(star: StarRenderEntry) {
  let totalChimes = 0
  const materialMap = new Map<string, { image: string; name: string; count: number }>()
  let champion: { name: string; image: string } | null = null
  for (const planet of star.planets) {
    if (planet.animState === 'saved') continue
    const boss = bossStore.activeBosses.find(
      (b) => b.planetId === planet.planetId && !b.defeated && !b.expired,
    )
    if (!boss) continue
    totalChimes += boss.rewardSlots
      .filter((s) => s.type === 'chimes')
      .reduce((sum, s) => sum + (s.amount ?? 0), 0)
    for (const slot of boss.rewardSlots.filter((s) => s.type === 'material')) {
      if (slot.materialId) {
        const mat = MATERIALS.find((m) => m.id === slot.materialId)
        if (mat) {
          const existing = materialMap.get(slot.materialId)
          if (existing) {
            existing.count += 1
          } else {
            materialMap.set(slot.materialId, {
              image: mat.image ?? '',
              name: mat.name,
              count: 1,
            })
          }
        }
      }
    }
    if (!champion && boss.isChampionPlanet && boss.homePlanetChampion) {
      champion = {
        name: boss.homePlanetChampion,
        image: `/img/champion/${boss.homePlanetChampion}.jpg`,
      }
    }
  }
  return { totalChimes, materials: [...materialMap.values()], champion }
}

function getChampionImageForPlanet(planet: PlanetRenderEntry): string | null {
  if (planet.animState === 'saved') return null
  const boss = bossStore.activeBosses.find(
    (b) => b.planetId === planet.planetId && !b.defeated && !b.expired,
  )
  if (!boss || !boss.isChampionPlanet || !boss.homePlanetChampion) return null
  return `/img/champion/${boss.homePlanetChampion}.jpg`
}

function rewardSummaryStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x}px, ${star.y + s / 2 + 58}px) translateX(-50%)`,
  }
}
</script>

<style scoped>
.star-sys-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.star-sys-back {
  z-index: 3;
}
.star-sys-front {
  z-index: 7;
}

.orbit-hints-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.star-body {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  will-change: transform, opacity;
  animation: star-pulse 2.8s ease-in-out infinite;
}

.star-body--champion {
  background: radial-gradient(circle, #ffe8a0 0%, #d4a020 45%, #7a4808 100%);
  box-shadow:
    0 0 14px rgba(255, 200, 60, 0.9),
    0 0 32px rgba(220, 140, 20, 0.6),
    0 0 56px rgba(180, 100, 10, 0.3);
}
.star-body--champion::after {
  content: '';
  position: absolute;
  inset: -11px;
  border-radius: 50%;
  border: 1px solid rgba(255, 200, 60, 0.35);
  animation: star-ring-pulse 2.8s ease-in-out infinite;
}

.star-body--resource {
  background: radial-gradient(circle, #ffffff 0%, #a8d4ff 35%, #2060c8 75%, #0a1a5c 100%);
  box-shadow:
    0 0 12px rgba(160, 210, 255, 0.95),
    0 0 28px rgba(80, 160, 255, 0.65),
    0 0 52px rgba(30, 80, 200, 0.35);
}
.star-body--resource::after {
  content: '';
  position: absolute;
  inset: -11px;
  border-radius: 50%;
  border: 1px solid rgba(120, 190, 255, 0.3);
  animation: star-ring-pulse 2.8s ease-in-out infinite;
}

.star-body--galaxy_boss {
  background: radial-gradient(circle, #ff9060 0%, #c01818 45%, #4a0000 100%);
  box-shadow:
    0 0 18px rgba(255, 80, 30, 0.95),
    0 0 38px rgba(200, 20, 20, 0.7),
    0 0 65px rgba(120, 0, 0, 0.4);
}
.star-body--galaxy_boss::after {
  content: '';
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 80, 30, 0.4);
  animation: star-ring-pulse 2.2s ease-in-out infinite;
}

@keyframes star-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.25);
  }
}

@keyframes star-ring-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.6;
  }
}

.planet-reward-icon {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reward-icon-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(255, 200, 80, 0.7));
}

.star-reward-summary {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 4px;
  background: rgba(8, 5, 18, 0.82);
  border: 1px solid rgba(232, 192, 64, 0.5);
  pointer-events: none;
  z-index: 8;
}

.star-reward-summary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -100%);
  width: 1px;
  height: 52px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(232, 192, 64, 0.25) 40%,
    rgba(232, 192, 64, 0.5) 100%
  );
}

.summary-loot-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.6));
}

.summary-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: #e8c040;
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.55);
}

.summary-divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(195, 160, 255, 0.35) 40%,
    rgba(195, 160, 255, 0.35) 60%,
    transparent
  );
}

.summary-champion {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-champion__crown {
  font-size: 13px;
  color: #c8a0ff;
  text-shadow: 0 0 8px rgba(195, 100, 255, 0.85);
  flex-shrink: 0;
}

.summary-champion__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(195, 160, 255, 0.8);
  box-shadow:
    0 0 10px rgba(180, 80, 255, 0.5),
    0 0 20px rgba(140, 40, 220, 0.25);
  flex-shrink: 0;
  animation: champIconPulse 2.2s ease-in-out infinite;
}

.summary-champion__icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.summary-champion__name {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(200, 165, 255, 0.97);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow: 0 0 6px rgba(190, 80, 255, 0.5);
  white-space: nowrap;
}

@keyframes champIconPulse {
  0%,
  100% {
    box-shadow:
      0 0 10px rgba(180, 80, 255, 0.5),
      0 0 20px rgba(140, 40, 220, 0.25);
  }
  50% {
    box-shadow:
      0 0 16px rgba(195, 100, 255, 0.8),
      0 0 32px rgba(160, 60, 240, 0.45);
  }
}
</style>
