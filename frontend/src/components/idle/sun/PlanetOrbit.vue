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
        :abilityActive="hoveredPlanetTier === i"
        :dimmed="
          starFocusActive ||
          hoveredChampionRole !== null ||
          (hoveredPlanetSlotId !== null && hoveredPlanetTier !== i)
        "
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
        'planet-orbit-item--hover-focus': pos.id === hoveredPlanetSlotId,
        'planet-orbit-item--down': pos.isDown,
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
        'planet-orbit-item--hover-focus': pos.id === hoveredPlanetSlotId,
        'planet-orbit-item--down': pos.isDown,
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

    </div>

    <!-- Turret-Cooldown-Ringe: EIN Canvas für alle Turret-Planeten, gezeichnet
         im selben Stil wie die Stern-Cooldown-Ringe — Fortschritt läuft im
         geteilten Salven-Takt, synchron zur Turret-Battery im Star-Fight-Modal -->
    <canvas ref="turretRingCanvas" class="planet-turret-ring-canvas" aria-hidden="true" />

    <!-- HP Bars -->
    <div
      v-for="pos in frontPlanets"
      :key="'hp-' + pos.id"
      class="planet-hp-wrap"
      :class="{ 'planet-hp-wrap--dimmed': pos.isDimmed }"
      :style="{
        transform: `translate(${pos.x - Math.max(pos.size, 48) / 2}px, ${pos.y + pos.size / 2 + 5}px)`,
        width: Math.max(pos.size, 48) + 'px',
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
      <span v-if="pos.isDown" class="planet-hp-text planet-hp-text--down">{{ pos.downSecs }}s</span>
      <span v-else class="planet-hp-text">{{ pos.currentHp }} / {{ pos.maxHp }}</span>
    </div>

    <!-- Jungle Buff — Countdown-Chip (schräg oben rechts am Planeten) -->
    <template v-for="pos in frontPlanets" :key="'jbuff-' + pos.id">
      <div
        class="planet-status-badge-anchor"
        :class="{ 'planet-status-badge-anchor--dimmed': pos.isDimmed }"
        :style="{
          transform: `translate(${pos.x + pos.size * 0.354 - 2}px, ${pos.y - pos.size * 0.354 - 24}px)`,
          zIndex: pos.zIndex + 2,
        }"
      >
        <Transition name="status-badge">
          <div
            v-if="pos.isJungleBuffed"
            class="planet-buff-chip"
            :class="{ 'planet-buff-chip--urgent': pos.jungleBuffSecsLeft < 3 }"
            :style="{ '--buff-progress': pos.jungleBuffProgress }"
            :title="pos.jungleBuffType"
          >
            <img src="/img/roles/jungle.png" alt="" draggable="false" />
            <span class="planet-buff-secs">{{ Math.ceil(pos.jungleBuffSecsLeft) }}s</span>
          </div>
        </Transition>
      </div>
    </template>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  JUNGLE_BUFF_DEFS,
  isPlanetDown,
} from '../../../stores/planetShopStore'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { ORBIT_TIERS, PLANET_SLOT_MAX_HP, BEHIND_SUN_SPEED_MULTIPLIER, HOVER_DIM_OPACITY, GAME_TICK_INTERVAL_MS, PLANET_ORBIT_FOREGROUND_DEPTH } from '@/config/constants'
import { useUiStore } from '@/stores/uiStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { activePlanetPositions } from '../../../utils/activePlanetPositions'
import { activePlayerPlanetPositions } from '../../../utils/activePlayerPlanetPositions'
import { planetOrbitPhases } from '../../../utils/planetOrbitPhase'
import AttackProjectileLayer from './AttackProjectileLayer.vue'
import OrbitPath from './OrbitPath.vue'
import { useProjectileSystem } from '@/composables/useProjectileSystem'
import { useOrbitScale } from '@/composables/useOrbitScale'

const BEHIND_SPEED_LERP = 0.04
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
  isDown: boolean
  downSecs: number
  zIndex: number
  color: string
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
  jungleBuffProgress: number
  jungleBuffType: string
  slotNum: number
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

export default defineComponent({
  name: 'PlanetOrbit',
  components: { AttackProjectileLayer, OrbitPath },
  setup() {
    const planetShopStore = usePlanetShopStore()
    const planetBossStore = usePlanetBossStore()
    const uiStore = useUiStore()
    const starGroupStore = useStarGroupStore()
    const hoveredChampionRole = computed(() => uiStore.hoveredChampionRole)
    // Stern-Fokus (Timer-Bar, Minimap oder Stern im Orbit gehovert):
    // alle Planeten samt Orbits blenden aus, nur der Stern bleibt sichtbar.
    const starFocusActive = computed(() => starGroupStore.hoveredTimerStarId !== null)
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

    // Hover-Fokus: Tier des gehoverten Planeten (gleiche Zuordnung wie in
    // animate(): Index in der Rollen-Slot-Liste modulo Tier-Anzahl), damit
    // nur dessen Orbit-Linie sichtbar bleibt.
    const hoveredPlanetSlotId = computed(() => uiStore.hoveredPlanetSlotId)
    const hoveredPlanetTier = computed(() => {
      const id = hoveredPlanetSlotId.value
      if (id === null) return null
      const idx = slotsWithRole.value.findIndex((s) => s.id === id)
      return idx >= 0 ? idx % ORBIT_TIERS.planet.length : null
    })

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

    // ── Turret-Cooldown-Ringe: alle Turrets auf EINEM Canvas, ein Draw-Pass
    // pro Frame — gleicher Stil wie die Stern-Cooldown-Ringe (Track + Arc +
    // Glüh-Spitze). Fortschritt = Zeit seit der letzten geteilten Salve.
    const turretRingCanvas = ref<HTMLCanvasElement | null>(null)
    const TWO_PI = Math.PI * 2
    let turretRingCanvasWasEmpty = false
    let turretLastVolleyMs = Date.now()

    function sizeTurretRingCanvas() {
      const cv = turretRingCanvas.value
      if (cv) {
        cv.width = window.innerWidth
        cv.height = window.innerHeight
      }
    }

    function drawTurretRings(positions: PlanetRenderPos[]) {
      const cv = turretRingCanvas.value
      const c = cv?.getContext('2d')
      if (!cv || !c) return

      c.clearRect(0, 0, cv.width, cv.height)
      let drewAny = false
      const progress = reducedMotion
        ? 1
        : Math.min(1, (Date.now() - turretLastVolleyMs) / GAME_TICK_INTERVAL_MS)

      // Ohne lebenden Boss ruht der Salven-Takt — kein Ring, statt eines
      // eingefrorenen "voll"-Zustands ohne Ziel
      const hasLiveBoss = planetBossStore.activeBosses.some((b) => !b.defeated && !b.expired)

      for (const pos of positions) {
        if (!hasLiveBoss) break
        if (!pos.isTurret || pos.isBehind || pos.isDown || pos.opacity <= 0.02) continue
        const r = pos.size / 2 + 8
        const alpha = pos.opacity
        drewAny = true

        // Leise Spur, damit der Ring auch bei wenig Fortschritt lesbar ist
        c.beginPath()
        c.arc(pos.x, pos.y, r, 0, TWO_PI)
        c.strokeStyle = `rgba(204,68,68,${0.12 * alpha})`
        c.lineWidth = 2
        c.stroke()

        if (progress <= 0.004) continue
        const start = -Math.PI / 2
        const end = start + progress * TWO_PI
        const hot = progress > 0.92
        c.beginPath()
        c.arc(pos.x, pos.y, r, start, end)
        c.strokeStyle = hot ? `rgba(255,150,140,${0.9 * alpha})` : `rgba(220,90,80,${0.55 * alpha})`
        c.lineWidth = 2
        c.lineCap = 'round'
        c.stroke()

        // Glüh-Spitze am Ende des Bogens
        if (progress < 1) {
          c.beginPath()
          c.arc(pos.x + Math.cos(end) * r, pos.y + Math.sin(end) * r, hot ? 3 : 2.2, 0, TWO_PI)
          c.fillStyle = `rgba(255,180,170,${0.85 * alpha})`
          c.fill()
        }
      }

      // Leeres Canvas ausblenden, damit der Compositor es überspringt
      const empty = !drewAny
      if (empty !== turretRingCanvasWasEmpty) {
        turretRingCanvasWasEmpty = empty
        cv.style.display = empty ? 'none' : ''
      }
    }

    // Turret-Abschuss: exakt im Takt der echten Turret-Salve (gameStore-Tick),
    // geteilt mit der Turret-Battery im Star-Fight-Modal — kein eigener Timer
    watch(
      () => planetBossStore.turretVolleyCounter,
      () => {
        turretLastVolleyMs = Date.now()
        if (reducedMotion) return
        // Idle-Layer pausiert (Star-Fight-Modal / Profil offen): keine Schüsse
        // ansammeln, die beim Fortsetzen alle gleichzeitig losfliegen würden
        if (isIdleRenderingPaused.value) return
        // Gleiche Bedingung wie der Cooldown-Ring (nicht hinter der Sonne):
        // jeder Turret, dessen Ring voll läuft, verschießt auch ein Projektil
        const turretPlanets = renderPositions.value.filter(
          (p) => p.isTurret && !p.isBehind && !p.isDown,
        )
        if (turretPlanets.length === 0 || planetBossStore.activeBosses.length === 0) return

        const bossPlanetIds = planetBossStore.activeBosses
          .filter((b) => !b.defeated && !b.expired)
          .map((b) => b.planetId)

        for (const turret of turretPlanets) {
          let nearestDist = Infinity
          let targetPos: { cx: number; cy: number; isForeground: boolean } | null = null
          let fallbackPos: { cx: number; cy: number; isForeground: boolean } | null = null
          let fallbackDist = Infinity

          for (const planetId of bossPlanetIds) {
            const pos = activePlanetPositions.get(planetId)
            if (!pos) continue
            const dist = Math.hypot(pos.cx - turret.x, pos.cy - turret.y)
            // nächstes Ziel überhaupt — Fallback, falls alle zu nah stehen
            if (dist < fallbackDist) {
              fallbackDist = dist
              fallbackPos = pos
            }
            if (dist < MIN_SHOT_DISTANCE) continue
            if (dist < nearestDist) {
              nearestDist = dist
              targetPos = pos
            }
          }

          const target = targetPos ?? fallbackPos
          if (target) {
            spawnShot(turret.x, turret.y, target.cx, target.cy, true, true)
          }
        }
      },
    )

    function animate(ts: number) {
      const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
      lastTs = ts

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const purchased = planetShopStore.purchasedSlots.filter((s) => s.role !== null)
      const newPositions: PlanetRenderPos[] = []

      const sunScale = planetShopStore.orbitSunScale
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
          planetShopStore.orbitSunRadius * MIN_RY_FACTORS[slotIdx % MIN_RY_FACTORS.length],
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

        // Bahnzustand für den Planeten-Tab teilen — bewusst der Winkel der
        // GEGLÄTTETEN Position, nicht der rohe Integrationswinkel ls.orbitAngle.
        // isForeground unten entsteht aus ls.y, und der Lerp zieht ls.y dem
        // Winkel um einige Frames nach. Nähme der Tab den rohen Winkel, liefe
        // seine Bahn dem Eclipse-Medaillon im Command Panel sichtbar voraus.
        // Rückrechnung der Ellipse: u = rx·cos(A), v = ry·sin(A).
        const relXPx = ls.x - cx
        const relYPx = ls.y - cy
        const cosTilt = Math.cos(tiltRad)
        const sinTilt = Math.sin(tiltRad)
        const ellipseU = (relXPx * cosTilt + relYPx * sinTilt) / Math.max(rx, 1)
        const ellipseV = (-relXPx * sinTilt + relYPx * cosTilt) / Math.max(ry, 1)
        planetOrbitPhases.set(slot.id, {
          angle: Math.atan2(ellipseV, ellipseU),
          speedMul: newMul,
        })


        const relY = (ls.y - cy) / Math.max(ry, 1)
        const isBehind = relY < -0.05
        const depth = (relY + 1) / 2

        const parallaxScale = 0.75 + depth * 0.5
        const size = Math.round(baseSize * parallaxScale)
        const opacity = isBehind ? 0.15 + depth * 0.28 : 0.82 + depth * 0.18
        const zIndex = Math.floor(9 + depth * 6)
        // Geteilte Schwelle: Command Panel und Planeten-Tab richten ihr
        // Eclipse-Medaillon exakt an diesem Wert aus.
        const isForeground = !isBehind && depth > PLANET_ORBIT_FOREGROUND_DEPTH

        const visibleFactor = Math.max(0, Math.min(1, (relY + 0.05 + 0.12) / 0.12))
        const hintOpacity = Math.max(0, 1 - visibleFactor)

        const color = slot.role ? PLANET_ROLES[slot.role].color : '#888888'
        const isTurret = slot.role === 'turret_planet'

        const planetImage = slot.role ? PLANET_ROLES[slot.role].image : '/img/planets/planet.png'

        const currentHp = slot.currentHp ?? PLANET_SLOT_MAX_HP
        const maxHp = slot.maxHp ?? PLANET_SLOT_MAX_HP
        const hpPercent = (currentHp / Math.max(maxHp, 1)) * 100
        const isHealing = Date.now() < (slot.healingUntilMs ?? 0)

        // Zerstört: Der Planet bleibt sichtbar, aber ausgegraut — gleiche
        // Darstellung wie ein gefallener Champion im ChampionOrbit; die HP-Zahl
        // weicht dem Respawn-Countdown.
        const isDown = isPlanetDown(slot)
        const downSecs = isDown
          ? Math.max(0, Math.ceil((slot.downUntilMs - Date.now()) / 1000))
          : 0

        const jb = slot.jungleBuff
        const isJungleBuffed = !!jb?.active
        const jungleBuffSecsLeft = isJungleBuffed
          ? Math.max(0, (jb!.activeUntil - Date.now()) / 1000)
          : 0
        const jungleBuffType = jb?.buffType ?? ''
        const jungleBuffDurationMs = slot.role ? JUNGLE_BUFF_DEFS[slot.role].durationMs : 0
        const jungleBuffProgress = jungleBuffDurationMs > 0
          ? Math.min(1, (jungleBuffSecsLeft * 1000) / jungleBuffDurationMs)
          : 0

        const slotNum = parseInt(slot.id.replace('slot_', ''), 10) - 1

        const hPlanetId = uiStore.hoveredPlanetSlotId
        // Dim when focusing a champion or a star (all planets recede) or
        // another planet.
        const isDimmed =
          starGroupStore.hoveredTimerStarId !== null ||
          uiStore.hoveredChampionRole !== null ||
          (hPlanetId !== null && slot.id !== hPlanetId)

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
          isDown,
          downSecs,
          zIndex,
          color,
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
          jungleBuffProgress,
          jungleBuffType,
          slotNum,
          isDimmed,
        })
      }

      for (const key of localStates.keys()) {
        if (!purchased.some((s) => s.id === key)) {
          localStates.delete(key)
          planetSpeedMuls.delete(key)
          planetOrbitPhases.delete(key)
        }
      }

      // Positionen und Eclipse-Status gehen IMMER raus: der Kampf (foregroundGate),
      // das Command Panel und der Planeten-Tab lesen sie auch dann, wenn dieser
      // Layer gerade unter dem Bard-Profil verdeckt ist.
      for (const pos of newPositions) {
        // Zerstörte Planeten bleiben sichtbar (ausgegraut), zählen aber nicht
        // als Kampfobjekte: kein Ziel für Salven, kein Turret-Schütze und kein
        // Empfänger von Jungle-Buffs oder Heilung.
        if (pos.isDown) {
          activePlayerPlanetPositions.delete(pos.id)
          continue
        }
        activePlayerPlanetPositions.set(pos.id, {
          cx: pos.x,
          cy: pos.y,
          isForeground: pos.isForeground,
        })
      }
      for (const key of activePlayerPlanetPositions.keys()) {
        if (!newPositions.some((p) => p.id === key)) activePlayerPlanetPositions.delete(key)
      }

      // Ab hier nur noch Sichtbares. Unter dem Bard-Profil endet der Frame: kein
      // Vue-Re-Render, kein Canvas-Paint, keine Projektil-Choreografie — nur die
      // Orbit-Mathematik oben ist gelaufen.
      if (isIdleRenderingPaused.value) {
        animFrame = requestAnimationFrame(animate)
        return
      }

      renderPositions.value = newPositions

      const tierCount = ORBIT_TIERS.planet.length
      for (let i = 0; i < tierCount; i++) {
        const behind = newPositions.some(
          (_, si) => si % tierCount === i && newPositions[si].isBehind,
        )
        if (tierIsBehind.value[i] !== behind) tierIsBehind.value[i] = behind
      }

      // ── Turret-Projektile weiterbewegen (Abschuss triggert der geteilte
      //    Volley-Counter aus dem planetBossStore, siehe watch unten) ─────────
      if (!reducedMotion) {
        tickShots(dt)
      }
      drawTurretRings(newPositions)
      // ─────────────────────────────────────────────────────────────────────────

      animFrame = requestAnimationFrame(animate)
    }

    const { isIdleRenderingPaused, isIdleSimulationPaused } = useRenderingPaused()

    // Gestoppt wird nur bei echtem Stillstand. Ein offenes Bard-Profil hält den
    // Loop am Leben — er läuft dann headless (siehe Ausstieg oben).
    watch(isIdleSimulationPaused, (paused) => {
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
      window.addEventListener('resize', sizeTurretRingCanvas)
      sizeTurretRingCanvas()
      animFrame = requestAnimationFrame(animate)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', updateScreenCenter)
      window.removeEventListener('resize', sizeTurretRingCanvas)
      cancelAnimationFrame(animFrame)
    })

    const screenW = computed(() => screenCx.value * 2)
    const screenH = computed(() => screenCy.value * 2)

    return {
      planetShopStore,
      turretRingCanvas,
      hoveredChampionRole,
      hoveredPlanetSlotId,
      hoveredPlanetTier,
      starFocusActive,
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

/* ── Turret-Cooldown-Ring-Canvas — ein Layer über allen Planeten ─────────── */
.planet-turret-ring-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 16;
}

.planet-orbit-item--behind {
  filter: blur(2px) brightness(0.7) saturate(0.5);
  transition: filter 0.25s ease;
  pointer-events: none;
}

.planet-orbit-item--healing {
  animation: slotHeal 0.9s ease-out;
}

/* ── Zerstört: bleibt in der Bahn, aber ausgegraut ─────────────────────────
   Exakt die Behandlung eines gefallenen Champions (champion-orbit-avatar--down):
   entsättigt, abgedunkelt, roter Schimmer, alle laufenden Effekt-Animationen
   aus — der Planet ist sichtbar da, aber erkennbar außer Gefecht. */
.planet-orbit-item--down {
  filter: grayscale(1) brightness(0.55) !important;
  animation: none !important;
}

.planet-orbit-item--down .planet-orbit-portrait {
  filter: drop-shadow(0 0 8px rgba(120, 20, 20, 0.55));
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
  transition: opacity 150ms ease;
}

/* Hover-Fokus: blendet mit dem Planeten-Portrait aus */
.planet-hp-wrap--dimmed {
  opacity: var(--hover-dim-opacity, 0.08);
}

/* Äußerer Rahmen – graviertes Metall */
.planet-hp-bar-track {
  position: relative;
  width: 100%;
  height: 5px;
  background: #0a0806;
  border: 1px solid #6b4a1e;
  border-radius: 3px;
  box-shadow:
    0 0 0 1px #1a0f04,
    inset 0 1px 2px rgba(0, 0, 0, 0.8),
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
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-shadow:
    0 0 3px rgba(232, 160, 20, 0.6),
    0 1px 2px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

/* Zerstört: Restzeit statt HP-Zahl — gleiche Sprache wie champ-hp-text--down */
.planet-hp-text--down {
  color: #ff6050;
  text-shadow:
    0 0 4px rgba(255, 60, 40, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.95);
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

/* ── Jungle Buff — Countdown-Chip ─────────────────────────────────────────
   Runder Chip im Stil des Champion-Ability-Badges: dunkler Grund, Jungle-
   Icon innen, konischer Ring außen, der mit der Restdauer abschmilzt.
   Feste px-Größe, damit er auf allen Desktop-Auflösungen lesbar bleibt. */
.planet-status-badge-anchor {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}

.planet-status-badge-anchor--dimmed {
  opacity: var(--hover-dim-opacity, 0.08);
}

.planet-buff-chip {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(22, 42, 26, 0.96), rgba(6, 14, 8, 0.96));
  display: grid;
  place-items: center;
  box-shadow:
    0 0 8px rgba(92, 230, 106, 0.55),
    0 0 18px rgba(92, 230, 106, 0.25),
    0 2px 5px rgba(0, 0, 0, 0.55);
}

/* Countdown-Ring: conic-gradient, per Maske auf einen Ring reduziert */
.planet-buff-chip::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(
    #5ce66a calc(var(--buff-progress, 1) * 360deg),
    rgba(92, 230, 106, 0.14) 0
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
  filter: drop-shadow(0 0 4px rgba(92, 230, 106, 0.7));
}

.planet-buff-chip img {
  width: 17px;
  height: 17px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 3px rgba(92, 230, 106, 0.7));
}

.planet-buff-secs {
  position: absolute;
  top: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 800;
  color: #5ce66a;
  line-height: 1;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 5px rgba(92, 230, 106, 0.8),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

/* Endet gleich: Ring + Text kippen auf Rot und blinken */
.planet-buff-chip--urgent::before {
  background: conic-gradient(
    #ff5040 calc(var(--buff-progress, 1) * 360deg),
    rgba(255, 80, 64, 0.16) 0
  );
  filter: drop-shadow(0 0 4px rgba(255, 64, 64, 0.8));
  animation: timer-urgent-blink 0.5s ease-in-out infinite;
}

.planet-buff-chip--urgent .planet-buff-secs {
  color: #ff5040;
  text-shadow:
    0 0 6px rgba(255, 40, 40, 0.95),
    0 1px 2px rgba(0, 0, 0, 0.9);
  animation: timer-urgent-blink 0.5s ease-in-out infinite;
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
  .planet-buff-chip--urgent::before,
  .planet-buff-chip--urgent .planet-buff-secs {
    animation: none;
  }
  .status-badge-enter-active,
  .status-badge-leave-active {
    animation: none;
  }
}

/* ── Hover-Fokus: gehoverter Planet klar hervorgehoben ────────────────────
   Spiegelt das Champion-Hover-Verhalten: steht am Ende des Stylesheets,
   damit der filter auch den Behind-Blur überschreibt — der Planet bleibt
   dadurch auch hinter der Sonne deutlich sichtbar. Das !important auf
   opacity übersteuert die per Frame gesetzte Inline-Tiefen-Opacity. */
.planet-orbit-item--hover-focus {
  filter: brightness(1.2) saturate(1.15)
    drop-shadow(0 0 12px color-mix(in srgb, var(--planet-color, #c89040) 75%, transparent)) !important;
  opacity: 1 !important;
}

</style>
