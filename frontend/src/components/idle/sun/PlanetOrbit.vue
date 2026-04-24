<!-- frontend/src/components/idle/sun/PlanetOrbit.vue -->
<template>
  <!-- Orbit-Ring Layer: faint ellipses for all defined slots (z-index 2) -->
  <svg class="planet-orbit-rings" aria-hidden="true">
    <g v-for="slot in allSlots" :key="slot.id + '-ring'">
      <ellipse
        :cx="screenCx"
        :cy="screenCy"
        :rx="slot.orbitRadiusX * ORBIT_RADIUS_SCALE"
        :ry="slot.orbitRadiusY * ORBIT_RADIUS_SCALE"
        :transform="`rotate(${slot.tiltDeg}, ${screenCx}, ${screenCy})`"
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        stroke-width="1"
        stroke-dasharray="4 8"
      />
    </g>
  </svg>

  <!-- Back-Layer: planets behind the sun -->
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
      <img src="/img/planets/planet.png" :alt="pos.name" draggable="false" />
    </div>
  </div>

  <!-- Front-Layer: planets in front of the sun -->
  <div class="planet-orbit-layer planet-orbit-front">
    <div
      v-for="pos in frontPlanets"
      :key="pos.id"
      class="planet-orbit-item"
      :class="{ 'planet-orbit-item--foreground': pos.isForeground, 'planet-orbit-item--clickable': true }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        zIndex: pos.zIndex,
        '--planet-color': pos.color,
      }"
      :title="pos.roleLabel"
      @click="planetShopStore.openRoleModal(pos.id)"
    >
      <img src="/img/planets/planet.png" :alt="pos.name" draggable="false" />
      <span class="planet-bonus-badge" :title="pos.roleLabel">{{ pos.roleIcon }}</span>
    </div>
  </div>

  <PlanetRoleModal />
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { usePlanetShopStore, PLANET_ROLES } from '../../../stores/planetShopStore'
import type { PlanetSlot } from '../../../stores/planetShopStore'
import { ORBIT_RADIUS_SCALE } from '@/config/constants'
import PlanetRoleModal from '../planet/PlanetRoleModal.vue'

interface PlanetRenderPos {
  id: string
  name: string
  x: number
  y: number
  size: number
  opacity: number
  isBehind: boolean
  isForeground: boolean
  zIndex: number
  color: string
  roleLabel: string
  roleIcon: string
}

interface LocalPlanetState {
  id: string
  orbitAngle: number
  x: number
  y: number
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

function slotRoleLabel(slot: PlanetSlot): string {
  if (!slot.role) return 'Keine Rolle — klicken zum Zuweisen'
  const r = PLANET_ROLES[slot.role]
  switch (r.bonusType) {
    case 'chimes_per_second':
      return `${r.name}: +${r.bonusPerSlot} CPS`
    case 'chimes_per_click':
      return `${r.name}: +${r.bonusPerSlot} CPC`
    case 'meep_cost_reduction':
      return `${r.name}: -${Math.round(r.bonusPerSlot * 100)}% Meep-Kosten`
    case 'cps_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% CPS`
    case 'offline_boost':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Offline`
    case 'periodic_chimes':
      return `${r.name}: ${Math.round(r.bonusPerSlot * 100)}% Schub-Chance/s`
  }
}

export default defineComponent({
  name: 'PlanetOrbit',
  components: { PlanetRoleModal },
  setup() {
    const planetShopStore = usePlanetShopStore()
    const localStates = new Map<string, LocalPlanetState>()
    const renderPositions = ref<PlanetRenderPos[]>([])
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const screenCx = ref(window.innerWidth / 2)
    const screenCy = ref(window.innerHeight / 2)

    function updateScreenCenter() {
      screenCx.value = window.innerWidth / 2
      screenCy.value = window.innerHeight / 2
    }

    const PLANET_BASE_SIZE = 36

    const allSlots = computed(() => planetShopStore.slots)
    const backPlanets = computed(() => renderPositions.value.filter((p) => p.isBehind))
    const frontPlanets = computed(() => renderPositions.value.filter((p) => !p.isBehind))

    let animFrame = 0
    let lastTs = 0

    function animate(ts: number) {
      const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
      lastTs = ts

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const purchased = planetShopStore.purchasedSlots
      const newPositions: PlanetRenderPos[] = []

      for (const slot of purchased) {
        let ls = localStates.get(slot.id)
        if (!ls) {
          const idx = purchased.indexOf(slot)
          const startAngle = (idx / Math.max(purchased.length, 1)) * Math.PI * 2
          const initPos = getOrbitPos(
            startAngle,
            slot.orbitRadiusX * ORBIT_RADIUS_SCALE,
            slot.orbitRadiusY * ORBIT_RADIUS_SCALE,
            (slot.tiltDeg * Math.PI) / 180,
            cx,
            cy,
          )
          ls = { id: slot.id, orbitAngle: startAngle, x: initPos.x, y: initPos.y }
          localStates.set(slot.id, ls)
        }

        const tiltRad = (slot.tiltDeg * Math.PI) / 180
        const rx = slot.orbitRadiusX * ORBIT_RADIUS_SCALE
        const ry = slot.orbitRadiusY * ORBIT_RADIUS_SCALE

        if (!reducedMotion) {
          const keplerBoost = 1.0 + 0.5 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
          ls.orbitAngle += slot.direction * slot.baseSpeed * keplerBoost * dt
          const target = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, cx, cy)
          ls.x += (target.x - ls.x) * 0.12
          ls.y += (target.y - ls.y) * 0.12
        } else {
          const pos = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, cx, cy)
          ls.x = pos.x
          ls.y = pos.y
        }

        const relY = (ls.y - cy) / Math.max(ry, 1)
        const isBehind = relY < -0.05
        const depth = (relY + 1) / 2

        const parallaxScale = 0.75 + depth * 0.5
        const size = Math.round(PLANET_BASE_SIZE * parallaxScale)
        const opacity = isBehind ? 0.15 + depth * 0.28 : 0.82 + depth * 0.18
        const zIndex = Math.floor(9 + depth * 6)
        const isForeground = !isBehind && depth > 0.65

        const color = slot.role ? PLANET_ROLES[slot.role].color : '#888888'
        const roleIcon = slot.role ? PLANET_ROLES[slot.role].icon : '?'

        newPositions.push({
          id: slot.id,
          name: slot.role ? PLANET_ROLES[slot.role].name : `Orbit ${slot.id.replace('slot_', '')}`,
          x: ls.x,
          y: ls.y,
          size,
          opacity,
          isBehind,
          isForeground,
          zIndex,
          color,
          roleLabel: slotRoleLabel(slot),
          roleIcon,
        })
      }

      for (const key of localStates.keys()) {
        if (!purchased.some((s) => s.id === key)) localStates.delete(key)
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
      window.addEventListener('resize', updateScreenCenter)
      animFrame = requestAnimationFrame(animate)
    })
    onUnmounted(() => {
      window.removeEventListener('resize', updateScreenCenter)
      cancelAnimationFrame(animFrame)
    })

    return {
      planetShopStore,
      allSlots,
      backPlanets,
      frontPlanets,
      screenCx,
      screenCy,
      ORBIT_RADIUS_SCALE,
    }
  },
})
</script>

<style scoped>
/* ── Orbit ring SVG ────────────────────────────────────────────────────────── */
.planet-orbit-rings {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}

/* ── Planet layers ─────────────────────────────────────────────────────────── */
.planet-orbit-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.planet-orbit-back {
  z-index: 3;
}

.planet-orbit-front {
  z-index: 7;
}

/* ── Planet item ───────────────────────────────────────────────────────────── */
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
  pointer-events: none;
}

.planet-orbit-item--clickable {
  pointer-events: auto;
  cursor: pointer;
}

.planet-orbit-item--clickable:hover {
  box-shadow:
    0 0 14px color-mix(in oklch, var(--planet-color, #aaa) 90%, transparent),
    0 0 28px color-mix(in oklch, var(--planet-color, #aaa) 60%, transparent);
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
  pointer-events: none;
}

.planet-orbit-item--foreground {
  filter: brightness(1.15) saturate(1.15);
  box-shadow:
    0 0 14px color-mix(in oklch, var(--planet-color, #aaa) 90%, transparent),
    0 0 28px color-mix(in oklch, var(--planet-color, #aaa) 50%, transparent),
    0 0 48px color-mix(in oklch, var(--planet-color, #aaa) 20%, transparent);
}

/* ── Bonus badge ───────────────────────────────────────────────────────────── */
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
}

@media (prefers-reduced-motion: reduce) {
  .planet-orbit-item {
    transition: none;
  }
}
</style>
