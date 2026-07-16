<template>
  <svg class="planet-orbit-rings" aria-hidden="true">
    <template v-for="(tier, i) in ORBIT_TIERS.planet" :key="'track-planet-' + i">
      <OrbitPath
        v-if="slotsWithRole.length > i"
        :color="tier.color"
        :x="screenCx"
        :y="screenCy"
        :rx="tierOrbitDimensions[i].rx"
        :ry="tierOrbitDimensions[i].ry"
        :tiltDeg="tierOrbitDimensions[i].tiltDeg"
        :visible="tierIsBehind[i]"
        :dimmed="hoveredChampionRole !== null"
      />
    </template>
  </svg>

  <AttackProjectileLayer :shots="shots" />

  <div
    class="planet-orbit-layer planet-orbit-back"
    aria-hidden="true"
    :style="{ '--hover-dim-opacity': HOVER_DIM_OPACITY }"
  >
    <div
      v-for="pos in backPlanets"
      :key="pos.id"
      class="planet-orbit-item planet-orbit-item--behind"
      :class="{
        'planet-orbit-item--healing': pos.isHealing,
        'planet-orbit-item--highlight-behind': pos.isHighlighted,
      }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        '--planet-color': pos.color,
      }"
    >
      <img
        :src="pos.planetImage"
        :alt="pos.name"
        draggable="false"
        class="planet-orbit-portrait"
        :class="{ 'planet-orbit-portrait--dimmed': pos.isDimmed }"
      />
    </div>
  </div>

  <div
    class="planet-orbit-layer planet-orbit-front"
    :style="{ '--hover-dim-opacity': HOVER_DIM_OPACITY }"
  >
    <div
      v-for="pos in frontPlanets"
      :key="pos.id"
      class="planet-orbit-item"
      :class="{
        'planet-orbit-item--foreground': pos.isForeground,
        'planet-orbit-item--turret': pos.isTurret,
        'planet-orbit-item--healing': pos.isHealing,
        'planet-orbit-item--jungle-buffed': pos.isJungleBuffed,
      }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        zIndex: pos.zIndex,
        '--planet-color': pos.color,
      }"
    >
      <img
        :src="pos.planetImage"
        :alt="pos.name"
        draggable="false"
        class="planet-orbit-portrait"
        :class="{ 'planet-orbit-portrait--dimmed': pos.isDimmed }"
      />
      <span class="planet-bonus-badge" :title="pos.roleLabel">
        <Icon v-if="pos.roleIcon.includes(':')" :icon="pos.roleIcon" class="planet-badge-gi" />
        <span v-else>{{ pos.roleIcon }}</span>
      </span>
    </div>

    <!-- HP Bars -->
    <div
      v-for="pos in frontPlanets"
      :key="'hp-' + pos.id"
      class="planet-hp-wrap"
      :style="{
        transform: `translate(${pos.x - Math.max(pos.size, 60) / 2}px, ${pos.y + pos.size / 2 + 6}px)`,
        width: Math.max(pos.size, 60) + 'px',
        zIndex: pos.zIndex,
      }"
    >
      <div class="planet-hp-bar-track">
        <div
          class="planet-hp-bar-fill"
          :class="{
            'planet-hp-bar-fill--low': pos.hpPercent < 25,
            'planet-hp-bar-fill--mid': pos.hpPercent >= 25 && pos.hpPercent < 60,
          }"
          :style="{ width: pos.hpPercent + '%' }"
        />
        <div class="planet-hp-bar-shine" />
      </div>
      <span class="planet-hp-text">{{ pos.currentHp }} / {{ pos.maxHp }}</span>
    </div>

    <!-- Jungle Buff Particle Aura -->
    <template v-for="pos in frontPlanets" :key="'jbuff-' + pos.id">
      <div
        v-show="pos.isJungleBuffed"
        class="jungle-buff-overlay"
        :title="pos.jungleBuffType"
        :style="{
          width: pos.size + 18 + 'px',
          height: pos.size + 18 + 'px',
          transform: `translate(${pos.x - (pos.size + 18) / 2}px, ${pos.y - (pos.size + 18) / 2}px)`,
          zIndex: pos.zIndex,
        }"
      />
      <div
        class="planet-status-badge-anchor"
        :style="{
          transform: `translate(${pos.x + pos.size / 2 - 30}px, ${pos.y - pos.size / 2 - 4}px)`,
          zIndex: pos.zIndex + 2,
        }"
      >
        <Transition name="status-badge">
          <div v-if="pos.isJungleBuffed" class="planet-status-badge planet-status-badge--buff">
            <img src="/img/roles/jungle.png" class="status-badge-icon" alt="" draggable="false" />
            <span
              class="status-badge-timer"
              :class="{ 'status-badge-timer--urgent': pos.jungleBuffSecsLeft < 3 }"
            >{{ Math.ceil(pos.jungleBuffSecsLeft) }}s</span>
          </div>
        </Transition>
      </div>
    </template>

    <!-- Hover ring — front and behind planets; behind ring floats above sun via z-index: 8 -->
    <template v-for="pos in renderPositions" :key="'hover-ring-' + pos.id">
      <Transition name="champion-ring">
        <div
          v-if="pos.isHighlighted"
          class="planet-champion-hover-ring"
          :class="{ 'planet-champion-hover-ring--behind': pos.isBehind }"
          :style="{
            width: (pos.size + 26) + 'px',
            height: (pos.size + 26) + 'px',
            transform: `translate(${pos.x - (pos.size + 26) / 2}px, ${pos.y - (pos.size + 26) / 2}px)`,
            '--cring-color': pos.highlightColor,
            zIndex: pos.isBehind ? 8 : pos.zIndex + 1,
          }"
        />
      </Transition>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { usePlanetShopStore, PLANET_ROLES } from '../../../stores/planetShopStore'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import type { PlanetSlot } from '../../../stores/planetShopStore'
import { ORBIT_TIERS, PLANET_SLOT_MAX_HP, SUN_RADIUS, BEHIND_SUN_SPEED_MULTIPLIER, HOVER_DIM_OPACITY } from '@/config/constants'
import { useUiStore } from '@/stores/uiStore'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import { activePlayerPlanetPositions } from '../../../utils/activePlayerPlanetPositions'
import AttackProjectileLayer from './AttackProjectileLayer.vue'
import OrbitPath from './OrbitPath.vue'
import { useProjectileSystem } from '@/composables/useProjectileSystem'
import { useOrbitScale } from '@/composables/useOrbitScale'

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
  planetImage: string
  currentHp: number
  maxHp: number
  hpPercent: number
  isHealing: boolean
  isJungleBuffed: boolean
  jungleBuffSecsLeft: number
  jungleBuffType: string
  slotNum: number
  isHighlighted: boolean
  highlightColor: string
  isDimmed: boolean
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
  if (!slot.role) return 'No Role — click to assign'
  const r = PLANET_ROLES[slot.role]
  switch (r.bonusType) {
    case 'auto_attack_dps':
      return `${r.name}: +${r.bonusPerSlot} DPS/s`
    case 'material_harvest_rate':
      return `${r.name}: Harvest every 30s`
    case 'expedition_reward_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Exped. Reward`
    case 'boss_damage_reduction':
      return `${r.name}: -${Math.round(r.bonusPerSlot * 100)}% Orbit Damage`
    case 'offline_boost':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Offline`
    case 'building_cps_multiplier':
      return `${r.name}: +${Math.round(r.bonusPerSlot * 100)}% Building CPS`
  }
}

export default defineComponent({
  name: 'PlanetOrbit',
  components: { AttackProjectileLayer, OrbitPath, Icon },
  setup() {
    const planetShopStore = usePlanetShopStore()
    const planetBossStore = usePlanetBossStore()
    const uiStore = useUiStore()
    const hoveredChampionRole = computed(() => uiStore.hoveredChampionRole)
    const localStates = new Map<string, LocalPlanetState>()
    const planetSpeedMuls = new Map<string, number>()
    const renderPositions = ref<PlanetRenderPos[]>([])
    const tierIsBehind = ref<boolean[]>(ORBIT_TIERS.planet.map(() => false))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const { shots, spawnShot, tickShots } = useProjectileSystem()
    const { orbitScale } = useOrbitScale()

    const screenCx = ref(window.innerWidth / 2)
    const screenCy = ref(window.innerHeight / 2)

    function updateScreenCenter() {
      screenCx.value = window.innerWidth / 2
      screenCy.value = window.innerHeight / 2
    }

    const allSlots = computed(() => planetShopStore.slots)
    const slotsWithRole = computed(() => planetShopStore.purchasedSlots.filter((s) => s.role !== null))
    const backPlanets = computed(() => renderPositions.value.filter((p) => p.isBehind))
    const frontPlanets = computed(() => renderPositions.value.filter((p) => !p.isBehind))

    const tierOrbitDimensions = computed(() =>
      ORBIT_TIERS.planet.map((tier, i) => {
        const rep = renderPositions.value.find((_, si) => si % ORBIT_TIERS.planet.length === i)
        return rep
          ? { rx: rep.orbitRx, ry: rep.orbitRy, tiltDeg: rep.tiltDeg }
          : { rx: tier.rx, ry: tier.ry, tiltDeg: tier.tiltDeg }
      }),
    )

    let animFrame = 0
    let lastTs = 0
    let turretAccumMs = 0

    function animate(ts: number) {
      const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
      lastTs = ts

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const purchased = planetShopStore.purchasedSlots.filter((s) => s.role !== null)
      const newPositions: PlanetRenderPos[] = []

      const sunScale = planetShopStore.currentSunRadius / SUN_RADIUS
      const orbitScaleVal = orbitScale.value
      for (const slot of purchased) {
        const slotIdx = purchased.indexOf(slot)
        const tier = ORBIT_TIERS.planet[slotIdx % ORBIT_TIERS.planet.length]
        const orbitColor = tier.color
        const baseSize = tier.size * Math.pow(sunScale, 0.65)

        const tiltRad = tier.tiltRad
        const rawRy = tier.ry * sunScale * orbitScaleVal
        const vMin = Math.min(window.innerWidth, window.innerHeight)
        const MIN_RY_FACTORS = [1.5, 2.0]
        const VIEWPORT_RY_FACTORS = [0.10, 0.15]
        const minRy = Math.max(
          planetShopStore.currentSunRadius * MIN_RY_FACTORS[slotIdx % MIN_RY_FACTORS.length],
          vMin * VIEWPORT_RY_FACTORS[slotIdx % VIEWPORT_RY_FACTORS.length],
        )
        const flooredRy = Math.max(rawRy, minRy)
        const flooredRx = flooredRy * (tier.rx / tier.ry)
        const maxRx = (window.innerWidth / 2) * 0.85
        const capFactor = Math.min(1.0, maxRx / flooredRx)
        const rx = flooredRx * capFactor
        const ry = flooredRy * capFactor

        let ls = localStates.get(slot.id)
        if (!ls) {
          const startAngle = (slotIdx / Math.max(purchased.length, 1)) * Math.PI * 2
          const initPos = getOrbitPos(startAngle, rx, ry, tiltRad, cx, cy)
          ls = { id: slot.id, orbitAngle: startAngle, x: initPos.x, y: initPos.y }
          localStates.set(slot.id, ls)
        }

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

        const planetImage = slot.role ? PLANET_ROLES[slot.role].image : '/img/planets/planet.png'

        const currentHp = slot.currentHp ?? PLANET_SLOT_MAX_HP
        const maxHp = slot.maxHp ?? PLANET_SLOT_MAX_HP
        const hpPercent = (currentHp / Math.max(maxHp, 1)) * 100
        const isHealing = Date.now() < (slot.healingUntilMs ?? 0)

        const jb = slot.jungleBuff
        const isJungleBuffed = !!jb?.active
        const jungleBuffSecsLeft = isJungleBuffed
          ? Math.max(0, (jb!.activeUntil - Date.now()) / 1000)
          : 0
        const jungleBuffType = jb?.buffType ?? ''

        const slotNum = parseInt(slot.id.replace('slot_', ''), 10) - 1

        const hPlanetId = uiStore.hoveredPlanetSlotId
        const isHighlighted = slot.id === hPlanetId
        const highlightColor = slot.role ? PLANET_ROLES[slot.role].color : '#c89040'
        // Dim when focusing a champion (all planets recede) or another planet.
        const isDimmed =
          uiStore.hoveredChampionRole !== null || (hPlanetId !== null && slot.id !== hPlanetId)

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
          planetImage,
          currentHp,
          maxHp,
          hpPercent,
          isHealing,
          isJungleBuffed,
          jungleBuffSecsLeft,
          jungleBuffType,
          slotNum,
          isHighlighted,
          highlightColor,
          isDimmed,
        })
      }

      for (const key of localStates.keys()) {
        if (!purchased.some((s) => s.id === key)) {
          localStates.delete(key)
          planetSpeedMuls.delete(key)
        }
      }

      renderPositions.value = newPositions

      for (const pos of newPositions) {
        activePlayerPlanetPositions.set(pos.id, {
          cx: pos.x,
          cy: pos.y,
          isForeground: pos.isForeground,
        })
      }
      for (const key of activePlayerPlanetPositions.keys()) {
        if (!newPositions.some((p) => p.id === key)) activePlayerPlanetPositions.delete(key)
      }

      const tierCount = ORBIT_TIERS.planet.length
      for (let i = 0; i < tierCount; i++) {
        const behind = newPositions.some(
          (_, si) => si % tierCount === i && newPositions[si].isBehind,
        )
        if (tierIsBehind.value[i] !== behind) tierIsBehind.value[i] = behind
      }

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

    const { isIdleRenderingPaused } = useRenderingPaused()

    watch(isIdleRenderingPaused, (paused) => {
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
      hoveredChampionRole,
      HOVER_DIM_OPACITY,
      allSlots,
      slotsWithRole,
      backPlanets,
      frontPlanets,
      renderPositions,
      tierIsBehind,
      tierOrbitDimensions,
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
  will-change: transform, opacity;
  pointer-events: none;
}

.planet-orbit-item--clickable {
  pointer-events: auto;
  cursor: pointer;
}

.planet-orbit-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  image-rendering: high-quality;
}

/* ── Hover-Focus dim (Command-Panel-Hover) ─────────────────────────────────
   Opacity sitzt auf dem Planet-<img>, nicht am äußeren Item, dessen
   Tiefen-Opacity pro Frame per JS gesetzt wird → beide multiplizieren sich,
   Dimm-Transition läuft weich (Klasse toggelt nur als Boolean). */
.planet-orbit-portrait {
  transition: opacity 150ms ease, filter 150ms ease;
}

.planet-orbit-portrait--dimmed {
  opacity: var(--hover-dim-opacity, 0.08);
  filter: grayscale(1) brightness(0.65) blur(1.5px);
}

.planet-orbit-item--behind {
  filter: blur(2px) brightness(0.7) saturate(0.5);
  transition: filter 0.25s ease;
  pointer-events: none;
}

.planet-orbit-item--healing {
  animation: slotHeal 0.9s ease-out;
}

@keyframes slotHeal {
  0% {
    filter: drop-shadow(0 0 0px #52b830);
  }
  40% {
    filter: drop-shadow(0 0 14px #52b830) drop-shadow(0 0 28px #2e7a1a);
  }
  100% {
    filter: drop-shadow(0 0 5px #52b830);
  }
}

.planet-orbit-item--foreground {
  filter: brightness(1.15) saturate(1.15);
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
  display: flex;
  align-items: center;
  justify-content: center;
}
.planet-badge-gi {
  width: 9px;
  height: 9px;
  color: var(--planet-color, #c89040);
}

@media (prefers-reduced-motion: reduce) {
  .planet-orbit-item {
    transition: none;
    animation: none;
  }
}

/* ── Planet HP Bars – RPG-Stil ─────────────────────────────────────────────── */
.planet-hp-wrap {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

/* Äußerer Rahmen – graviertes Metall */
.planet-hp-bar-track {
  position: relative;
  width: 100%;
  height: 8px;
  background: #0a0806;
  border: 1px solid #6b4a1e;
  border-radius: 3px;
  box-shadow:
    0 0 0 1px #1a0f04,
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    0 1px 0 rgba(255, 200, 80, 0.08);
  overflow: hidden;
}

/* Füllbalken – Basis grün */
.planet-hp-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to bottom, #5de84a 0%, #2eaa1e 45%, #1d7a12 100%);
  box-shadow:
    inset 0 1px 0 rgba(120, 255, 100, 0.45),
    0 0 6px rgba(60, 200, 40, 0.5);
  transition: width 0.25s linear;
  position: relative;
}

/* Mittlerer HP-Bereich (25–60 %) – gelb-orange */
.planet-hp-bar-fill--mid {
  background: linear-gradient(to bottom, #f5d84a 0%, #d4960e 45%, #9a6508 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 120, 0.45),
    0 0 6px rgba(220, 160, 20, 0.55);
}

/* Niedriger HP-Bereich (< 25 %) – rot, pulsierend */
.planet-hp-bar-fill--low {
  background: linear-gradient(to bottom, #ff5f5f 0%, #cc1e1e 45%, #8a0d0d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 140, 140, 0.45),
    0 0 8px rgba(220, 30, 30, 0.7);
  animation: hp-pulse 1.1s ease-in-out infinite;
}

/* Glanz-Overlay auf dem Track */
.planet-hp-bar-shine {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 0%, transparent 55%);
  pointer-events: none;
}

@keyframes hp-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.planet-hp-text {
  font-size: 14px;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow:
    0 0 4px rgba(232, 160, 20, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

/* ── Jungle Buff — Planet Glow (applied to the item itself, not clipped) ─── */
.planet-orbit-item--jungle-buffed {
  animation: jungle-planet-glow 1.8s ease-in-out infinite;
}

@keyframes jungle-planet-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 5px #5ce66a99);
  }
  50% {
    filter: drop-shadow(0 0 14px #5ce66acc) drop-shadow(0 0 28px #5ce66a55);
  }
}

/* ── Jungle Buff Particle Aura (external overlay, not clipped) ─────────────── */
.jungle-buff-overlay {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  pointer-events: none;
}

/* Outer spinning arc */
.jungle-buff-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #5ce66a;
  border-right-color: #5ce66a66;
  animation: jungle-spin 2.4s linear infinite;
}

/* Inner counter-spin dotted arc */
.jungle-buff-overlay::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px dashed #5ce66a55;
  animation: jungle-spin-rev 3.6s linear infinite;
}

@keyframes jungle-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes jungle-spin-rev {
  to {
    transform: rotate(-360deg);
  }
}

/* ── MMO Status Badge (Jungle Buff) ──────────────────────────────────────── */
.planet-status-badge-anchor {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.planet-status-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 28px;
  padding: 3px 2px 2px;
  border-radius: 4px;
  background: rgba(6, 14, 6, 0.9);
}

.planet-status-badge--buff {
  border: 1px solid #5ce66a;
  box-shadow:
    0 0 8px rgba(92, 230, 106, 0.55),
    inset 0 0 5px rgba(0, 0, 0, 0.6);
  animation: status-buff-pulse 2s ease-in-out infinite;
}

.status-badge-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 0 4px rgba(92, 230, 106, 0.7));
}

.status-badge-timer {
  font-size: 10px;
  font-weight: 900;
  color: #5ce66a;
  line-height: 1;
  margin-top: 2px;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 5px rgba(92, 230, 106, 0.8),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

.status-badge-timer--urgent {
  color: #ff4040;
  text-shadow:
    0 0 6px rgba(255, 40, 40, 0.95),
    0 1px 2px rgba(0, 0, 0, 0.9);
  animation: timer-urgent-blink 0.5s ease-in-out infinite;
}

@keyframes status-buff-pulse {
  0%,
  100% {
    box-shadow: 0 0 6px rgba(92, 230, 106, 0.45);
  }
  50% {
    box-shadow:
      0 0 14px rgba(92, 230, 106, 0.85),
      0 0 4px rgba(92, 230, 106, 0.3);
  }
}

@keyframes timer-urgent-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.status-badge-enter-active {
  animation: status-badge-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.status-badge-leave-active {
  animation: status-badge-in 0.18s ease-in reverse both;
}

@keyframes status-badge-in {
  from {
    opacity: 0;
    transform: scale(0.6) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .planet-status-badge--buff {
    animation: none;
  }
  .status-badge-timer--urgent {
    animation: none;
  }
  .status-badge-enter-active,
  .status-badge-leave-active {
    animation: none;
  }
}

/* ── Champion slot / planet tile hover ring ─────────────────────────────── */
.planet-champion-hover-ring {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  pointer-events: none;
  border: 3px solid var(--cring-color);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--cring-color) 28%, transparent),
    0 0 14px 5px var(--cring-color),
    0 0 30px 10px color-mix(in srgb, var(--cring-color) 42%, transparent),
    inset 0 0 10px 3px color-mix(in srgb, var(--cring-color) 22%, transparent);
  animation: champion-ring-pulse 1.3s ease-in-out infinite;
}

/* Inner counter-pulse ring */
.planet-champion-hover-ring::before {
  content: '';
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--cring-color) 58%, transparent);
  animation: champion-ring-inner 1.3s ease-in-out infinite;
}

/* Behind-sun variant: dashed outer border + stronger glow signals "hidden" location */
.planet-champion-hover-ring--behind {
  border-style: dashed;
  box-shadow:
    0 0 18px 7px var(--cring-color),
    0 0 38px 14px color-mix(in srgb, var(--cring-color) 50%, transparent);
  opacity: 0.88;
}

@keyframes champion-ring-pulse {
  0%, 100% {
    opacity: 0.82;
    box-shadow:
      0 0 10px 3px var(--cring-color),
      inset 0 0 6px 2px color-mix(in srgb, var(--cring-color) 18%, transparent);
  }
  50% {
    opacity: 1;
    box-shadow:
      0 0 22px 8px var(--cring-color),
      0 0 44px 14px color-mix(in srgb, var(--cring-color) 42%, transparent),
      inset 0 0 12px 4px color-mix(in srgb, var(--cring-color) 28%, transparent);
  }
}

@keyframes champion-ring-inner {
  0%, 100% { opacity: 0.35; }
  50%       { opacity: 0.88; }
}

.champion-ring-enter-active {
  animation: champion-ring-in 0.22s ease-out both;
}
.champion-ring-leave-active {
  animation: champion-ring-in 0.16s ease-in reverse both;
}

@keyframes champion-ring-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Behind-planet: partially break through the sun blur when highlighted */
.planet-orbit-item--behind.planet-orbit-item--highlight-behind {
  filter: blur(0.4px) brightness(1.25) saturate(0.85);
  opacity: 0.72;
}

@media (prefers-reduced-motion: reduce) {
  .planet-champion-hover-ring,
  .planet-champion-hover-ring::before { animation: none; }
}
</style>
