<template>
  <div class="drifter-layer">
    <!-- Edge ping: a sensor wedge on the border a drifter is entering from,
         pointing the way it will travel. The old concentric ring said only THAT
         something was there; a wedge says where to look. Without it a quiet
         Ember Shard slips past a player who happens to be watching the shop. -->
    <div
      v-for="ping in edgePings"
      :key="`ping-${ping.uid}`"
      class="drifter-ping"
      :class="[`drifter-ping--${ping.side}`, { 'drifter-ping--herald': ping.herald }]"
      :style="ping.style"
      aria-hidden="true"
    >
      <span class="ping-wedge"></span>
      <span v-if="ping.herald" class="ping-wedge ping-wedge--b"></span>
      <span class="ping-core"></span>
    </div>

    <DrifterObject
      v-for="d in active"
      :key="d.uid"
      :ref="(el) => setObjRef(d.uid, el)"
      :drifter="d"
      :def="defOf(d.defId)!"
      @hit="(x, y) => onHit(d.uid, x, y)"
    />

    <!-- Collect burst — the body coming apart at the very pixel that was
         clicked, plus the name of what was caught. Keyed on the collect counter
         so two catches of the same type in a row both play. -->
    <div
      v-if="burst"
      :key="`burst-${burst.seq}`"
      class="drifter-burst"
      :style="burst.rootStyle"
      aria-hidden="true"
    >
      <span class="burst-ring"></span>
      <span v-if="burst.pillar" class="burst-pillar"></span>
      <span
        v-for="p in burst.particles"
        :key="p.i"
        class="burst-streak"
        :style="p.style"
      ></span>
      <span class="burst-label" :style="{ color: burst.color }">{{ burst.name }}</span>
      <span class="burst-effect">{{ burst.effect }}</span>
    </div>

    <!-- Shockwave of a damage drifter. Owns its own trigger (the store's strike
         counter), so it also fires for an admin-forced collect. -->
    <OrbitStrikeWave />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { useHerald } from '@/composables/ui/useHerald'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'
import { logDrifterCollected } from '@/config/ui/eventLog'
import { getDrifter, drifterFxStage } from '@/config/world/drifters'
import {
  drifterEntryEdge,
  drifterField,
  measuredFieldInsets,
  type DrifterFieldRect,
} from '@/utils/orbit/drifterPath'
import { hudFieldMetrics } from '@/utils/ui/hudField'
import { hexToRgbTriple, hexToRgba } from '@/utils/ui/format'
import DrifterObject from './DrifterObject.vue'
import OrbitStrikeWave from './OrbitStrikeWave.vue'
import {
  DRIFTER_EDGE_PING_LEAD_MS,
  DRIFTER_EDGE_PING_HERALD_MULT,
  DRIFTER_PING_REACH_PX,
  DRIFTER_PING_SPREAD_PX,
  DRIFTER_PING_SWEEP_MS,
  DRIFTER_COLLECT_FX_MS,
  DRIFTER_BURST_PARTICLES,
  DRIFTER_BURST_PER_STAGE,
  DRIFTER_BURST_STREAK_LEN_PX,
  DRIFTER_BURST_STREAK_THICK_PX,
  DRIFTER_BURST_RING_SCALE,
  DRIFTER_BURST_RING_MS,
  DRIFTER_BURST_PILLAR_SCALE,
  DRIFTER_BURST_PILLAR_MS,
  DRIFTER_BURST_ANGLE_JITTER,
  DRIFTER_BURST_DIST_MIN_FACTOR,
  DRIFTER_BURST_DIST_RANGE_FACTOR,
  DRIFTER_RARITY_ORDER,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'

const drifterStore = useDrifterStore()
const { active, lastCollect } = storeToRefs(drifterStore)
const { isIdleRenderingPaused } = useRenderingPaused()
const { announce, announceReceipt } = useHerald()
const { headerCenterArc } = useHeaderCenterArc()

function defOf(id: string) {
  return getDrifter(id) ?? null
}

// Spawning pauses while the bard profile or a star fight covers the idle view:
// a drifter nobody can see would just fly by and count as missed.
watch(
  isIdleRenderingPaused,
  (hidden) => drifterStore.setSpawningBlocked(hidden),
  { immediate: true },
)

// ── The one frame loop ──────────────────────────────────────────────────────
// ONE rAF drives every drifter on the screen. Each body used to bring its own,
// which is the reason DRIFTER_MAX_CONCURRENT stands at 1 — with the loop up
// here, the flight band and the HUD contour are resolved once per FRAME rather
// than once per body, and raising that cap costs nothing but the constant.
//
// Both are cached on purpose: `measuredFieldInsets()` and `readHudFieldMetrics()`
// read computed styles, and a getComputedStyle per frame forces a style recalc —
// measured on this very component at roughly −17 fps with the orbit running.

const objRefs = new Map<number, ComponentPublicInstance & { renderFrame: RenderFrame }>()

type RenderFrame = (
  now: number,
  field: DrifterFieldRect,
  metrics: ReturnType<typeof hudFieldMetrics>,
  viewportW: number,
  viewportH: number,
) => void

function setObjRef(uid: number, el: Element | ComponentPublicInstance | null): void {
  if (el) {
    objRefs.set(uid, el as ComponentPublicInstance & { renderFrame: RenderFrame })
    return
  }
  // Der null-Ref eines abgeräumten Eintrags kann NACH dem set des neuen
  // feuern — dann würde er den frischen Eintrag löschen. Deshalb nur
  // entfernen, was wirklich aus dem Dokument verschwunden ist; dasselbe
  // Muster wie `setMapEl` in utils/orbit/frameEls.ts.
  const cur = objRefs.get(uid)
  if (cur && !(cur.$el as HTMLElement | null)?.isConnected) objRefs.delete(uid)
}

let frame = 0
let cachedField = drifterField(0, 0)

function refreshField(): void {
  cachedField = drifterField(window.innerWidth, window.innerHeight, measuredFieldInsets())
}

function renderAll(): void {
  if (objRefs.size === 0) return
  const now = gameNow()
  const metrics = hudFieldMetrics(headerCenterArc.value ?? null)
  const w = window.innerWidth
  const h = window.innerHeight
  for (const obj of objRefs.values()) obj.renderFrame(now, cachedField, metrics, w, h)
}

function tick(): void {
  frame = requestAnimationFrame(tick)
  // Nicht Sichtbares kostet nichts: liegt ein Modal darüber, endet der Frame
  // vor dem Schreiben. Die Schleife selbst läuft weiter — ein Ab- und
  // Wiederanmelden kostet mehr als der leere Durchlauf.
  if (isIdleRenderingPaused.value) return
  renderAll()
}

// A newly spawned body must stand in the right place BEFORE the browser paints,
// or it flashes at the top-left corner for one frame.
watch(
  () => active.value.map((d) => d.uid).join(','),
  () => {
    void nextTick(renderAll)
  },
)

// ── Edge ping ───────────────────────────────────────────────────────────────

const pingUntil = ref(new Map<number, number>())
const pingClock = ref(0)
let pingTimer: ReturnType<typeof setInterval> | null = null

watch(
  () => active.value.map((d) => `${d.uid}:${d.defId}`).join(','),
  () => {
    const next = new Map<number, number>()
    for (const d of active.value) {
      const kept = pingUntil.value.get(d.uid)
      if (kept !== undefined) {
        next.set(d.uid, kept)
        continue
      }
      const def = getDrifter(d.defId)
      if (!def) continue
      const lead =
        DRIFTER_EDGE_PING_LEAD_MS *
        (drifterFxStage(def.rarity).herald ? DRIFTER_EDGE_PING_HERALD_MULT : 1)
      // Late arrivals (a save restored mid-flight) get no ping — the marker
      // would point at an edge the drifter has long left.
      if (gameNow() - d.spawnedAt > lead) continue
      next.set(d.uid, d.spawnedAt + lead)
    }
    pingUntil.value = next
  },
  { immediate: true },
)

const edgePings = computed(() => {
  // Read the clock so the list re-evaluates as pings expire.
  const now = pingClock.value
  const out: {
    uid: number
    side: string
    herald: boolean
    style: Record<string, string>
  }[] = []
  for (const d of active.value) {
    const until = pingUntil.value.get(d.uid)
    if (until === undefined || now >= until) continue
    const def = getDrifter(d.defId)
    if (!def) continue
    const edge = drifterEntryEdge(d.routeIndex, d.mirrored)
    const style: Record<string, string> = {
      '--ping-color': def.color,
      '--ping-soft': hexToRgba(def.color, 0.32),
      '--ping-fade': hexToRgba(def.color, 0),
      '--ping-reach': `${DRIFTER_PING_REACH_PX}px`,
      '--ping-spread': `${DRIFTER_PING_SPREAD_PX}px`,
      '--ping-ms': `${DRIFTER_PING_SWEEP_MS}ms`,
    }
    if (edge.side === 'left' || edge.side === 'right') style.top = `${edge.alongPct}%`
    else style.left = `${edge.alongPct}%`
    out.push({
      uid: d.uid,
      side: edge.side,
      herald: drifterFxStage(def.rarity).herald,
      style,
    })
  }
  return out
})

// ── Collect feedback ────────────────────────────────────────────────────────

const burst = ref<{
  seq: number
  color: string
  name: string
  effect: string
  pillar: boolean
  rootStyle: Record<string, string>
  particles: { i: number; style: Record<string, string> }[]
} | null>(null)
let burstTimer: ReturnType<typeof setTimeout> | null = null

function onHit(uid: number, x: number, y: number): void {
  drifterStore.hitDrifter(uid, x, y)
}

// Everything that happens on a successful collect hangs off the store counter,
// so an admin-forced collect announces itself exactly like a clicked one.
watch(
  () => lastCollect.value.seq,
  () => {
    const def = getDrifter(lastCollect.value.defId)
    if (!def) return
    const stage = drifterFxStage(def.rarity)
    const rank = DRIFTER_RARITY_ORDER[def.rarity] ?? 0

    logDrifterCollected(def.name, def.effectLine)

    // Entweder Zeremonie ODER Quittung, nie beides: beide Spuren stehen jetzt
    // übereinander in derselben Spalte, und derselbe Satz zweimal untereinander
    // liest sich als Fehler.
    if (def.rarity === 'legendary') {
      announce({
        kind: 'champion',
        eyebrow: 'DRIFTER COLLECTED',
        headline: def.name,
        subline: def.effectLine,
        icon: def.icon,
        accent: hexToRgbTriple(def.color),
      })
    } else {
      announceReceipt({
        kind: 'event',
        eyebrow: 'DRIFTER',
        headline: def.name,
        subline: def.effectLine,
        icon: def.icon,
        accent: hexToRgbTriple(def.color),
        mergeKey: 'drifter',
      })
    }

    // Sparks are STREAKS, not dots: matter coming apart draws itself out along
    // the direction it leaves in. How many, and how far, is the rank's business —
    // an Errant Chime should not throw the same fireworks as the Leviathan.
    const count = DRIFTER_BURST_PARTICLES + rank * DRIFTER_BURST_PER_STAGE
    const step = (Math.PI * 2) / count
    const base = Math.random() * Math.PI * 2
    const particles = Array.from({ length: count }, (_, i) => {
      const angle = base + step * i + (Math.random() - 0.5) * step * DRIFTER_BURST_ANGLE_JITTER
      const dist =
        def.sizePx *
        (DRIFTER_BURST_DIST_MIN_FACTOR + Math.random() * DRIFTER_BURST_DIST_RANGE_FACTOR) *
        (0.7 + stage.motion * 0.5)
      return {
        i,
        style: {
          '--dx': `${(Math.cos(angle) * dist).toFixed(1)}px`,
          '--dy': `${(Math.sin(angle) * dist).toFixed(1)}px`,
          '--deg': `${((angle * 180) / Math.PI).toFixed(1)}deg`,
          width: `${DRIFTER_BURST_STREAK_LEN_PX}px`,
          height: `${DRIFTER_BURST_STREAK_THICK_PX}px`,
          background: `linear-gradient(90deg, ${hexToRgba(def.color, 0)} 0%, ${
            def.color
          } 62%, #ffffff 100%)`,
        } as Record<string, string>,
      }
    })

    burst.value = {
      seq: lastCollect.value.seq,
      color: def.color,
      name: def.name,
      effect: def.effectLine,
      pillar: stage.herald,
      rootStyle: {
        left: `${lastCollect.value.x}px`,
        top: `${lastCollect.value.y}px`,
        '--burst-c': def.color,
        '--burst-c-55': hexToRgba(def.color, 0.55),
        '--burst-c-0': hexToRgba(def.color, 0),
        '--burst-ring': `${def.sizePx * DRIFTER_BURST_RING_SCALE}px`,
        '--burst-ring-ms': `${DRIFTER_BURST_RING_MS}ms`,
        '--burst-pillar-h': `${def.sizePx * DRIFTER_BURST_PILLAR_SCALE}px`,
        '--burst-pillar-w': `${def.sizePx * 0.42}px`,
        '--burst-pillar-ms': `${DRIFTER_BURST_PILLAR_MS}ms`,
      },
      particles,
    }
    if (burstTimer) clearTimeout(burstTimer)
    burstTimer = setTimeout(() => {
      burst.value = null
      burstTimer = null
    }, DRIFTER_COLLECT_FX_MS)
  },
)

onMounted(() => {
  refreshField()
  window.addEventListener('resize', refreshField)
  frame = requestAnimationFrame(tick)
  // Coarse on purpose: the ping list only has to notice that a lead time has
  // run out. A per-frame check would re-evaluate a computed 60×/s to change
  // something once.
  pingTimer = setInterval(() => {
    pingClock.value = gameNow()
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', refreshField)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  if (pingTimer) clearInterval(pingTimer)
  if (burstTimer) clearTimeout(burstTimer)
  objRefs.clear()
})
</script>

<style scoped>
/* Sits above the sun's click target and the buff vignette, below header
   (z-120), bottom bar (z-10000) and every modal. The shell itself never
   intercepts pointer events — only the drifter body does. */
.drifter-layer {
  position: fixed;
  inset: 0;
  z-index: 42;
  pointer-events: none;
}

/* ── Edge ping ─────────────────────────────────────────────────────────────
   A wedge that points INTO the field along the drifter's path. Anchored at the
   border, widening inward — the shape says "from here, that way", which a ring
   cannot. Each side is the same wedge under a different rotation. */
.drifter-ping {
  position: fixed;
  width: var(--ping-reach);
  height: var(--ping-spread);
  pointer-events: none;
}

.drifter-ping--left {
  left: 0;
  transform: translateY(-50%);
}
.drifter-ping--right {
  right: 0;
  transform: translateY(-50%) rotate(180deg);
}
.drifter-ping--top {
  top: 0;
  transform: translate(-50%, 50%) rotate(90deg);
}
.drifter-ping--bottom {
  bottom: 0;
  transform: translate(-50%, -50%) rotate(270deg);
}

.ping-wedge {
  position: absolute;
  inset: 0;
  transform-origin: 0% 50%;
  clip-path: polygon(0% 42%, 0% 58%, 100% 100%, 100% 0%);
  background: linear-gradient(90deg, var(--ping-color) 0%, var(--ping-soft) 46%, var(--ping-fade) 100%);
  animation: ping-sweep var(--ping-ms) ease-out infinite;
}

/* Second, offset beat — only the rank that is worth crossing the screen for. */
.ping-wedge--b {
  animation-delay: calc(var(--ping-ms) / -2);
}

.ping-core {
  position: absolute;
  top: 50%;
  left: 0;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -3px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--ping-color) 60%, var(--ping-fade) 100%);
  animation: ping-core var(--ping-ms) ease-in-out infinite;
}

@keyframes ping-sweep {
  0% {
    transform: scaleX(0.2);
    opacity: 0;
  }
  22% {
    opacity: 0.95;
  }
  100% {
    transform: scaleX(1);
    opacity: 0;
  }
}

@keyframes ping-core {
  0%,
  100% {
    transform: scale(0.7);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

/* ── Collect burst ── */
.drifter-burst {
  position: fixed;
  pointer-events: none;
}

/* Pressure front as a radial gradient, not a border. A scaled-up border is at
   its thinnest exactly while the ring is still on screen — the same reason
   OrbitStrikeWave builds its fronts out of gradients. */
.burst-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--burst-ring);
  height: var(--burst-ring);
  margin: calc(var(--burst-ring) / -2) 0 0 calc(var(--burst-ring) / -2);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    var(--burst-c-0) 52%,
    var(--burst-c-55) 78%,
    #ffffff 88%,
    var(--burst-c-0) 100%
  );
  animation: burst-ring var(--burst-ring-ms) cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
}

/* Legendary only: a column of light standing where it was caught. */
.burst-pillar {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--burst-pillar-w);
  height: var(--burst-pillar-h);
  margin-left: calc(var(--burst-pillar-w) / -2);
  transform-origin: 50% 100%;
  border-radius: 50%;
  background: linear-gradient(0deg, #ffffff 0%, var(--burst-c) 34%, var(--burst-c-0) 100%);
  animation: burst-pillar var(--burst-pillar-ms) ease-out forwards;
}

.burst-streak {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  animation: burst-fly 0.62s cubic-bezier(0.18, 0.7, 0.35, 1) forwards;
}

/* The fixed rotation has to be repeated in every keyframe — one element carries
   only ONE transform, and here the animation is what writes it. */
@keyframes burst-fly {
  0% {
    transform: translate(-50%, -50%) rotate(var(--deg)) scaleX(0.35);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) rotate(var(--deg)) scaleX(1.4);
    opacity: 0;
  }
}

@keyframes burst-ring {
  0% {
    transform: scale(0.14);
    opacity: 0;
  }
  18% {
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes burst-pillar {
  0% {
    transform: translateY(-100%) scaleY(0.1);
    opacity: 0;
  }
  26% {
    opacity: 0.9;
  }
  100% {
    transform: translateY(-100%) scaleY(1);
    opacity: 0;
  }
}

.burst-label {
  position: absolute;
  left: 50%;
  top: 0;
  white-space: nowrap;
  font-size: clamp(16px, 1.3vw, 24px);
  font-weight: 700;
  text-shadow:
    0 0 10px rgba(0, 0, 0, 0.9),
    0 2px 6px rgba(0, 0, 0, 0.9);
  animation: burst-rise 0.85s ease-out forwards;
}

.burst-effect {
  position: absolute;
  left: 50%;
  top: 0;
  white-space: nowrap;
  color: #d8cfae;
  font-size: clamp(11px, 0.85vw, 15px);
  letter-spacing: 0.5px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
  animation: burst-rise-sub 0.95s ease-out forwards;
}

@keyframes burst-rise {
  0% {
    transform: translate(-50%, -10px) scale(0.85);
    opacity: 0;
  }
  22% {
    transform: translate(-50%, -34px) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -62px) scale(1);
    opacity: 0;
  }
}

@keyframes burst-rise-sub {
  0% {
    transform: translate(-50%, -4px);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -8px);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -30px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ping-wedge,
  .ping-core {
    animation: none;
  }
  .burst-streak,
  .burst-ring,
  .burst-pillar {
    display: none;
  }
}
</style>
