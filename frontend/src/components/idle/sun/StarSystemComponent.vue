<template>
  <!-- ① Back-Layer -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-back" aria-hidden="true">
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
        />
      </template>

      <!-- ③ Reward-Icons PRO PLANET -->
      <template v-for="star in allStars" :key="'reward-star-' + star.id">
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
      <template v-for="star in allStars" :key="'summary-' + star.id">
        <div
          v-if="
            getStarRewardSummary(star).totalChimes > 0 ||
            getStarRewardSummary(star).materials.length > 0
          "
          class="star-reward-summary"
          :style="rewardSummaryStyle(star)"
        >
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

const { starRenders } = useStarSystem()
const bossStore = usePlanetBossStore()

const backStars = computed(() => starRenders.value.filter((s) => s.isBehind))
const frontStars = computed(() => starRenders.value.filter((s) => !s.isBehind))
const allStars = computed(() => starRenders.value)

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
  if (boss.reward && boss.reward > 0) {
    items.push({
      key: 'chimes',
      image: '/img/BardAbilities/BardChime.png',
      name: 'Chimes',
      count: boss.reward,
      index: 0,
    })
  }
  if (boss.potentialMaterialId) {
    const mat = MATERIALS.find((m) => m.id === boss.potentialMaterialId)
    if (mat) {
      items.push({
        key: mat.id,
        image: mat.image ?? '',
        name: mat.name,
        count: mat.dropCount ?? 1,
        index: items.length,
      })
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
  for (const planet of star.planets) {
    if (planet.animState === 'saved') continue
    const boss = bossStore.activeBosses.find(
      (b) => b.planetId === planet.planetId && !b.defeated && !b.expired,
    )
    if (!boss) continue
    totalChimes += boss.reward ?? 0
    if (boss.potentialMaterialId) {
      const mat = MATERIALS.find((m) => m.id === boss.potentialMaterialId)
      if (mat) {
        const existing = materialMap.get(boss.potentialMaterialId)
        if (existing) {
          existing.count += mat.dropCount ?? 1
        } else {
          materialMap.set(boss.potentialMaterialId, {
            image: mat.image ?? '',
            name: mat.name,
            count: mat.dropCount ?? 1,
          })
        }
      }
    }
  }
  return { totalChimes, materials: [...materialMap.values()] }
}

function rewardSummaryStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x}px, ${star.y + s / 2 + 14}px) translateX(-50%)`,
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
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: 8;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.summary-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.summary-count {
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}
</style>
