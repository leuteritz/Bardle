<script setup lang="ts">
/**
 * Caretaker's Gate — was sich am befreiten Kern ÄNDERT.
 *
 * Die Marke selbst malt das Canvas: `paintGalaxy` setzt `core-gate` in die Mitte
 * (dunkler Torschlund, achteckiger Rand in der Themenfarbe, zersprungene Krone),
 * und zwar in allen vier Flächen, die sich `paintGalaxy` teilen. Diese Ebene
 * legt nur darauf, was ein Standbild nicht tragen kann: die Uhr auf die nächste
 * Rückkehr, den Zustand, den Ankunftsschimmer, die Klickfläche.
 *
 * Deshalb hat sie KEINEN eigenen Rahmen mehr. Zwei konzentrische Ringe auf
 * engem Raum lasen sich als Doppelung; jetzt gilt: Canvas trägt die Form, DOM
 * trägt den Zustand.
 *
 * Die Grösse kommt von aussen (`--gt-size`, aus `voyageGateSizeFor`) und trägt
 * ausdrücklich keinen Übergang — sie ist Layout, kein Effekt. Der Ring läuft
 * über `stroke-dashoffset` einer SVG-Kreislinie (ein Schreibvorgang je Sekunde,
 * nicht je Frame), der Schimmer über die `opacity` einer eigenen Ebene mit
 * statischem Schein: kein `filter`, kein `box-shadow`, kein `conic-gradient`.
 */
import { computed } from 'vue'
import { VOYAGE_GATE_BREATH_MS, VOYAGE_NODE_RING_CIRCUMFERENCE } from '@/config/constants'

const props = defineProps<{
  left: number
  top: number
  now: number
  /** Laufende Crews dieser Galaxie. */
  crewsOut: number
  /** Heimgekehrt, aber noch nicht eingesammelt. */
  waiting: number
  /** Wann die naechste Crew faellig ist — `null`, wenn keine unterwegs ist. */
  nextReturnAt: number | null
  /** Eine Crew steht gerade am Tor. */
  arriving: boolean
  /** Gesamtdauer der fruehesten laufenden Reise, fuer den Fortschrittsring. */
  nextSpanMs: number
  /** Fiele der Ring in die gemalte Krone, entfaellt er — siehe `voyageGateSizeFor`. */
  showArc: boolean
}>()
const emit = defineEmits<{ home: [] }>()

const remainingMs = computed(() =>
  props.nextReturnAt === null ? 0 : Math.max(0, props.nextReturnAt - props.now),
)

function clock(ms: number): string {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}

/** Fuellt sich auf die naechste Rueckkehr zu — leer beim Aufbruch, voll bei Ankunft. */
const ringOffset = computed(() => {
  if (props.nextReturnAt === null) return VOYAGE_NODE_RING_CIRCUMFERENCE
  const span = Math.max(1, props.nextSpanMs)
  const done = Math.min(1, Math.max(0, 1 - remainingMs.value / span))
  return VOYAGE_NODE_RING_CIRCUMFERENCE * (1 - done)
})

const state = computed(() => {
  if (props.arriving) return 'arriving'
  if (props.waiting > 0) return 'waiting'
  return props.crewsOut > 0 ? 'watching' : 'quiet'
})

const caption = computed(() => {
  if (props.arriving) return 'Coming home'
  if (props.crewsOut > 0) return `${props.crewsOut} out · ${clock(remainingMs.value)}`
  if (props.waiting > 0) return `${props.waiting} at berth`
  return 'Gate open'
})

const label = computed(() => {
  if (props.arriving) return "Caretaker's Gate — a crew is coming home"
  if (props.crewsOut > 0) {
    const plural = props.crewsOut > 1 ? 's' : ''
    return `Caretaker's Gate — ${props.crewsOut} crew${plural} out, next home in ${clock(remainingMs.value)}`
  }
  if (props.waiting > 0) return `Caretaker's Gate — ${props.waiting} waiting at berth`
  return "Caretaker's Gate — every crew departs and returns here"
})

const nodeStyle = computed(() => ({ left: `${props.left}%`, top: `${props.top}%` }))
const breathMs = `${VOYAGE_GATE_BREATH_MS}ms`
</script>

<template>
  <button
    class="gt"
    :class="`gt--${state}`"
    :style="nodeStyle"
    :aria-label="label"
    :title="label"
    @click.stop="emit('home')"
  >
    <!-- Eigene Ebene mit statischem Schein; animiert wird nur ihre opacity. Sie
         steht NUR, wenn etwas ansteht — im Ruhezustand trägt das Canvas das
         Bild allein. -->
    <span v-if="state === 'waiting' || state === 'arriving'" class="gt-breath" aria-hidden="true" />

    <svg
      v-if="showArc && nextReturnAt !== null"
      class="gt-arc"
      viewBox="0 0 36 36"
      aria-hidden="true"
    >
      <circle
        class="gt-arc-fill"
        cx="18"
        cy="18"
        r="16"
        :stroke-dasharray="VOYAGE_NODE_RING_CIRCUMFERENCE"
        :stroke-dashoffset="ringOffset"
      />
    </svg>

    <span class="gt-pill">{{ caption }}</span>
  </button>
</template>

<style scoped>
.gt {
  position: absolute;
  /* Unter den Hafenmarken: laege es darueber, verdeckte es einen Vertrag,
     der dem Kern nahe kommt — und der Hafen ist das, was eine Handlung will. */
  z-index: 0;
  width: var(--gt-size, 56px);
  height: var(--gt-size, 56px);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transform: translate(-50%, -50%);
}
.gt:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 4px;
  border-radius: 4px;
}

/* ── Schimmer: nur wenn etwas ansteht ───────────────────────────────────── */
.gt-breath {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 190%;
  height: 190%;
  margin: -95% 0 0 -95%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(232, 192, 96, 0.32) 0%,
    rgba(232, 192, 96, 0.11) 46%,
    rgba(232, 192, 96, 0) 72%
  );
  opacity: 0.5;
  pointer-events: none;
  animation: gt-breathe v-bind(breathMs) ease-in-out infinite alternate;
}
.gt--arriving .gt-breath {
  background: radial-gradient(
    circle,
    rgba(100, 220, 180, 0.46) 0%,
    rgba(100, 220, 180, 0.16) 46%,
    rgba(100, 220, 180, 0) 72%
  );
  opacity: 0.85;
}
@keyframes gt-breathe {
  from {
    opacity: 0.3;
  }
  to {
    opacity: 0.72;
  }
}

/* ── Der Ring auf die nächste Rückkehr ──────────────────────────────────── */
.gt-arc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}
.gt-arc-fill {
  fill: none;
  stroke: rgba(232, 192, 96, 0.62);
  stroke-width: 1.6;
  stroke-linecap: round;
  transition: stroke 0.16s ease;
}
.gt:hover .gt-arc-fill {
  stroke: rgba(255, 224, 150, 0.9);
}

/* ── Die Beschriftung ───────────────────────────────────────────────────── */
.gt-pill {
  position: absolute;
  left: 50%;
  top: calc(100% + 3px);
  transform: translateX(-50%);
  padding: 1px 6px;
  background: rgba(11, 8, 6, 0.86);
  border: 1px solid #3e200a;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(200, 144, 64, 0.72);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.gt:hover .gt-pill,
.gt--waiting .gt-pill {
  color: #e8c040;
}
.gt--arriving .gt-pill {
  color: #a0f0d0;
  border-color: #2e6a56;
}

@media (prefers-reduced-motion: reduce) {
  .gt-breath {
    animation: none;
    opacity: 0.5;
  }
  .gt-arc-fill {
    transition: none;
  }
}
</style>
