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

  <div
    class="planet-orbit-layer planet-orbit-back"
    aria-hidden="true"
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
      :style="itemStyle(pos)"
      :ref="(el) => setMapEl(backItemEls, pos.id, el)"
    >
      <img
        :src="pos.planetImage"
        :alt="pos.name"
        draggable="false"
        class="planet-orbit-portrait"
      />
    </div>
  </div>

  <div
    class="planet-orbit-layer planet-orbit-front"
    :style="{ '--buff-mark-gap': PLANET_BUFF_MARK_GAP_PX + 'px' }"
  >
    <!-- Jungle Buff — Aura hinter dem Planeten.
         Eigenes Element statt eines Effekts am Item: .planet-orbit-item ist
         kreisrund geclippt (overflow: hidden), alles Ausgreifende würde dort
         abgeschnitten. Liegt eine Ebene unter dem Planeten, damit die Wellen
         hinter ihm hervorlaufen statt über sein Portrait. -->
    <template v-for="pos in frontPlanets" :key="'aura-' + pos.id">
      <div
        v-if="pos.isJungleBuffed && !pos.isDown"
        class="planet-buff-aura"
        :style="auraStyle(pos)"
        :ref="(el) => setMapEl(auraEls, pos.id, el)"
        aria-hidden="true"
      >
        <span class="planet-buff-aura__halo" />
        <span class="planet-buff-aura__wave" />
        <span class="planet-buff-aura__wave planet-buff-aura__wave--late" />
      </div>
    </template>

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
      :style="itemStyle(pos)"
      :ref="(el) => setMapEl(frontItemEls, pos.id, el)"
    >
      <img
        :src="pos.planetImage"
        :alt="pos.name"
        draggable="false"
        class="planet-orbit-portrait"
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
      :style="hpWrapStyle(pos)"
      :ref="(el) => setMapEl(hpWrapEls, pos.id, el)"
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

    <!-- Jungle Buff — Statusmarke an der Leine über dem Planeten.
         Dieselbe Grammatik wie Fluch und Rage am Stern (StarSystemComponent):
         eine Marke, die an einer kurzen Leine über dem Objekt hängt, den Namen
         des Zustands trägt und die Restzeit zeigt. Oben statt seitlich, weil
         unter dem Planeten schon die HP-Leiste liegt. -->
    <template v-for="pos in frontPlanets" :key="'jbuff-' + pos.id">
      <div
        class="planet-buff-anchor"
        :style="anchorStyle(pos)"
        :ref="(el) => setMapEl(anchorEls, pos.id, el)"
      >
        <Transition name="planet-buff">
          <div v-if="pos.isJungleBuffed && !pos.isDown" class="planet-buff-stack">
            <div
              class="planet-buff-mark"
              :class="{
                'planet-buff-mark--urgent': pos.jungleBuffSecsLeft < PLANET_BUFF_URGENT_SECS,
              }"
            >
              <!-- Iconify statt des Rollen-PNGs: das Portrait bringt eigenes
                   Orange mit und bräche die grüne Marke. Dasselbe Vorgehen wie
                   bei der Fluchmarke am Stern, die ihr Icon einfärbt. -->
              <Icon
                icon="game-icons:thorny-vine"
                class="planet-buff-mark__icon"
                width="15"
                height="15"
                aria-hidden="true"
              />
              <span class="planet-buff-mark__label">{{ pos.jungleBuffType }}</span>
              <span class="planet-buff-mark__mult">×{{ pos.jungleBuffMult }}</span>
              <span class="planet-buff-mark__secs">{{ Math.ceil(pos.jungleBuffSecsLeft) }}s</span>
              <!-- Restdauer als abschmelzende Zündschnur am Fuß der Marke.
                   Bewusst ein inline gesetzter scaleX-Transform am Balken selbst
                   statt einer CSS-Variable am Container: eine Variable würde bei
                   jedem Frame den kompletten Subtree neu berechnen lassen, der
                   Transform bleibt reine Compositor-Arbeit. -->
              <span
                class="planet-buff-mark__fuse"
                :style="{ transform: `scaleX(${pos.jungleBuffProgress})` }"
                :ref="(el) => setMapEl(fuseEls, pos.id, el)"
              />
            </div>
            <span class="planet-buff-leash" />
          </div>
        </Transition>
      </div>
    </template>

  </div>
</template>

<script lang="ts">
import { getOrbitBodyScale, getOrbitPos } from '@/utils/orbit/geometry'
import { Icon } from '@iconify/vue'
import { defineComponent, ref, shallowRef, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  JUNGLE_BUFF_DEFS,
  isPlanetDown,
} from '@/stores/world/planetShopStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import {
  ORBIT_TIERS,
  PLANET_SLOT_MAX_HP,
  BEHIND_SUN_SPEED_MULTIPLIER,
  HOVER_DIM_OPACITY,
  HOVER_DIM_FADE_MS,
  GAME_TICK_INTERVAL_MS,
  PLANET_ORBIT_FOREGROUND_DEPTH,
  PLANET_BUFF_MARK_GAP_PX,
  PLANET_BUFF_URGENT_SECS,
  ORBIT_MAX_RX_VIEWPORT_FRACTION,
  ORBIT_BEHIND_REL_Y,
  ORBIT_BEHIND_FADE_BAND,
  ORBIT_BEHIND_SPEED_LERP,
  ORBIT_RING_MIN_OPACITY,
  PLANET_ORBIT_POSITION_LERP,
  PLANET_ORBIT_KEPLER_BOOST,
  PLANET_ORBIT_PARALLAX_SCALE_BASE,
  PLANET_ORBIT_PARALLAX_SCALE_SPAN,
  PLANET_ORBIT_MIN_RY_SUN_FACTORS,
  PLANET_ORBIT_MIN_RY_VIEWPORT_FACTORS,
  PLANET_ORBIT_OPACITY_BEHIND_BASE,
  PLANET_ORBIT_OPACITY_BEHIND_SPAN,
  PLANET_ORBIT_OPACITY_FRONT_BASE,
  PLANET_ORBIT_OPACITY_FRONT_SPAN,
  COOLDOWN_RING_MIN_PROGRESS,
  COOLDOWN_RING_HOT_PROGRESS,
  COOLDOWN_RING_TIP_RADIUS,
  COOLDOWN_RING_TIP_RADIUS_HOT,
  ORBIT_SCALE_QUANTIZE_STEPS,
  FRAME_EL_SWEEP_INTERVAL,
} from '@/config/constants'
import { setMapEl, sweepMapEls } from '@/utils/orbit/frameEls'
import { useUiStore } from '@/stores/core/uiStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { activePlanetPositions, activePlayerPlanetPositions } from '@/utils/orbit/liveState'
import { planetOrbitPhases } from '@/utils/orbit/planetOrbitPhase'
import OrbitPath from './OrbitPath.vue'
import { useProjectileSystem } from '@/composables/orbit/useProjectileSystem'
import { useOrbitScale } from '@/composables/orbit/useOrbitScale'

const MIN_SHOT_DISTANCE = 32

interface PlanetRenderPos {
  id: string
  name: string
  x: number
  y: number
  /**
   * Ungeschrumpfte Kantenlänge — steht als width/height am Element und ändert
   * sich nur mit dem Sonnenradius. Die Parallax-Verkleinerung fährt `scale`
   * im transform, damit pro Frame kein Layout anfällt.
   */
  baseSize: number
  /** Parallax-Faktor auf 1 %-Stufen quantisiert. */
  scale: number
  /** Effektive Kantenlänge (baseSize × scale) — für Abstände und Ring-Radien. */
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
  jungleBuffMult: string
  slotNum: number
  /** Hover-Fokus-Blende, 1 = voll sichtbar, HOVER_DIM_OPACITY = ausgeblendet */
  dimFactor: number
}

interface LocalPlanetState {
  id: string
  orbitAngle: number
  x: number
  y: number
}

export default defineComponent({
  name: 'PlanetOrbit',
  components: { OrbitPath, Icon },
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
    // shallowRef: die Positionsfelder werden pro Frame in-place mutiert, ohne
    // dass Vue aufwacht — ein neues Array kommt nur bei Strukturwechsel.
    const renderPositions = shallowRef<PlanetRenderPos[]>([])

    // ── Per-Frame-DOM-Updates am Vue-Rendering vorbei ────────────────────────
    // Dasselbe Muster wie in StarSystemComponent und ChampionOrbit: Vue rendert
    // nur bei struktureller Änderung (Planet kommt/geht, Ebenenwechsel,
    // Zustandsklasse, HP-Zahl, Buff-Sekunde), die Bewegung schreibt
    // applyFrames() direkt auf die registrierten Elemente. Ein Planet trägt
    // fünf mitwandernde Ebenen (Körper, Aura, HP-Leiste, Marke, Zündschnur) —
    // pro Frame ein VNode-Diff über alle sechs Slots war der zweitgrößte
    // Posten des Idle-Orbits.
    const backItemEls = new Map<string, HTMLElement>()
    const frontItemEls = new Map<string, HTMLElement>()
    const auraEls = new Map<string, HTMLElement>()
    const hpWrapEls = new Map<string, HTMLElement>()
    const anchorEls = new Map<string, HTMLElement>()
    const fuseEls = new Map<string, HTMLElement>()
    const ALL_EL_MAPS: Map<string, Element>[] = [
      backItemEls,
      frontItemEls,
      auraEls,
      hpWrapEls,
      anchorEls,
      fuseEls,
    ]
    let sweepCounter = 0
    /** Zuletzt geschriebener z-index je Slot — er wechselt nur stufenweise. */
    const lastZIndex = new Map<string, number>()

    // Weiche Hover-Blende OHNE CSS-Transition: der Wert wird pro Slot gehalten,
    // im Frame Richtung Ziel gezogen und in die ohnehin pro Frame gesetzte
    // Inline-Opacity gerechnet — siehe HOVER_DIM_FADE_MS.
    const dimFactors = new Map<string, number>()
    const DIM_SPAN = Math.max(0.001, 1 - HOVER_DIM_OPACITY)

    function stepDimFactor(id: string, dimmed: boolean, dt: number): number {
      const target = dimmed ? HOVER_DIM_OPACITY : 1
      const current = dimFactors.get(id) ?? target
      const maxStep = (dt / HOVER_DIM_FADE_MS) * DIM_SPAN
      const diff = target - current
      const next = Math.abs(diff) <= maxStep ? target : current + Math.sign(diff) * maxStep
      dimFactors.set(id, next)
      return next
    }

    const tierIsBehind = ref<boolean[]>(ORBIT_TIERS.planet.map(() => false))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Der geteilte AttackProjectileLayer holt sich die Schuss-Liste selbst —
    // hier bleiben nur Abschuss und Flugtakt.
    const { spawnShot, tickShots } = useProjectileSystem()
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

    /** Breite der HP-Leiste — folgt der ungeschrumpften Planetengröße. */
    function hpWrapWidth(pos: PlanetRenderPos): number {
      return Math.max(pos.baseSize, 48)
    }

    function bodyTransform(pos: PlanetRenderPos): string {
      const half = pos.baseSize / 2
      return `translate(${(pos.x - half).toFixed(1)}px, ${(pos.y - half).toFixed(1)}px) scale(${pos.scale})`
    }

    function hpWrapTransform(pos: PlanetRenderPos): string {
      const x = pos.x - hpWrapWidth(pos) / 2
      const y = pos.y + pos.size / 2 + 5
      return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    }

    function anchorTransform(pos: PlanetRenderPos): string {
      return `translate(${pos.x.toFixed(1)}px, ${(pos.y - pos.size / 2).toFixed(1)}px)`
    }

    // Initialstile für einen Vue-Render — pro Frame überschreibt applyFrames sie.
    function itemStyle(pos: PlanetRenderPos) {
      return {
        width: pos.baseSize + 'px',
        height: pos.baseSize + 'px',
        transform: bodyTransform(pos),
        opacity: pos.opacity * pos.dimFactor,
        zIndex: pos.isBehind ? undefined : pos.zIndex,
        '--planet-color': pos.color,
      }
    }

    function auraStyle(pos: PlanetRenderPos) {
      return {
        width: pos.baseSize + 'px',
        height: pos.baseSize + 'px',
        transform: bodyTransform(pos),
        opacity: pos.opacity * pos.dimFactor,
        zIndex: pos.zIndex - 1,
      }
    }

    function hpWrapStyle(pos: PlanetRenderPos) {
      return {
        transform: hpWrapTransform(pos),
        width: hpWrapWidth(pos) + 'px',
        opacity: pos.dimFactor,
        zIndex: pos.zIndex,
      }
    }

    function anchorStyle(pos: PlanetRenderPos) {
      return {
        transform: anchorTransform(pos),
        opacity: pos.dimFactor,
        zIndex: pos.zIndex + 2,
      }
    }

    function applyFrames(positions: PlanetRenderPos[]) {
      if (++sweepCounter >= FRAME_EL_SWEEP_INTERVAL) {
        sweepCounter = 0
        sweepMapEls(ALL_EL_MAPS)
        const alive = new Set(positions.map((p) => p.id))
        for (const id of lastZIndex.keys()) {
          if (!alive.has(id)) lastZIndex.delete(id)
        }
      }

      for (const pos of positions) {
        const transform = bodyTransform(pos)
        const opacity = (pos.opacity * pos.dimFactor).toFixed(3)
        const dim = pos.dimFactor.toFixed(3)
        // z-index wechselt nur stufenweise — jedes Schreiben sortiert die
        // Paint-Reihenfolge neu, deshalb nur bei echtem Wechsel.
        const zChanged = lastZIndex.get(pos.id) !== pos.zIndex
        if (zChanged) lastZIndex.set(pos.id, pos.zIndex)

        const body = pos.isBehind ? backItemEls.get(pos.id) : frontItemEls.get(pos.id)
        if (body) {
          body.style.transform = transform
          body.style.opacity = opacity
          if (zChanged && !pos.isBehind) body.style.zIndex = String(pos.zIndex)
        }

        const aura = auraEls.get(pos.id)
        if (aura) {
          aura.style.transform = transform
          aura.style.opacity = opacity
          if (zChanged) aura.style.zIndex = String(pos.zIndex - 1)
        }

        const hp = hpWrapEls.get(pos.id)
        if (hp) {
          hp.style.transform = hpWrapTransform(pos)
          hp.style.opacity = dim
          if (zChanged) hp.style.zIndex = String(pos.zIndex)
        }

        const anchor = anchorEls.get(pos.id)
        if (anchor) {
          anchor.style.transform = anchorTransform(pos)
          anchor.style.opacity = dim
          if (zChanged) anchor.style.zIndex = String(pos.zIndex + 2)
        }

        const fuse = fuseEls.get(pos.id)
        if (fuse) fuse.style.transform = `scaleX(${pos.jungleBuffProgress.toFixed(3)})`
      }
    }

    /**
     * Alles, was das Template liest und NICHT pro Frame läuft. Ändert sich der
     * Schlüssel, rendert Vue neu — sonst bleibt der Baum stehen.
     */
    function structureKey(positions: PlanetRenderPos[]): string {
      let key = ''
      for (const p of positions) {
        key +=
          p.id +
          (p.isBehind ? '1' : '0') +
          (p.isForeground ? '1' : '0') +
          (p.isTurret ? '1' : '0') +
          (p.isHealing ? '1' : '0') +
          (p.isJungleBuffed ? '1' : '0') +
          (p.isDown ? '1' : '0') +
          p.downSecs +
          '_' +
          Math.round(p.baseSize) +
          '_' +
          Math.round(p.currentHp) +
          '/' +
          p.maxHp +
          '_' +
          p.jungleBuffType +
          p.jungleBuffMult +
          Math.ceil(p.jungleBuffSecsLeft) +
          '_' +
          p.color +
          p.planetImage +
          ';'
      }
      return key
    }

    let lastStructureKey = ''

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
        if (!pos.isTurret || pos.isBehind || pos.isDown || pos.opacity <= ORBIT_RING_MIN_OPACITY)
          continue
        const r = pos.size / 2 + 8
        const alpha = pos.opacity
        drewAny = true

        // Leise Spur, damit der Ring auch bei wenig Fortschritt lesbar ist
        c.beginPath()
        c.arc(pos.x, pos.y, r, 0, TWO_PI)
        c.strokeStyle = `rgba(204,68,68,${0.12 * alpha})`
        c.lineWidth = 2
        c.stroke()

        if (progress <= COOLDOWN_RING_MIN_PROGRESS) continue
        const start = -Math.PI / 2
        const end = start + progress * TWO_PI
        const hot = progress > COOLDOWN_RING_HOT_PROGRESS
        c.beginPath()
        c.arc(pos.x, pos.y, r, start, end)
        c.strokeStyle = hot ? `rgba(255,150,140,${0.9 * alpha})` : `rgba(220,90,80,${0.55 * alpha})`
        c.lineWidth = 2
        c.lineCap = 'round'
        c.stroke()

        // Glüh-Spitze am Ende des Bogens
        if (progress < 1) {
          c.beginPath()
          c.arc(
            pos.x + Math.cos(end) * r,
            pos.y + Math.sin(end) * r,
            hot ? COOLDOWN_RING_TIP_RADIUS_HOT : COOLDOWN_RING_TIP_RADIUS,
            0,
            TWO_PI,
          )
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
        const baseSize = tier.size * getOrbitBodyScale(sunScale)

        const tiltRad = tier.tiltRad
        const rawRy = tier.ry * sunScale * orbitScaleVal
        const vMin = Math.min(window.innerWidth, window.innerHeight)
        const minRy = Math.max(
          planetShopStore.orbitSunRadius *
            PLANET_ORBIT_MIN_RY_SUN_FACTORS[slotIdx % PLANET_ORBIT_MIN_RY_SUN_FACTORS.length],
          vMin *
            PLANET_ORBIT_MIN_RY_VIEWPORT_FACTORS[
              slotIdx % PLANET_ORBIT_MIN_RY_VIEWPORT_FACTORS.length
            ],
        )
        const flooredRy = Math.max(rawRy, minRy)
        const flooredRx = flooredRy * (tier.rx / tier.ry)
        const maxRx = (window.innerWidth / 2) * ORBIT_MAX_RX_VIEWPORT_FRACTION
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
        const prevIsBehind = prevRelY < ORBIT_BEHIND_REL_Y
        const targetMul = prevIsBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
        const curMul = planetSpeedMuls.get(slot.id) ?? 1.0
        const newMul = curMul + (targetMul - curMul) * ORBIT_BEHIND_SPEED_LERP
        planetSpeedMuls.set(slot.id, newMul)

        if (!reducedMotion) {
          const keplerBoost =
            1.0 + PLANET_ORBIT_KEPLER_BOOST * (1 - Math.abs(Math.cos(ls.orbitAngle)))
          ls.orbitAngle += slot.direction * slot.baseSpeed * keplerBoost * newMul * dt
          const target = getOrbitPos(ls.orbitAngle, rx, ry, tiltRad, cx, cy)
          ls.x += (target.x - ls.x) * PLANET_ORBIT_POSITION_LERP
          ls.y += (target.y - ls.y) * PLANET_ORBIT_POSITION_LERP
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
        const isBehind = relY < ORBIT_BEHIND_REL_Y
        const depth = (relY + 1) / 2

        // Parallax fährt als transform-scale, nicht mehr als width/height: eine
        // Größenänderung in px erzwingt pro Frame Layout, Repaint und — hinter
        // der Sonne — eine Neurasterung des geblurrten Planeten.
        const fixedSize = Math.round(baseSize)
        const rawScale =
          PLANET_ORBIT_PARALLAX_SCALE_BASE + depth * PLANET_ORBIT_PARALLAX_SCALE_SPAN
        const scale =
          Math.round(rawScale * ORBIT_SCALE_QUANTIZE_STEPS) / ORBIT_SCALE_QUANTIZE_STEPS
        const size = fixedSize * scale
        const opacity = isBehind
          ? PLANET_ORBIT_OPACITY_BEHIND_BASE + depth * PLANET_ORBIT_OPACITY_BEHIND_SPAN
          : PLANET_ORBIT_OPACITY_FRONT_BASE + depth * PLANET_ORBIT_OPACITY_FRONT_SPAN
        const zIndex = Math.floor(9 + depth * 6)
        // Geteilte Schwelle: Command Panel und Planeten-Tab richten ihr
        // Eclipse-Medaillon exakt an diesem Wert aus.
        const isForeground = !isBehind && depth > PLANET_ORBIT_FOREGROUND_DEPTH

        const visibleFactor = Math.max(
          0,
          Math.min(1, (relY - ORBIT_BEHIND_REL_Y + ORBIT_BEHIND_FADE_BAND) / ORBIT_BEHIND_FADE_BAND),
        )
        const hintOpacity = Math.max(0, 1 - visibleFactor)

        const color = slot.role ? PLANET_ROLES[slot.role].color : '#888888'
        const isTurret = slot.role === 'turret_planet'

        // Fallback für Slots ohne Rolle: /img/planets/planet.png existiert nicht
        // (der Ordner hat nur planet1–6), das Bild blieb also leer.
        const planetImage = slot.role ? PLANET_ROLES[slot.role].image : '/img/planet-256.png'

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
        // Der Multiplikator ist die eigentliche Aussage des Buffs — glatte Werte
        // ohne Nachkommastelle (×3 statt ×3.0), damit die Marke schmal bleibt.
        const rawMult = jb?.multiplier ?? 0
        const jungleBuffMult = Number.isInteger(rawMult) ? String(rawMult) : rawMult.toFixed(1)

        const slotNum = parseInt(slot.id.replace('slot_', ''), 10) - 1

        const hPlanetId = uiStore.hoveredPlanetSlotId
        // Dim when focusing a champion or a star (all planets recede) or
        // another planet.
        const isDimmed =
          starGroupStore.hoveredTimerStarId !== null ||
          uiStore.hoveredChampionRole !== null ||
          (hPlanetId !== null && slot.id !== hPlanetId)
        const dimFactor = stepDimFactor(slot.id, isDimmed, dt)

        newPositions.push({
          id: slot.id,
          name: slot.role ? PLANET_ROLES[slot.role].name : `Orbit ${slot.id.replace('slot_', '')}`,
          x: ls.x,
          y: ls.y,
          baseSize: fixedSize,
          scale,
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
          jungleBuffMult,
          slotNum,
          dimFactor,
        })
      }

      for (const key of localStates.keys()) {
        if (!purchased.some((s) => s.id === key)) {
          localStates.delete(key)
          planetSpeedMuls.delete(key)
          planetOrbitPhases.delete(key)
          dimFactors.delete(key)
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
        // In place mutieren statt sechs Objektliterale je Frame zu werfen —
        // `r` ist die DARGESTELLTE Halbkante und damit exakt der Körper, gegen
        // den die Void-Berührung prüft.
        let entry = activePlayerPlanetPositions.get(pos.id)
        if (!entry) {
          entry = { cx: 0, cy: 0, isForeground: false, r: 0 }
          activePlayerPlanetPositions.set(pos.id, entry)
        }
        entry.cx = pos.x
        entry.cy = pos.y
        entry.isForeground = pos.isForeground
        entry.r = pos.size / 2
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

      // Vue rendert nur bei struktureller Änderung. Sonst werden die
      // Positionsfelder IN-PLACE geschrieben — so sieht ein Render aus fremdem
      // Anlass (Hover, Buff-Wechsel) immer die aktuelle Bahn, ohne dass hier
      // pro Frame ein VNode-Diff über sechs Slots mal fünf Ebenen anfällt.
      const key = structureKey(newPositions)
      if (key !== lastStructureKey) {
        lastStructureKey = key
        renderPositions.value = newPositions
      } else {
        const prev = renderPositions.value
        for (let i = 0; i < newPositions.length; i++) {
          const n = newPositions[i]
          const o = prev[i]
          if (!o) continue
          o.x = n.x
          o.y = n.y
          o.scale = n.scale
          o.size = n.size
          o.opacity = n.opacity
          o.zIndex = n.zIndex
          o.dimFactor = n.dimFactor
          o.hpPercent = n.hpPercent
          o.hintOpacity = n.hintOpacity
          o.orbitRx = n.orbitRx
          o.orbitRy = n.orbitRy
          o.jungleBuffProgress = n.jungleBuffProgress
          o.jungleBuffSecsLeft = n.jungleBuffSecsLeft
        }
      }

      applyFrames(newPositions)

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
      PLANET_BUFF_MARK_GAP_PX,
      PLANET_BUFF_URGENT_SECS,
      allSlots,
      slotsWithRole,
      backPlanets,
      frontPlanets,
      renderPositions,
      tierIsBehind,
      tierOrbitDimensions,
      screenCx,
      screenCy,
      screenW,
      screenH,
      ORBIT_TIERS,
      PLANET_ROLES,
      itemStyle,
      auraStyle,
      hpWrapStyle,
      anchorStyle,
      setMapEl,
      backItemEls,
      frontItemEls,
      auraEls,
      hpWrapEls,
      anchorEls,
      fuseEls,
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
   Bewusst KEINE CSS-Regel: die Blende rechnet animate() in die ohnehin pro
   Frame gesetzte Inline-Opacity (pos.dimFactor). Eine CSS-Transition auf einem
   Element, das gleichzeitig Position und Größe pro Frame ändert, kostet einen
   eigenen Transparenz-Layer samt Neurasterung je Frame. */

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
  /* Hover-Blende läuft über die Inline-Opacity (pos.dimFactor) */
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

/* ══ Jungle Buff ═══════════════════════════════════════════════════════════
   Übernimmt die Zustands-Grammatik der Sterne (StarSystemComponent, Abschnitt
   „Statuszustände am Stern"): eine Marke an kurzer Leine benennt den Zustand
   und zählt ihn herunter, der Körper selbst trägt nur eine ruhige Färbung.
   Farbe ist das Vorzeichen — Jungle-Grün (#3ecf5a, die Rollenfarbe aus ROLES)
   gegen das Crimson der Rage und das Violett des Fluchs.

   Drei Träger, jeder mit eigener Aufgabe und ohne Überschneidung:
     Aura   → „hier wirkt etwas" (peripher sichtbar, auch ohne Hinsehen)
     Marke  → was genau wirkt und wie stark
     Fuse   → wie lange noch (grob, ohne die Sekundenzahl lesen zu müssen)
   Die HP-Leiste bleibt bewusst unangetastet: sie ist bereits farbcodiert
   (grün/gelb/rot), ein grüner Buff-Rahmen dort läse sich als „volle HP".

   Bewegt werden ausschließlich transform und opacity. Der frühere Zustand
   animierte drop-shadow am Planeten und ein conic-gradient am Chip — beides
   zwingt den Browser, in jedem Frame neu zu rastern, und zwar pro gebufftem
   Planeten. Hier bleibt alles Compositor-Arbeit. */

/* Körper: ruhige, statische Färbung — kein zweiter Puls neben der Aura.
   brightness/saturate sind mitgeführt, weil diese Regel den Filter von
   .planet-orbit-item--foreground vollständig ersetzt. */
.planet-orbit-item--jungle-buffed {
  filter: brightness(1.14) saturate(1.2) drop-shadow(0 0 7px rgba(92, 230, 106, 0.6));
}

/* ── Aura: stehender Halo + zwei nach außen laufende Wellen ──────────────── */
.planet-buff-aura {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  pointer-events: none;
  /* Hover-Blende läuft über die Inline-Opacity (pos.dimFactor) */
}

/* Der stehende Anteil: sitzt direkt am Planetenrand und macht den Zustand
   auch in dem Moment lesbar, in dem gerade keine Welle unterwegs ist. */
.planet-buff-aura__halo {
  position: absolute;
  inset: -8%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 52%,
    rgba(62, 207, 90, 0.28) 70%,
    rgba(62, 207, 90, 0.05) 84%,
    transparent 92%
  );
}

.planet-buff-aura__wave {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(126, 240, 140, 0.85);
  box-shadow: 0 0 10px rgba(62, 207, 90, 0.45);
  /* Kein `will-change`: die laufende Animation holt sich ihre Ebene ohnehin.
     Vorgezogen belegten die beiden Wellen JEDES gebufften Planeten dauerhaft
     zwei Ebenen — zwölf allein hierfür, und das Compositing-Budget ist die
     knappe Ressource, an der am Ende alle Animationen hängen. */
  animation: planet-buff-wave 2.6s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
}

/* Zweite Welle über einen negativen Delay: sie startet nicht erst nach der
   ersten, sondern läuft von Beginn an um die halbe Periode versetzt mit. */
.planet-buff-aura__wave--late {
  animation-delay: -1.3s;
}

@keyframes planet-buff-wave {
  0% {
    transform: scale(1);
    opacity: 0;
  }
  12% {
    opacity: 0.9;
  }
  100% {
    transform: scale(1.75);
    opacity: 0;
  }
}

/* ── Marke: hängt an kurzer Leine über dem Planeten ─────────────────────── */
.planet-buff-anchor {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  /* Hover-Blende läuft über die Inline-Opacity (pos.dimFactor) */
}

/* Am Ankerpunkt (obere Planetenkante) unten verankert und nach oben wachsend —
   so bleibt der Abstand zum Planeten konstant, egal wie hoch die Marke baut. */
.planet-buff-stack {
  position: absolute;
  left: 0;
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.planet-buff-mark {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 5px;
  white-space: nowrap;
  background: linear-gradient(to bottom, rgba(12, 32, 16, 0.94), rgba(5, 16, 8, 0.94));
  border: 1px solid rgba(62, 207, 90, 0.75);
  border-radius: 4px;
  box-shadow:
    0 0 12px rgba(62, 207, 90, 0.28),
    inset 0 0 0 1px rgba(62, 207, 90, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.planet-buff-mark__icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: #7ef08c;
  filter: drop-shadow(0 0 4px rgba(92, 230, 106, 0.75));
}

.planet-buff-mark__label {
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  /* Buffnamen sind lang ("Scavenger's Blessing") — engere Sperrung als bei den
     Sternmarken, damit die Marke nicht deutlich breiter wird als der Planet. */
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b6f5c2;
  text-shadow:
    0 0 8px rgba(62, 207, 90, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Der Multiplikator ist die Aussage des Buffs und bekommt deshalb die
   stärkste Farbe — abgesetzt durch einen eigenen dunklen Grund. */
.planet-buff-mark__mult {
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  color: #0a1a0c;
  background: linear-gradient(to bottom, #7ef08c, #3ecf5a);
  box-shadow: 0 0 8px rgba(62, 207, 90, 0.5);
}

.planet-buff-mark__secs {
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  /* Tabellenziffern: die Marke darf beim Herunterzählen nicht zappeln */
  font-variant-numeric: tabular-nums;
  color: #5ce66a;
  text-shadow:
    0 0 8px rgba(62, 207, 90, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Zündschnur am Fuß der Marke: läuft von voll nach leer, transform-origin
   links, damit sie von rechts abbrennt. scaleX kommt pro Frame inline. */
.planet-buff-mark__fuse {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  transform-origin: left center;
  background: linear-gradient(to right, #3ecf5a, #7ef08c);
  box-shadow: 0 0 6px rgba(126, 240, 140, 0.8);
}

/* Leine zum Planeten — verjüngt sich nach unten wie die Leine am Stern */
.planet-buff-leash {
  width: 1px;
  height: var(--buff-mark-gap, 18px);
  background: linear-gradient(
    to bottom,
    rgba(62, 207, 90, 0.75) 0%,
    rgba(62, 207, 90, 0.3) 60%,
    transparent 100%
  );
}

/* Letzte Sekunden: die Marke blinkt, bleibt aber grün. Ein Umschlag auf Rot
   wäre hier falsch — direkt über der HP-Leiste läse sich der auslaufende Buff
   als Schadensmeldung, obwohl gar nichts zu tun ist. */
.planet-buff-mark--urgent {
  animation: planet-buff-urgent 0.6s ease-in-out infinite;
}

@keyframes planet-buff-urgent {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.planet-buff-enter-active {
  animation: planet-buff-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.planet-buff-leave-active {
  animation: planet-buff-in 0.18s ease-in reverse both;
}

@keyframes planet-buff-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(7px) scale(0.86);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .planet-buff-aura__wave,
  .planet-buff-mark--urgent {
    animation: none;
  }
  /* Ohne Wellen trägt der stehende Halo den Zustand allein */
  .planet-buff-aura__wave {
    opacity: 0.55;
  }
  .planet-buff-enter-active,
  .planet-buff-leave-active {
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
