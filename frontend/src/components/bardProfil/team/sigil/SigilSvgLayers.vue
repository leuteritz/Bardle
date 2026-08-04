<script setup lang="ts">
import { computed } from 'vue'
import {
  SIGIL_STAGE_SIZE,
  SIGIL_RING_OUTER_R,
  SIGIL_RING_RUNE_R,
  SIGIL_RING_INNER_R,
  SIGIL_RING_CORE_R,
  SIGIL_DIM_COLOR,
  SWORN_ALLY_COUNT,
  SIGIL_LINK_GAP_MAIN,
  SIGIL_LINK_GAP_SWORN,
  SIGIL_LINK_GAP_BENCH,
} from '@/config/constants'
import type { SigilStageDef } from '@/types'
import type { SigilPoint } from '@/composables/useTeamSigil'

const props = defineProps<{
  stage: SigilStageDef
  filledSlots: number
  rolePoints: SigilPoint[]
  /** Ally satellite positions per role — rune ticks align with these. */
  allyPoints: SigilPoint[][]
  /** Per role: which ally sub-slots hold a champion. */
  allyFilled: boolean[][]
  roleColors: string[]
  mainFilled: boolean[]
  roleFull: boolean[]
  selectedRole: number | null
  showPentagram: boolean
  showMandala: boolean
}>()

const C = SIGIL_STAGE_SIZE / 2

const pentagonPath = computed(() =>
  props.rolePoints.map((p) => `${p.x},${p.y}`).join(' '),
)

interface RoleEdge {
  id: string
  a: SigilPoint
  b: SigilPoint
  colorA: string
  colorB: string
  lit: boolean
}

function buildEdge(id: string, i: number, j: number): RoleEdge {
  return {
    id,
    a: props.rolePoints[i],
    b: props.rolePoints[j],
    colorA: props.roleColors[i],
    colorB: props.roleColors[j],
    lit: props.mainFilled[i] && props.mainFilled[j],
  }
}

/** Pentagon edges — each link fades from one role's color into the other's
 *  at the middle of the line. */
const pentagonEdges = computed(() =>
  props.rolePoints.map((_, i) => buildEdge(`pent-${i}`, i, (i + 1) % props.rolePoints.length)),
)

/** Pentagram diagonals (0→2→4→1→3→0) — same two-color gradient treatment. */
const pentagramEdges = computed(() => {
  const order = [0, 2, 4, 1, 3]
  return order.map((i, idx) => buildEdge(`star-${i}`, i, order[(idx + 1) % order.length]))
})

function spokeColor(i: number): string {
  return props.mainFilled[i] ? props.roleColors[i] : SIGIL_DIM_COLOR
}

/** Gaps that keep a link off the champion images it connects, per endpoint kind.
 *  A sworn endpoint is a cut plate, not a disc: it reaches SIGIL_SWORN_SIZE / 2 +
 *  SIGIL_SWORN_RIM_PX = 24px at its corners, so the line has to stop further out
 *  than the portrait box alone would suggest. */
const LINK_GAP_MAIN = SIGIL_LINK_GAP_MAIN
const LINK_GAP_SWORN = SIGIL_LINK_GAP_SWORN
const LINK_GAP_BENCH = SIGIL_LINK_GAP_BENCH

type LinkKind = 'sworn' | 'yoke' | 'bench'
interface SigilLink {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  kind: LinkKind
}

/**
 * The role's chain of command, drawn as one connector layer:
 *
 *   node ──── sworn        thick, bright — the two that lend their stats
 *   sworn ─── sworn        the yoke across the node, so the pair reads as a pair
 *   sworn ─── bench        thin, dim — two feeders per bench ally, one to each
 *                              sworn, so the bench hangs off the PAIR
 *
 * A bench ally with no sworn ally seated falls back to the node, so a half-filled
 * role never leaves a satellite floating unconnected. Every segment is trimmed on
 * both ends by the radius of whatever it touches.
 */
const allyLinks = computed<SigilLink[]>(() => {
  const links: SigilLink[] = []
  props.allyPoints.forEach((points, roleIdx) => {
    const main = props.rolePoints[roleIdx]
    const color = props.roleColors[roleIdx] ?? props.stage.crestColor
    const filled = (sub: number) => !!props.allyFilled[roleIdx]?.[sub]

    const connect = (a: SigilPoint, b: SigilPoint, gapA: number, gapB: number, kind: LinkKind) => {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      if (dist <= gapA + gapB) return
      const ux = dx / dist
      const uy = dy / dist
      links.push({
        x1: a.x + ux * gapA,
        y1: a.y + uy * gapA,
        x2: b.x - ux * gapB,
        y2: b.y - uy * gapB,
        color,
        kind,
      })
    }

    const swornSubs = points.map((_, sub) => sub).filter((sub) => sub < SWORN_ALLY_COUNT && filled(sub))
    // node → each sworn, and the yoke between them
    for (const sub of swornSubs) {
      connect(main, points[sub], LINK_GAP_MAIN, LINK_GAP_SWORN, 'sworn')
    }
    for (let i = 1; i < swornSubs.length; i++) {
      connect(points[swornSubs[i - 1]], points[swornSubs[i]], LINK_GAP_SWORN, LINK_GAP_SWORN, 'yoke')
    }

    // every bench ally hangs off BOTH sworn allies — two feeders each, so the
    // bench reads as carried by the pair rather than assigned to one of them
    points.forEach((p, sub) => {
      if (sub < SWORN_ALLY_COUNT || !filled(sub)) return
      if (swornSubs.length === 0) {
        // no sworn ally seated yet — fall back to the node so nothing floats free
        connect(main, p, LINK_GAP_MAIN, LINK_GAP_BENCH, 'bench')
        return
      }
      for (const s of swornSubs) {
        connect(points[s], p, LINK_GAP_SWORN, LINK_GAP_BENCH, 'bench')
      }
    })
  })
  return links
})
</script>

<template>
  <!-- ── Rotierende Ringe: je ein EIGENES <svg> ──────────────────────────────
       Sie steckten früher als <g class="sigil-spin"> im Haupt-SVG. Eine
       Transform-Animation auf einem SVG-Kindelement kann Blink nicht auf den
       Compositor auslagern — die Folge war ein Repaint des kompletten
       900×900-Sigils in jedem einzelnen Frame, dauerhaft, solange der Team-Tab
       offen ist. Ein <svg> ist dagegen ein replaced element: rotiert man es als
       Ganzes, läuft die Drehung auf der GPU und der Main Thread bleibt außen
       vor. Gleicher viewBox, gleiche Koordinaten — die Ringe sitzen exakt wie
       zuvor, sie kosten nur nichts mehr. -->
  <svg
    class="sigil-svg sigil-svg--spin"
    :viewBox="`0 0 ${SIGIL_STAGE_SIZE} ${SIGIL_STAGE_SIZE}`"
    :style="{ '--spin-dur': `${stage.spinSec}s` }"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_OUTER_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1.5"
      stroke-dasharray="3 14"
      opacity="0.75"
    />
    <circle
      v-if="stage.extraRings >= 1"
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_OUTER_R - 22"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1"
      opacity="0.45"
    />
  </svg>

  <!-- counter-rotating extra ring (stage 2+) -->
  <svg
    v-if="stage.extraRings >= 2"
    class="sigil-svg sigil-svg--spin sigil-svg--reverse"
    :viewBox="`0 0 ${SIGIL_STAGE_SIZE} ${SIGIL_STAGE_SIZE}`"
    :style="{ '--spin-dur': `${stage.spinSec * 1.6}s` }"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_OUTER_R + 18"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1"
      stroke-dasharray="1 8"
      opacity="0.55"
    />
  </svg>

  <svg
    class="sigil-svg"
    :viewBox="`0 0 ${SIGIL_STAGE_SIZE} ${SIGIL_STAGE_SIZE}`"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- rune ring (decorative) -->
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_RUNE_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1"
      opacity="0.35"
    />

    <!-- inner circles -->
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_INNER_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1"
      stroke-dasharray="3 6"
      opacity="0.5"
    />
    <circle
      :cx="C"
      :cy="C"
      :r="SIGIL_RING_CORE_R"
      fill="none"
      :stroke="stage.ringColor"
      stroke-width="1.5"
      opacity="0.6"
    />

    <!-- two-color gradients: each main→main link blends between the two role
         colors at the middle of the line -->
    <defs>
      <linearGradient
        v-for="e in [...pentagonEdges, ...pentagramEdges]"
        :id="`sigil-edge-${e.id}`"
        :key="`grad-${e.id}`"
        gradientUnits="userSpaceOnUse"
        :x1="e.a.x"
        :y1="e.a.y"
        :x2="e.b.x"
        :y2="e.b.y"
      >
        <stop offset="0%" :stop-color="e.colorA" />
        <stop offset="42%" :stop-color="e.colorA" />
        <stop offset="58%" :stop-color="e.colorB" />
        <stop offset="100%" :stop-color="e.colorB" />
      </linearGradient>
    </defs>

    <!-- pentagon body (fill only — edges are drawn as gradient lines) -->
    <polygon
      :points="pentagonPath"
      :fill="showMandala ? `${stage.crestColor}14` : 'rgba(200, 164, 90, 0.04)'"
      stroke="none"
    />
    <g stroke-width="1.5" stroke-linecap="round">
      <line
        v-for="e in pentagonEdges"
        :key="e.id"
        :x1="e.a.x"
        :y1="e.a.y"
        :x2="e.b.x"
        :y2="e.b.y"
        :stroke="`url(#sigil-edge-${e.id})`"
        :opacity="e.lit ? 0.9 : 0.4"
      />
    </g>
  </svg>

  <!-- ── Pentagramm — erscheint, sobald alle 5 Mains stehen ──────────────────
       Auch dieses Overlay hat sein eigenes <svg>: sein Glühen animiert Opacity,
       und Opacity auf einer SVG-Gruppe ist genauso wenig compositierbar wie
       eine Transform darauf. Im Haupt-SVG hieß das: sobald das Team vollzählig
       ist, wird das gesamte Sigil dauerhaft in jedem Frame neu gezeichnet —
       ausgerechnet im vollen Team, wo ohnehin am meisten zu zeichnen ist. Als
       eigenes Element ist es eine Compositor-Ebene, die nur ihre eigene
       Deckkraft ändert. Der Farbverlauf per url(#…) löst dokumentweit auf, die
       Linien behalten also ihre Zwei-Farben-Verläufe aus dem Haupt-SVG. -->
  <svg
    v-if="showPentagram"
    class="sigil-svg sigil-svg--pentagram"
    :viewBox="`0 0 ${SIGIL_STAGE_SIZE} ${SIGIL_STAGE_SIZE}`"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <g stroke-width="1.2" stroke-linecap="round">
      <line
        v-for="e in pentagramEdges"
        :key="e.id"
        :x1="e.a.x"
        :y1="e.a.y"
        :x2="e.b.x"
        :y2="e.b.y"
        :stroke="`url(#sigil-edge-${e.id})`"
      />
    </g>
  </svg>

  <svg
    class="sigil-svg"
    :viewBox="`0 0 ${SIGIL_STAGE_SIZE} ${SIGIL_STAGE_SIZE}`"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- ally links: role main → each filled ally satellite -->
    <!-- chain of command: the stroke weight IS the hierarchy -->
    <g stroke-linecap="round">
      <line
        v-for="(l, k) in allyLinks"
        :key="`ally-link-${k}`"
        :x1="l.x1"
        :y1="l.y1"
        :x2="l.x2"
        :y2="l.y2"
        :stroke="l.color"
        :stroke-width="l.kind === 'sworn' ? 2.6 : l.kind === 'yoke' ? 1.8 : 1"
        :stroke-dasharray="l.kind === 'bench' ? '5 5' : undefined"
        :opacity="l.kind === 'sworn' ? 0.9 : l.kind === 'yoke' ? 0.7 : 0.4"
      />
    </g>

    <!-- spokes: center → role vertex, lit in role color once the main is set -->
    <g stroke-width="1.5" stroke-linecap="round">
      <line
        v-for="(p, i) in rolePoints"
        :key="`spoke-${i}`"
        :x1="C"
        :y1="C"
        :x2="p.x"
        :y2="p.y"
        :stroke="spokeColor(i)"
        :opacity="mainFilled[i] ? 0.7 : 0.4"
      />
    </g>

    <!-- vertex diamonds — lit per filled main -->
    <g>
      <rect
        v-for="(p, i) in rolePoints"
        :key="`vertex-${i}`"
        :x="p.x - 5"
        :y="p.y - 5"
        width="10"
        height="10"
        :transform="`rotate(45 ${p.x} ${p.y})`"
        :fill="mainFilled[i] ? roleColors[i] : SIGIL_DIM_COLOR"
        :opacity="mainFilled[i] ? 0.95 : 0.6"
      />
    </g>

  </svg>

  <!-- mandala petals at a complete 15/15 team — eigenes <svg> aus demselben
       Grund wie die Ringe oben; es liegt nach dem Haupt-SVG, zeichnet also
       weiterhin darüber -->
  <svg
    v-if="showMandala"
    class="sigil-svg sigil-svg--spin"
    :viewBox="`0 0 ${SIGIL_STAGE_SIZE} ${SIGIL_STAGE_SIZE}`"
    :style="{ '--spin-dur': `${stage.spinSec * 2}s` }"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      v-for="(p, i) in rolePoints"
      :key="`petal-${i}`"
      :cx="(p.x + C) / 2"
      :cy="(p.y + C) / 2"
      :r="52"
      fill="none"
      :stroke="stage.crestColor"
      stroke-width="1"
      stroke-dasharray="2 5"
      opacity="0.5"
    />
  </svg>
</template>

<style scoped>
.sigil-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
/* Die Drehung sitzt auf dem <svg> selbst, nicht auf einer Gruppe darin: eine
   laufende Transform-Animation auf einem replaced element bekommt ihre eigene
   Compositor-Ebene, eine auf einem SVG-Kindelement nicht. Bewusst OHNE
   `will-change` — das würde die Ebene schon beim Mounten anlegen, also genau in
   dem Frame, der beim Öffnen des Tabs ohnehin der teuerste ist. */
.sigil-svg--spin {
  transform-origin: 50% 50%;
  animation: sigil-rotate var(--spin-dur, 60s) linear infinite;
}
.sigil-svg--reverse {
  animation-direction: reverse;
}
.sigil-svg--pentagram {
  animation: pentagram-glow 3s ease-in-out infinite;
}
@keyframes sigil-rotate {
  to {
    transform: rotate(360deg);
  }
}
@keyframes pentagram-glow {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.85;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sigil-svg--spin,
  .sigil-svg--pentagram {
    animation: none !important;
  }
}
</style>
