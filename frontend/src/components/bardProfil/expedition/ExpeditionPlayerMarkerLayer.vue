<script setup lang="ts">
/**
 * Bard auf der Live-Platte — der einzige Körper, der sich dort bewegt.
 *
 * Die Platte darunter ist ein STANDBILD und bleibt eines; was wandert, ist DOM.
 * Der Kurs ist ein statisches SVG und wird nur beim Etappenwechsel neu gelegt,
 * der Körper bekommt pro Frame EINEN `transform` — Ort und Kurswinkel in einem
 * Schreibvorgang.
 *
 * Die Position kommt IMMER frisch aus `gameNow()` und wird nie fortgeschrieben:
 * damit ist der Flug zeitraffer-treu und übersteht Reiterwechsel und Reload.
 * Gerechnet wird auf der GEBOGENEN Bahn, nicht auf der Sehne — sonst liefe der
 * Körper neben seinem eigenen Kurs.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { gameNow } from '@/utils/game/gameClock'
import { galaxyStarDots } from '@/utils/game/galaxyStarDots'
import { playerLeg, playerTravelProgress } from '@/utils/game/playerGalaxyPos'
import SunOrb from '@/components/ui/SunOrb.vue'
import { sunBodyFor } from '@/utils/fx/sunBodySprite'
import { drawStarBody } from '@/utils/fx/starBodyCanvas'
import { drawRoleStar, rolePaletteFromHex } from '@/components/bottom/minimap/minimapDraw'
import {
  COMET_PHASE_DATA,
  LANDMARK_ROLE_CORE,
  LANDMARK_FREED_CORE,
  MINIMAP_FLIGHTPATH_BEND,
  PLAYER_MARKER_HALO_EDGE,
  PLAYER_MARKER_HALO_FILL_ALPHA,
  PLAYER_MARKER_HALO_PERIOD_MS,
  PLAYER_MARKER_HALO_SCALE,
  PLAYER_MARKER_COMET_FRAME_CORNER_PX,
  PLAYER_MARKER_COMET_FRAME_SCALE,
  PLAYER_MARKER_COMET_FRAME_STROKE_PX,
  VOYAGE_LIVE_PLAYER_BOX_PX,
  VOYAGE_LIVE_PLAYER_TAIL_PX,
  VOYAGE_LIVE_PLAYER_TAIL_H_PX,
  VOYAGE_LIVE_TARGET_R_PX,
  ROLE_COLORS,
  STAR_BODY_SPRITE_SPAN,
} from '@/config/constants'
import type { FitBox } from '@/utils/fx/galaxyPlate'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

const props = defineProps<{
  record: CompletedGalaxyRecord
  box: FitBox
  /** Bühnenmasse — das SVG spannt über die ganze Bühne, nicht über die Box. */
  width: number
  height: number
  /** Der Reiter bleibt gemountet; ohne das liefe die Schleife im Hintergrund. */
  visible: boolean
  /** Sekundentakt der Bühne — der Rückfallweg bei reduzierter Bewegung. */
  now: number
}>()

const galaxyStore = useGalaxyStore()
const starGroupStore = useStarGroupStore()
const solarStore = useSolarUpgradeStore()
const { isRenderingPaused } = useRenderingPaused()

const playerBody = computed(() => sunBodyFor(solarStore, solarStore.solarSignature))

/** Dieselbe Quelle wie `paintGalaxy` — beide setzen so denselben Punkt. */
const geometry = computed(() => {
  const attempts = props.record.attemptResults.length
  const { spawn, dots } = galaxyStarDots(props.record.mapSeed, attempts, props.record.starPositions)
  return { spawn, dots, attempts }
})

/**
 * Der nächste Stern bleibt verborgen, bis eine Rolle für ihn steht — die Karte
 * enthüllt nichts, was noch vor dem Schiff liegt. Der Bossstern im Kern ist
 * davon ausgenommen: dorthin führt der letzte Flug ohne Wahl.
 */
const revealed = computed(
  () =>
    galaxyStore.travelingToGalaxyBoss ||
    (!!galaxyStore.nextStarRole && !galaxyStore.pendingRoleSelection),
)

const leg = computed(() => {
  const g = geometry.value
  const { from, target } = playerLeg(g.spawn, g.dots, g.attempts, galaxyStore)
  return { from, target: revealed.value ? target : null }
})

/** Der Körper ruht im Kern, sobald der Bossstern dran ist. */
const docked = computed(() => galaxyStore.bossPhaseActive || galaxyStore.isComplete)

const targetTint = computed(() => {
  const role = galaxyStore.nextStarRole
  if (galaxyStore.travelingToGalaxyBoss || !role) return LANDMARK_FREED_CORE
  return LANDMARK_ROLE_CORE[role] ?? LANDMARK_FREED_CORE
})

/** Same destination body as the minimap; only the target marker is painted here. */
const targetStar = computed(() =>
  starGroupStore.activeStars.find((star) => star.starType === 'champion'),
)
const targetBodyVisible = computed(() => !!targetPos.value && !galaxyStore.travelingToGalaxyBoss)
const targetBodyPx = VOYAGE_LIVE_TARGET_R_PX * 2
const targetCanvasPx = targetBodyPx * STAR_BODY_SPRITE_SPAN
const targetCanvasSize = `${targetCanvasPx}px`
const targetCanvas = ref<HTMLCanvasElement | null>(null)

function paintTargetBody() {
  const el = targetCanvas.value
  if (!el || !targetBodyVisible.value) return

  const size = targetCanvasPx
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.max(1, Math.round(size * dpr))
  el.height = Math.max(1, Math.round(size * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)

  const center = size / 2
  const star = targetStar.value
  if (star) {
    drawStarBody(ctx, center, center, targetBodyPx, star, Date.now(), dpr)
    return
  }

  const role = galaxyStore.nextStarRole
  const roleColor = role ? ROLE_COLORS[role] : undefined
  if (roleColor)
    drawRoleStar(
      ctx,
      center,
      center,
      VOYAGE_LIVE_TARGET_R_PX,
      rolePaletteFromHex(roleColor),
      Date.now(),
    )
}

// ── Bahn ────────────────────────────────────────────────────────────────────
interface Curve {
  x0: number
  y0: number
  cx: number
  cy: number
  x2: number
  y2: number
}

/**
 * Die Biegung steht in PIXELN senkrecht zur Sehne. Im 0..1-Raum gerechnet
 * krümmte sie auf breiten Bühnen falsch: der Raum ist anisotrop.
 */
const curve = computed<Curve | null>(() => {
  const t = leg.value.target
  if (!t) return null
  const b = props.box
  const f = leg.value.from
  const x0 = b.x + f.x * b.w
  const y0 = b.y + f.y * b.h
  const x2 = b.x + t.x * b.w
  const y2 = b.y + t.y * b.h
  const dx = x2 - x0
  const dy = y2 - y0
  const len = Math.hypot(dx, dy)
  if (len <= 1) return null
  const bend = len * MINIMAP_FLIGHTPATH_BEND
  return {
    x0,
    y0,
    cx: (x0 + x2) / 2 - (dy / len) * bend,
    cy: (y0 + y2) / 2 + (dx / len) * bend,
    x2,
    y2,
  }
})

const routeD = computed(() => {
  const c = curve.value
  if (!c) return ''
  return (
    `M${c.x0.toFixed(1)} ${c.y0.toFixed(1)} ` +
    `Q${c.cx.toFixed(1)} ${c.cy.toFixed(1)} ${c.x2.toFixed(1)} ${c.y2.toFixed(1)}`
  )
})

const targetPos = computed(() => {
  const c = curve.value
  return c ? { left: c.x2, top: c.y2 } : null
})

const flying = computed(
  () => galaxyStore.championTravelState === 'traveling' && !docked.value && !!curve.value,
)

function pointOn(c: Curve, t: number): { x: number; y: number; angle: number } {
  const u = 1 - t
  const x = u * u * c.x0 + 2 * u * t * c.cx + t * t * c.x2
  const y = u * u * c.y0 + 2 * u * t * c.cy + t * t * c.y2
  const tx = 2 * u * (c.cx - c.x0) + 2 * t * (c.x2 - c.cx)
  const ty = 2 * u * (c.cy - c.y0) + 2 * t * (c.y2 - c.cy)
  return { x, y, angle: Math.atan2(ty, tx) }
}

// ── Die eine Schleife ───────────────────────────────────────────────────────
// Plain, NICHT reaktiv: der rAF darf weder Box noch Store pro Frame lesen.
const body = ref<HTMLElement | null>(null)
let curveCache: Curve | null = null
let restCache = { x: 0, y: 0, angle: 0 }
let flyCache = false
let frame: number | null = null

const reduceMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

function rebuild() {
  curveCache = curve.value
  flyCache = flying.value
  const b = props.box
  if (docked.value) {
    restCache = { x: b.x + 0.5 * b.w, y: b.y + 0.5 * b.h, angle: 0 }
    return
  }
  if (curveCache) {
    // Stillstehend zeigt der Körper trotzdem den Kurs, den er nehmen wird.
    const arrived =
      galaxyStore.championTravelState === 'champion_available' ||
      galaxyStore.championTravelState === 'champion_spawned'
    restCache = pointOn(curveCache, arrived ? 1 : 0)
    return
  }
  const p = leg.value.target ?? leg.value.from
  restCache = { x: b.x + p.x * b.w, y: b.y + p.y * b.h, angle: 0 }
}

function place(now: number) {
  const el = body.value
  if (!el) return
  let { x, y, angle } = restCache
  if (flyCache && curveCache) {
    const pt = pointOn(curveCache, playerTravelProgress(galaxyStore, now))
    x = pt.x
    y = pt.y
    angle = pt.angle
  }
  el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${angle.toFixed(3)}rad)`
}

function tick() {
  // Immer zuerst neu anmelden, dann VOR dem Schreiben aussteigen.
  frame = requestAnimationFrame(tick)
  if (!props.visible || isRenderingPaused.value) return
  place(gameNow())
}

function startLoop() {
  if (frame !== null || reduceMotion?.matches) return
  frame = requestAnimationFrame(tick)
}
function stopLoop() {
  if (frame === null) return
  cancelAnimationFrame(frame)
  frame = null
}

watch(
  [() => props.box, leg, docked, flying, () => galaxyStore.championTravelStartTime],
  () => {
    rebuild()
    nextTick(() => place(gameNow()))
  },
  { immediate: true, deep: false },
)

watch(
  [targetPos, targetStar, () => galaxyStore.nextStarRole, targetBodyVisible],
  () => nextTick(paintTargetBody),
  { immediate: true, flush: 'post' },
)

watch(
  [flying, () => props.visible],
  ([isFlying, visible]) => {
    if (isFlying && visible) startLoop()
    else stopLoop()
  },
  { immediate: true },
)

/** Reduzierte Bewegung: keine Schleife, nur der Sekundentakt der Bühne. */
watch(
  () => props.now,
  () => {
    if (reduceMotion?.matches && props.visible) place(gameNow())
  },
)

onMounted(() => nextTick(() => place(gameNow())))
onBeforeUnmount(stopLoop)

const playerBoxPx = `${VOYAGE_LIVE_PLAYER_BOX_PX}px`
const haloPx = `${VOYAGE_LIVE_PLAYER_BOX_PX * PLAYER_MARKER_HALO_SCALE}px`
const haloPulseMs = `${PLAYER_MARKER_HALO_PERIOD_MS}ms`
const haloFillAlpha = String(PLAYER_MARKER_HALO_FILL_ALPHA)
const haloEdge = `${PLAYER_MARKER_HALO_EDGE * 100}%`
const framePx = `${VOYAGE_LIVE_PLAYER_BOX_PX * PLAYER_MARKER_COMET_FRAME_SCALE}px`
const frameCornerPx = `${PLAYER_MARKER_COMET_FRAME_CORNER_PX}px`
const frameStrokePx = `${PLAYER_MARKER_COMET_FRAME_STROKE_PX}px`
const tailPx = `${VOYAGE_LIVE_PLAYER_TAIL_PX}px`
const tailHPx = `${VOYAGE_LIVE_PLAYER_TAIL_H_PX}px`
const targetPx = `${VOYAGE_LIVE_TARGET_R_PX * 2}px`
</script>

<template>
  <div class="epml" :style="{ '--epml-frame-color': COMET_PHASE_DATA.accent }" aria-hidden="true">
    <svg
      v-if="routeD"
      class="epml-routes"
      :viewBox="`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`"
    >
      <path :d="routeD" class="epml-route" />
    </svg>

    <span
      v-if="targetPos"
      class="epml-target"
      :style="{
        transform: `translate3d(${targetPos.left.toFixed(1)}px, ${targetPos.top.toFixed(1)}px, 0)`,
        '--ep-t': targetTint,
      }"
    >
      <canvas
        v-if="targetBodyVisible"
        ref="targetCanvas"
        class="epml-target-star"
        :width="Math.ceil(targetCanvasPx)"
        :height="Math.ceil(targetCanvasPx)"
        aria-hidden="true"
      />
      <span class="epml-target-ring" />
    </span>

    <div ref="body" class="epml-marker" :class="`epml-marker--${playerBody.kind}`">
      <span class="epml-tail" />
      <span class="epml-halo" />
      <span class="epml-sun">
        <SunOrb :body="playerBody" :px="VOYAGE_LIVE_PLAYER_BOX_PX" />
      </span>
      <span v-if="playerBody.kind === 'comet'" class="epml-comet-frame">
        <span class="epml-comet-corner epml-comet-corner--tl" />
        <span class="epml-comet-corner epml-comet-corner--tr" />
        <span class="epml-comet-corner epml-comet-corner--br" />
        <span class="epml-comet-corner epml-comet-corner--bl" />
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Reine Anzeigeebene über der Platte, unter dem Datenband und den Listen. */
.epml {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.epml-routes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Statisch — die laufende Strichfahrt ist eine Canvas-Sache und bleibt bei der
   Minimap; hier bewegen sich nur transform und opacity. */
.epml-route {
  fill: none;
  stroke: rgba(255, 210, 120, 0.42);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-dasharray: 5 7;
}

/* Nullgrosse Hüllen: der Frame schreibt nur `transform`, die Kinder zentrieren
   sich selbst. */
.epml-marker,
.epml-target {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
}
.epml-marker {
  will-change: transform;
}

.epml-sun {
  position: absolute;
  top: 0;
  left: 0;
  width: v-bind(playerBoxPx);
  height: v-bind(playerBoxPx);
  transform: translate(-50%, -50%);
}

.epml-comet-frame {
  position: absolute;
  top: 0;
  left: 0;
  width: v-bind(framePx);
  height: v-bind(framePx);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}

.epml-comet-corner {
  position: absolute;
  width: v-bind(frameCornerPx);
  height: v-bind(frameCornerPx);
  border-style: solid;
  border-color: var(--epml-frame-color, #f0d878);
  border-width: v-bind(frameStrokePx) 0 0 v-bind(frameStrokePx);
}

.epml-comet-corner--tl {
  top: 0;
  left: 0;
}

.epml-comet-corner--tr {
  top: 0;
  right: 0;
  transform: rotate(90deg);
}

.epml-comet-corner--br {
  right: 0;
  bottom: 0;
  transform: rotate(180deg);
}

.epml-comet-corner--bl {
  bottom: 0;
  left: 0;
  transform: rotate(270deg);
}

/* Der Schweif liegt HINTER dem Kopf und dreht mit dem Rumpf — ein statischer
   Verlauf, kein Zug pro Frame. */
.epml-tail {
  position: absolute;
  top: 0;
  left: 0;
  width: v-bind(tailPx);
  height: v-bind(tailHPx);
  transform: translate(-100%, -50%);
  background: linear-gradient(to right, rgba(255, 210, 120, 0) 0%, rgba(255, 214, 140, 0.5) 100%);
  border-radius: 50%;
}

/* Eigene Ebene mit statischem Schein; animiert wird allein die Deckkraft. */
.epml-halo {
  position: absolute;
  top: 0;
  left: 0;
  width: v-bind(haloPx);
  height: v-bind(haloPx);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 220, 150, v-bind(haloFillAlpha)) 0%,
    rgba(255, 220, 150, 0) v-bind(haloEdge)
  );
  animation: epml-breathe v-bind(haloPulseMs) ease-in-out infinite;
}
@keyframes epml-breathe {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.85;
  }
}

/* Der Zielstern RUHT: statischer Ring, animiert wird nur seine Deckkraft. */
.epml-target-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: v-bind(targetPx);
  height: v-bind(targetPx);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid var(--ep-t, #64dcb4);
  box-shadow: 0 0 8px var(--ep-t, #64dcb4);
  animation: epml-breathe 2600ms ease-in-out infinite;
}
.epml-target-star {
  position: absolute;
  top: 0;
  left: 0;
  width: v-bind(targetCanvasSize);
  height: v-bind(targetCanvasSize);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .epml-halo,
  .epml-target-ring {
    animation: none;
    opacity: 0.7;
  }
}
</style>
