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
    <g ref="drawGroup" />
    <circle
      v-if="isGalaxyBoss"
      :cx="size / 2"
      :cy="size / 2"
      :r="size / 2 - 1.5"
      fill="none"
      stroke="rgba(180,60,255,0.85)"
      stroke-width="2"
      :class="{ 'galaxy-boss-ring--arriving': animState === 'champion_arriving' }"
    />
    <!-- Reward-Icon: Material hat Priorität, sonst Chimes -->
    <template v-if="labelData && (labelData.materialImage || (labelData.chimesImage && labelData.reward))">
      <circle
        :cx="size / 2"
        :cy="size - 14"
        r="11"
        fill="rgba(0,0,0,0.6)"
        stroke="rgba(255,200,80,0.35)"
        stroke-width="1"
      />
      <image
        :href="labelData.materialImage ?? labelData.chimesImage"
        :x="size / 2 - 9"
        :y="size - 25"
        width="18"
        height="18"
      />
    </template>
  </svg>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { drawPlanet } from '@/utils/planetDraw'
import { usePlanetBossStore } from '@/stores/planetBossStore'
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
  animState: 'normal' | 'exploding' | 'saved' | 'champion_arriving'
}

const props = defineProps<Props>()
const bossStore = usePlanetBossStore()
const svgEl = ref<SVGSVGElement | null>(null)
const drawGroup = ref<SVGGElement | null>(null)

const svgClasses = computed(() => ({
  planet: true,
  'planet--rescue': props.isRescue,
  'planet--rescue--galaxy': props.isGalaxyBoss,
  'planet--exploding': props.animState === 'exploding',
  'planet--saved': props.animState === 'saved',
  'planet--champion-arriving': props.animState === 'champion_arriving',
}))

const svgStyle = computed(() => ({
  position: 'absolute' as const,
  top: '0',
  left: '0',
  transformOrigin: '0px 0px',
  transform: props.transform,
  opacity: props.opacity,
  pointerEvents: (props.isRescue ? 'auto' : 'none') as 'auto' | 'none',
  cursor: props.isRescue ? 'pointer' : 'default',
}))

function handleClick() {
  if (props.isRescue) bossStore.openBossModal(props.id)
}

function redrawPlanet() {
  if (!drawGroup.value) return
  drawGroup.value.innerHTML = ''
  const r = props.size / 2
  drawPlanet(drawGroup.value as unknown as SVGSVGElement, props.id, props.planetType, r, r, r)
}

onMounted(async () => {
  await nextTick()
  redrawPlanet()
})

watch(
  () => props.isGalaxyBoss,
  async () => {
    await nextTick()
    redrawPlanet()
  },
)

watch(
  () => props.planetType,
  async () => {
    await nextTick()
    redrawPlanet()
  },
)
</script>

<style scoped>
/* ── Bestehende Animationen (unverändert) ─────────────────────────────────── */
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
    filter: drop-shadow(0 0 28px rgba(100, 255, 150, 1))
      drop-shadow(0 0 55px rgba(200, 255, 210, 0.7));
  }
  100% {
    opacity: 0;
    scale: 1.6;
    filter: drop-shadow(0 0 4px rgba(100, 255, 150, 0.3));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAMPION-PLANET ARRIVAL — Blutroter Hölleneinschlag
   Phase 1 : 0–5%   Vakuum-Blitz (reines Weiß, scale 0→5)
   Phase 2 : 5–16%  Roter Glutkern entfaltet sich
   Phase 3 : 16–30% Crimson-Schockwelle
   Phase 4 : 30–44% Doppel-Pulse (Herz-Rhythmus)
   Phase 5 : 44–68% Glühende Stabilisierung
   Phase 6 : 68–100% Einbrennen — bleibt mit rotem Nachleuchten
   ═══════════════════════════════════════════════════════════════════════════ */
.planet--champion-arriving {
  animation: championPlanetArrive 4.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  pointer-events: none !important;
}

@keyframes championPlanetArrive {
  /* ── Phase 1: Vakuum-Blitz ─────────────────────────────────────────────── */
  0% {
    opacity: 0;
    scale: 0.01;
    filter: brightness(1) saturate(0) drop-shadow(0 0 0px rgba(255, 0, 0, 0));
  }
  3% {
    opacity: 1;
    scale: 5.5;
    filter: brightness(22) saturate(0) drop-shadow(0 0 140px rgba(255, 255, 255, 1))
      drop-shadow(0 0 260px rgba(255, 80, 40, 1));
  }

  /* ── Phase 2: Roter Glutkern ───────────────────────────────────────────── */
  8% {
    scale: 3.4;
    filter: brightness(12) saturate(4) drop-shadow(0 0 100px rgba(255, 30, 0, 1))
      drop-shadow(0 0 180px rgba(200, 0, 0, 0.95)) drop-shadow(0 0 60px rgba(255, 100, 40, 0.9));
  }
  16% {
    scale: 2.2;
    filter: brightness(6) saturate(3.5) drop-shadow(0 0 70px rgba(255, 20, 0, 1))
      drop-shadow(0 0 130px rgba(180, 0, 0, 0.9)) drop-shadow(0 0 200px rgba(120, 0, 0, 0.6));
  }

  /* ── Phase 3: Crimson-Schockwelle ─────────────────────────────────────── */
  24% {
    scale: 1.85;
    filter: brightness(4) saturate(3) drop-shadow(0 0 50px rgba(255, 40, 0, 1))
      drop-shadow(0 0 100px rgba(200, 10, 0, 0.85)) drop-shadow(0 0 170px rgba(150, 0, 0, 0.55));
  }
  30% {
    scale: 1.55;
    filter: brightness(2.8) saturate(2.6) drop-shadow(0 0 38px rgba(255, 60, 10, 0.95))
      drop-shadow(0 0 80px rgba(220, 20, 0, 0.8)) drop-shadow(0 0 140px rgba(160, 0, 0, 0.5));
  }

  /* ── Phase 4: Herz-Rhythmus-Doppelpuls ────────────────────────────────── */
  36% {
    scale: 1.28;
    filter: brightness(1.9) saturate(2.2) drop-shadow(0 0 26px rgba(255, 50, 0, 0.85))
      drop-shadow(0 0 60px rgba(200, 10, 0, 0.65));
  }
  40% {
    scale: 1.52;
    filter: brightness(4.5) saturate(3.8) drop-shadow(0 0 55px rgba(255, 80, 20, 1))
      drop-shadow(0 0 110px rgba(255, 10, 0, 0.95)) drop-shadow(0 0 180px rgba(180, 0, 0, 0.7));
  }
  44% {
    scale: 1.22;
    filter: brightness(2) saturate(2.4) drop-shadow(0 0 28px rgba(255, 45, 0, 0.88))
      drop-shadow(0 0 65px rgba(210, 10, 0, 0.68));
  }
  48% {
    scale: 1.38;
    filter: brightness(3.2) saturate(3.2) drop-shadow(0 0 42px rgba(255, 60, 10, 0.95))
      drop-shadow(0 0 85px rgba(230, 10, 0, 0.85)) drop-shadow(0 0 140px rgba(160, 0, 0, 0.55));
  }

  /* ── Phase 5: Glühende Stabilisierung ────────────────────────────────── */
  58% {
    scale: 1.14;
    filter: brightness(1.7) saturate(1.9) drop-shadow(0 0 20px rgba(255, 50, 0, 0.82))
      drop-shadow(0 0 48px rgba(200, 10, 0, 0.6));
  }
  68% {
    scale: 1.06;
    filter: brightness(1.3) saturate(1.5) drop-shadow(0 0 14px rgba(255, 40, 0, 0.72))
      drop-shadow(0 0 35px rgba(180, 5, 0, 0.5));
  }

  /* ── Phase 6: Einbrennen — permanentes rotes Nachleuchten ─────────────── */
  82% {
    scale: 1.02;
    filter: brightness(1.12) saturate(1.25) drop-shadow(0 0 9px rgba(255, 30, 0, 0.6))
      drop-shadow(0 0 22px rgba(180, 0, 0, 0.4));
  }
  100% {
    opacity: 1;
    scale: 1;
    filter: brightness(1) saturate(1) drop-shadow(0 0 6px rgba(255, 20, 0, 0.45))
      drop-shadow(0 0 16px rgba(160, 0, 0, 0.28));
  }
}

/* ── Galaxy-Boss-Ring: Weißblitz → Feuerrot → zurück zu Lila ─────────────── */
.galaxy-boss-ring--arriving {
  animation: galaxyBossRingStrike 4.5s ease-out forwards;
}

@keyframes galaxyBossRingStrike {
  0% {
    stroke-width: 2;
    stroke: rgba(180, 60, 255, 0.85);
    filter: none;
  }
  3% {
    stroke-width: 16;
    stroke: rgba(255, 255, 255, 1);
    filter: drop-shadow(0 0 24px rgba(255, 255, 255, 1))
      drop-shadow(0 0 50px rgba(255, 100, 60, 0.9));
  }
  10% {
    stroke-width: 11;
    stroke: rgba(255, 60, 10, 1);
    filter: drop-shadow(0 0 20px rgba(255, 40, 0, 1)) drop-shadow(0 0 45px rgba(200, 0, 0, 0.9));
  }
  22% {
    stroke-width: 8;
    stroke: rgba(255, 30, 0, 0.98);
    filter: drop-shadow(0 0 14px rgba(255, 20, 0, 0.9)) drop-shadow(0 0 32px rgba(180, 0, 0, 0.7));
  }
  40% {
    stroke-width: 10;
    stroke: rgba(255, 80, 20, 1);
    filter: drop-shadow(0 0 18px rgba(255, 50, 0, 1)) drop-shadow(0 0 40px rgba(200, 0, 0, 0.8));
  }
  48% {
    stroke-width: 6;
    stroke: rgba(255, 40, 0, 0.95);
    filter: drop-shadow(0 0 10px rgba(255, 20, 0, 0.82));
  }
  68% {
    stroke-width: 4;
    stroke: rgba(220, 20, 0, 0.85);
    filter: drop-shadow(0 0 6px rgba(200, 0, 0, 0.6));
  }
  85% {
    stroke-width: 3;
    stroke: rgba(200, 50, 200, 0.88);
    filter: drop-shadow(0 0 5px rgba(180, 30, 220, 0.55));
  }
  100% {
    stroke-width: 2;
    stroke: rgba(180, 60, 255, 0.85);
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .planet--champion-arriving {
    animation: none !important;
  }
  .galaxy-boss-ring--arriving {
    animation: none !important;
  }
}
</style>
