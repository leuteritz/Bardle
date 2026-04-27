<!-- frontend/src/components/idle/sun/PlanetOrbit.vue -->
<template>
  <!-- Orbit-Ring Layer: gestrichelte Ringe exakt auf der Planeten-Umlaufbahn -->
  <svg class="planet-orbit-rings" aria-hidden="true">
    <template v-for="(tier, i) in ORBIT_TIERS.planet" :key="'track-planet-' + i">
      <ellipse
        v-if="planetShopStore.purchasedSlots.length > i"
        :cx="screenCx"
        :cy="screenCy"
        :rx="tier.rx"
        :ry="tier.ry"
        :transform="`rotate(${tier.tiltDeg}, ${screenCx}, ${screenCy})`"
        fill="none"
        :stroke="tier.color"
        stroke-opacity="0.55"
        stroke-width="1.5"
        stroke-dasharray="5 8"
      />
    </template>
  </svg>

  <!-- Turret Shot Layer -->
  <svg class="turret-shots-svg" aria-hidden="true">
    <defs>
      <filter id="turret-shot-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g v-for="shot in turretShots" :key="shot.id">
      <line
        :x1="shot.tailX"
        :y1="shot.tailY"
        :x2="shot.headX"
        :y2="shot.headY"
        stroke="#cc4444"
        stroke-width="2"
        :stroke-opacity="shot.opacity * 0.7"
        stroke-linecap="round"
        filter="url(#turret-shot-glow)"
      />
      <circle
        :cx="shot.headX"
        :cy="shot.headY"
        r="4.5"
        fill="#ff7777"
        :opacity="shot.opacity"
        filter="url(#turret-shot-glow)"
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
      :class="{
        'planet-orbit-item--foreground': pos.isForeground,
        'planet-orbit-item--clickable': true,
        'planet-orbit-item--turret': pos.isTurret,
      }"
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
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import type { PlanetSlot } from '../../../stores/planetShopStore'
import { ORBIT_TIERS } from '@/config/constants'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import PlanetRoleModal from '../planet/PlanetRoleModal.vue'

const BEHIND_SUN_SPEED_MULTIPLIER = 1.5
const BEHIND_SPEED_LERP = 0.04
const TURRET_FIRE_INTERVAL_MS = 1000
const SHOT_DURATION_MS = 550

interface PlanetRenderPos {
  id: string
  name: string
  x: number
  y: number
  size: number
  opacity: number
  isBehind: boolean
  isForeground: boolean
  isTurret: boolean
  zIndex: number
  color: string
  roleLabel: string
  roleIcon: string
  hintOpacity: number
  orbitRx: number
  orbitRy: number
  tiltDeg: number
  orbitColor: string
}

interface LocalPlanetState {
  id: string
  orbitAngle: number
  x: number
  y: number
}

interface TurretShot {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  elapsed: number
  duration: number
  headX: number
  headY: number
  tailX: number
  tailY: number
  opacity: number
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
    case 'auto_attack_dps':
      return `${r.name}: +${r.bonusPerSlot} DPS/s`
    case 'material_harvest_rate':
      return `${r.name}: Ernte alle 30s`
    case 'expedition_reward_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Exped.-Belohnung`
    case 'boss_damage_reduction':
      return `${r.name}: -${Math.round(r.bonusPerSlot * 100)}% Orbit-Schaden`
    case 'meep_power_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Meep-Stärke`
    case 'champion_damage_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Champion-Power`
    case 'drop_chance_bonus':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Drop-Chance`
    case 'building_cps_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Gebäude-CPS`
  }
}

export default defineComponent({
  name: 'PlanetOrbit',
  components: { PlanetRoleModal },
  setup() {
    const planetShopStore = usePlanetShopStore()
    const planetBossStore = usePlanetBossStore()
    const localStates = new Map<string, LocalPlanetState>()
    const planetSpeedMuls = new Map<string, number>()
    const renderPositions = ref<PlanetRenderPos[]>([])
    const turretShots = ref<TurretShot[]>([])
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const screenCx = ref(window.innerWidth / 2)
    const screenCy = ref(window.innerHeight / 2)

    function updateScreenCenter() {
      screenCx.value = window.innerWidth / 2
      screenCy.value = window.innerHeight / 2
    }

    const allSlots = computed(() => planetShopStore.slots)
    const backPlanets = computed(() => renderPositions.value.filter((p) => p.isBehind))
    const frontPlanets = computed(() => renderPositions.value.filter((p) => !p.isBehind))

    let animFrame = 0
    let lastTs = 0
    let turretAccumMs = 0
    let nextShotId = 0

    function animate(ts: number) {
      const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
      lastTs = ts

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const purchased = planetShopStore.purchasedSlots
      const newPositions: PlanetRenderPos[] = []

      for (const slot of purchased) {
        const slotIdx = purchased.indexOf(slot)
        const tier = ORBIT_TIERS.planet[slotIdx % ORBIT_TIERS.planet.length]
        const orbitColor = tier.color
        const baseSize = tier.size

        let ls = localStates.get(slot.id)
        if (!ls) {
          const idx = purchased.indexOf(slot)
          const startAngle = (idx / Math.max(purchased.length, 1)) * Math.PI * 2
          const initPos = getOrbitPos(startAngle, tier.rx, tier.ry, tier.tiltRad, cx, cy)
          ls = { id: slot.id, orbitAngle: startAngle, x: initPos.x, y: initPos.y }
          localStates.set(slot.id, ls)
        }

        const tiltRad = tier.tiltRad
        const rx = tier.rx
        const ry = tier.ry

        const prevRelY = (ls.y - cy) / Math.max(ry, 1)
        const prevIsBehind = prevRelY < -0.05
        const targetMul = prevIsBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
        const curMul = planetSpeedMuls.get(slot.id) ?? 1.0
        const newMul = curMul + (targetMul - curMul) * BEHIND_SPEED_LERP
        planetSpeedMuls.set(slot.id, newMul)

        if (!reducedMotion) {
          const keplerBoost = 1.0 + 0.5 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
          ls.orbitAngle += slot.direction * slot.baseSpeed * keplerBoost * newMul * dt
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
        const size = Math.round(baseSize * parallaxScale)
        const opacity = isBehind ? 0.15 + depth * 0.28 : 0.82 + depth * 0.18
        const zIndex = Math.floor(9 + depth * 6)
        const isForeground = !isBehind && depth > 0.65

        const visibleFactor = Math.max(0, Math.min(1, (relY + 0.05 + 0.12) / 0.12))
        const hintOpacity = Math.max(0, 1 - visibleFactor)

        const color = slot.role ? PLANET_ROLES[slot.role].color : '#888888'
        const roleIcon = slot.role ? PLANET_ROLES[slot.role].icon : '?'
        const isTurret = slot.role === 'turret_planet'

        newPositions.push({
          id: slot.id,
          name: slot.role ? PLANET_ROLES[slot.role].name : `Orbit ${slot.id.replace('slot_', '')}`,
          x: ls.x,
          y: ls.y,
          size,
          opacity,
          isBehind,
          isForeground,
          isTurret,
          zIndex,
          color,
          roleLabel: slotRoleLabel(slot),
          roleIcon,
          hintOpacity,
          orbitRx: rx,
          orbitRy: ry,
          tiltDeg: slot.tiltDeg,
          orbitColor,
        })
      }

      for (const key of localStates.keys()) {
        if (!purchased.some((s) => s.id === key)) {
          localStates.delete(key)
          planetSpeedMuls.delete(key)
        }
      }

      renderPositions.value = newPositions

      // ── Turret shot system ───────────────────────────────────────────────────
      if (!reducedMotion) {
        turretAccumMs += dt

        if (turretAccumMs >= TURRET_FIRE_INTERVAL_MS) {
          turretAccumMs -= TURRET_FIRE_INTERVAL_MS

          // Only fire when a boss is actually active
          if (planetBossStore.isBossActive && activePlanetPositions.size > 0) {
            const turretPlanets = newPositions.filter((p) => p.isTurret && !p.isBehind)

            if (turretPlanets.length > 0) {
              // Find nearest target position for each turret
              for (const turret of turretPlanets) {
                let nearestDist = Infinity
                let target: { cx: number; cy: number } | null = null

                for (const pos of activePlanetPositions.values()) {
                  const dist = Math.hypot(pos.cx - turret.x, pos.cy - turret.y)
                  if (dist < nearestDist) {
                    nearestDist = dist
                    target = pos
                  }
                }

                if (target) {
                  const shot: TurretShot = {
                    id: nextShotId++,
                    x1: turret.x,
                    y1: turret.y,
                    x2: target.cx,
                    y2: target.cy,
                    elapsed: 0,
                    duration: SHOT_DURATION_MS,
                    headX: turret.x,
                    headY: turret.y,
                    tailX: turret.x,
                    tailY: turret.y,
                    opacity: 1,
                  }
                  turretShots.value.push(shot)
                }
              }
            }
          }
        }

        // Update existing shots
        const alive: TurretShot[] = []
        for (const shot of turretShots.value) {
          shot.elapsed += dt
          const t = Math.min(1, shot.elapsed / shot.duration)
          shot.headX = shot.x1 + (shot.x2 - shot.x1) * t
          shot.headY = shot.y1 + (shot.y2 - shot.y1) * t
          const tailT = Math.max(0, t - 0.22)
          shot.tailX = shot.x1 + (shot.x2 - shot.x1) * tailT
          shot.tailY = shot.y1 + (shot.y2 - shot.y1) * tailT
          // Fade: ramp in over first 20%, ramp out over last 30%
          shot.opacity = t < 0.2 ? t / 0.2 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
          if (t < 1) alive.push(shot)
        }
        turretShots.value = alive
      }

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

    const screenW = computed(() => screenCx.value * 2)
    const screenH = computed(() => screenCy.value * 2)

    return {
      planetShopStore,
      allSlots,
      backPlanets,
      frontPlanets,
      renderPositions,
      turretShots,
      screenCx,
      screenCy,
      screenW,
      screenH,
      ORBIT_TIERS,
      PLANET_ROLES,
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

/* ── Turret shot SVG ───────────────────────────────────────────────────────── */
.turret-shots-svg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 8;
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

/* turret_planet: animated ring pulsing to show it's armed */
.planet-orbit-item--turret {
  animation: turret-pulse 1s ease-in-out infinite;
}

@keyframes turret-pulse {
  0%, 100% {
    box-shadow:
      0 0 8px color-mix(in oklch, var(--planet-color, #cc4444) 80%, transparent),
      0 0 18px color-mix(in oklch, var(--planet-color, #cc4444) 40%, transparent);
  }
  50% {
    box-shadow:
      0 0 16px color-mix(in oklch, var(--planet-color, #cc4444) 95%, transparent),
      0 0 34px color-mix(in oklch, var(--planet-color, #cc4444) 60%, transparent),
      0 0 52px color-mix(in oklch, var(--planet-color, #cc4444) 20%, transparent);
  }
}

.planet-orbit-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.planet-orbit-item--behind {
  filter: blur(2px) brightness(0.7) saturate(0.5);
  transition: filter 0.25s ease;
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
    animation: none;
  }
}
</style>
