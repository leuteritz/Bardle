<template>
  <!-- ① Back-Layer: Champions HINTER der Sonne (z-index 4, unter der Sonne) -->
  <div class="champion-orbit-layer champion-orbit-back" aria-hidden="true">
    <div
      v-for="pos in backChampions"
      :key="pos.name"
      class="champion-orbit-avatar champion-orbit-avatar--behind"
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
    </div>

    <!-- Planet detect aura (shown while champions approach or attack) -->
    <div
      v-if="showAura && planetPos"
      class="detect-aura"
      :style="{
        width: auraSize + 'px',
        height: auraSize + 'px',
        transform: `translate(${planetPos.cx - auraSize / 2}px, ${planetPos.cy - auraSize / 2}px)`,
      }"
    />

    <!-- Planet HP overlay (shown while boss is active) -->
    <div
      v-if="showAura && planetPos && bossStore.activeBoss"
      class="planet-hp-overlay"
      :style="{
        transform: `translate(calc(${planetPos.cx}px - 50%), ${planetPos.cy + auraSize / 2 + 8}px)`,
      }"
    >
      <div class="planet-hp-name">{{ bossStore.activeBoss.bossName }}</div>
      <div
        class="planet-hp-numbers"
        :class="{ 'planet-hp-numbers--critical': bossStore.bossHPPercent < 25 }"
      >
        ♥ {{ formatNumber(bossStore.activeBoss.currentHP) }} /
        {{ formatNumber(bossStore.activeBoss.maxHP) }}
      </div>
      <div class="planet-hp-bar-track">
        <div
          class="planet-hp-bar-fill"
          :class="{ 'planet-hp-bar-fill--critical': bossStore.bossHPPercent < 25 }"
          :style="{ width: bossStore.bossHPPercent + '%' }"
        />
      </div>
      <div
        v-if="potentialMaterial"
        class="planet-hp-material"
        :class="`planet-hp-material--${potentialMaterial.rarity}`"
      >
        <img
          :src="potentialMaterial.image"
          :alt="potentialMaterial.name"
          class="planet-hp-material-icon"
        />
        <span>{{ potentialMaterial.name }}</span>
      </div>
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
            :class="{ 'champion-dmg-float--planet': f.planetFloat }"
            :style="{ left: f.x + 'px', top: f.y + 'px' }"
          >
            -{{ f.value }}
          </span>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useCombatStore } from '../../../stores/combatStore'
import { useBattleStore } from '../../../stores/battleStore'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import { formatNumber } from '../../../config/numberFormat'
import { MATERIALS } from '../../../config/materials'
import { AVATAR_SIZE_LARGE, AVATAR_SIZE_SMALL, ORBIT_RADIUS_SCALE } from '@/config/constants'

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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const localStates = new Map<string, LocalChampState>()
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

        if (!reducedMotion) {
          const keplerBoost = 1.0 + 0.55 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
          ls.orbitAngle += c.direction * c.baseSpeed * keplerBoost * dt
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
        })
      }

      for (const key of localStates.keys()) {
        if (!champions.some((c) => c.name === key)) localStates.delete(key)
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

    const planetPos = computed(() => {
      const boss = bossStore.activeBoss
      if (!boss) return null
      return activePlanetPositions.get(boss.planetId) ?? null
    })

    const showAura = computed(() => bossStore.activeBoss !== null)

    const potentialMaterial = computed(() => {
      const boss = bossStore.activeBoss
      if (!boss?.potentialMaterialId) return null
      return MATERIALS.find((m) => m.id === boss.potentialMaterialId) ?? null
    })

    const auraSize = 120

    watch(
      () => battleStore.ownedChampions,
      (owned) => combatStore.syncChampions(owned),
      { immediate: true, deep: true },
    )

    onMounted(() => {
      animFrame = requestAnimationFrame(animate)
    })
    onUnmounted(() => {
      cancelAnimationFrame(animFrame)
    })

    return {
      combatStore,
      bossStore,
      backChampions,
      frontChampions,
      planetPos,
      showAura,
      auraSize,
      formatNumber,
      potentialMaterial,
      projectiles,
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
  border: 2px solid #c89040;
  box-shadow:
    0 0 8px rgba(232, 192, 64, 0.55),
    0 0 16px rgba(232, 192, 64, 0.2);
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

/* Hinter der Sonne: gedimmt, entsättigt, kein Glow */
.champion-orbit-avatar--behind {
  border-color: rgba(140, 90, 15, 0.35);
  box-shadow:
    0 0 3px rgba(160, 120, 30, 0.1),
    0 0 6px rgba(160, 120, 30, 0.06);
  filter: brightness(0.42) saturate(0.45);
}

/* Klar vor der Sonne: hellerer Rand, starkes Glow */
.champion-orbit-avatar--foreground {
  border-color: #ffe080;
  box-shadow:
    0 0 14px rgba(255, 220, 80, 0.8),
    0 0 28px rgba(255, 180, 40, 0.5),
    0 3px 10px rgba(0, 0, 0, 0.65);
  filter: brightness(1.08) saturate(1.12);
}

/* Angriff überschreibt alles */
.champion-orbit-avatar--attacking {
  border-color: #ff6040;
  box-shadow:
    0 0 12px rgba(255, 80, 20, 0.8),
    0 0 24px rgba(255, 60, 0, 0.5);
  animation: champion-attack-pulse 0.5s ease-in-out infinite alternate;
  filter: none;
}

@keyframes champion-attack-pulse {
  from {
    box-shadow:
      0 0 10px rgba(255, 80, 20, 0.7),
      0 0 20px rgba(255, 60, 0, 0.4);
  }
  to {
    box-shadow:
      0 0 20px rgba(255, 100, 30, 1),
      0 0 40px rgba(255, 80, 0, 0.7);
    filter: brightness(1.2);
  }
}

/* ── Planet-Detect-Aura ───────────────────────────────────────────────────── */
.detect-aura {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 160, 40, 0.5);
  animation: aura-pulse 1.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes aura-pulse {
  0%,
  100% {
    opacity: 0.35;
    scale: 1;
  }
  50% {
    opacity: 0.75;
    scale: 1.1;
  }
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

/* ── Planet-HP-Overlay ────────────────────────────────────────────────────── */
.planet-hp-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 140px;
  background: rgba(17, 16, 8, 0.75);
  border: 2px solid #7a4e20;
  box-shadow: inset 0 0 0 1px #3e200a;
  border-radius: 4px;
  padding: 5px 8px;
}

.planet-hp-name {
  font-size: 0.65rem;
  color: #c89040;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.planet-hp-numbers {
  font-size: 1.05rem;
  font-weight: 700;
  color: #e8c040;
  text-shadow:
    0 0 8px rgba(232, 192, 64, 0.6),
    0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}

.planet-hp-numbers--critical {
  color: #cc6050;
  text-shadow:
    0 0 8px rgba(204, 96, 80, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.9);
}

.planet-hp-bar-track {
  width: 100%;
  height: 8px;
  background: #1c1c18;
  border: 1px solid #7a4e20;
  border-radius: 3px;
  overflow: hidden;
}

.planet-hp-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #52b830, #2e7a1a);
  border-radius: 2px;
  transition:
    width 0.4s ease-out,
    background 0.3s;
}

.planet-hp-bar-fill--critical {
  background: linear-gradient(to right, #cc6050, #8b2020);
}

.planet-hp-material {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  white-space: nowrap;
  margin-top: 1px;
}

.planet-hp-material--common {
  color: #c0c0b0;
}
.planet-hp-material--uncommon {
  color: #52b830;
}
.planet-hp-material--rare {
  color: #4080e0;
}
.planet-hp-material--epic {
  color: #c060e0;
}

.planet-hp-material-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  image-rendering: pixelated;
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
  .detect-aura {
    animation: none;
  }
}
</style>
