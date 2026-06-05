<!-- frontend/src/components/idle/sun/ChampionOrbit.vue -->
<template>
  <!-- Projektile: teleportiert sich selbst nach body -->
  <AttackProjectileLayer :shots="shots" />

  <!-- ① Back-Layer: Champions HINTER der Sonne -->
  <div class="champion-orbit-layer champion-orbit-back" aria-hidden="true">
    <div
      v-for="pos in backChampions"
      :key="pos.name"
      class="champion-orbit-avatar champion-orbit-avatar--behind"
      :class="{
        'champion-orbit-avatar--role-colored': !!pos.primaryRole,
        'champion-orbit-avatar--secondary': !pos.isMain,
      }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        '--role-color': pos.primaryRole ? ROLE_BY_KEY[pos.primaryRole]?.color : undefined,
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
        'champion-orbit-avatar--secondary': !pos.isMain,
        'champion-orbit-avatar--role-colored': !!pos.primaryRole,
        'champion-orbit-avatar--shield':
          pos.isMain && pos.primaryRole === 'top' && roleBehaviorStore.tankShieldActive,
        'champion-orbit-avatar--cursing':
          pos.isMain && pos.primaryRole === 'mid' && roleBehaviorStore.midCurseFlashActive,
        'champion-orbit-avatar--ability-mid':
          pos.isMain && pos.primaryRole === 'mid' && roleBehaviorStore.midCurseCooldownMs === 0,
        'champion-orbit-avatar--top-hit':
          pos.isMain && pos.primaryRole === 'top' && topHitActive,
        'champion-orbit-avatar--intercept':
          pos.isMain && pos.primaryRole === 'top' && roleBehaviorStore.tankInterceptActive,
        'champion-orbit-avatar--healing':
          pos.isMain && pos.primaryRole === 'support' && roleBehaviorStore.supportPlanetHealActive,
        'champion-orbit-avatar--ability-jungle':
          pos.isMain && pos.primaryRole === 'jungle' && roleBehaviorStore.jungleBuffCooldownMs === 0,
        'champion-orbit-avatar--ability-adc':
          pos.isMain && pos.primaryRole === 'adc' && roleBehaviorStore.adcBurstActive,
        'champion-orbit-avatar--synergy': pos.synergyActive,
      }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        zIndex: pos.zIndex,
        '--role-color': pos.primaryRole ? ROLE_BY_KEY[pos.primaryRole]?.color : undefined,
      }"
    >
      <img :src="pos.img" :alt="pos.name" />
      <Transition name="ability-icon">
        <img
          v-if="pos.isMain && pos.primaryRole && isAbilityActive(pos.primaryRole)"
          :src="ROLE_BY_KEY[pos.primaryRole].image"
          :alt="pos.primaryRole"
          :aria-label="pos.primaryRole + ' ability'"
          class="champion-ability-icon"
        />
      </Transition>
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
              'champion-dmg-float--shield': f.shieldFloat,
              'champion-dmg-float--curse': f.curseFloat,
            }"
            :style="{ left: f.x + 'px', top: f.y + 'px' }"
          >
            <template v-if="f.shieldFloat"><Icon icon="game-icons:shield-reflect" width="16" height="16" style="color: #5090e8" /></template>
            <template v-else-if="f.healFloat">+{{ f.value }}</template>
            <template v-else>-{{ f.value }}</template>
          </span>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useCombatStore } from '../../../stores/combatStore'
import { useBattleStore } from '../../../stores/battleStore'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { useRoleBehaviorStore } from '../../../stores/roleBehaviorStore'
import { useSynergyStore } from '../../../stores/synergyStore'
import { usePlanetShopStore } from '../../../stores/planetShopStore'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import {
  ORBIT_TIERS,
  SUPPORT_ANGLE_OFFSET,
  ROLES,
  ROLE_BY_KEY,
  SECONDARY_ANGLE_OFFSET_1,
  SECONDARY_ANGLE_OFFSET_2,
  SECONDARY_SIZE_SCALE,
  SUN_RADIUS,
  BEHIND_SUN_SPEED_MULTIPLIER,
} from '@/config/constants'
import AttackProjectileLayer from './AttackProjectileLayer.vue'
import { useProjectileSystem } from '@/composables/useProjectileSystem'
import { useOrbitScale } from '@/composables/useOrbitScale'
import { activeChampionBehindState } from '../../../utils/activeChampionBehindState'
import type { ChampionRole } from '../../../types'

const BEHIND_SPEED_LERP = 0.04
const PROJECTILE_COOLDOWN_MS = 700
const INTERCEPT_MAX_OFFSET = 25
const INTERCEPT_DURATION_MS = 500

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
  isMain: boolean
  hintOpacity: number
  orbitRx: number
  orbitRy: number
  tiltDeg: number
  orbitColor: string
  synergyActive: boolean
}

interface Assignment {
  role: ChampionRole | null
  isMain: boolean
  subIndex: number
  roleIndex: number
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
  components: { AttackProjectileLayer, Icon },
  setup() {
    const combatStore = useCombatStore()
    const battleStore = useBattleStore()
    const bossStore = usePlanetBossStore()
    const roleBehaviorStore = useRoleBehaviorStore()
    const synergyStore = useSynergyStore()
    const planetShopStore = usePlanetShopStore()

    const { shots, spawnShot, tickShots } = useProjectileSystem()
    const { orbitScale } = useOrbitScale()

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const localStates = new Map<string, LocalChampState>()
    const champSpeedMuls = new Map<string, number>()
    const lastFiredAt = new Map<string, number>()

    // topHitActive bleibt für den --top-hit CSS-Flash-Effekt am Avatar erhalten
    const topHitActive = ref(false)
    let topHitTimer = 0

    function scheduleTopHit() {
      const TOP_TIER = ROLES[0].orbit
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

    function getAssignment(name: string): Assignment {
      const mainIdx = battleStore.headerSlots.indexOf(name)
      if (mainIdx >= 0)
        return { role: ROLES[mainIdx]?.key ?? null, isMain: true, subIndex: -1, roleIndex: mainIdx }
      const secs = battleStore.secondarySlots
      for (let r = 0; r < secs.length; r++) {
        const subIdx = secs[r].indexOf(name)
        if (subIdx >= 0)
          return { role: ROLES[r]?.key ?? null, isMain: false, subIndex: subIdx, roleIndex: r }
      }
      return { role: null, isMain: false, subIndex: -1, roleIndex: -1 }
    }

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

      // Compute assignments once + sort so mains process before secondaries (secondaries snap to main angle)
      const assignments = new Map<string, Assignment>()
      for (const c of champions) assignments.set(c.name, getAssignment(c.name))
      const ordered = [...champions].sort((a, b) => {
        const aIsMain = assignments.get(a.name)!.isMain
        const bIsMain = assignments.get(b.name)!.isMain
        if (aIsMain !== bIsMain) return aIsMain ? -1 : 1
        return 0
      })

      const sunScale = planetShopStore.currentSunRadius / SUN_RADIUS
      const orbitScaleVal = orbitScale.value

      for (let ci = 0; ci < ordered.length; ci++) {
        const c = ordered[ci]
        const asn = assignments.get(c.name)!
        const primaryRole: ChampionRole | null = asn.role
        const isMain = asn.isMain

        const roleTier = primaryRole ? ROLE_BY_KEY[primaryRole].orbit : null
        const planetTier = ORBIT_TIERS.planet[ci % 2]
        const rawRx = (roleTier ? roleTier.rx : planetTier.rx) * sunScale * orbitScaleVal
        const rawRy = (roleTier ? roleTier.ry : planetTier.ry) * sunScale * orbitScaleVal

        const vMin = Math.min(window.innerWidth, window.innerHeight)
        const MIN_RY_BY_ROLE: Record<string, number> = {
          top: 1.35, jungle: 1.8, mid: 2.2, adc: 2.6, support: 2.6,
        }
        const VIEWPORT_RY_BY_ROLE: Record<string, number> = {
          top: 0.07, jungle: 0.12, mid: 0.17, adc: 0.22, support: 0.22,
        }
        const minRyFactor = primaryRole ? (MIN_RY_BY_ROLE[primaryRole] ?? 1.5) : 1.6
        const viewportFactor = primaryRole ? (VIEWPORT_RY_BY_ROLE[primaryRole] ?? 0.10) : 0.12
        const minRy = Math.max(
          planetShopStore.currentSunRadius * minRyFactor,
          vMin * viewportFactor,
        )
        const aspectRatio = roleTier ? roleTier.rx / roleTier.ry : planetTier.rx / planetTier.ry
        const flooredRy = Math.max(rawRy, minRy)
        const flooredRx = flooredRy * aspectRatio
        const maxRx = (window.innerWidth / 2) * 0.85
        const capFactor = Math.min(1.0, maxRx / flooredRx)
        const rx = flooredRx * capFactor
        const ry = flooredRy * capFactor

        const tiltRad = roleTier ? roleTier.tiltRad : planetTier.tiltRad
        const tiltDeg = roleTier ? roleTier.tiltDeg : planetTier.tiltDeg
        const orbitColor = roleTier ? roleTier.color : planetTier.color
        const baseSizeRaw = (roleTier ? roleTier.championSize : planetTier.size) * Math.pow(sunScale, 0.65)
        const baseSize = isMain ? baseSizeRaw : baseSizeRaw * SECONDARY_SIZE_SCALE
        const orbitSpeed = roleTier ? roleTier.speed : c.baseSpeed

        // For secondaries: locate the main of the same role to snap our angle to its orbit
        let mainState: LocalChampState | null = null
        if (!isMain && asn.roleIndex >= 0) {
          const mainName = battleStore.headerSlots[asn.roleIndex]
          if (mainName) mainState = localStates.get(mainName) ?? null
        }

        let ls = localStates.get(c.name)
        if (!ls) {
          const initAngle = mainState
            ? mainState.orbitAngle +
              (asn.subIndex === 0 ? SECONDARY_ANGLE_OFFSET_1 : SECONDARY_ANGLE_OFFSET_2)
            : c.angle
          const orbitPos = getOrbitPos(initAngle, rx, ry, tiltRad, screenCx, screenCy)
          ls = {
            name: c.name,
            x: orbitPos.x,
            y: orbitPos.y,
            orbitAngle: initAngle,
            initialised: false,
          }
          localStates.set(c.name, ls)
        }

        if (primaryRole === 'support' && isMain && adcState) {
          ls.orbitAngle = adcState.orbitAngle - adcDir * SUPPORT_ANGLE_OFFSET
        }

        if (!isMain && mainState) {
          ls.orbitAngle =
            mainState.orbitAngle +
            (asn.subIndex === 0 ? SECONDARY_ANGLE_OFFSET_1 : SECONDARY_ANGLE_OFFSET_2)
        }

        const prevRelY = (ls.y - screenCy) / Math.max(ry, 1)
        const prevIsBehind = prevRelY < -0.05
        const targetMul = prevIsBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
        const curMul = champSpeedMuls.get(c.name) ?? 1.0
        const newMul = curMul + (targetMul - curMul) * BEHIND_SPEED_LERP
        champSpeedMuls.set(c.name, newMul)

        const followsAngle = (primaryRole === 'support' && isMain && adcState) || (!isMain && mainState)

        if (!reducedMotion) {
          if (!followsAngle) {
            const keplerBoost = 1.0 + 0.55 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
            ls.orbitAngle += c.direction * orbitSpeed * keplerBoost * newMul * dt
          }
          const targetOrbit = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, screenCx, screenCy)
          ls.x += (targetOrbit.x - ls.x) * 0.15
          ls.y += (targetOrbit.y - ls.y) * 0.15
        } else {
          const orbitPos = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, screenCx, screenCy)
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

        activeChampionBehindState[c.name] = isBehind

        const isForeground = !isBehind && depth > 0.65

        const visibleFactor = Math.max(0, Math.min(1, (relY + 0.05 + 0.12) / 0.12))
        const hintOpacity = Math.max(0, 1 - visibleFactor)

        let renderX = ls.x
        let renderY = ls.y
        if (isMain && primaryRole === 'top' && roleBehaviorStore.tankInterceptActive) {
          const elapsed = Date.now() - roleBehaviorStore.tankInterceptStartMs
          const t = Math.min(1, elapsed / INTERCEPT_DURATION_MS)
          const progress = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7
          renderX += roleBehaviorStore.tankInterceptDirX * INTERCEPT_MAX_OFFSET * progress
          renderY += roleBehaviorStore.tankInterceptDirY * INTERCEPT_MAX_OFFSET * progress
        }

        newPositions.push({
          name: c.name,
          img: battleStore.getChampionImage(c.name),
          x: renderX,
          y: renderY,
          size,
          opacity,
          isAttacking: c.isAttacking,
          isBehind: isBehind && !c.isAttacking,
          isForeground,
          zIndex,
          primaryRole,
          isMain,
          hintOpacity,
          orbitRx: rx,
          orbitRy: ry,
          tiltDeg,
          orbitColor,
          synergyActive: !!synergyStore.championSynergyMap[c.name]?.length,
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
            spawnShot(pos.x, pos.y, pPos.cx, pPos.cy, true, true)
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      championRenderPositions.value = newPositions
      animFrame = requestAnimationFrame(animate)
    }

    watch(
      () => [battleStore.headerSlots, battleStore.secondarySlots],
      () => combatStore.syncChampions(battleStore.assignedChampions),
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

    function isAbilityActive(role: ChampionRole): boolean {
      switch (role) {
        case 'top':
          return roleBehaviorStore.tankShieldActive // ← geändert
        case 'support':
          return roleBehaviorStore.supportPlanetHealActive
        case 'mid':
          return roleBehaviorStore.midCurseCooldownMs === 0
        case 'jungle':
          return roleBehaviorStore.jungleBuffCooldownMs === 0
        case 'adc':
          return roleBehaviorStore.adcBurstActive
      }
    }

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2

    const currentSunRadius = computed(() => planetShopStore.currentSunRadius)

    return {
      combatStore,
      roleBehaviorStore,
      ROLE_BY_KEY,
      backChampions,
      frontChampions,
      championRenderPositions,
      shots,
      topHitActive,
      isAbilityActive,
      screenCx,
      screenCy,
      currentSunRadius,
    }
  },
})
</script>

<style scoped>
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
  border: 3px solid #c89040;
  box-shadow:
    0 0 10px rgba(232, 192, 64, 0.55),
    0 0 20px rgba(232, 192, 64, 0.2);
  will-change: transform;
  transition:
    box-shadow 0.3s ease,
    filter 0.25s ease;
}

.champion-orbit-avatar img:first-child {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  border-radius: 50%;
}

/* ── Rollen-Farben (via CSS-Variable aus ROLES[].color) ─────────────────── */
.champion-orbit-avatar--role-colored {
  border-color: var(--role-color, #c89040) !important;
  box-shadow:
    0 0 10px color-mix(in srgb, var(--role-color, #c89040) 70%, transparent),
    0 0 20px color-mix(in srgb, var(--role-color, #c89040) 30%, transparent);
}

.champion-orbit-avatar--behind {
  filter: blur(2px) brightness(0.75) saturate(0.65);
  transition: filter 0.25s ease;
}

.champion-orbit-avatar--secondary {
  border-width: 2px !important;
  box-shadow:
    0 0 6px rgba(232, 192, 64, 0.4),
    0 0 12px rgba(232, 192, 64, 0.15) !important;
}

.champion-orbit-avatar--foreground {
  filter: brightness(1.18) saturate(1.2);
}

/* ── Synergie-Glow ──────────────────────────────────────────────────────── */
.champion-orbit-avatar--synergy::before {
  content: '';
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 1.5px solid rgba(232, 192, 64, 0.7);
  animation: synergy-ring-spin 2.5s linear infinite;
  pointer-events: none;
}

.champion-orbit-avatar--synergy::after {
  content: '';
  position: absolute;
  inset: -13px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 220, 100, 0.35);
  animation: synergy-ring-spin 4s linear infinite reverse;
  pointer-events: none;
}

@keyframes synergy-ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes synergy-shimmer {
  0%, 100% {
    box-shadow:
      0 0 12px rgba(232, 192, 64, 0.6),
      0 0 28px rgba(232, 192, 64, 0.25),
      inset 0 0 8px rgba(232, 192, 64, 0.1);
  }
  50% {
    box-shadow:
      0 0 20px rgba(255, 220, 120, 0.85),
      0 0 50px rgba(232, 192, 64, 0.45),
      inset 0 0 14px rgba(232, 192, 64, 0.2);
  }
}

.champion-orbit-avatar--synergy {
  animation: synergy-shimmer 2s ease-in-out infinite;
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

/* ── Ability-Glows ────────────────────────────────────────────────────────── */
.champion-orbit-avatar--shield {
  border-width: 5px !important;
  border-color: #f54747 !important;
  box-shadow:
    0 0 18px rgba(245, 71, 71, 1),
    0 0 40px rgba(245, 71, 71, 0.7),
    0 0 70px rgba(245, 71, 71, 0.35),
    inset 0 0 14px rgba(245, 71, 71, 0.25);
  animation: shield-pulse 0.7s ease-in-out infinite alternate;
}

.champion-orbit-avatar--shield::before {
  content: '';
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  border: 2px solid rgba(245, 71, 71, 0.65);
  animation: shield-ring-spin 2.2s linear infinite;
  pointer-events: none;
}

.champion-orbit-avatar--shield::after {
  content: '';
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 140, 140, 0.35);
  animation: shield-ring-spin 3.5s linear infinite reverse;
  pointer-events: none;
}

@keyframes shield-ring-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes shield-pulse {
  from {
    border-width: 4px;
    box-shadow:
      0 0 14px rgba(245, 71, 71, 0.9),
      0 0 32px rgba(245, 71, 71, 0.55),
      0 0 58px rgba(245, 71, 71, 0.28);
  }
  to {
    border-width: 8px;
    box-shadow:
      0 0 28px rgba(255, 80, 80, 1),
      0 0 60px rgba(245, 71, 71, 0.85),
      0 0 100px rgba(245, 71, 71, 0.5),
      inset 0 0 20px rgba(245, 71, 71, 0.4);
  }
}

/* Fluch-Cast Burst */
.champion-orbit-avatar--cursing {
  animation: mid-curse-cast 0.6s ease-out forwards;
}

.champion-orbit-avatar--cursing::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid rgba(180, 60, 255, 0.85);
  animation: curse-cast-ring-expand 0.6s ease-out forwards;
  pointer-events: none;
}

.champion-orbit-avatar--cursing::after {
  content: '';
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  border: 1px solid rgba(140, 30, 240, 0.45);
  animation: curse-cast-ring-expand 0.6s ease-out forwards 0.1s;
  pointer-events: none;
}

@keyframes mid-curse-cast {
  0% {
    filter: brightness(1.2) drop-shadow(0 0 0px rgba(180, 60, 255, 0));
  }
  20% {
    filter: brightness(4) drop-shadow(0 0 24px rgba(210, 90, 255, 1));
    box-shadow:
      0 0 36px rgba(190, 70, 255, 1),
      0 0 72px rgba(150, 30, 240, 0.7);
  }
  100% {
    filter: brightness(1) drop-shadow(0 0 0px rgba(180, 60, 255, 0));
  }
}

@keyframes curse-cast-ring-expand {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(2.8);
  }
}

/* ── Mid Ability Ready (curse charged — sustained glow) ─────────────────── */
.champion-orbit-avatar--ability-mid {
  border-width: 5px !important;
  border-color: #5598f6 !important;
  box-shadow:
    0 0 18px rgba(85, 152, 246, 1),
    0 0 42px rgba(85, 152, 246, 0.7),
    0 0 80px rgba(85, 152, 246, 0.35),
    inset 0 0 14px rgba(85, 152, 246, 0.25);
  animation: mid-ability-pulse 1.2s ease-in-out infinite alternate;
}

.champion-orbit-avatar--ability-mid::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid rgba(85, 152, 246, 0.65);
  animation: mid-ring-spin 2.8s linear infinite;
  pointer-events: none;
}

.champion-orbit-avatar--ability-mid::after {
  content: '';
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  border: 1px dashed rgba(120, 180, 255, 0.35);
  animation: mid-ring-spin 4.5s linear infinite reverse;
  pointer-events: none;
}

@keyframes mid-ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes mid-ability-pulse {
  from {
    border-width: 4px;
    box-shadow:
      0 0 14px rgba(85, 152, 246, 0.9),
      0 0 32px rgba(85, 152, 246, 0.55),
      0 0 60px rgba(85, 152, 246, 0.28);
  }
  to {
    border-width: 8px;
    box-shadow:
      0 0 28px rgba(110, 170, 255, 1),
      0 0 60px rgba(85, 152, 246, 0.85),
      0 0 100px rgba(85, 152, 246, 0.5),
      inset 0 0 20px rgba(85, 152, 246, 0.4);
  }
}

/* Heal-Farbe: Teal-Mint (#00e5a0) */
.champion-orbit-avatar--healing {
  animation: support-heal-burst 0.9s ease-out forwards;
}

.champion-orbit-avatar--healing::before {
  content: '';
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(0, 229, 160, 0.75) 0%,
    rgba(0, 229, 160, 0.3) 40%,
    transparent 70%
  );
  pointer-events: none;
  animation: support-heal-aura 0.9s ease-out forwards;
}

@keyframes support-heal-burst {
  0% {
    filter: brightness(1) drop-shadow(0 0 0px rgba(0, 229, 160, 0));
  }
  20% {
    filter: brightness(1.9) drop-shadow(0 0 14px rgba(0, 229, 160, 1));
  }
  65% {
    filter: brightness(1.3) drop-shadow(0 0 8px rgba(0, 229, 160, 0.6));
  }
  100% {
    filter: brightness(1) drop-shadow(0 0 0px rgba(0, 229, 160, 0));
  }
}

@keyframes support-heal-aura {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  25% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}

/* ── Jungle Ability Active (buff ready — sustained glow) ─────────────────── */
.champion-orbit-avatar--ability-jungle {
  border-width: 5px !important;
  border-color: #3eea58 !important;
  box-shadow:
    0 0 18px rgba(62, 234, 88, 1),
    0 0 42px rgba(62, 234, 88, 0.7),
    0 0 80px rgba(62, 234, 88, 0.35),
    inset 0 0 14px rgba(62, 234, 88, 0.25);
  animation: jungle-ability-pulse 1.2s ease-in-out infinite alternate;
}

.champion-orbit-avatar--ability-jungle::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid rgba(62, 234, 88, 0.6);
  animation: jungle-ring-spin 2.8s linear infinite;
  pointer-events: none;
}

.champion-orbit-avatar--ability-jungle::after {
  content: '';
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  border: 1px dashed rgba(92, 230, 106, 0.35);
  animation: jungle-ring-spin 4.5s linear infinite reverse;
  pointer-events: none;
}

@keyframes jungle-ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes jungle-ability-pulse {
  from {
    border-width: 4px;
    box-shadow:
      0 0 14px rgba(62, 234, 88, 0.9),
      0 0 32px rgba(62, 234, 88, 0.55),
      0 0 60px rgba(62, 234, 88, 0.28);
  }
  to {
    border-width: 8px;
    box-shadow:
      0 0 28px rgba(92, 230, 106, 1),
      0 0 60px rgba(62, 234, 88, 0.85),
      0 0 100px rgba(62, 234, 88, 0.5),
      inset 0 0 20px rgba(62, 234, 88, 0.4);
  }
}

/* ── ADC Burst Active (short-lived snap flash) ────────────────────────────── */
.champion-orbit-avatar--ability-adc {
  border-width: 5px !important;
  border-color: #f7a145 !important;
  box-shadow:
    0 0 20px rgba(247, 161, 69, 1),
    0 0 50px rgba(247, 161, 69, 0.75),
    0 0 90px rgba(247, 161, 69, 0.4),
    inset 0 0 16px rgba(247, 161, 69, 0.3);
  animation: adc-burst-flare 0.35s ease-out forwards;
}

.champion-orbit-avatar--ability-adc::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid rgba(247, 161, 69, 0.8);
  animation: adc-ring-expand 0.35s ease-out forwards;
  pointer-events: none;
}

.champion-orbit-avatar--ability-adc::after {
  content: '';
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  border: 1px solid rgba(255, 200, 100, 0.4);
  animation: adc-ring-expand 0.35s ease-out forwards 0.05s;
  pointer-events: none;
}

@keyframes adc-burst-flare {
  0%  {
    filter: brightness(2.5) saturate(1.5) drop-shadow(0 0 20px rgba(255, 160, 60, 1));
  }
  40% {
    filter: brightness(1.6) saturate(1.25) drop-shadow(0 0 10px rgba(247, 161, 69, 0.7));
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}

@keyframes adc-ring-expand {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(2.5); }
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

.champion-dmg-float--shield {
  font-size: 1.6rem;
  color: #80ccff;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.6);
  text-shadow:
    0 0 14px rgba(80, 180, 255, 0.95),
    0 0 28px rgba(60, 140, 255, 0.6);
}

.champion-dmg-float--orb {
  font-size: 1.2rem;
  color: #40d8ff;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.8);
  text-shadow:
    0 0 12px rgba(80, 200, 255, 1),
    0 0 24px rgba(60, 160, 255, 0.6);
}

.champion-dmg-float--curse {
  font-size: 1.05rem;
  color: #c060ff;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.8);
  text-shadow:
    0 0 10px rgba(180, 50, 255, 0.95),
    0 0 22px rgba(140, 20, 240, 0.55);
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

/* ── Top-Lane Intercept-Effekt ────────────────────────────────────────────── */
.champion-orbit-avatar--intercept {
  animation: top-intercept-flash 0.5s ease-out forwards;
}

@keyframes top-intercept-flash {
  0% {
    filter: brightness(2.8) saturate(2) drop-shadow(0 0 18px rgba(80, 180, 255, 1));
  }
  45% {
    filter: brightness(1.6) saturate(1.4) drop-shadow(0 0 8px rgba(80, 180, 255, 0.5));
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .champion-orbit-avatar--attacking,
  .champion-orbit-avatar--top-hit,
  .champion-orbit-avatar--intercept,
  .champion-orbit-avatar--ability-jungle,
  .champion-orbit-avatar--ability-mid,
  .champion-orbit-avatar--ability-adc {
    animation: none;
  }
  .champion-orbit-avatar--ability-jungle::before,
  .champion-orbit-avatar--ability-jungle::after,
  .champion-orbit-avatar--ability-mid::before,
  .champion-orbit-avatar--ability-mid::after,
  .champion-orbit-avatar--ability-adc::before,
  .champion-orbit-avatar--ability-adc::after {
    animation: none;
  }
}

/* ── Ability-Icon ──────────────────────────────────────────────────────────── */
.champion-ability-icon {
  position: absolute;
  bottom: -8px;
  right: -8px;
  width: 36px;
  height: 36px;
  object-fit: contain;
  display: block;
  pointer-events: none;
  z-index: 4;
  border-radius: 50%;
  border: 4px solid color-mix(in srgb, var(--role-color, #c89040) 70%, transparent);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--role-color, #c89040) 80%, transparent));
}

.ability-icon-enter-active,
.ability-icon-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.ability-icon-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.ability-icon-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
