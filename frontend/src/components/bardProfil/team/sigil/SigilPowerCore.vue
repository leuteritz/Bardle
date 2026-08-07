<script setup lang="ts">
/**
 * ── Power core — the middle of the Battle Sigil ───────────────────────────────
 *
 * The centre answers one question and shows its working: how strong is this
 * team, and where does that strength come from. The figure inside is the SUM of
 * the five role nodes; the ring around it is that same sum cut into five arcs,
 * one per role, each as long as that role's share. Read against the power tab on
 * every name plate, the board is a whole sentence — each node states its number,
 * the ring states its weight, the middle states the total.
 *
 * Cost: the gauge is a plain SVG stroke that is repainted only when a slot
 * changes. Nothing in here animates except the crest's own pulse ring, which
 * animates transform and opacity alone — see the performance rules in CLAUDE.md.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber, formatNumberCompact } from '@/config/ui/numberFormat'
import {
  ROLES,
  SIGIL_CREST_SIZE,
  SIGIL_CORE_GAUGE_RADIUS,
  SIGIL_CORE_GAUGE_CIRCUMFERENCE,
  SIGIL_CORE_GAUGE_STROKE,
  SIGIL_CORE_GAUGE_GAP,
  SIGIL_CORE_GAUGE_MIN_ARC,
  SIGIL_CORE_GAUGE_LABEL_PX,
} from '@/config/constants'
import type { SigilStageDef } from '@/types'

const props = defineProps<{
  stage: SigilStageDef
  /** Sum of `rolePower` — kept as its own prop so the caller stays the one source. */
  teamPower: number
  /** Power contributed by each role, index-aligned with ROLES. */
  rolePower: number[]
  /** Active traits + origin synergies. */
  synergyCount: number
}>()

const emit = defineEmits<{ open: [] }>()

const crestPx = `${SIGIL_CREST_SIZE}px`
const gaugeStroke = String(SIGIL_CORE_GAUGE_STROKE)
const labelPx = `${SIGIL_CORE_GAUGE_LABEL_PX}px`

interface GaugeSegment {
  key: string
  color: string
  dash: string
  offset: number
  /** Whole-percent share, the figure printed on the arc while the core is hovered. */
  pct: number
  /** Label seat: the arc's middle, on the ring's centre line, in % of the crest box. */
  left: string
  top: string
  /** Tangent of the ring at that seat, flipped where it would read upside down. */
  rot: string
}

/**
 * Whole percentages that add up to 100 exactly (largest remainder). Plain
 * rounding would let five arcs read 21/21/21/21/21 and leave the player looking
 * for the missing 5 % — the ring is a breakdown, so its figures have to close.
 */
function wholePercents(values: number[], total: number): number[] {
  const raw = values.map((v) => (v / total) * 100)
  const out = raw.map(Math.floor)
  const remainder = 100 - out.reduce((sum, v) => sum + v, 0)
  const byFraction = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < remainder; k++) out[byFraction[k % byFraction.length].i]++
  return out
}

/** Roles that hold any power at all, in ROLES order. */
const active = computed(() =>
  props.rolePower.map((power, index) => ({ power, index })).filter((r) => r.power > 0),
)

/** Share per role, index-aligned with ROLES (0 where the role is empty). */
const rolePct = computed<number[]>(() => {
  const out = props.rolePower.map(() => 0)
  if (props.teamPower <= 0) return out
  const percents = wholePercents(
    active.value.map((r) => r.power),
    props.teamPower,
  )
  active.value.forEach((r, k) => {
    out[r.index] = percents[k]
  })
  return out
})

/**
 * One arc per role that actually contributes, laid out clockwise from twelve
 * o'clock in ROLES order — the same order and the same starting direction as the
 * pentagon outside, so the arcs run in the direction of the nodes they stand for.
 *
 * A role with no power is skipped rather than drawn empty: the ring is a
 * breakdown of what exists, and the dim track behind it already carries the
 * "nothing here yet" reading.
 */
const segments = computed<GaugeSegment[]>(() => {
  if (active.value.length === 0) return []

  // One gap per arc — the last one closes the circle back onto the first, so a
  // single contributing role reads as an arc rather than as a plain ring.
  const usable = Math.max(
    SIGIL_CORE_GAUGE_CIRCUMFERENCE - active.value.length * SIGIL_CORE_GAUGE_GAP,
    0,
  )

  let cursor = 0
  return active.value.map(({ power, index }) => {
    const length = Math.max((power / props.teamPower) * usable, SIGIL_CORE_GAUGE_MIN_ARC)
    // The arc's middle, taken along the stroke and turned back into an angle.
    // −90° because the gauge group is rotated to start at twelve o'clock.
    const mid = ((cursor + length / 2) / SIGIL_CORE_GAUGE_CIRCUMFERENCE) * 360 - 90
    const rad = (mid * Math.PI) / 180
    // The figure follows the ring instead of standing upright: a horizontal
    // label is at most 12px tall but over 20px wide, and at the ring's left and
    // right the WIDTH is what has to cross a 13.6px band — two thirds of it
    // would end up on the dark disc either side of its own arc. Turned tangent,
    // only its height crosses the band and it fits with room to spare. Flipped
    // by half a turn on the far side so it never reads upside down.
    const tangent = mid + 90
    const rot = tangent > 90 && tangent < 270 ? tangent - 180 : tangent
    const segment: GaugeSegment = {
      key: `core-arc-${index}`,
      color: ROLES[index].color,
      dash: `${length.toFixed(2)} ${SIGIL_CORE_GAUGE_CIRCUMFERENCE.toFixed(2)}`,
      offset: -cursor,
      pct: rolePct.value[index],
      // The gauge's viewBox is 0–100, so a radius in viewBox units IS a
      // percentage of the crest box — no second unit to keep in step.
      left: `${(50 + SIGIL_CORE_GAUGE_RADIUS * Math.cos(rad)).toFixed(2)}%`,
      top: `${(50 + SIGIL_CORE_GAUGE_RADIUS * Math.sin(rad)).toFixed(2)}%`,
      rot: `${rot.toFixed(1)}deg`,
    }
    cursor += length + SIGIL_CORE_GAUGE_GAP
    return segment
  })
})

const powerLabel = computed(() => formatNumberCompact(props.teamPower))
const synergyLabel = computed(() =>
  props.synergyCount === 1 ? '1 Synergy' : `${props.synergyCount} Synergies`,
)

/** The breakdown in words — the ring says the proportions, this says the numbers. */
const breakdown = computed(() => {
  const parts = ROLES.map(
    (role, i) => `${role.label} ${formatNumber(props.rolePower[i] ?? 0)} (${rolePct.value[i]}%)`,
  )
  return `Team Power ${formatNumber(props.teamPower)} — ${parts.join(' · ')}`
})
</script>

<template>
  <!-- escalation pulse: a ring that swells out of the core, its cadence set by
       the sigil stage. transform + opacity only. -->
  <div
    class="core-pulse"
    :style="{
      borderColor: stage.crestColor,
      animationDuration: stage.pulseSec > 0 ? `${stage.pulseSec}s` : undefined,
      animationName: stage.pulseSec > 0 ? undefined : 'none',
    }"
  />

  <button
    class="core"
    :style="{ '--crest-color': stage.crestColor }"
    :title="breakdown"
    aria-label="Open team synergies"
    @click.stop="emit('open')"
  >
    <!-- distribution gauge, inset at the disc's rim -->
    <svg class="core-gauge" viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(-90 50 50)">
        <circle
          class="core-gauge-track"
          cx="50"
          cy="50"
          :r="SIGIL_CORE_GAUGE_RADIUS"
          :stroke="stage.ringColor"
        />
        <circle
          v-for="segment in segments"
          :key="segment.key"
          class="core-gauge-arc"
          cx="50"
          cy="50"
          :r="SIGIL_CORE_GAUGE_RADIUS"
          :stroke="segment.color"
          :stroke-dasharray="segment.dash"
          :stroke-dashoffset="segment.offset"
        />
      </g>
    </svg>

    <!-- Share readout — one figure per arc, seated on the arc it belongs to and
         only while the core is pointed at. The ring alone says which role is the
         bigger slice; this says by how much, and it says it where the answer is
         rather than in a legend the eye has to walk to. Dark ink on lit metal,
         the same inversion the level tab on every name plate uses. -->
    <span class="core-shares" aria-hidden="true">
      <span
        v-for="segment in segments"
        :key="`pct-${segment.key}`"
        class="core-share"
        :style="{
          left: segment.left,
          top: segment.top,
          transform: `translate(-50%, -50%) rotate(${segment.rot})`,
          '--arc-color': segment.color,
        }"
        >{{ segment.pct }}%</span
      >
    </span>

    <span class="core-face">
      <span class="core-label">Team Power</span>
      <span class="core-value">{{ powerLabel }}</span>
      <span class="core-stage">
        <i class="core-stage-rule" aria-hidden="true" />
        <span class="core-stage-name">{{ stage.name }}</span>
        <i class="core-stage-rule" aria-hidden="true" />
      </span>
    </span>

    <span class="core-syn" :class="{ 'core-syn--none': synergyCount === 0 }">
      <Icon icon="game-icons:linked-rings" width="15" height="15" />
      {{ synergyLabel }}
    </span>
  </button>
</template>

<style scoped>
.core-pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  width: v-bind(crestPx);
  height: v-bind(crestPx);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid;
  pointer-events: none;
  animation: core-pulse 3.5s ease-out infinite;
}

/* The disc itself. Doubles as the team-synergies trigger, so the whole face is
   one button — there is nothing inside it a player would want to press apart. */
.core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: v-bind(crestPx);
  height: v-bind(crestPx);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  cursor: pointer;
  background: radial-gradient(circle at 50% 34%, #2a1f10, #0e0906 72%);
  box-shadow:
    0 0 0 2px #7a5a1e,
    0 0 28px rgba(220, 170, 60, 0.3),
    inset 0 0 26px rgba(0, 0, 0, 0.8);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}
.core:hover {
  transform: translate(-50%, -50%) scale(1.03);
  box-shadow:
    0 0 0 2px #c89040,
    0 0 40px rgba(232, 192, 64, 0.5),
    inset 0 0 26px rgba(0, 0, 0, 0.8);
}

/* ── gauge ──
   Inset at the rim rather than wrapped around the outside: the plates of the two
   roles at ±18° come within ~16px of the disc, and a ring drawn outside it would
   spend exactly that clearance. Butt caps, because round ones would add half a
   stroke at each end and eat the gap that separates two role colours. */
.core-gauge {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.core-gauge-track {
  fill: none;
  stroke-width: v-bind(gaugeStroke);
  opacity: 0.32;
}
.core-gauge-arc {
  fill: none;
  stroke-width: v-bind(gaugeStroke);
  stroke-linecap: butt;
}

/* ── share readout (hover) ──
   Five figures on the ring's centre line, each at the middle of its own arc.
   Opacity only — the labels are laid out once when a slot changes and just fade
   in, so pointing at the core costs a compositor pass and nothing else. */
.core-shares {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.16s ease;
}
.core:hover .core-shares,
.core:focus-visible .core-shares {
  opacity: 1;
}
/* The figure is its role's colour, lit, with no plate under it — the contrast it
   needs comes from a dark outline ON THE GLYPH instead of a box behind it. That
   keeps the ring whole (the plate this replaced covered 36 % of the
   circumference, a third of the gauge hidden behind its own labels) while the
   number still reads as the role's own colour rather than as ink.

   An outline is the only way to have both. Lit role colour straight on the
   matching arc is same-hue-on-same-hue: mixed toward white it measures 2.7 : 1
   on Top and 1.5 : 1 on Support, i.e. not readable at any mix. With the outline
   the figure no longer sits on its arc at all, it sits on its own dark edge, so
   the arc underneath stops mattering and the fill can stay bright.

   `paint-order: stroke fill` paints the outline first and the letterform over
   it, so the stroke only ever grows OUTWARD — without it half of its 2px would
   be cut out of the stem of a 12px glyph and the figure would come out spindly.
   2px is where it stopped: at 2.6 the figures read as black shapes with a
   coloured core, and the fill was lifted to 46 % white in the same pass so the
   colour carries the number and the edge only separates it.

   Static paint, no layout, no filter: the label box stays 23×12, well inside the
   13.6px band, and the outline adds nothing to it. */
.core-share {
  position: absolute;
  /* seat and tangent come inline — they are geometry, not style */
  display: block;
  font-size: v-bind(labelPx);
  line-height: 1;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, #fff 46%, var(--arc-color));
  -webkit-text-stroke: 2px rgba(5, 3, 1, 0.94);
  paint-order: stroke fill;
  white-space: nowrap;
}

/* The face is a RECTANGLE inside a circle, so its width is bounded by its own
   height, not by the ring's diameter: the gauge's inner edge sits at 39% of the
   crest (66px), the block is ~72px tall, so its half-width may reach
   √(66² − 36²) = 55px — 65% of the crest. 62% keeps a hair of air at the corners
   where the bottom rule runs widest. */
.core-face {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 62%;
}
.core-label {
  font-size: 10.5px;
  line-height: 1;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(212, 176, 102, 0.82);
}
/* The headline of the whole board. Tabular figures so the number does not
   twitch sideways every time a slot changes. */
.core-value {
  font-size: 44px;
  line-height: 0.94;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: var(--crest-color);
  text-shadow: 0 0 14px color-mix(in srgb, var(--crest-color) 45%, transparent);
}
.core-stage {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
/* Two hairlines flanking the stage name — they close the face off at the bottom
   and give the word a baseline to sit on instead of floating under the number. */
.core-stage-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--crest-color) 55%, transparent)
  );
}
.core-stage-rule:last-child {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--crest-color) 55%, transparent)
  );
}
.core-stage-name {
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--crest-color);
}

/* ── synergy chip ──
   Seated just under the disc on the one axis that stays free: the plates of the
   two lower roles start 125px out from the centre, the chip ends at 111. It says
   the WORD, not just the count — a bare number under a power figure would read
   as a second power figure. */
.core-syn {
  position: absolute;
  left: 50%;
  bottom: -22px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 4px;
  background: #1e1006;
  border: 1px solid #c89040;
  color: #e8c040;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}
.core:hover .core-syn {
  border-color: #e8c060;
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.5);
}
/* Nothing active yet — the chip stays legible, it just stops claiming attention.
   Colour, not opacity: a 11px glyph at half alpha on near-black is gone. */
.core-syn--none {
  background: #16120a;
  border-color: #5c3310;
  color: #8a7448;
}

@keyframes core-pulse {
  0% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1);
  }
  72%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.55);
  }
}
@media (prefers-reduced-motion: reduce) {
  .core-pulse {
    animation: none !important;
  }
}
</style>
