<!-- frontend/src/components/idle/sun/PlanetOrbit.vue -->
<template>
  <!-- Back-Layer: Planeten HINTER der Sonne (z-index 3, unter Champions und Sonne) -->
  <div class="planet-orbit-layer planet-orbit-back" aria-hidden="true">
    <div
      v-for="pos in backPlanets"
      :key="pos.id"
      class="planet-orbit-item planet-orbit-item--behind"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        '--planet-color': pos.color,
      }"
    >
      <img :src="pos.icon" :alt="pos.name" draggable="false" />
    </div>
  </div>

  <!-- Front-Layer: Planeten VOR der Sonne (z-index 5.5 → wir nutzen 7, über Champions) -->
  <div class="planet-orbit-layer planet-orbit-front" aria-hidden="true">
    <div
      v-for="pos in frontPlanets"
      :key="pos.id"
      class="planet-orbit-item"
      :class="{ 'planet-orbit-item--foreground': pos.isForeground }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        zIndex: pos.zIndex,
        '--planet-color': pos.color,
      }"
    >
      <img :src="pos.icon" :alt="pos.name" draggable="false" />
      <!-- Bonus-Indikator Badge -->
      <span class="planet-bonus-badge" :title="pos.bonusLabel">{{ pos.bonusIcon }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { usePlanetShopStore } from '../../../stores/planetShopStore'
import { ORBIT_RADIUS_SCALE } from '@/config/constants'
import type { ShopPlanet, PlanetBonus } from '../../../stores/planetShopStore'

interface PlanetRenderPos {
  id: string
  name: string
  icon: string
  x: number
  y: number
  size: number
  opacity: number
  isBehind: boolean
  isForeground: boolean
  zIndex: number
  color: string
  bonusLabel: string
  bonusIcon: string
}

interface LocalPlanetState {
  id: string
  orbitAngle: number
  x: number
  y: number
}

const BONUS_ICONS: Record<PlanetBonus, string> = {
  chimes_per_second: '🎵',
  chimes_per_click: '👆',
  meep_cost_reduction: '💰',
  cps_multiplier: '✨',
}

function bonusLabel(planet: ShopPlanet): string {
  switch (planet.bonusType) {
    case 'chimes_per_second':
      return `+${planet.bonusPerLevel * planet.level} CPS`
    case 'chimes_per_click':
      return `+${planet.bonusPerLevel * planet.level} CPC`
    case 'meep_cost_reduction':
      return `-${Math.round(planet.bonusPerLevel * planet.level * 100)}% Meep-Kosten`
    case 'cps_multiplier':
      return `×${(1 + planet.bonusPerLevel * planet.level).toFixed(2)} CPS`
  }
}

function getOrbitPos(
  angle: number,
  rx: number,
  ry: number,
  tiltRad: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const cosT = Math.cos(tiltRad)
  const sinT = Math.sin(tiltRad)
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  return {
    x: cx + rx * cosA * cosT - ry * sinA * sinT,
    y: cy + rx * cosA * sinT + ry * sinA * cosT,
  }
}

export default defineComponent({
  name: 'PlanetOrbit',
  setup() {
    const planetShopStore = usePlanetShopStore()
    const localStates = new Map<string, LocalPlanetState>()
    const renderPositions = ref<PlanetRenderPos[]>([])
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const PLANET_BASE_SIZE = 36 // px – etwas größer als Champions bei wenigen
    const backPlanets = computed(() => renderPositions.value.filter((p) => p.isBehind))
    const frontPlanets = computed(() => renderPositions.value.filter((p) => !p.isBehind))

    let animFrame = 0
    let lastTs = 0

    function animate(ts: number) {
      const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
      lastTs = ts

      const screenCx = window.innerWidth / 2
      const screenCy = window.innerHeight / 2
      const owned = planetShopStore.ownedPlanets
      const newPositions: PlanetRenderPos[] = []

      for (const planet of owned) {
        let ls = localStates.get(planet.id)
        if (!ls) {
          // Spread Startwinkel gleichmäßig
          const idx = owned.indexOf(planet)
          const startAngle = (idx / Math.max(owned.length, 1)) * Math.PI * 2
          const initPos = getOrbitPos(
            startAngle,
            planet.orbitRadiusX * ORBIT_RADIUS_SCALE,
            planet.orbitRadiusY * ORBIT_RADIUS_SCALE,
            (planet.tiltDeg * Math.PI) / 180,
            screenCx,
            screenCy,
          )
          ls = { id: planet.id, orbitAngle: startAngle, x: initPos.x, y: initPos.y }
          localStates.set(planet.id, ls)
        }

        const tiltRad = (planet.tiltDeg * Math.PI) / 180
        const rx = planet.orbitRadiusX * ORBIT_RADIUS_SCALE
        const ry = planet.orbitRadiusY * ORBIT_RADIUS_SCALE

        if (!reducedMotion) {
          // Kepler-Boost: schneller an Sonne vorbei, langsamer am Apogäum
          const keplerBoost = 1.0 + 0.5 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
          ls.orbitAngle += planet.direction * planet.baseSpeed * keplerBoost * dt
          const target = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, screenCx, screenCy)
          ls.x += (target.x - ls.x) * 0.12
          ls.y += (target.y - ls.y) * 0.12
        } else {
          const pos = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, screenCx, screenCy)
          ls.x = pos.x
          ls.y = pos.y
        }

        const relY = (ls.y - screenCy) / Math.max(ry, 1)
        const isBehind = relY < -0.05
        const depth = (relY + 1) / 2

        const parallaxScale = 0.75 + depth * 0.5
        const size = Math.round(PLANET_BASE_SIZE * parallaxScale)
        const opacity = isBehind ? 0.15 + depth * 0.28 : 0.82 + depth * 0.18
        const zIndex = Math.floor(9 + depth * 6)
        const isForeground = !isBehind && depth > 0.65

        newPositions.push({
          id: planet.id,
          name: planet.name,
          icon: planet.icon,
          x: ls.x,
          y: ls.y,
          size,
          opacity,
          isBehind: isBehind,
          isForeground,
          zIndex,
          color: planet.color,
          bonusLabel: bonusLabel(planet),
          bonusIcon: BONUS_ICONS[planet.bonusType],
        })
      }

      // Alte States entfernen
      for (const key of localStates.keys()) {
        if (!owned.some((p) => p.id === key)) localStates.delete(key)
      }

      renderPositions.value = newPositions
      animFrame = requestAnimationFrame(animate)
    }

    const { isRenderingPaused } = useRenderingPaused()

    watch(isRenderingPaused, (paused) => {
      if (paused) {
        cancelAnimationFrame(animFrame)
        animFrame = 0
      } else if (!animFrame) {
        lastTs = 0
        animFrame = requestAnimationFrame(animate)
      }
    })

    onMounted(() => {
      animFrame = requestAnimationFrame(animate)
    })
    onUnmounted(() => {
      cancelAnimationFrame(animFrame)
    })

    return { backPlanets, frontPlanets }
  },
})
</script>

<style scoped>
.planet-orbit-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/* Planeten unter Champions (4) und Sonne (5), aber über dem Hintergrund */
.planet-orbit-back {
  z-index: 3;
}
.planet-orbit-front {
  z-index: 7;
}

/* ── Planet-Avatar ──────────────────────────────────────────────────────── */
.planet-orbit-item {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--planet-color, #aaaaaa);
  box-shadow:
    0 0 8px color-mix(in oklch, var(--planet-color, #aaa) 80%, transparent),
    0 0 18px color-mix(in oklch, var(--planet-color, #aaa) 40%, transparent);
  will-change: transform, opacity;
  transition: box-shadow 0.4s ease;
}

.planet-orbit-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.planet-orbit-item--behind {
  filter: brightness(0.38) saturate(0.4);
}

.planet-orbit-item--foreground {
  filter: brightness(1.15) saturate(1.15);
  box-shadow:
    0 0 14px color-mix(in oklch, var(--planet-color, #aaa) 90%, transparent),
    0 0 28px color-mix(in oklch, var(--planet-color, #aaa) 50%, transparent),
    0 0 48px color-mix(in oklch, var(--planet-color, #aaa) 20%, transparent);
}

/* ── Bonus-Badge ────────────────────────────────────────────────────────── */
.planet-bonus-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  font-size: 8px;
  line-height: 15px;
  text-align: center;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid var(--planet-color, #aaa);
  pointer-events: none;
  z-index: 2;
  cursor: default;
}

@media (prefers-reduced-motion: reduce) {
  .planet-orbit-item {
    transition: none;
  }
}
</style>
