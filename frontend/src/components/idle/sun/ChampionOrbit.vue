<template>
  <!-- Champion Orbit-Arc Layer (über Sonne, z-index 6) -->
  <Teleport to="body">
    <svg
      class="champion-orbit-arcs"
      :viewBox="`0 0 ${screenW} ${screenH}`"
      aria-hidden="true"
    >
      <defs>
        <filter id="orbit-blur-champ-arc" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <ellipse
        v-for="pos in championRenderPositions"
        :key="'arc-champ-' + pos.name"
        :cx="screenCx"
        :cy="screenCy"
        :rx="pos.orbitRx"
        :ry="pos.orbitRy"
        :transform="`rotate(${pos.tiltDeg}, ${screenCx}, ${screenCy})`"
        stroke="#40a0ff"
        :stroke-opacity="pos.hintOpacity * 0.65"
        filter="url(#orbit-blur-champ-arc)"
        fill="none"
        stroke-width="4"
      />
    </svg>
  </Teleport>

  <!-- ① Back-Layer: Champions HINTER der Sonne (z-index 4, unter der Sonne) -->
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

  <!-- ② Front-Layer: Champions VOR der Sonne + UI (z-index 6, über der Sonne) -->
  <div class="champion-orbit-layer champion-orbit-front" aria-hidden="true">
    <div
      v-for="pos in frontChampions"
      :key="pos.name"
      class="champion-orbit-avatar"
      :class="{
        'champion-orbit-avatar--attacking': pos.isAttacking,
        'champion-orbit-avatar--foreground': pos.isForeground,
        [`champion-orbit-avatar--role-${pos.primaryRole}`]: !!pos.primaryRole,
        'champion-orbit-avatar--shield': pos.primaryRole === 'top' && roleBehaviorStore.tankShieldActive,
        'champion-orbit-avatar--dot': pos.primaryRole === 'mid' && roleBehaviorStore.dotRemainingMs > 0,
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
      <span v-if="pos.primaryRole" class="champion-role-badge" :class="`champion-role-badge--${pos.primaryRole}`">
        {{ roleIcons[pos.primaryRole] }}
      </span>
      <!-- Jungler stack indicator -->
      <span
        v-if="pos.primaryRole === 'jungle' && roleBehaviorStore.junglerStackCount > 0"
        class="champion-jungler-stacks"
      >{{ roleBehaviorStore.junglerStackCount }}</span>
    </div>

    <!-- Floating damage numbers + projectiles -->
    <Teleport to="body">
      <div class="champion-dmg-overlay" aria-hidden="true">
        <!-- Attack projectiles -->
        <div
          v-for="proj in projectiles"
          :key="proj.id"
          class="champion-projectile"
          :style="{ left: proj.renderX + 'px', top: proj.renderY + 'px', opacity: proj.renderOpacity }"
        />
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
import { AVATAR_SIZE_LARGE, AVATAR_SIZE_SMALL, ORBIT_RADIUS_SCALE } from '@/config/constants'
import type { ChampionRole } from '../../../types'

const BEHIND_SUN_SPEED_MULTIPLIER = 1.5
const BEHIND_SPEED_LERP = 0.04

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
}

interface LocalChampState {
  name: string
  x: number
  y: number
  orbitAngle: number
  initialised: boolean
}

interface Projectile {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  startedAt: number
  duration: number
  renderX: number
  renderY: number
  renderOpacity: number
  done: boolean
}

export default defineComponent({
  name: 'ChampionOrbit',
  setup() {
    const combatStore = useCombatStore()
    const battleStore = useBattleStore()
    const bossStore = usePlanetBossStore()
    const roleBehaviorStore = useRoleBehaviorStore()

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
    const championRenderPositions = ref<ChampionRenderPos[]>([])

    const projectiles = ref<Projectile[]>([])
    const _projId = { v: 0 }
    const lastFiredAt = new Map<string, number>()
    const MAX_PROJECTILES = 4
    const PROJECTILE_COOLDOWN_MS = 700
    const PROJECTILE_DURATION_MS = 420

    // Trennung in zwei Listen für die zwei Render-Layer
    const backChampions = computed(() => championRenderPositions.value.filter((p) => p.isBehind))
    const frontChampions = computed(() => championRenderPositions.value.filter((p) => !p.isBehind))

    function getAvatarSize(count: number): number {
      return count <= 4 ? AVATAR_SIZE_LARGE : AVATAR_SIZE_SMALL
    }

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
      const baseSize = getAvatarSize(champions.length)
      const newPositions: ChampionRenderPos[] = []

      for (const c of champions) {
        let ls = localStates.get(c.name)
        if (!ls) {
          const orbitPos = getOrbitPos(
            c.angle,
            c.orbitRadiusX * ORBIT_RADIUS_SCALE,
            c.orbitRadiusY * ORBIT_RADIUS_SCALE,
            c.tiltRad,
            screenCx,
            screenCy,
          )
          ls = {
            name: c.name,
            x: orbitPos.x,
            y: orbitPos.y,
            orbitAngle: c.angle,
            initialised: false,
          }
          localStates.set(c.name, ls)
        }

        // Speed-Multiplikator hinter der Sonne (aus letztem Frame)
        const prevRelY = (ls.y - screenCy) / Math.max(c.orbitRadiusY * ORBIT_RADIUS_SCALE, 1)
        const prevIsBehind = prevRelY < -0.05
        const targetMul = prevIsBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
        const curMul = champSpeedMuls.get(c.name) ?? 1.0
        const newMul = curMul + (targetMul - curMul) * BEHIND_SPEED_LERP
        champSpeedMuls.set(c.name, newMul)

        if (!reducedMotion) {
          const keplerBoost = 1.0 + 0.55 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
          ls.orbitAngle += c.direction * c.baseSpeed * keplerBoost * newMul * dt
          const targetOrbit = getOrbitPos(
            ls.orbitAngle,
            c.orbitRadiusX * ORBIT_RADIUS_SCALE,
            c.orbitRadiusY * ORBIT_RADIUS_SCALE,
            c.tiltRad,
            screenCx,
            screenCy,
          )
          ls.x += (targetOrbit.x - ls.x) * 0.15
          ls.y += (targetOrbit.y - ls.y) * 0.15
        } else {
          const orbitPos = getOrbitPos(
            c.angle,
            c.orbitRadiusX * ORBIT_RADIUS_SCALE,
            c.orbitRadiusY * ORBIT_RADIUS_SCALE,
            c.tiltRad,
            screenCx,
            screenCy,
          )
          ls.x = orbitPos.x
          ls.y = orbitPos.y
        }

        combatStore.setChampionScreenPos(c.name, ls.x, ls.y)

        // relY: -1 = Orbit-Top (hinter Sonne), +1 = Orbit-Bottom (vor Sonne)
        const relY = (ls.y - screenCy) / Math.max(c.orbitRadiusY * ORBIT_RADIUS_SCALE, 1)
        const isBehind = relY < -0.05
        const depth = (relY + 1) / 2 // 0 = ganz hinten, 1 = ganz vorne

        // Parallax-Größe: 0.72× (hinten) → 1.0× (Äquator) → 1.28× (vorne)
        const parallaxScale = 0.72 + depth * 0.56
        const size = c.isAttacking ? baseSize : Math.round(baseSize * parallaxScale)

        // Opazität: klarer Kontrast hinten (0.12–0.27) vs. vorne (0.80–1.0)
        const opacity = c.isAttacking ? 1 : isBehind ? 0.12 + depth * 0.3 : 0.8 + depth * 0.2

        // z-index nur innerhalb des jeweiligen Layers (für Überlappung mehrerer Champions)
        const zIndex = c.isAttacking ? 20 : Math.floor(8 + depth * 7)

        // CSS-Foreground-Glow: unteres Drittel der Umlaufbahn
        const isForeground = !isBehind && !c.isAttacking && depth > 0.65

        // Orbit-Arc Opacity (hoch wenn hinter Sonne)
        const visibleFactor = Math.max(0, Math.min(1, (relY + 0.05 + 0.12) / 0.12))
        const hintOpacity = Math.max(0, 1 - visibleFactor)

        const slotIndex = battleStore.headerSlots.indexOf(c.name)
        const primaryRole: ChampionRole | null = slotIndex >= 0 ? SLOT_ROLES[slotIndex] : null

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
          orbitRx: c.orbitRadiusX * ORBIT_RADIUS_SCALE,
          orbitRy: c.orbitRadiusY * ORBIT_RADIUS_SCALE,
          tiltDeg: c.tiltDeg,
        })
      }

      for (const key of localStates.keys()) {
        if (!champions.some((c) => c.name === key)) {
          localStates.delete(key)
          champSpeedMuls.delete(key)
        }
      }

      // ── Projectile update ─────────────────────────────────────────────────────
      // Read planet position directly from Map (not computed) so we get the
      // current frame position, not the stale one from when activeBoss changed.
      const activeBoss = bossStore.activeBoss
      const pPos = activeBoss ? (activePlanetPositions.get(activeBoss.planetId) ?? null) : null

      // Build new projectile render positions (plain array → swap whole ref at end)
      const nextProjectiles: Projectile[] = []
      for (const p of projectiles.value) {
        const t = Math.min((ts - p.startedAt) / p.duration, 1)
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        const x = p.fromX + (p.toX - p.fromX) * ease
        const y = p.fromY + (p.toY - p.fromY) * ease
        const dx = p.toX - p.fromX
        const dy = p.toY - p.fromY
        const arc = Math.sin(t * Math.PI) * 18
        const len = Math.hypot(dx, dy) || 1
        const renderX = x + (dy / len) * arc
        const renderY = y - (dx / len) * arc
        const renderOpacity = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1
        if (t < 1) {
          nextProjectiles.push({ ...p, renderX, renderY, renderOpacity, done: false })
        }
      }

      // Spawn new projectiles for attacking champions
      if (pPos) {
        let spawnedCount = nextProjectiles.length
        for (const pos of newPositions) {
          if (!pos.isAttacking) continue
          if (spawnedCount >= MAX_PROJECTILES) break
          const last = lastFiredAt.get(pos.name) ?? 0
          if (ts - last < PROJECTILE_COOLDOWN_MS) continue
          lastFiredAt.set(pos.name, ts)
          nextProjectiles.push({
            id: ++_projId.v,
            fromX: pos.x,
            fromY: pos.y,
            toX: pPos.cx,
            toY: pPos.cy,
            startedAt: ts,
            duration: PROJECTILE_DURATION_MS,
            renderX: pos.x,
            renderY: pos.y,
            renderOpacity: 1,
            done: false,
          })
          spawnedCount++
        }
      }

      // Swap the whole array once → single Vue reactive trigger per frame
      projectiles.value = nextProjectiles
      // ──────────────────────────────────────────────────────────────────────────

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
        animFrame = requestAnimationFrame(animate)
      }
    })

    onMounted(() => {
      animFrame = requestAnimationFrame(animate)
    })
    onUnmounted(() => {
      cancelAnimationFrame(animFrame)
    })

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2
    const screenW = window.innerWidth
    const screenH = window.innerHeight

    return {
      combatStore,
      roleBehaviorStore,
      roleIcons,
      backChampions,
      frontChampions,
      championRenderPositions,
      projectiles,
      screenCx,
      screenCy,
      screenW,
      screenH,
    }
  },
})
</script>

<style scoped>
/* ── Orbit-Arc SVG ────────────────────────────────────────────────────────── */
.champion-orbit-arcs {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 6;
  pointer-events: none;
  overflow: visible;
}

/* ── Layer-Container ──────────────────────────────────────────────────────── */
.champion-orbit-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/*
 * Sonne hat z-index: 5 (SunComponent.vue → .sun-container)
 * back  = 4  → unter der Sonne
 * front = 6  → über der Sonne
 */
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
    filter 0.3s ease;
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
/* border-color !important → nie überschreibbar; box-shadow ohne → Animationen können überschreiben */
.champion-orbit-avatar--role-top {
  border-color: #e05050 !important;
  box-shadow: 0 0 10px rgba(220, 60, 60, 0.7), 0 0 20px rgba(220, 60, 60, 0.3);
}
.champion-orbit-avatar--role-jungle {
  border-color: #50c060 !important;
  box-shadow: 0 0 10px rgba(60, 200, 80, 0.7), 0 0 20px rgba(60, 200, 80, 0.3);
}
.champion-orbit-avatar--role-mid {
  border-color: #5090e8 !important;
  box-shadow: 0 0 10px rgba(60, 130, 240, 0.7), 0 0 20px rgba(60, 130, 240, 0.3);
}
.champion-orbit-avatar--role-adc {
  border-color: #e89840 !important;
  box-shadow: 0 0 10px rgba(240, 150, 40, 0.7), 0 0 20px rgba(240, 150, 40, 0.3);
}
.champion-orbit-avatar--role-support {
  border-color: #b8c8d8 !important;
  box-shadow: 0 0 10px rgba(180, 200, 210, 0.7), 0 0 20px rgba(180, 200, 210, 0.3);
}

/* Hinter der Sonne: gedimmt, entsättigt – Rollenfarbe bleibt via !important erhalten */
.champion-orbit-avatar--behind {
  filter: brightness(0.42) saturate(0.45);
}

/* Klar vor der Sonne: Helligkeit erhöhen, Rollenfarbe bleibt erhalten */
.champion-orbit-avatar--foreground {
  filter: brightness(1.18) saturate(1.2);
}

/* Angriff: Rollenfarbe bleibt, nur Helligkeit pulsiert */
.champion-orbit-avatar--attacking {
  animation: champion-attack-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes champion-attack-pulse {
  from { filter: brightness(1.0) saturate(1.0); }
  to   { filter: brightness(1.4) saturate(1.25); }
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

.champion-role-badge--adc     { background: #804010; }
.champion-role-badge--support { background: #3a5060; }
.champion-role-badge--top     { background: #7a1818; }
.champion-role-badge--mid     { background: #1a3880; }
.champion-role-badge--jungle  { background: #1a6028; }

/* Ability glows — only animate box-shadow, border-color stays as role color */
.champion-orbit-avatar--shield {
  box-shadow: 0 0 14px rgba(80, 180, 255, 0.9), 0 0 28px rgba(60, 140, 255, 0.5);
  animation: shield-pulse 1s ease-in-out infinite alternate;
}

@keyframes shield-pulse {
  from { box-shadow: 0 0 12px rgba(80, 180, 255, 0.8), 0 0 24px rgba(60, 140, 255, 0.5); }
  to   { box-shadow: 0 0 24px rgba(100, 200, 255, 1), 0 0 48px rgba(80, 160, 255, 0.7); }
}

.champion-orbit-avatar--dot {
  box-shadow: 0 0 14px rgba(180, 80, 255, 0.9), 0 0 28px rgba(140, 60, 255, 0.5);
  animation: dot-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes dot-pulse {
  from { box-shadow: 0 0 12px rgba(180, 80, 255, 0.8), 0 0 24px rgba(140, 60, 255, 0.5); }
  to   { box-shadow: 0 0 24px rgba(200, 100, 255, 1), 0 0 48px rgba(160, 80, 255, 0.7); }
}

/* Jungler stack counter */
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

/* ADC burst — orange */
.champion-dmg-float--adc {
  font-size: 1.3rem;
  color: #ff8020;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.85);
  text-shadow: 0 0 12px rgba(255, 120, 0, 1), 0 0 24px rgba(255, 80, 0, 0.6);
}

/* Mid DoT — purple */
.champion-dmg-float--dot {
  font-size: 0.95rem;
  color: #d060ff;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.8);
  text-shadow: 0 0 10px rgba(200, 80, 255, 0.9);
}

/* Support heal — green */
.champion-dmg-float--heal {
  font-size: 1.1rem;
  color: #60ff80;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.75);
  text-shadow: 0 0 12px rgba(80, 255, 100, 0.9), 0 0 24px rgba(40, 200, 60, 0.5);
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

/* ── Angriffs-Projektile ──────────────────────────────────────────────────── */
.champion-projectile {
  position: fixed;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 59;
  will-change: left, top;
  background: radial-gradient(circle, #ffe080 0%, #ff8020 55%, #cc3000 100%);
  box-shadow:
    0 0 6px 2px rgba(255, 160, 20, 0.9),
    0 0 14px 4px rgba(255, 80, 0, 0.6),
    0 0 28px 8px rgba(200, 40, 0, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .champion-orbit-avatar--attacking {
    animation: none;
  }
}
</style>
