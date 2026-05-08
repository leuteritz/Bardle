<template>
  <!-- ⓪ Permanent Orbit Tracks (nebula glow rings) -->
  <Teleport to="body">
    <svg class="orbit-tracks-svg" :viewBox="`0 0 ${screenW} ${screenH}`" aria-hidden="true">
      <template v-if="hasActiveStars">
        <OrbitPath
          v-for="(tier, i) in ORBIT_TIERS.star"
          :key="'track-star-' + i"
          :color="tier.color"
          :x="screenCx"
          :y="screenCy"
          :rx="tier.rx"
          :ry="tier.ry"
          :tiltDeg="tier.tiltDeg"
          :visible="starOrbitVisible[i]"
        />
      </template>

      <template v-if="hasActiveChampions">
        <OrbitPath
          v-for="(entry, i) in activeRoleOrbits"
          :key="'track-role-' + entry.role"
          :color="entry.color"
          :x="screenCx"
          :y="screenCy"
          :rx="entry.rx"
          :ry="entry.ry"
          :tiltDeg="entry.tiltDeg"
          :visible="roleOrbitVisibility[i]"
        />
      </template>
    </svg>
  </Teleport>

  <!-- ① Back-Layer -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-back" aria-hidden="true">
      <svg class="orbit-hints-svg" :viewBox="`0 0 ${screenW} ${screenH}`">
        <defs>
          <filter id="orbit-blur-champion" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="orbit-blur-resource" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="orbit-blur-galaxy_boss" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <ellipse
          v-for="star in backStars"
          :key="'hint-' + star.id"
          :cx="screenCx"
          :cy="screenCy"
          :rx="star.orbitRx"
          :ry="star.orbitRy"
          :transform="`rotate(${(star.orbitTilt * 180) / Math.PI} ${screenCx} ${screenCy})`"
          :stroke="orbitHintColor(star.starType)"
          :stroke-opacity="star.hintOpacity * 0.65"
          :filter="`url(#orbit-blur-${star.starType})`"
          fill="none"
          stroke-width="5"
        />
      </svg>

      <template v-for="star in backStars" :key="star.id">
        <div
          class="star-body"
          :class="`star-body--${star.starType}`"
          :style="starBodyStyle(star)"
        />
        <PlanetComponent
          v-for="p in star.planets.filter((p) => p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="false"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>

      <template v-for="star in frontStars" :key="'fb-' + star.id">
        <PlanetComponent
          v-for="p in star.planets.filter((p) => p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="false"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>
    </div>
  </Teleport>

  <!-- ② Front-Layer -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-front" aria-hidden="true">
      <svg class="orbit-hints-front-svg" :viewBox="`0 0 ${screenW} ${screenH}`">
        <defs>
          <filter id="orbit-blur-star-front" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>
        <ellipse
          v-for="star in backStars"
          :key="'front-hint-' + star.id"
          :cx="screenCx"
          :cy="screenCy"
          :rx="star.orbitRx"
          :ry="star.orbitRy"
          :transform="`rotate(${(star.orbitTilt * 180) / Math.PI} ${screenCx} ${screenCy})`"
          :stroke="orbitHintColor(star.starType)"
          :stroke-opacity="star.hintOpacity * 0.8"
          filter="url(#orbit-blur-star-front)"
          fill="none"
          stroke-width="5"
        />
      </svg>

      <template v-for="star in frontStars" :key="star.id">
        <div
          class="star-body"
          :class="`star-body--${star.starType}`"
          :style="starBodyStyle(star)"
          @click="handleStarClick(star)"
        />
        <PlanetComponent
          v-for="p in star.planets.filter((p) => !p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="false"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>

      <template v-for="star in backStars" :key="'ff-' + star.id">
        <PlanetComponent
          v-for="p in star.planets.filter((p) => !p.isBehind)"
          :key="p.planetId"
          :id="p.planetId"
          :size="p.size"
          :planetType="p.type"
          :transform="p.transform"
          :opacity="p.opacity"
          :isRescue="false"
          :isGalaxyBoss="p.isGalaxyBoss"
          :labelData="null"
          :animState="p.animState"
          :championImage="getChampionImageForPlanet(p) ?? undefined"
        />
      </template>

      <!-- ③ Enemy Projectiles -->
      <AttackProjectileLayer :shots="enemyShots" />

      <!-- Curse-Aura auf dem Stern mit dem verfluchten Planeten -->
      <template v-if="cursedStarId !== null">
        <div
          v-for="star in frontStars.filter((s) => s.id === cursedStarId)"
          :key="'curse-star-ring-' + star.id"
          class="star-curse-ring"
          :style="{
            width: starSize(star.starType) + 32 + 'px',
            height: starSize(star.starType) + 32 + 'px',
            transform: `translate(${star.x - (starSize(star.starType) + 32) / 2}px, ${star.y - (starSize(star.starType) + 32) / 2}px) scale(${star.scale})`,
            opacity: String(star.opacity),
          }"
        />
      </template>

      <!-- ④ Midlaner Fluch-Overlay (alle Planeten des verfluchten Sterns) -->
      <template v-for="(p, idx) in cursedPlanetPositions" :key="'curse-planet-' + idx">
        <div
          class="mid-curse-overlay"
          :style="{
            width: p.size + 24 + 'px',
            height: p.size + 24 + 'px',
            transform: `translate(${p.cx - (p.size + 24) / 2}px, ${p.cy - (p.size + 24) / 2}px)`,
          }"
        />
      </template>

      <!-- ⑤ Fluch-Timer über dem Stern -->
      <template v-if="cursedStarId !== null && curseSecsLeft > 0">
        <div
          v-for="star in frontStars.filter((s) => s.id === cursedStarId)"
          :key="'curse-star-timer-' + star.id"
          class="star-curse-timer"
          :style="{
            transform: `translate(${star.x}px, ${star.y - starSize(star.starType) / 2 - 20}px)`,
          }"
        >{{ curseIcon }} {{ curseSecsLeft }}s</div>
      </template>

      <!-- ④ Stern-Gesamt-Belohnung -->
      <template v-for="star in frontStars" :key="'summary-' + star.id">
        <div
          v-if="
            getStarRewardSummary(star).totalChimes > 0 ||
            getStarRewardSummary(star).materials.length > 0 ||
            getStarRewardSummary(star).champion
          "
          class="star-reward-summary"
          :style="rewardSummaryStyle(star)"
        >
          <div v-if="getStarRewardSummary(star).champion" class="summary-champion">
            <span class="summary-champion__crown">♛</span>
            <div class="summary-champion__icon-wrap">
              <img
                :src="getStarRewardSummary(star).champion!.image"
                :alt="getStarRewardSummary(star).champion!.name"
                class="summary-champion__icon"
              />
            </div>
            <span class="summary-champion__name">{{
              getStarRewardSummary(star).champion!.name
            }}</span>
          </div>

          <div
            v-if="
              getStarRewardSummary(star).champion &&
              (getStarRewardSummary(star).totalChimes > 0 ||
                getStarRewardSummary(star).materials.length > 0)
            "
            class="summary-divider"
          />

          <div class="summary-loot-row">
            <div v-if="getStarRewardSummary(star).totalChimes > 0" class="summary-item">
              <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="summary-icon" />
              <span class="summary-count"
                >×{{ formatNumber(getStarRewardSummary(star).totalChimes) }}</span
              >
            </div>
            <div
              v-for="mat in getStarRewardSummary(star).materials"
              :key="mat.name"
              class="summary-item"
            >
              <img :src="mat.image" :alt="mat.name" class="summary-icon" />
              <span class="summary-count">×{{ mat.count }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </Teleport>

  <!-- ③ Planet-Zähler über jedem Stern -->
  <Teleport to="body">
    <div class="star-count-layer">
      <template v-for="star in starRenders" :key="'cnt-' + star.id">
        <Transition name="star-cnt">
          <div
            v-if="remainingPlanetCount(star) > 0"
            :key="remainingPlanetCount(star)"
            class="star-planet-count"
            :style="starCountStyle(star)"
          >
            <span class="star-planet-count__current">{{ remainingPlanetCount(star) }}</span>
            <span class="star-planet-count__sep">/</span>
            <span class="star-planet-count__total">{{ star.totalPlanets }}</span>
          </div>
        </Transition>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStarSystem } from '../../../composables/useStarSystem'
import OrbitPath from './OrbitPath.vue'
import type { StarRenderEntry, PlanetRenderEntry } from '../../../composables/useStarSystem'
import PlanetComponent from '../planet/PlanetComponent.vue'
import AttackProjectileLayer from './AttackProjectileLayer.vue'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import { useCombatStore } from '../../../stores/combatStore'
import { useBattleStore } from '../../../stores/battleStore'
import { usePlanetShopStore } from '../../../stores/planetShopStore'
import { usePlayerStore } from '../../../stores/playerStore'
import { useRoleBehaviorStore } from '../../../stores/roleBehaviorStore'
import { useRenderingPaused } from '../../../composables/useRenderingPaused'
import { useProjectileSystem } from '../../../composables/useProjectileSystem'
import { MATERIALS } from '../../../config/materials'
import { formatNumber } from '../../../config/numberFormat'
import {
  ORBIT_TIERS,
  ROLE_BY_KEY,
  ENEMY_ATTACK_INTERVAL_MIN_MS,
  ENEMY_ATTACK_INTERVAL_MAX_MS,
  ENEMY_PROJECTILE_DAMAGE,
  ROLE_MID_CURSE_ATTACK_DEBUFF,
  ROLE_MID_CURSE_ATTACK_SLOW,
} from '../../../config/constants'
import { activeChampionBehindState } from '../../../utils/activeChampionBehindState'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import { activePlayerPlanetPositions } from '../../../utils/activePlayerPlanetPositions'
import { CURSE_DEFS } from '../../../stores/roleBehaviorStore'
import type { ChampionRole } from '../../../types'

const { starRenders } = useStarSystem()
const bossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()

function handleStarClick(star: StarRenderEntry) {
  if (starGroupStore.starFightModalOpen) return
  starGroupStore.openStarFightModal(star.id)
}
const combatStore = useCombatStore()
const battleStore = useBattleStore()
const planetShopStore = usePlanetShopStore()
const playerStore = usePlayerStore()
const roleBehaviorStore = useRoleBehaviorStore()
const { isRenderingPaused } = useRenderingPaused()

// ── Midlaner Fluch-Overlay (reaktive Positionen/Timer) ───────────────────────
interface CursedPlanetPos { cx: number; cy: number; size: number }
const cursedPlanetPositions = ref<CursedPlanetPos[]>([])
const curseSecsLeft = ref(0)

const curseIcon = computed(() => {
  const type = roleBehaviorStore.activeCurse?.type
  return type ? CURSE_DEFS[type].icon : ''
})
// ─────────────────────────────────────────────────────────────────────────────

const SLOT_ROLES: ChampionRole[] = ['top', 'jungle', 'mid', 'adc', 'support']

const activeRoleOrbits = computed(() =>
  battleStore.headerSlots
    .map((slot, i) => (slot != null ? SLOT_ROLES[i] : null))
    .filter((r): r is ChampionRole => r != null)
    .map((role) => ({ role, ...ROLE_BY_KEY[role].orbit })),
)

const backStars = computed(() => starRenders.value.filter((s) => s.isBehind))
const frontStars = computed(() => starRenders.value.filter((s) => !s.isBehind))

const cursedStarId = computed(() => {
  const curse = roleBehaviorStore.activeCurse
  if (!curse) return null
  const boss = bossStore.activeBoss
  if (!boss || boss.defeated || boss.expired) return null
  return starRenders.value.find((s) => s.planets.some((p) => p.planetId === boss.planetId))?.id ?? null
})
const hasActiveStars = computed(() => starRenders.value.length > 0)
const hasActiveChampions = computed(() => combatStore.champions.length > 0)

const starOrbitVisible = computed(() => [
  starRenders.value.some((s) => s.starType === 'champion' && s.isBehind),
  starRenders.value.some((s) => s.starType === 'resource' && s.isBehind),
])

const roleOrbitVisibility = computed(() =>
  activeRoleOrbits.value.map((entry) => {
    const slotIdx = SLOT_ROLES.indexOf(entry.role)
    const champName = battleStore.headerSlots[slotIdx]
    return champName ? (activeChampionBehindState[champName] ?? false) : false
  }),
)

const screenW = ref(window.innerWidth)
const screenH = ref(window.innerHeight)
const screenCx = computed(() => screenW.value / 2)
const screenCy = computed(() => screenH.value / 2)

function onResize() {
  screenW.value = window.innerWidth
  screenH.value = window.innerHeight
}

// ── Enemy Planet Attack System ────────────────────────────────────────────────
const {
  shots: enemyShots,
  spawnShot: spawnEnemyShot,
  tickShots: tickEnemyShots,
} = useProjectileSystem()

const ENEMY_TRAIL_COLOR = '#cc5500'
const ENEMY_HEAD_COLOR = '#ff8800'
const TOP_INTERCEPT_RADIUS = 50

const enemyAttackTimers = new Map<string, number>()
let enemyAnimFrame = 0
let enemyLastTs = 0
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function randomAttackInterval(): number {
  const base =
    ENEMY_ATTACK_INTERVAL_MIN_MS +
    Math.random() * (ENEMY_ATTACK_INTERVAL_MAX_MS - ENEMY_ATTACK_INTERVAL_MIN_MS)
  const curse = roleBehaviorStore.activeCurse
  const glaciated = curse?.type === 'glaciation' && Date.now() < curse.activeUntil
  return glaciated ? base * ROLE_MID_CURSE_ATTACK_SLOW : base
}

function enemyAttackLoop(ts: number) {
  const dt = enemyLastTs === 0 ? 16 : Math.min(ts - enemyLastTs, 50)
  enemyLastTs = ts

  if (!reducedMotion) {
    tickEnemyShots(dt)

    for (const star of starRenders.value) {
      for (const planet of star.planets) {
        if (planet.isBehind || planet.animState !== 'normal') continue

        const pos = activePlanetPositions.get(planet.planetId)
        if (!pos) continue

        let timer = enemyAttackTimers.get(planet.planetId) ?? randomAttackInterval()
        timer -= dt

        if (timer <= 0) {
          timer = randomAttackInterval()

          const foregroundSlots = [...activePlayerPlanetPositions.entries()].filter(
            ([, p]) => p.isForeground,
          )

          let targetX: number
          let targetY: number
          let targetSlotId: string | null = null

          if (foregroundSlots.length > 0) {
            const [slotId, slotPos] =
              foregroundSlots[Math.floor(Math.random() * foregroundSlots.length)]
            targetX = slotPos.cx
            targetY = slotPos.cy
            targetSlotId = slotId
          } else {
            targetX = window.innerWidth / 2
            targetY = window.innerHeight / 2
          }

          const capturedSlotId = targetSlotId
          const capturedTopLaneName = battleStore.headerSlots[0]
          spawnEnemyShot(pos.cx, pos.cy, targetX, targetY, true, true, {
            trailColor: ENEMY_TRAIL_COLOR,
            headColor: ENEMY_HEAD_COLOR,
            interceptCheck:
              capturedSlotId === null && capturedTopLaneName
                ? (headX: number, headY: number) => {
                    if (!roleBehaviorStore.tankShieldActive) return false
                    if (activeChampionBehindState[capturedTopLaneName]) return false
                    const topChamp = combatStore.champions.find(
                      (c) => c.name === capturedTopLaneName,
                    )
                    if (!topChamp) return false
                    return (
                      Math.hypot(headX - topChamp.screenX, headY - topChamp.screenY) <
                      TOP_INTERCEPT_RADIUS
                    )
                  }
                : undefined,
            onIntercept:
              capturedSlotId === null && capturedTopLaneName
                ? (headX: number, headY: number) => {
                    const topChamp = combatStore.champions.find(
                      (c) => c.name === capturedTopLaneName,
                    )
                    if (!topChamp) return
                    const dx = headX - topChamp.screenX
                    const dy = headY - topChamp.screenY
                    const len = Math.hypot(dx, dy) || 1
                    roleBehaviorStore.triggerIntercept(dx / len, dy / len, topChamp.screenX, topChamp.screenY)
                  }
                : undefined,
            onHit() {
              const curse = roleBehaviorStore.activeCurse
              const weakened = curse?.type === 'weakness' && Date.now() < curse.activeUntil
              const dmg = weakened
                ? Math.max(1, Math.round(ENEMY_PROJECTILE_DAMAGE * ROLE_MID_CURSE_ATTACK_DEBUFF))
                : ENEMY_PROJECTILE_DAMAGE
              if (capturedSlotId) {
                planetShopStore.takeDamage(capturedSlotId, dmg)
              } else {
                playerStore.takeDamage(dmg)
              }
            },
          })
        }

        enemyAttackTimers.set(planet.planetId, timer)
      }
    }

    const activePlanetIds = new Set(
      starRenders.value.flatMap((s) => s.planets.map((p) => p.planetId)),
    )
    for (const id of enemyAttackTimers.keys()) {
      if (!activePlanetIds.has(id)) enemyAttackTimers.delete(id)
    }

    // ── Curse-Overlay Positionen aktualisieren (alle Planeten des verfluchten Sterns) ──
    const curse = roleBehaviorStore.activeCurse
    if (curse && Date.now() < curse.activeUntil) {
      const boss = bossStore.activeBoss
      if (boss && !boss.defeated && !boss.expired) {
        const cursedStar = starRenders.value.find((s) =>
          s.planets.some((p) => p.planetId === boss.planetId),
        )
        if (cursedStar) {
          const positions: CursedPlanetPos[] = []
          for (const planet of cursedStar.planets) {
            if (!planet.isBehind && planet.animState === 'normal') {
              const pos = activePlanetPositions.get(planet.planetId)
              if (pos && pos.isForeground) {
                positions.push({ cx: pos.cx, cy: pos.cy, size: planet.size })
              }
            }
          }
          cursedPlanetPositions.value = positions
          curseSecsLeft.value = Math.max(0, Math.ceil((curse.activeUntil - Date.now()) / 1000))
        } else {
          cursedPlanetPositions.value = []
        }
      } else {
        cursedPlanetPositions.value = []
      }
    } else {
      cursedPlanetPositions.value = []
    }
    // ─────────────────────────────────────────────────────────────────────────
  }

  enemyAnimFrame = requestAnimationFrame(enemyAttackLoop)
}

watch(isRenderingPaused, (paused) => {
  if (paused) {
    cancelAnimationFrame(enemyAnimFrame)
    enemyAnimFrame = 0
  } else if (!enemyAnimFrame) {
    enemyLastTs = 0
    enemyAnimFrame = requestAnimationFrame(enemyAttackLoop)
  }
})
// ─────────────────────────────────────────────────────────────────────────────

onMounted(() => {
  window.addEventListener('resize', onResize)
  enemyAnimFrame = requestAnimationFrame(enemyAttackLoop)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(enemyAnimFrame)
})

function orbitHintColor(starType: string): string {
  if (starType === 'champion') return ORBIT_TIERS.star[0].color
  if (starType === 'resource') return ORBIT_TIERS.star[1].color
  if (starType === 'galaxy_boss') return '#ff5030'
  return '#ffffff'
}

function starSize(type: string): number {
  if (type === 'champion') return ORBIT_TIERS.star[0].size
  if (type === 'resource') return ORBIT_TIERS.star[1].size
  return 82
}

function starBoxShadow(type: string, s: number): string {
  const r = (n: number) => Math.round(s * n)

  if (type === 'champion') {
    return [
      `0 0 ${r(0.19)}px rgba(255, 200, 60, 0.9)`,
      `0 0 ${r(0.44)}px rgba(220, 140, 20, 0.6)`,
      `0 0 ${r(0.78)}px rgba(180, 100, 10, 0.3)`,
    ].join(', ')
  }

  if (type === 'resource') {
    return [
      `0 0 ${r(0.19)}px rgba(160, 210, 255, 0.95)`,
      `0 0 ${r(0.45)}px rgba(80, 160, 255, 0.65)`,
      `0 0 ${r(0.84)}px rgba(30, 80, 200, 0.35)`,
    ].join(', ')
  }

  if (type === 'galaxy_boss') {
    return [
      `0 0 ${r(0.22)}px rgba(255, 80, 30, 0.95)`,
      `0 0 ${r(0.46)}px rgba(200, 20, 20, 0.7)`,
      `0 0 ${r(0.79)}px rgba(120, 0, 0, 0.4)`,
    ].join(', ')
  }

  return ''
}

function starBodyStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  const ringInset = Math.round(s * 0.16)

  return {
    transform: `translate(${star.x - s / 2}px, ${star.y - s / 2}px) scale(${star.scale.toFixed(4)})`,
    opacity: String(star.opacity.toFixed(3)),
    width: `${s}px`,
    height: `${s}px`,
    boxShadow: starBoxShadow(star.starType, s),
    '--ring-inset': `-${ringInset}px`,
    filter: star.filterStyle || undefined,
    transition: 'filter 0.3s ease',
  }
}

function getStarRewardSummary(star: StarRenderEntry) {
  let totalChimes = 0
  const materialMap = new Map<string, { image: string; name: string; count: number }>()
  let champion: { name: string; image: string } | null = null

  for (const planet of star.planets) {
    if (planet.animState === 'saved') continue
    const boss = bossStore.activeBosses.find(
      (b) => b.planetId === planet.planetId && !b.defeated && !b.expired,
    )
    if (!boss) continue

    totalChimes += boss.rewardSlots
      .filter((s) => s.type === 'chimes')
      .reduce((sum, s) => sum + (s.amount ?? 0), 0)

    for (const slot of boss.rewardSlots.filter((s) => s.type === 'material')) {
      if (slot.materialId) {
        const mat = MATERIALS.find((m) => m.id === slot.materialId)
        if (mat) {
          const existing = materialMap.get(slot.materialId)
          if (existing) {
            existing.count += 1
          } else {
            materialMap.set(slot.materialId, {
              image: mat.image ?? '',
              name: mat.name,
              count: 1,
            })
          }
        }
      }
    }

    if (!champion && boss.isChampionPlanet && boss.homePlanetChampion) {
      champion = {
        name: boss.homePlanetChampion,
        image: `/img/champion/${boss.homePlanetChampion}.jpg`,
      }
    }
  }

  return { totalChimes, materials: [...materialMap.values()], champion }
}

function getChampionImageForPlanet(planet: PlanetRenderEntry): string | null {
  if (planet.animState === 'saved') return null
  const boss = bossStore.activeBosses.find(
    (b) => b.planetId === planet.planetId && !b.defeated && !b.expired,
  )
  if (!boss || !boss.isChampionPlanet || !boss.homePlanetChampion) return null
  return `/img/champion/${boss.homePlanetChampion}.jpg`
}

function rewardSummaryStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x}px, ${star.y + s / 2 + 58}px) translateX(-50%)`,
  }
}

function remainingPlanetCount(star: StarRenderEntry): number {
  return star.planets.filter((p) => p.animState !== 'saved').length
}

function starCountStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x}px, ${star.y - s / 2 - 16}px) translateX(-50%) translateY(-100%)`,
    opacity: String(star.opacity.toFixed(3)),
  }
}
</script>

<style scoped>
.orbit-tracks-svg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}

.star-sys-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.star-sys-back {
  z-index: 3;
}

.star-sys-front {
  z-index: 7;
}

.orbit-hints-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.orbit-hints-front-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.star-body {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  will-change: transform, opacity;
  animation: star-pulse 2.8s ease-in-out infinite;
  pointer-events: auto;
  cursor: pointer;
}

.star-body--champion {
  background: radial-gradient(circle, #ffe8a0 0%, #d4a020 45%, #7a4808 100%);
}

.star-body--champion::after {
  content: '';
  position: absolute;
  inset: var(--ring-inset, -11px);
  border-radius: 50%;
  border: 1px solid rgba(255, 200, 60, 0.35);
  animation: star-ring-pulse 2.8s ease-in-out infinite;
}

.star-body--resource {
  background: radial-gradient(circle, #ffffff 0%, #a8d4ff 35%, #2060c8 75%, #0a1a5c 100%);
}

.star-body--resource::after {
  content: '';
  position: absolute;
  inset: var(--ring-inset, -11px);
  border-radius: 50%;
  border: 1px solid rgba(120, 190, 255, 0.3);
  animation: star-ring-pulse 2.8s ease-in-out infinite;
}

.star-body--galaxy_boss {
  background: radial-gradient(circle, #ff9060 0%, #c01818 45%, #4a0000 100%);
}

.star-body--galaxy_boss::after {
  content: '';
  position: absolute;
  inset: var(--ring-inset, -14px);
  border-radius: 50%;
  border: 1.5px solid rgba(255, 80, 30, 0.4);
  animation: star-ring-pulse 2.2s ease-in-out infinite;
}

@keyframes star-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.25);
  }
}

@keyframes star-ring-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.6;
  }
}

.star-reward-summary {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 4px;
  background: rgba(8, 5, 18, 0.82);
  border: 1px solid rgba(232, 192, 64, 0.5);
  pointer-events: none;
  z-index: 8;
}

.star-reward-summary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -100%);
  width: 1px;
  height: 52px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(232, 192, 64, 0.25) 40%,
    rgba(232, 192, 64, 0.5) 100%
  );
}

.summary-loot-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.6));
}

.summary-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: #e8c040;
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.55);
}

.summary-divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(195, 160, 255, 0.35) 40%,
    rgba(195, 160, 255, 0.35) 60%,
    transparent
  );
}

.summary-champion {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-champion__crown {
  font-size: 13px;
  color: #c8a0ff;
  text-shadow: 0 0 8px rgba(195, 100, 255, 0.85);
  flex-shrink: 0;
}

.summary-champion__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(195, 160, 255, 0.8);
  box-shadow:
    0 0 10px rgba(180, 80, 255, 0.5),
    0 0 20px rgba(140, 40, 220, 0.25);
  flex-shrink: 0;
  animation: champIconPulse 2.2s ease-in-out infinite;
}

.summary-champion__icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.summary-champion__name {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(200, 165, 255, 0.97);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow: 0 0 6px rgba(190, 80, 255, 0.5);
  white-space: nowrap;
}

@keyframes champIconPulse {
  0%,
  100% {
    box-shadow:
      0 0 10px rgba(180, 80, 255, 0.5),
      0 0 20px rgba(140, 40, 220, 0.25);
  }
  50% {
    box-shadow:
      0 0 16px rgba(195, 100, 255, 0.8),
      0 0 32px rgba(160, 60, 240, 0.45);
  }
}

/* ── Planet-Zähler über Sternen ─────────────────────────────────────────────── */
.star-count-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9;
}

.star-planet-count {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
}

.star-planet-count__current {
  font-size: clamp(1.1rem, 1.7vw, 1.7rem);
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 4px rgba(232, 160, 20, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

.star-planet-count__sep {
  font-size: clamp(0.85rem, 1.3vw, 1.3rem);
  font-weight: 700;
  color: #e8c040;
  opacity: 0.45;
  margin-inline: 1px;
  text-shadow:
    0 0 4px rgba(232, 160, 20, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

.star-planet-count__total {
  font-size: clamp(0.85rem, 1.3vw, 1.3rem);
  font-weight: 700;
  color: #e8c040;
  opacity: 0.4;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 4px rgba(232, 160, 20, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

.star-cnt-enter-active {
  transition:
    opacity 0.22s ease,
    scale 0.22s ease;
}

.star-cnt-leave-active {
  transition:
    opacity 0.15s ease,
    scale 0.15s ease;
}

.star-cnt-enter-from {
  opacity: 0;
  scale: 0.7;
}

.star-cnt-leave-to {
  opacity: 0;
  scale: 0.7;
}

/* ── Midlaner Fluch-Overlay ──────────────────────────────────────────────── */
.mid-curse-overlay {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  pointer-events: none;
  z-index: 15;
  border: 2px solid rgba(160, 40, 255, 0.75);
  box-shadow:
    0 0 18px rgba(140, 30, 255, 0.85),
    0 0 38px rgba(100, 0, 200, 0.45),
    inset 0 0 14px rgba(160, 40, 255, 0.3);
  animation: curse-aura-pulse 1.4s ease-in-out infinite alternate;
}

.mid-curse-overlay::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px dashed rgba(180, 80, 255, 0.55);
  animation: curse-ring-spin 3s linear infinite;
}

.mid-curse-overlay::after {
  content: '';
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  border: 1px solid rgba(130, 20, 240, 0.3);
  animation: curse-ring-spin 5s linear infinite reverse;
}

@keyframes curse-aura-pulse {
  from {
    box-shadow:
      0 0 14px rgba(140, 30, 255, 0.7),
      0 0 28px rgba(100, 0, 200, 0.35),
      inset 0 0 10px rgba(160, 40, 255, 0.2);
  }
  to {
    box-shadow:
      0 0 30px rgba(190, 70, 255, 0.95),
      0 0 65px rgba(140, 20, 240, 0.55),
      inset 0 0 22px rgba(190, 70, 255, 0.38);
  }
}

@keyframes curse-ring-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Fluch-Timer über dem Stern ─────────────────────────────────────────────── */
.star-curse-timer {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: #c060ff;
  background: rgba(20, 10, 32, 0.82);
  border: 1px solid #7a2db0;
  border-radius: 3px;
  padding: 1px 6px;
  line-height: 14px;
  pointer-events: none;
  white-space: nowrap;
  translate: -50% -100%;
  text-shadow: 0 0 6px rgba(190, 70, 255, 0.85);
  z-index: 15;
}

/* ── Curse-Aura auf dem Stern ────────────────────────────────────────────── */
.star-curse-ring {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  pointer-events: none;
  border: 2px solid rgba(180, 50, 255, 0.7);
  box-shadow:
    0 0 20px rgba(180, 50, 255, 0.6),
    0 0 42px rgba(130, 10, 230, 0.35),
    inset 0 0 12px rgba(180, 50, 255, 0.2);
  animation:
    curse-star-ring-pulse 1.8s ease-in-out infinite alternate,
    curse-ring-spin 4s linear infinite;
}

.star-curse-ring::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1px dashed rgba(210, 100, 255, 0.4);
  animation: curse-ring-spin 6s linear infinite reverse;
  pointer-events: none;
}

@keyframes curse-star-ring-pulse {
  from {
    box-shadow:
      0 0 14px rgba(170, 40, 255, 0.5),
      0 0 28px rgba(120, 0, 220, 0.25),
      inset 0 0 8px rgba(170, 40, 255, 0.15);
  }
  to {
    box-shadow:
      0 0 32px rgba(200, 80, 255, 0.85),
      0 0 66px rgba(155, 30, 240, 0.48),
      inset 0 0 20px rgba(200, 80, 255, 0.32);
  }
}
</style>
