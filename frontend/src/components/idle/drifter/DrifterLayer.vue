<template>
  <div class="drifter-layer">
    <!-- Edge ping: marks the screen border a drifter is entering from, for the
         first moment of its flight. Without it a quiet Ember Shard slips past
         a player who happens to be looking at the shop. -->
    <div
      v-if="edgePing"
      :key="`ping-${activeDrifter?.uid}`"
      class="drifter-ping"
      :class="`drifter-ping--${edgePing.side}`"
      :style="edgePing.style"
      aria-hidden="true"
    >
      <span class="ping-ring"></span>
      <span class="ping-core"></span>
    </div>

    <DrifterObject
      v-if="activeDrifter && activeDef"
      :key="activeDrifter.uid"
      :drifter="activeDrifter"
      :def="activeDef"
      :paused="isIdleRenderingPaused"
      @hit="onHit"
    />

    <!-- Collect burst — sparks plus the name of what was caught, at the very
         pixel that was clicked. Keyed on the collect counter so two catches of
         the same type in a row both play. -->
    <div
      v-if="burst"
      :key="`burst-${burst.seq}`"
      class="drifter-burst"
      :style="{ left: `${burst.x}px`, top: `${burst.y}px` }"
      aria-hidden="true"
    >
      <span
        v-for="p in burst.particles"
        :key="p.i"
        class="burst-spark"
        :style="{
          '--dx': `${p.dx}px`,
          '--dy': `${p.dy}px`,
          background: burst.color,
        }"
      ></span>
      <span class="burst-label" :style="{ color: burst.color }">{{ burst.name }}</span>
      <span class="burst-effect">{{ burst.effect }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDrifterStore } from '@/stores/drifterStore'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useActionToast } from '@/composables/useActionToast'
import { useHerald } from '@/composables/useHerald'
import { logDrifterCollected } from '@/config/gameEventLogger'
import { getDrifter } from '@/config/drifters'
import { drifterEntryEdge } from '@/utils/drifterPath'
import DrifterObject from './DrifterObject.vue'
import {
  DRIFTER_EDGE_PING_LEAD_MS,
  DRIFTER_COLLECT_FX_MS,
  DRIFTER_BURST_PARTICLES,
} from '@/config/constants'

const drifterStore = useDrifterStore()
const { active, lastCollect } = storeToRefs(drifterStore)
const { isIdleRenderingPaused } = useRenderingPaused()
const { showToast } = useActionToast()
const { announce } = useHerald()

const activeDrifter = computed(() => active.value[0] ?? null)
const activeDef = computed(() =>
  activeDrifter.value ? (getDrifter(activeDrifter.value.defId) ?? null) : null,
)

// Spawning pauses while the bard profile or a star fight covers the idle view:
// a drifter nobody can see would just fly by and count as missed.
watch(
  isIdleRenderingPaused,
  (hidden) => drifterStore.setSpawningBlocked(hidden),
  { immediate: true },
)

// ── Edge ping ───────────────────────────────────────────────────────────────

const pingVisible = ref(false)
let pingTimer: ReturnType<typeof setTimeout> | null = null

watch(activeDrifter, (drifter) => {
  if (pingTimer) clearTimeout(pingTimer)
  pingTimer = null
  if (!drifter) {
    pingVisible.value = false
    return
  }
  // Late arrivals (a save restored mid-flight) get no ping — the marker would
  // point at an edge the drifter has long left.
  const elapsed = Date.now() - drifter.spawnedAt
  if (elapsed > DRIFTER_EDGE_PING_LEAD_MS) {
    pingVisible.value = false
    return
  }
  pingVisible.value = true
  pingTimer = setTimeout(() => {
    pingVisible.value = false
    pingTimer = null
  }, DRIFTER_EDGE_PING_LEAD_MS - elapsed)
})

const edgePing = computed(() => {
  if (!pingVisible.value || !activeDrifter.value || !activeDef.value) return null
  const edge = drifterEntryEdge(activeDrifter.value.routeIndex, activeDrifter.value.mirrored)
  const along = `${edge.alongPct}%`
  const style: Record<string, string> = { '--ping-color': activeDef.value.color }
  if (edge.side === 'left' || edge.side === 'right') style.top = along
  else style.left = along
  return { side: edge.side, style }
})

// ── Collect feedback ────────────────────────────────────────────────────────

interface BurstSpark {
  i: number
  dx: number
  dy: number
}

const burst = ref<{
  seq: number
  x: number
  y: number
  color: string
  name: string
  effect: string
  particles: BurstSpark[]
} | null>(null)
let burstTimer: ReturnType<typeof setTimeout> | null = null

function onHit(x: number, y: number): void {
  const drifter = activeDrifter.value
  if (!drifter) return
  drifterStore.hitDrifter(drifter.uid, x, y)
}

// Everything that happens on a successful collect hangs off the store counter,
// so an admin-forced collect announces itself exactly like a clicked one.
watch(
  () => lastCollect.value.seq,
  () => {
    const def = getDrifter(lastCollect.value.defId)
    if (!def) return

    showToast(`${def.name} — ${def.effectLine}`)
    logDrifterCollected(def.name, def.effectLine)

    if (def.rarity === 'legendary') {
      announce({
        kind: 'champion',
        eyebrow: 'DRIFTER COLLECTED',
        headline: def.name,
        subline: def.effectLine,
        icon: def.icon,
        accent: hexToRgbTriple(def.color),
      })
    }

    const step = (Math.PI * 2) / DRIFTER_BURST_PARTICLES
    const base = Math.random() * Math.PI * 2
    burst.value = {
      seq: lastCollect.value.seq,
      x: lastCollect.value.x,
      y: lastCollect.value.y,
      color: def.color,
      name: def.name,
      effect: def.effectLine,
      particles: Array.from({ length: DRIFTER_BURST_PARTICLES }, (_, i) => {
        const angle = base + step * i + (Math.random() - 0.5) * step * 0.7
        const dist = def.sizePx * (1.1 + Math.random() * 1.1)
        return { i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist }
      }),
    }
    if (burstTimer) clearTimeout(burstTimer)
    burstTimer = setTimeout(() => {
      burst.value = null
      burstTimer = null
    }, DRIFTER_COLLECT_FX_MS)
  },
)

/** Herald wants its accent as an "r, g, b" triple, not a hex string. */
function hexToRgbTriple(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(', ')
}

onUnmounted(() => {
  if (pingTimer) clearTimeout(pingTimer)
  if (burstTimer) clearTimeout(burstTimer)
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

/* ── Edge ping ── */
.drifter-ping {
  position: fixed;
  width: 22px;
  height: 22px;
  pointer-events: none;
}

.drifter-ping--left {
  left: 6px;
  transform: translateY(-50%);
}
.drifter-ping--right {
  right: 6px;
  transform: translateY(-50%);
}
.drifter-ping--top {
  top: 6px;
  transform: translateX(-50%);
}
.drifter-ping--bottom {
  bottom: 6px;
  transform: translateX(-50%);
}

.ping-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: var(--ping-color, #e8c040);
}

.ping-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--ping-color, #e8c040);
  transform: translate(-50%, -50%);
  animation: ping-pulse 1.1s ease-out infinite;
}

@keyframes ping-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.1);
    opacity: 0;
  }
}

/* ── Collect burst ── */
.drifter-burst {
  position: fixed;
  pointer-events: none;
}

.burst-spark {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: burst-fly 0.62s cubic-bezier(0.18, 0.7, 0.35, 1) forwards;
}

@keyframes burst-fly {
  0% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.3);
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
  .ping-ring {
    animation: none;
  }
  .burst-spark {
    display: none;
  }
}
</style>
