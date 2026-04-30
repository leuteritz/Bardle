<!-- frontend/src/components/idle/sun/ChampionOrbit.vue -->
<template>
  <!-- Champion Orbit-Ring Layer (crisp dashed guide rings) -->
  <svg class="champion-orbit-rings" aria-hidden="true">
    <template v-for="pos in championRenderPositions" :key="'ring-champ-' + pos.name">
      <ellipse
        :cx="screenCx"
        :cy="screenCy"
        :rx="pos.orbitRx"
        :ry="pos.orbitRy"
        :transform="`rotate(${pos.tiltDeg}, ${screenCx}, ${screenCy})`"
        :stroke="pos.orbitColor"
        stroke-opacity="0.06"
        stroke-width="18"
        fill="none"
      />
      <ellipse
        :cx="screenCx"
        :cy="screenCy"
        :rx="pos.orbitRx"
        :ry="pos.orbitRy"
        :transform="`rotate(${pos.tiltDeg}, ${screenCx}, ${screenCy})`"
        :stroke="pos.orbitColor"
        stroke-opacity="0.17"
        stroke-width="6"
        fill="none"
      />
      <ellipse
        :cx="screenCx"
        :cy="screenCy"
        :rx="pos.orbitRx"
        :ry="pos.orbitRy"
        :transform="`rotate(${pos.tiltDeg}, ${screenCx}, ${screenCy})`"
        :stroke="pos.orbitColor"
        stroke-opacity="0.40"
        stroke-width="1.5"
        fill="none"
      />
    </template>
  </svg>

  <!-- Projektile: teleportiert sich selbst nach body -->
  <AttackProjectileLayer :shots="shots" />

  <!-- ① Back-Layer: Champions HINTER der Sonne -->
  <div class="champion-orbit-layer champion-orbit-back" aria-hidden="true">
    <div
      v-for="pos in backChampions"
      :key="pos.name"
      class="champion-orbit-avatar champion-orbit-avatar--behind"
      :class="{ [`champion-orbit-avatar--role-${pos.primaryRole}`]: !!pos.primaryRole }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
      }"
    >
      <img :src="pos.img" :alt="pos.name" />
    </div>
  </div>

  <!-- ② Front-Layer: Champions VOR der Sonne -->
  <div class="champion-orbit-layer champion-orbit-front" aria-hidden="true">
    <div
      v-for="pos in frontChampions"
      :key="pos.name"
      class="champion-orbit-avatar"
      :class="{
        'champion-orbit-avatar--attacking': pos.isAttacking,
        'champion-orbit-avatar--foreground': pos.isForeground,
        [`champion-orbit-avatar--role-${pos.primaryRole}`]: !!pos.primaryRole,
        'champion-orbit-avatar--shield':
          pos.primaryRole === 'top' && roleBehaviorStore.tankShieldActive,
        'champion-orbit-avatar--dot':
          pos.primaryRole === 'mid' && roleBehaviorStore.dotRemainingMs > 0,
        'champion-orbit-avatar--top-hit': pos.primaryRole === 'top' && topHitActive,
      }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        zIndex: pos.zIndex,
      }"
    >
      <img :src="pos.img" :alt="pos.name" />
      <span
        v-if="pos.primaryRole"
        class="champion-role-badge"
        :class="`champion-role-badge--${pos.primaryRole}`"
      >
        {{ roleIcons[pos.primaryRole] }}
      </span>
      <span
        v-if="pos.primaryRole === 'jungle' && roleBehaviorStore.junglerStackCount > 0"
        class="champion-jungler-stacks"
        >{{ roleBehaviorStore.junglerStackCount }}</span
      >
    </div>

    <!-- Floating damage numbers -->
    <Teleport to="body">
      <div class="champion-dmg-overlay" aria-hidden="true">
        <TransitionGroup name="champion-dmg">
          <span
            v-for="f in combatStore.damageFloats"
            :key="f.id"
            class="champion-dmg-float"
            :class="{
              'champion-dmg-float--planet': f.planetFloat,
              'champion-dmg-float--dot': f.dotFloat,
              'champion-dmg-float--adc': f.adcFloat,
              'champion-dmg-float--heal': f.healFloat,
            }"
            :style="{ left: f.x + 'px', top: f.y + 'px' }"
          >
            <template v-if="f.healFloat">+{{ f.value }}</template>
            <template v-else>-{{ f.value }}</template>
          </span>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useCombatStore } from '../../../stores/combatStore'
import { useBattleStore } from '../../../stores/battleStore'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { useRoleBehaviorStore } from '../../../stores/roleBehaviorStore'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import { ORBIT_TIERS, SUPPORT_ANGLE_OFFSET } from '@/config/constants'
import AttackProjectileLayer from './AttackProjectileLayer.vue'
import { useProjectileSystem } from '@/composables/useProjectileSystem'
import type { ChampionRole } from '../../../types'

const BEHIND_SUN_SPEED_MULTIPLIER = 1.5
const BEHIND_SPEED_LERP = 0.04
const PROJECTILE_COOLDOWN_MS = 700

interface ChampionRenderPos {
  name: string
  img: string
  x: number
  y: number
  size: number
  opacity: number
  isAttacking: boolean
  isBehind: boolean
  isForeground: boolean
  zIndex: number
  primaryRole: ChampionRole | null
  hintOpacity: number
  orbitRx: number
  orbitRy: number
  tiltDeg: number
  orbitColor: string
}

interface LocalChampState {
  name: string
  x: number
  y: number
  orbitAngle: number
  initialised: boolean
}

export default defineComponent({
  name: 'ChampionOrbit',
  components: { AttackProjectileLayer },
  setup() {
    const combatStore = useCombatStore()
    const battleStore = useBattleStore()
    const bossStore = usePlanetBossStore()
    const roleBehaviorStore = useRoleBehaviorStore()

    const { shots, spawnShot, tickShots } = useProjectileSystem()

    const SLOT_ROLES: ChampionRole[] = ['top', 'jungle', 'mid', 'adc', 'support']

    const roleIcons: Record<ChampionRole, string> = {
      adc: '🏹',
      support: '💚',
      top: '🛡',
      mid: '🔮',
      jungle: '🌿',
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const localStates = new Map<string, LocalChampState>()
    const champSpeedMuls = new Map<string, number>()
    const lastFiredAt = new Map<string, number>()

    const topHitActive = ref(false)
    let topHitTimer = 0

    function scheduleTopHit() {
      const TOP_TIER = ORBIT_TIERS.role.top
      topHitTimer = window.setTimeout(() => {
        topHitActive.value = true
        window.setTimeout(() => {
          topHitActive.value = false
          scheduleTopHit()
        }, TOP_TIER.hitDurationMs)
      }, TOP_TIER.hitIntervalMs)
    }

    const championRenderPositions = ref<ChampionRenderPos[]>([])

    const backChampions = computed(() => championRenderPositions.value.filter((p) => p.isBehind))
    const frontChampions = computed(() => championRenderPositions.value.filter((p) => !p.isBehind))

    function getOrbitPos(
      angle: number,
      orbitRadiusX: number,
      orbitRadiusY: number,
      tiltRad: number,
      screenCx: number,
      screenCy: number,
    ): { x: number; y: number } {
      const cosT = Math.cos(tiltRad)
      const sinT = Math.sin(tiltRad)
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      return {
        x: screenCx + orbitRadiusX * cosA * cosT - orbitRadiusY * sinA * sinT,
        y: screenCy + orbitRadiusX * cosA * sinT + orbitRadiusY * sinA * cosT,
      }
    }

    let animFrame = 0
    let lastTs = 0

    function animate(ts: number) {
      const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
      lastTs = ts

      const screenCx = window.innerWidth / 2
      const screenCy = window.innerHeight / 2
      const champions = combatStore.champions
      const newPositions: ChampionRenderPos[] = []

      const adcName = battleStore.headerSlots[3]
      const adcState = adcName ? localStates.get(adcName) : null
      const adcChampion = adcName ? champions.find((ch) => ch.name === adcName) : null
      const adcDir = adcChampion?.direction ?? 1

      for (let ci = 0; ci < champions.length; ci++) {
        const c = champions[ci]

        const slotIndex = battleStore.headerSlots.indexOf(c.name)
        const primaryRole: ChampionRole | null = slotIndex >= 0 ? SLOT_ROLES[slotIndex] : null

        const tier = primaryRole ? ORBIT_TIERS.role[primaryRole] : ORBIT_TIERS.planet[ci % 2]
        const rx = tier.rx
        const ry = tier.ry
        const tiltRad = tier.tiltRad
        const tiltDeg = tier.tiltDeg
        const orbitColor = tier.color
        const baseSize = primaryRole
          ? ORBIT_TIERS.role[primaryRole].championSize
          : ORBIT_TIERS.planet[ci % 2].size
        const orbitSpeed = 'speed' in tier ? (tier as { speed: number }).speed : c.baseSpeed

        let ls = localStates.get(c.name)
        if (!ls) {
          const orbitPos = getOrbitPos(c.angle, rx, ry, tiltRad, screenCx, screenCy)
          ls = {
            name: c.name,
            x: orbitPos.x,
            y: orbitPos.y,
            orbitAngle: c.angle,
            initialised: false,
          }
          localStates.set(c.name, ls)
        }

        if (primaryRole === 'support' && adcState) {
          ls.orbitAngle = adcState.orbitAngle - adcDir * SUPPORT_ANGLE_OFFSET
        }

        const prevRelY = (ls.y - screenCy) / Math.max(ry, 1)
        const prevIsBehind = prevRelY < -0.05
        const targetMul = prevIsBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
        const curMul = champSpeedMuls.get(c.name) ?? 1.0
        const newMul = curMul + (targetMul - curMul) * BEHIND_SPEED_LERP
        champSpeedMuls.set(c.name, newMul)

        if (!reducedMotion) {
          if (primaryRole !== 'support' || !adcState) {
            const keplerBoost = 1.0 + 0.55 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
            ls.orbitAngle += c.direction * orbitSpeed * keplerBoost * newMul * dt
          }
          const targetOrbit = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, screenCx, screenCy)
          ls.x += (targetOrbit.x - ls.x) * 0.15
          ls.y += (targetOrbit.y - ls.y) * 0.15
        } else {
          const orbitPos = getOrbitPos(c.angle, rx, ry, tiltRad, screenCx, screenCy)
          ls.x = orbitPos.x
          ls.y = orbitPos.y
        }

        combatStore.setChampionScreenPos(c.name, ls.x, ls.y)

        const relY = (ls.y - screenCy) / Math.max(ry, 1)
        const isBehind = relY < -0.05
        const depth = (relY + 1) / 2

        const parallaxScale = 0.72 + depth * 0.56
        const size = c.isAttacking ? baseSize : Math.round(baseSize * parallaxScale)
        const opacity = c.isAttacking ? 1 : isBehind ? 0.82 + depth * 0.18 : 0.9 + depth * 0.1
        const zIndex = c.isAttacking ? 20 : Math.floor(8 + depth * 7)

        // isForeground bewusst OHNE !c.isAttacking – sonst kann ein
        // angreifender Champion nie schießen
        const isForeground = !isBehind && depth > 0.65

        const visibleFactor = Math.max(0, Math.min(1, (relY + 0.05 + 0.12) / 0.12))
        const hintOpacity = Math.max(0, 1 - visibleFactor)

        newPositions.push({
          name: c.name,
          img: battleStore.getChampionImage(c.name),
          x: ls.x,
          y: ls.y,
          size,
          opacity,
          isAttacking: c.isAttacking,
          isBehind: isBehind && !c.isAttacking,
          isForeground,
          zIndex,
          primaryRole,
          hintOpacity,
          orbitRx: rx,
          orbitRy: ry,
          tiltDeg,
          orbitColor,
        })
      }

      for (const key of localStates.keys()) {
        if (!champions.some((ch) => ch.name === key)) {
          localStates.delete(key)
          champSpeedMuls.delete(key)
          lastFiredAt.delete(key)
        }
      }

      // ── Projektil-System ──────────────────────────────────────────────────────
      if (!reducedMotion) {
        tickShots(dt)

        const activeBoss = bossStore.activeBoss
        const pPos = activeBoss ? (activePlanetPositions.get(activeBoss.planetId) ?? null) : null

        if (pPos?.isForeground) {
          for (const pos of newPositions) {
            if (!pos.isAttacking) continue
            if (!pos.isForeground) continue

            const last = lastFiredAt.get(pos.name) ?? 0
            if (ts - last < PROJECTILE_COOLDOWN_MS) continue

            lastFiredAt.set(pos.name, ts)
            // Beide Flags sind bereits geprüft – spawnShot wird sicher feuern
            spawnShot(pos.x, pos.y, pPos.cx, pPos.cy, true, true)
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      championRenderPositions.value = newPositions
      animFrame = requestAnimationFrame(animate)
    }

    watch(
      () => battleStore.headerSlots,
      (slots) => combatStore.syncChampions(slots.filter((s): s is string => s !== null)),
      { immediate: true, deep: true },
    )

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
      scheduleTopHit()
    })
    onUnmounted(() => {
      cancelAnimationFrame(animFrame)
      clearTimeout(topHitTimer)
    })

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2

    return {
      combatStore,
      roleBehaviorStore,
      roleIcons,
      backChampions,
      frontChampions,
      championRenderPositions,
      shots,
      topHitActive,
      screenCx,
      screenCy,
    }
  },
})
</script>

<style scoped>
/* ── Orbit-Ring SVG ───────────────────────────────────────────────────────── */
.champion-orbit-rings {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
  filter: blur(2px);
}

/* ── Layer-Container ──────────────────────────────────────────────────────── */
.champion-orbit-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.champion-orbit-back {
  z-index: 4;
}
.champion-orbit-front {
  z-index: 6;
}

/* ── Champion-Avatare ─────────────────────────────────────────────────────── */
.champion-orbit-avatar {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #c89040;
  box-shadow:
    0 0 10px rgba(232, 192, 64, 0.55),
    0 0 20px rgba(232, 192, 64, 0.2);
  will-change: transform;
  transition:
    box-shadow 0.3s ease,
    filter 0.25s ease;
}

.champion-orbit-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  border-radius: 50%;
}

/* ── Rollen-Farben ──────────────────────────────────────────────────────── */
.champion-orbit-avatar--role-top {
  border-color: #f54747 !important;
  box-shadow:
    0 0 10px rgba(245, 71, 71, 0.7),
    0 0 20px rgba(245, 71, 71, 0.3);
}
.champion-orbit-avatar--role-jungle {
  border-color: #3eea58 !important;
  box-shadow:
    0 0 10px rgba(62, 234, 88, 0.7),
    0 0 20px rgba(62, 234, 88, 0.3);
}
.champion-orbit-avatar--role-mid {
  border-color: #5598f6 !important;
  box-shadow:
    0 0 10px rgba(85, 152, 246, 0.7),
    0 0 20px rgba(85, 152, 246, 0.3);
}
.champion-orbit-avatar--role-adc {
  border-color: #f7a145 !important;
  box-shadow:
    0 0 10px rgba(247, 161, 69, 0.7),
    0 0 20px rgba(247, 161, 69, 0.3);
}
.champion-orbit-avatar--role-support {
  border-color: #89b8e6 !important;
  box-shadow:
    0 0 10px rgba(137, 184, 230, 0.7),
    0 0 20px rgba(137, 184, 230, 0.3);
}

.champion-orbit-avatar--behind {
  filter: blur(2px) brightness(0.75) saturate(0.65);
  transition: filter 0.25s ease;
}

.champion-orbit-avatar--foreground {
  filter: brightness(1.18) saturate(1.2);
}

.champion-orbit-avatar--attacking {
  animation: champion-attack-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes champion-attack-pulse {
  from {
    filter: brightness(1) saturate(1);
  }
  to {
    filter: brightness(1.4) saturate(1.25);
  }
}

/* ── Rollen-Badge ─────────────────────────────────────────────────────────── */
.champion-role-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 8px;
  line-height: 14px;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 2;
}

.champion-role-badge--adc {
  background: #804010;
}
.champion-role-badge--support {
  background: #3a5060;
}
.champion-role-badge--top {
  background: #7a1818;
}
.champion-role-badge--mid {
  background: #1a3880;
}
.champion-role-badge--jungle {
  background: #1a6028;
}

/* ── Ability-Glows ────────────────────────────────────────────────────────── */
.champion-orbit-avatar--shield {
  box-shadow:
    0 0 14px rgba(80, 180, 255, 0.9),
    0 0 28px rgba(60, 140, 255, 0.5);
  animation: shield-pulse 1s ease-in-out infinite alternate;
}

@keyframes shield-pulse {
  from {
    box-shadow:
      0 0 12px rgba(80, 180, 255, 0.8),
      0 0 24px rgba(60, 140, 255, 0.5);
  }
  to {
    box-shadow:
      0 0 24px rgba(100, 200, 255, 1),
      0 0 48px rgba(80, 160, 255, 0.7);
  }
}

.champion-orbit-avatar--dot {
  box-shadow:
    0 0 14px rgba(180, 80, 255, 0.9),
    0 0 28px rgba(140, 60, 255, 0.5);
  animation: dot-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes dot-pulse {
  from {
    box-shadow:
      0 0 12px rgba(180, 80, 255, 0.8),
      0 0 24px rgba(140, 60, 255, 0.5);
  }
  to {
    box-shadow:
      0 0 24px rgba(200, 100, 255, 1),
      0 0 48px rgba(160, 80, 255, 0.7);
  }
}

/* ── Jungler-Stacks ───────────────────────────────────────────────────────── */
.champion-jungler-stacks {
  position: absolute;
  top: -4px;
  left: -4px;
  min-width: 14px;
  height: 14px;
  padding: 0 2px;
  border-radius: 7px;
  background: #1a5a10;
  border: 1px solid #60c040;
  color: #a0ff80;
  font-size: 8px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
  pointer-events: none;
  z-index: 2;
}

/* ── Schadenszahlen ───────────────────────────────────────────────────────── */
.champion-dmg-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 60;
}

.champion-dmg-float {
  position: absolute;
  font-size: 1.05rem;
  font-weight: 700;
  color: #ff6040;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.85);
  text-shadow: 0 0 10px rgba(255, 80, 0, 0.9);
  pointer-events: none;
  white-space: nowrap;
  transform: translateX(-50%);
}

.champion-dmg-float--planet {
  font-size: 2.2rem;
  color: #ffe040;
  -webkit-text-stroke: 1.5px rgba(0, 0, 0, 0.9);
  text-shadow:
    0 0 16px rgba(255, 200, 0, 1),
    0 0 32px rgba(255, 160, 0, 0.7);
}

.champion-dmg-float--adc {
  font-size: 1.3rem;
  color: #ff8020;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.85);
  text-shadow:
    0 0 12px rgba(255, 120, 0, 1),
    0 0 24px rgba(255, 80, 0, 0.6);
}

.champion-dmg-float--dot {
  font-size: 0.95rem;
  color: #d060ff;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.8);
  text-shadow: 0 0 10px rgba(200, 80, 255, 0.9);
}

.champion-dmg-float--heal {
  font-size: 1.1rem;
  color: #60ff80;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.75);
  text-shadow:
    0 0 12px rgba(80, 255, 100, 0.9),
    0 0 24px rgba(40, 200, 60, 0.5);
}

/* ── Schaden-Transitions ──────────────────────────────────────────────────── */
.champion-dmg-enter-active {
  transition:
    opacity 0.85s ease-out,
    transform 0.85s ease-out;
}
.champion-dmg-leave-active {
  transition:
    opacity 0.85s ease-in,
    transform 0.85s ease-in;
}
.champion-dmg-enter-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1.2);
}
.champion-dmg-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-54px) scale(0.8);
}

/* ── Top-Lane Treffer-Effekt ──────────────────────────────────────────────── */
.champion-orbit-avatar--top-hit {
  animation: top-hit-flash 0.35s ease-out forwards;
}

@keyframes top-hit-flash {
  0% {
    filter: brightness(2) saturate(1.4);
    box-shadow:
      0 0 18px rgba(255, 80, 80, 1),
      0 0 36px rgba(220, 40, 40, 0.7);
  }
  40% {
    filter: brightness(1.4) saturate(1.15);
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .champion-orbit-avatar--attacking,
  .champion-orbit-avatar--top-hit {
    animation: none;
  }
}
</style>
