<!-- frontend/src/components/idle/sun/ChampionOrbit.vue -->
<template>
  <!-- Projektile: teleportiert sich selbst nach body -->
  <AttackProjectileLayer :shots="shots" />

  <!-- ① Back-Layer: Champions HINTER der Sonne -->
  <div
    class="champion-orbit-layer champion-orbit-back"
    aria-hidden="true"
    :style="{ '--hover-dim-opacity': HOVER_DIM_OPACITY }"
  >
    <div
      v-for="pos in backChampions"
      :key="pos.name"
      class="champion-orbit-avatar champion-orbit-avatar--behind"
      :class="{
        'champion-orbit-avatar--role-colored': !!pos.primaryRole,
        'champion-orbit-avatar--role-hover': hoveredChampionRole !== null,
        'champion-orbit-avatar--role-hover-primary': pos.primaryRole === hoveredChampionRole && pos.isMain,
        'champion-orbit-avatar--dim': isChampionDimmed(pos),
      }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        '--role-color': pos.primaryRole ? ROLE_BY_KEY[pos.primaryRole]?.color : undefined,
        '--hover-role-color': hoverColor || undefined,
      }"
    >
      <img
        :src="pos.img"
        :alt="pos.name"
        class="champion-orbit-portrait"
        :class="{ 'champion-orbit-portrait--dimmed': isChampionDimmed(pos) }"
      />
    </div>
  </div>

  <!-- ② Front-Layer: Champions VOR der Sonne -->
  <div
    class="champion-orbit-layer champion-orbit-front"
    aria-hidden="true"
    :style="{ '--hover-dim-opacity': HOVER_DIM_OPACITY }"
  >
    <div
      v-for="pos in frontChampions"
      :key="pos.name"
      class="champion-orbit-avatar"
      :class="{
        'champion-orbit-avatar--attacking': pos.isAttacking,
        'champion-orbit-avatar--foreground': pos.isForeground,
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
        'champion-orbit-avatar--role-hover': hoveredChampionRole !== null,
        'champion-orbit-avatar--role-hover-primary': pos.primaryRole === hoveredChampionRole && pos.isMain,
        'champion-orbit-avatar--dim': isChampionDimmed(pos),
        'champion-orbit-avatar--hit': pos.isHit,
        'champion-orbit-avatar--down': pos.isDown,
      }"
      :style="{
        width: pos.size + 'px',
        height: pos.size + 'px',
        transform: `translate(${pos.x - pos.size / 2}px, ${pos.y - pos.size / 2}px)`,
        opacity: pos.opacity,
        zIndex: pos.zIndex,
        '--role-color': pos.primaryRole ? ROLE_BY_KEY[pos.primaryRole]?.color : undefined,
        '--hover-role-color': hoverColor || undefined,
      }"
    >
      <img
        :src="pos.img"
        :alt="pos.name"
        class="champion-orbit-portrait"
        :class="{ 'champion-orbit-portrait--dimmed': isChampionDimmed(pos) }"
      />
      <Transition name="ability-icon">
        <span
          v-if="pos.isMain && pos.primaryRole && isAbilityActive(pos.primaryRole)"
          class="champion-ability-badge"
          :aria-label="pos.primaryRole + ' ability'"
        >
          <img :src="ROLE_BY_KEY[pos.primaryRole].image" :alt="pos.primaryRole" />
        </span>
      </Transition>
    </div>

    <!-- Champion HP Bars — nur Mains mit HP-Pool, Stil wie Planeten-Bars -->
    <template v-for="pos in frontChampions" :key="'chp-' + pos.name">
      <div
        v-if="pos.isMain && pos.maxHp > 0"
        class="champ-hp-wrap"
        :class="{ 'champ-hp-wrap--dimmed': isChampionDimmed(pos) }"
        :style="{
          transform: `translate(${pos.x - Math.max(pos.size, 52) / 2}px, ${pos.y + pos.size / 2 + 6}px)`,
          width: Math.max(pos.size, 52) + 'px',
          zIndex: pos.zIndex,
          '--role-color': pos.primaryRole ? ROLE_BY_KEY[pos.primaryRole]?.color : undefined,
        }"
      >
        <div class="champ-hp-bar-track" :class="{ 'champ-hp-bar-track--low': pos.hpPercent < 25 }">
          <div class="champ-hp-ghost" :style="{ width: pos.hpPercent + '%' }" />
          <div
            class="champ-hp-bar-fill"
            :class="{ 'champ-hp-bar-fill--low': pos.hpPercent < 25 }"
            :style="{ width: pos.hpPercent + '%' }"
          />
          <div class="champ-hp-ticks" />
          <div class="champ-hp-bar-shine" />
        </div>
        <span v-if="pos.isDown" class="champ-hp-text champ-hp-text--down">
          DOWN {{ pos.downSecs }}s
        </span>
        <span v-else class="champ-hp-text">{{ pos.currentHp }} / {{ pos.maxHp }}</span>
      </div>
    </template>

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
import { useUiStore } from '../../../stores/uiStore'
import { ROLE_HOVER_COLORS } from '@/config/constants'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import {
  ORBIT_TIERS,
  SUPPORT_ANGLE_OFFSET,
  ROLES,
  ROLE_BY_KEY,
  BEHIND_SUN_SPEED_MULTIPLIER,
  HOVER_DIM_OPACITY,
  CHAMPION_HIT_FLASH_MS,
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
  hpPercent: number
  currentHp: number
  maxHp: number
  isDown: boolean
  downSecs: number
  isHit: boolean
}

interface Assignment {
  role: ChampionRole | null
  isMain: boolean
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
    const uiStore = useUiStore()

    const hoveredChampionRole = computed(() => uiStore.hoveredChampionRole)
    const hoveredPlanetSlotId = computed(() => uiStore.hoveredPlanetSlotId)
    const hoverColor = computed(() =>
      hoveredChampionRole.value ? (ROLE_HOVER_COLORS[hoveredChampionRole.value] ?? null) : null,
    )

    // Dim a champion when focusing a planet (all champions recede) or a champion
    // of a different role (same-role champions stay full).
    function isChampionDimmed(pos: ChampionRenderPos): boolean {
      if (hoveredPlanetSlotId.value !== null) return true
      return hoveredChampionRole.value !== null && pos.primaryRole !== hoveredChampionRole.value
    }

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
      if (mainIdx >= 0) return { role: ROLES[mainIdx]?.key ?? null, isMain: true, roleIndex: mainIdx }
      return { role: null, isMain: false, roleIndex: -1 }
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

      const sunScale = planetShopStore.orbitSunScale
      const orbitScaleVal = orbitScale.value

      for (let ci = 0; ci < champions.length; ci++) {
        const c = champions[ci]
        const asn = getAssignment(c.name)
        const primaryRole: ChampionRole | null = asn.role
        const isMain = asn.isMain

        const roleTier = primaryRole ? ROLE_BY_KEY[primaryRole].orbit : null
        const planetTier = ORBIT_TIERS.planet[ci % 2]
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
          planetShopStore.orbitSunRadius * minRyFactor,
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
        const baseSize = (roleTier ? roleTier.championSize : planetTier.size) * Math.pow(sunScale, 0.65)
        const orbitSpeed = roleTier ? roleTier.speed : c.baseSpeed

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

        if (primaryRole === 'support' && isMain && adcState) {
          ls.orbitAngle = adcState.orbitAngle - adcDir * SUPPORT_ANGLE_OFFSET
        }

        const prevRelY = (ls.y - screenCy) / Math.max(ry, 1)
        const prevIsBehind = prevRelY < -0.05
        const targetMul = prevIsBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
        const curMul = champSpeedMuls.get(c.name) ?? 1.0
        const newMul = curMul + (targetMul - curMul) * BEHIND_SPEED_LERP
        champSpeedMuls.set(c.name, newMul)

        const followsAngle = primaryRole === 'support' && isMain && adcState

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

        // ── Champion-HP (nur Mains haben einen HP-Pool) ────────────────────
        const hpPool = isMain && primaryRole ? roleBehaviorStore.championHp[primaryRole] : null
        const nowMs = Date.now()
        const downUntil =
          isMain && primaryRole ? roleBehaviorStore.championDownUntil[primaryRole] : 0
        const isDown = downUntil > nowMs
        const hitAt = isMain && primaryRole ? roleBehaviorStore.championHitAt[primaryRole] : 0

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
          hpPercent: hpPool && hpPool.max > 0 ? (hpPool.current / hpPool.max) * 100 : 100,
          currentHp: Math.round(hpPool?.current ?? 0),
          maxHp: hpPool?.max ?? 0,
          isDown,
          downSecs: isDown ? Math.ceil((downUntil - nowMs) / 1000) : 0,
          isHit: !isDown && nowMs - hitAt < CHAMPION_HIT_FLASH_MS,
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

    // Only mains fly the orbit — allies contribute passively via combatStore's ally multiplier
    watch(
      () => battleStore.headerSlots,
      () =>
        combatStore.syncChampions(
          battleStore.headerSlots.filter((s): s is string => s !== null),
        ),
      { immediate: true, deep: true },
    )

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
      hoveredChampionRole,
      hoverColor,
      isChampionDimmed,
      HOVER_DIM_OPACITY,
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
    border-color 0.3s ease,
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

/* ── Hover-Focus dim (Command-Panel-Hover) ─────────────────────────────────
   Opacity sitzt auf dem Portrait-<img>, nicht am äußeren Avatar, dessen
   Tiefen-Opacity pro Frame per JS gesetzt wird. So multiplizieren sich beide
   Werte und die Dimm-Transition läuft weich (Klasse toggelt nur als Boolean). */
.champion-orbit-portrait {
  transition: opacity 150ms ease, filter 150ms ease;
}

.champion-orbit-portrait--dimmed {
  opacity: var(--hover-dim-opacity, 0.08);
  filter: grayscale(1) brightness(0.65) blur(1.5px);
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

.champion-orbit-avatar--foreground {
  filter: brightness(1.18) saturate(1.2);
}

/* ── Synergie-Glow ──────────────────────────────────────────────────────── */
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

/* ── Boss-Treffer am Champion: roter Flash + Ruckeln ─────────────────────── */
.champion-orbit-avatar--hit {
  animation: champ-boss-hit 0.45s ease-out;
}

@keyframes champ-boss-hit {
  0% {
    filter: brightness(2.2) saturate(0.4) sepia(0.5) hue-rotate(-30deg);
    box-shadow:
      0 0 18px rgba(255, 60, 40, 1),
      0 0 40px rgba(220, 30, 20, 0.6);
  }
  30% {
    translate: -3px 1px;
  }
  55% {
    translate: 3px -1px;
    filter: brightness(1.4) saturate(0.8);
  }
  100% {
    translate: 0 0;
    filter: brightness(1) saturate(1);
  }
}

/* ── Champion am Boden — ausgegraut bis zum Revive ───────────────────────── */
.champion-orbit-avatar--down {
  filter: grayscale(1) brightness(0.55) !important;
  border-color: #5a2020 !important;
  box-shadow: 0 0 10px rgba(120, 20, 20, 0.5) !important;
  animation: none !important;
}

/* ── Champion HP Bars — RPG-Stil wie Planeten-Bars ───────────────────────── */
.champ-hp-wrap {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: opacity 150ms ease;
}

.champ-hp-wrap--dimmed {
  opacity: var(--hover-dim-opacity, 0.08);
}

/* Energie-Leiste in Rollenfarbe — bewusst anders als die grünen Planeten-
   Bars: segmentiert, mit Ghost-Trail und Rollenfarben-Glow. Rot nur kritisch. */
.champ-hp-bar-track {
  position: relative;
  width: 100%;
  height: 7px;
  background: rgba(6, 3, 0, 0.85);
  border: 1px solid color-mix(in srgb, var(--role-color, #c89040) 50%, #0a0806);
  border-radius: 4px;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.85),
    0 0 8px color-mix(in srgb, var(--role-color, #c89040) 22%, transparent);
  overflow: hidden;
}

.champ-hp-bar-track--low {
  border-color: #8a2018;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.85),
    0 0 10px rgba(220, 30, 30, 0.35);
}

/* Ghost-Trail: heller Balken zieht dem HP-Stand verzögert hinterher */
.champ-hp-ghost {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(255, 235, 200, 0.32);
  transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.champ-hp-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--role-color, #c89040) 80%, #fff) 0%,
    var(--role-color, #c89040) 45%,
    color-mix(in srgb, var(--role-color, #c89040) 55%, #000) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 0 7px color-mix(in srgb, var(--role-color, #c89040) 60%, transparent);
  transition: width 0.25s linear;
}

.champ-hp-bar-fill--low {
  background: linear-gradient(to bottom, #ff5f5f 0%, #cc1e1e 45%, #8a0d0d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 140, 140, 0.45),
    0 0 8px rgba(220, 30, 30, 0.7);
  animation: champ-hp-pulse 1.1s ease-in-out infinite;
}

/* Segment-Ticks alle 25 % — liest sich als Energie-Zellen */
.champ-hp-ticks {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(25% - 1px),
    rgba(0, 0, 0, 0.55) calc(25% - 1px),
    rgba(0, 0, 0, 0.55) 25%
  );
  pointer-events: none;
}

.champ-hp-bar-shine {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

@keyframes champ-hp-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.champ-hp-text {
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--role-color, #c89040) 55%, #f0e6cc);
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-shadow:
    0 0 3px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent),
    0 1px 2px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

.champ-hp-text--down {
  color: #ff6050;
  text-shadow:
    0 0 4px rgba(255, 60, 40, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.95);
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

/* ── Role-Hover Lift Effect (Command Panel slot hover) ──────────────────── */
/* `translate` (CSS Transforms Level 2) composes independently with the
   JS-set inline `transform: translate(X, Y)` — no conflict. */
.champion-orbit-avatar--role-hover {
  translate: 0 -5px;
  filter: drop-shadow(0 6px 12px color-mix(in srgb, var(--hover-role-color, #c89040) 55%, transparent));
  transition:
    translate 0.35s ease,
    filter 0.35s ease,
    box-shadow 0.3s ease;
}

.champion-orbit-avatar--role-hover-primary {
  translate: 0 -10px;
  filter:
    brightness(1.2)
    drop-shadow(0 8px 20px color-mix(in srgb, var(--hover-role-color, #c89040) 85%, transparent));
}

@media (prefers-reduced-motion: reduce) {
  .champion-orbit-avatar--attacking,
  .champion-orbit-avatar--hit,
  .champ-hp-bar-fill--low,
  .champion-orbit-avatar--top-hit,
  .champion-orbit-avatar--intercept,
  .champion-orbit-avatar--ability-jungle,
  .champion-orbit-avatar--ability-mid,
  .champion-orbit-avatar--ability-adc {
    animation: none;
  }
  .champion-orbit-avatar--ability-adc::before,
  .champion-orbit-avatar--ability-adc::after,
  .champion-ability-badge {
    animation: none;
  }
  .champion-orbit-avatar--role-hover,
  .champion-orbit-avatar--role-hover-primary {
    translate: none;
    filter: none;
  }
}

/* ── Ability-Badge ─────────────────────────────────────────────────────────
   Status-Badge im Messenger-Stil: dunkler Chip mit Rollenfarben-Ring, sitzt
   unten rechts außerhalb des Avatars. Feste px-Größe und -Offsets: Prozent-
   werte würden mit der per-Frame wechselnden Avatar-Größe (Parallax) mit-
   wandern und das Badge sichtbar wackeln lassen. */
.champion-ability-badge {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(36, 44, 62, 0.96), rgba(8, 11, 20, 0.96));
  box-shadow:
    0 0 8px color-mix(in srgb, var(--role-color, #c89040) 70%, transparent),
    0 0 18px color-mix(in srgb, var(--role-color, #c89040) 30%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 4;
  transition: opacity 150ms ease;
  animation: ability-badge-pulse 1.6s ease-in-out infinite;
}

.champion-ability-badge img {
  width: 70%;
  height: 70%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--role-color, #c89040) 80%, transparent));
}

@keyframes ability-badge-pulse {
  0%, 100% {
    box-shadow:
      0 0 8px color-mix(in srgb, var(--role-color, #c89040) 70%, transparent),
      0 0 18px color-mix(in srgb, var(--role-color, #c89040) 30%, transparent),
      0 2px 6px rgba(0, 0, 0, 0.55);
  }
  50% {
    box-shadow:
      0 0 12px color-mix(in srgb, var(--role-color, #c89040) 95%, transparent),
      0 0 26px color-mix(in srgb, var(--role-color, #c89040) 50%, transparent),
      0 2px 6px rgba(0, 0, 0, 0.55);
  }
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

/* ── Hover-Fokus: gedimmte Champions komplett verstecken ──────────────────
   MUSS die letzte Avatar-Regel im Stylesheet sein: --role-colored und die
   Ability-Klassen setzen border-color ebenfalls mit !important — bei
   gleicher Spezifität gewinnt sonst deren spätere Position. Die doppelte
   Klasse erhöht zusätzlich die Spezifität. */
.champion-orbit-avatar--dim.champion-orbit-avatar--dim {
  border-color: transparent !important;
  box-shadow: none !important;
  animation: none !important;
  filter: none !important;
}

.champion-orbit-avatar--dim .champion-ability-badge {
  opacity: 0;
  animation: none;
}

/* Burst-Ringe (Curse, ADC, Heal) auf gedimmten Avataren unterdrücken */
.champion-orbit-avatar--dim::before,
.champion-orbit-avatar--dim::after {
  content: none !important;
}
</style>
