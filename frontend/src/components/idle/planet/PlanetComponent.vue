<template>
  <svg
    ref="svgEl"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    :class="svgClasses"
    :style="svgStyle"
    @click="handleClick"
  >
    <circle
      v-if="isGalaxyBoss"
      :cx="size / 2"
      :cy="size / 2"
      :r="size / 2 - 1.5"
      fill="none"
      stroke="rgba(180,60,255,0.85)"
      stroke-width="2"
    />
  </svg>
  <PlanetLabelComponent
    v-if="labelData"
    :style="{ transform: labelData.transform }"
    :bossName="labelData.bossName"
    :currentHP="labelData.currentHP"
    :maxHP="labelData.maxHP"
    :reward="labelData.reward"
    :materialImage="labelData.materialImage"
    :materialName="labelData.materialName"
    :championImage="labelData.championImage"
    :championName="labelData.championName"
    :isGalaxyBoss="labelData.isGalaxyBoss"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { drawPlanet } from '@/utils/planetDraw'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import PlanetLabelComponent from './PlanetLabelComponent.vue'
import type { PlanetType, LabelData } from '@/types'

interface Props {
  id: string
  size: number
  planetType: PlanetType
  transform: string
  opacity: number
  isRescue: boolean
  isGalaxyBoss: boolean
  labelData: LabelData | null
  animState: 'normal' | 'exploding' | 'saved'
}

const props = defineProps<Props>()
const bossStore = usePlanetBossStore()
const svgEl = ref<SVGSVGElement | null>(null)

const svgClasses = computed(() => ({
  planet: true,
  'planet--rescue': props.isRescue,
  'planet--rescue--galaxy': props.isGalaxyBoss,
  'planet--exploding': props.animState === 'exploding',
  'planet--saved': props.animState === 'saved',
}))

const svgStyle = computed(() => ({
  transform: props.transform,
  opacity: props.opacity,
  pointerEvents: (props.isRescue ? 'auto' : 'none') as 'auto' | 'none',
  cursor: props.isRescue ? 'pointer' : 'default',
}))

function handleClick() {
  if (props.isRescue) bossStore.openBossModal(props.id)
}

onMounted(() => {
  if (!svgEl.value) return
  const r = props.size / 2
  drawPlanet(svgEl.value, props.id, props.planetType, r, r, r)
})
</script>

<style scoped>
.planet--exploding {
  animation: planetExplode 0.7s ease-out forwards;
  pointer-events: none !important;
}

.planet--saved {
  animation: planetSaved 0.55s ease-out forwards;
  pointer-events: none !important;
}

@keyframes planetExplode {
  0% {
    opacity: 1;
    scale: 1;
    filter: none;
  }
  30% {
    opacity: 0.85;
    scale: 1.5;
    filter: brightness(3) saturate(3);
  }
  100% {
    opacity: 0;
    scale: 2.2;
    filter: brightness(0.5);
  }
}

@keyframes planetSaved {
  0% {
    opacity: 1;
    scale: 1;
    filter: drop-shadow(0 0 8px rgba(100, 255, 150, 0.9));
  }
  50% {
    opacity: 0.9;
    scale: 1.25;
    filter: drop-shadow(0 0 28px rgba(100, 255, 150, 1)) drop-shadow(0 0 55px rgba(200, 255, 210, 0.7));
  }
  100% {
    opacity: 0;
    scale: 1.6;
    filter: drop-shadow(0 0 4px rgba(100, 255, 150, 0.3));
  }
}
</style>
