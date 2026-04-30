<template>
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

  <AttackProjectileLayer :shots="shots" />

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
      <!-- ✅ ÄNDERUNG: :src statt src, rollenspezifisches Bild -->
      <img :src="pos.planetImage" :alt="pos.name" draggable="false" />
    </div>
  </div>

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
      <!-- ✅ ÄNDERUNG: :src statt src, rollenspezifisches Bild -->
      <img :src="pos.planetImage" :alt="pos.name" draggable="false" />
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
import AttackProjectileLayer from './AttackProjectileLayer.vue'
import { useProjectileSystem } from '@/composables/useProjectileSystem'

const BEHIND_SUN_SPEED_MULTIPLIER = 1.5
const BEHIND_SPEED_LERP = 0.04
const TURRET_FIRE_INTERVAL_MS = 1000
const MIN_SHOT_DISTANCE = 32

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
  planetImage: string // ✅ ÄNDERUNG: neues Feld hinzugefügt
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
    case 'auto_attack_dps':
      return `${r.name}: +${r.bonusPerSlot} DPS/s`
    case 'material_harvest_rate':
      return `${r.name}: Ernte alle 30s`
    case 'expedition_reward_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Exped.-Belohnung`
    case 'boss_damage_reduction':
      return `${r.name}: -${Math.round(r.bonusPerSlot * 100)}% Orbit-Schaden`
    case 'offline_boost':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Offline`
    case 'building_cps_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Gebäude-CPS`
  }
}

export default defineComponent({
  name: 'PlanetOrbit',
  components: { PlanetRoleModal, AttackProjectileLayer },
  setup() {
    const planetShopStore = usePlanetShopStore()
    const planetBossStore = usePlanetBossStore()
    const localStates = new Map<string, LocalPlanetState>()
    const planetSpeedMuls = new Map<string, number>()
    const renderPositions = ref<PlanetRenderPos[]>([])
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const { shots, spawnShot, tickShots } = useProjectileSystem()

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

        // ✅ ÄNDERUNG: Planetenbild aus der Rolle lesen, Fallback auf planet.png
        const planetImage = slot.role ? PLANET_ROLES[slot.role].image : '/img/planets/planet.png'

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
          planetImage, // ✅ ÄNDERUNG: neues Feld befüllt
        })
      }

      for (const key of localStates.keys()) {
        if (!purchased.some((s) => s.id === key)) {
          localStates.delete(key)
          planetSpeedMuls.delete(key)
        }
      }

      renderPositions.value = newPositions

      // ── Turret-Schuss-System ──────────────────────────────────────────────────
      if (!reducedMotion) {
        tickShots(dt)
        turretAccumMs += dt

        if (turretAccumMs >= TURRET_FIRE_INTERVAL_MS) {
          turretAccumMs -= TURRET_FIRE_INTERVAL_MS

          const turretPlanets = newPositions.filter((p) => p.isTurret && p.isForeground)

          if (turretPlanets.length > 0 && planetBossStore.activeBosses.length > 0) {
            const bossPlanetIds = planetBossStore.activeBosses
              .filter((b) => !b.defeated && !b.expired)
              .map((b) => b.planetId)

            for (const turret of turretPlanets) {
              let nearestDist = Infinity
              let targetPos: { cx: number; cy: number; isForeground: boolean } | null = null

              for (const planetId of bossPlanetIds) {
                const pos = activePlanetPositions.get(planetId)
                if (!pos || !pos.isForeground) continue
                const dist = Math.hypot(pos.cx - turret.x, pos.cy - turret.y)
                if (dist < MIN_SHOT_DISTANCE) continue
                if (dist < nearestDist) {
                  nearestDist = dist
                  targetPos = pos
                }
              }

              if (targetPos) {
                spawnShot(turret.x, turret.y, targetPos.cx, targetPos.cy, true, true)
              }
            }
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

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
      shots,
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
/* ── Orbit Rings ───────────────────────────────────────────────────────────── */
.planet-orbit-rings {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}

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

.planet-orbit-item {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  overflow: hidden;
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

.planet-orbit-item--turret {
  animation: turret-pulse 1s ease-in-out infinite;
}

@keyframes turret-pulse {
  0%,
  100% {
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
