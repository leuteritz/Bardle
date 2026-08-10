<template>
  <div class="void-layer">
    <VoidRiftObject
      v-if="activeRift && activeDef"
      :key="activeRift.uid"
      :rift="activeRift"
      :def="activeDef"
      :paused="isIdleRenderingPaused"
      @hit="onHit"
    />

    <!-- Ausgang: Funken beim Schliessen, eine einfahrende Welle beim Kollaps.
         Beides hängt am Zähler des Stores, damit ein erzwungener Ausgang
         genauso aussieht wie ein erspielter. -->
    <div
      v-if="outcome"
      :key="`vo-${outcome.seq}`"
      class="vo-burst"
      :class="outcome.sealed ? 'vo-burst--sealed' : 'vo-burst--collapsed'"
      :style="{ left: `${outcome.x}px`, top: `${outcome.y}px` }"
      aria-hidden="true"
    >
      <span
        v-for="p in outcome.particles"
        :key="p.i"
        class="vo-spark"
        :style="{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, background: outcome.color }"
      ></span>
      <span class="vo-label" :style="{ color: outcome.color }">{{ outcome.title }}</span>
      <span class="vo-sub">{{ outcome.sub }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useVoidStore } from '@/stores/world/voidStore'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { useActionToast } from '@/composables/ui/useActionToast'
import { useHerald } from '@/composables/ui/useHerald'
import { logVoidRiftSealed, logVoidRiftCollapsed } from '@/config/ui/eventLog'
import { getVoidRift } from '@/config/world/void'
import { hexToRgbTriple } from '@/utils/ui/format'
import VoidRiftObject from './VoidRiftObject.vue'
import {
  VOID_SEAL_BURST_PARTICLES,
  VOID_RIFT_SEAL_FX_MS,
  VOID_RIFT_COLLAPSE_FX_MS,
} from '@/config/constants'

const voidStore = useVoidStore()
const { active, lastOutcome } = storeToRefs(voidStore)
const { isIdleRenderingPaused } = useRenderingPaused()
const { showToast } = useActionToast()
const { announce } = useHerald()

const activeRift = computed(() => active.value[0] ?? null)
const activeDef = computed(() =>
  activeRift.value ? (getVoidRift(activeRift.value.defId) ?? null) : null,
)

// Kein Aufreissen, solange das Bard-Profil oder ein Star Fight den Idle-Layer
// deckt: ein Riss, den niemand sehen kann, wäre eine Strafe für das Öffnen
// eines Menüs und keine Entscheidung.
watch(isIdleRenderingPaused, (hidden) => voidStore.setSpawningBlocked(hidden), {
  immediate: true,
})

function onHit(): void {
  const rift = activeRift.value
  if (!rift) return
  voidStore.hitRift(rift.uid)
}

// ── Ausgang ─────────────────────────────────────────────────────────────────

interface OutcomeSpark {
  i: number
  dx: number
  dy: number
}

const outcome = ref<{
  seq: number
  sealed: boolean
  x: number
  y: number
  color: string
  title: string
  sub: string
  particles: OutcomeSpark[]
} | null>(null)
let outcomeTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => lastOutcome.value.seq,
  () => {
    const result = lastOutcome.value
    const def = getVoidRift(result.defId)
    if (!def) return

    if (result.sealed) {
      showToast(`${def.name} sealed — ${def.boonLine}`, 'event')
      logVoidRiftSealed(def.name, def.boonLine)
    } else {
      showToast(`${def.name} collapsed — ${result.hpLost} HP lost`, 'warning')
      logVoidRiftCollapsed(def.name, result.hpLost)
    }

    // Nur der schwerste Riss verdient ein Banner. Ein Herald für jeden kleinen
    // Riss würde die Meldung entwerten, die für den Warp reserviert ist.
    if (def.severity === 'abyssal') {
      announce({
        kind: 'champion',
        eyebrow: result.sealed ? 'RIFT SEALED' : 'RIFT COLLAPSED',
        headline: def.name,
        subline: result.sealed ? def.boonLine : `The sun took ${result.hpLost} damage`,
        icon: def.icon,
        accent: hexToRgbTriple(def.color),
      })
    }

    const step = (Math.PI * 2) / VOID_SEAL_BURST_PARTICLES
    const base = result.seq * 0.7
    // Beim Schliessen fliegen die Funken nach AUSSEN, beim Kollaps fallen sie
    // nach innen — dieselbe Geometrie, umgekehrtes Vorzeichen, und man sieht
    // auf einen Blick, welcher der beiden Ausgänge eingetreten ist.
    const dir = result.sealed ? 1 : -1
    outcome.value = {
      seq: result.seq,
      sealed: result.sealed,
      x: result.x,
      y: result.y,
      color: def.color,
      title: result.sealed ? 'SEALED' : 'COLLAPSED',
      sub: result.sealed ? def.boonLine : `−${result.hpLost} HP`,
      particles: Array.from({ length: VOID_SEAL_BURST_PARTICLES }, (_, i) => {
        const angle = base + step * i
        const dist = def.sizePx * (dir > 0 ? 1.15 : 1.6)
        return { i, dx: Math.cos(angle) * dist * dir, dy: Math.sin(angle) * dist * dir }
      }),
    }
    if (outcomeTimer) clearTimeout(outcomeTimer)
    outcomeTimer = setTimeout(
      () => {
        outcome.value = null
        outcomeTimer = null
      },
      result.sealed ? VOID_RIFT_SEAL_FX_MS : VOID_RIFT_COLLAPSE_FX_MS,
    )
  },
)

onUnmounted(() => {
  if (outcomeTimer) clearTimeout(outcomeTimer)
})
</script>

<style scoped>
/* Auf derselben Höhe wie der Drifter-Layer: über der Klickfläche der Sonne,
   unter Header, Bottom-Bar und jedem Modal. Die Hülle selbst fängt nie einen
   Klick ab — das tut allein die Trefferfläche des Risses. */
.void-layer {
  position: fixed;
  inset: 0;
  z-index: 42;
  pointer-events: none;
}

/* ── Ausgang ── */
.vo-burst {
  position: fixed;
  pointer-events: none;
}

.vo-spark {
  position: absolute;
  top: 0;
  left: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.vo-burst--sealed .vo-spark {
  animation: vo-fly-out 0.72s cubic-bezier(0.18, 0.7, 0.35, 1) forwards;
}

.vo-burst--collapsed .vo-spark {
  animation: vo-fall-in 0.9s cubic-bezier(0.5, 0, 0.75, 0.2) forwards;
}

@keyframes vo-fly-out {
  0% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.3);
    opacity: 0;
  }
}

@keyframes vo-fall-in {
  0% {
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.4);
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}

.vo-label {
  position: absolute;
  left: 50%;
  top: 0;
  white-space: nowrap;
  font-size: clamp(17px, 1.35vw, 25px);
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow:
    0 0 10px rgba(0, 0, 0, 0.9),
    0 2px 6px rgba(0, 0, 0, 0.9);
  animation: vo-rise 0.9s ease-out forwards;
}

.vo-sub {
  position: absolute;
  left: 50%;
  top: 0;
  white-space: nowrap;
  color: #d8cfae;
  font-size: clamp(11px, 0.85vw, 15px);
  letter-spacing: 0.5px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
  animation: vo-rise-sub 1s ease-out forwards;
}

.vo-burst--collapsed .vo-sub {
  color: #cc6050;
}

@keyframes vo-rise {
  0% {
    transform: translate(-50%, -8px) scale(0.85);
    opacity: 0;
  }
  22% {
    transform: translate(-50%, -36px) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -64px) scale(1);
    opacity: 0;
  }
}

@keyframes vo-rise-sub {
  0% {
    transform: translate(-50%, -2px);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -10px);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -32px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vo-spark {
    display: none;
  }
}
</style>
