<template>
  <!-- Ladder border for a roster card: a thin tier-coloured line that fades
       toward the bottom, blades in the upper corners and a crown standing on
       the top edge. Purely decorative — never takes a click. -->
  <div class="rank-frame" :class="frameClass" :style="frameVars">
    <span class="frame-line" />
    <!-- Master and up: the line breathes instead of sitting still -->
    <span v-if="lit && frame.pulse" class="frame-aura" />
    <!-- Diamond and up: a reflection travels along the line -->
    <span v-if="lit && frame.sweep" class="frame-sweep" />
    <!-- Challenger only: an arc of light circles the whole card -->
    <span v-if="lit && frame.halo" class="frame-halo" />

    <!-- Corner blades: doubled feathers up top, a plain angle below -->
    <svg
      v-for="corner in FRAME_CORNERS"
      :key="corner"
      class="frame-blade"
      :class="`frame-blade--${corner}`"
      viewBox="0 0 60 60"
      aria-hidden="true"
    >
      <path class="blade-arm" d="M0 0 H58 L51 5 H0 Z" />
      <path class="blade-arm" d="M0 0 V58 L5 51 V0 Z" />
      <path class="blade-feather" d="M14 7 H41 L33 12 H10 Z" />
      <path class="blade-feather" d="M7 14 V41 L12 33 V10 Z" />
    </svg>

    <!-- Crown: the tier's signature, seated on the top edge and rising above it.
         Every stage layers onto the one before instead of replacing it. -->
    <svg
      class="frame-crown"
      viewBox="0 0 160 40"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      <!-- outer wings (royal and up) — the widest sweep, almost flat -->
      <g class="crown-part crown-part--royal">
        <path d="M48 37 C32 36 16 32 2 23 C16 35 32 39 47 40 Z" />
        <path d="M112 37 C128 36 144 32 158 23 C144 35 128 39 113 40 Z" />
      </g>
      <!-- inner wings (wings and up) -->
      <g class="crown-part crown-part--wings">
        <path d="M50 33 C36 32 22 28 10 18 C20 30 34 36 48 37.5 Z" />
        <path d="M110 33 C124 32 138 28 150 18 C140 30 126 36 112 37.5 Z" />
      </g>
      <!-- apex blades riding the wings + flanking spikes -->
      <g class="crown-part crown-part--apex">
        <path d="M27 30 L33 20 L37 31 Z" />
        <path d="M133 30 L127 20 L123 31 Z" />
        <path d="M53 21 L56 27.5 L53 34 L50 27.5 Z" />
        <path d="M107 21 L110 27.5 L107 34 L104 27.5 Z" />
      </g>
      <!-- socket: the crown's footing on the card's top edge -->
      <path class="crown-socket" d="M38 40 L48 30 H112 L122 40 Z" />
      <!-- plain tiers get short angled flanks, so the base stage still reads as
           an ornament rather than a lone spike -->
      <g class="crown-part crown-part--base">
        <path d="M48 31 L64 22 L68 29 L57 33 Z" />
        <path d="M112 31 L96 22 L92 29 L103 33 Z" />
      </g>
      <!-- side spikes (crown and up) -->
      <g class="crown-part crown-part--crown">
        <path d="M64 11 L69 24 L67 33 H61 L59 24 Z" />
        <path d="M96 11 L91 24 L93 33 H87 L85 24 Z" />
      </g>
      <!-- centre spire — every tier has it, it just grows -->
      <path class="crown-spire" d="M80 2 L86.5 20 L83 33 H77 L73.5 20 Z" />
      <!-- lit core of the spire -->
      <path class="crown-lit" d="M80 7 L83 20 L80 27 L77 20 Z" />
      <!-- gemstone (crown and up) -->
      <path class="crown-part crown-part--crown crown-gem" d="M80 19 L84 25 L80 31 L76 25 Z" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { RANK_FRAME_STYLES, RANK_FRAME_CROWN_FOOT, RANK_TIER_COLORS } from '@/config/constants'

const props = defineProps<{
  /** Ladder tier the frame represents — always the player's current rank */
  tier: string
  /** Empty slots wear the same frame, dimmed and without any moving part */
  lit: boolean
}>()

const FRAME_CORNERS = ['tl', 'tr', 'bl', 'br'] as const

const frame = computed(() => RANK_FRAME_STYLES[props.tier] ?? RANK_FRAME_STYLES.Iron)
const color = computed(() => RANK_TIER_COLORS[props.tier] ?? '#8a9098')

const frameClass = computed(() => [
  `rank-frame--${frame.value.crown}`,
  { 'rank-frame--dim': !props.lit },
])

const frameVars = computed(
  () =>
    ({
      '--rank-c': color.value,
      '--frame-w': `${frame.value.width}px`,
      '--crown-w': `${frame.value.crownW}px`,
      '--crown-h': `${frame.value.crownH}px`,
      '--crown-foot': `${RANK_FRAME_CROWN_FOOT}px`,
      '--blade-len': `${frame.value.blade}px`,
      '--line-sat': String(frame.value.saturate),
    }) as CSSProperties,
)
</script>

<style scoped>
.rank-frame {
  /* --frame-scale comes from the card, which scales its own content with it
     (see TeamRosterPanel's height queries); 1 is the standalone fallback */
  --w: calc(var(--frame-w) * var(--frame-scale, 1));
  --blade: calc(var(--blade-len) * var(--frame-scale, 1));
  --foot: calc(var(--crown-foot) * var(--frame-scale, 1));
  position: absolute;
  inset: 0;
  /* above the hover stat sheet (z 3) so the border never gets covered */
  z-index: 4;
  border-radius: 5px;
  pointer-events: none;
}
.rank-frame--dim {
  opacity: 0.4;
}

/* ── The line ──
   A ring cut out of a full-size box. Bright along the top where the crown sits,
   fading out toward the bottom, exactly like the ladder borders. */
.frame-line,
.frame-sweep,
.frame-halo {
  position: absolute;
  inset: 0;
  border-radius: 5px;
  padding: var(--w);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.frame-line {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rank-c) 45%, #fff) 0%,
    var(--rank-c) 12%,
    var(--rank-c) 42%,
    color-mix(in srgb, var(--rank-c) 62%, transparent) 78%,
    color-mix(in srgb, var(--rank-c) 34%, transparent) 100%
  );
  filter: saturate(var(--line-sat));
}

/* Reflection sliding along the line — one pass every few seconds */
.frame-sweep {
  background: linear-gradient(
    115deg,
    transparent 41%,
    rgba(255, 255, 255, 0.92) 50%,
    transparent 59%
  );
  background-size: 300% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
  animation: frame-sweep 3.8s linear infinite;
}

/* Rotating arc: a square far larger than the card spins behind the ring mask,
   so only the lit stretch of the conic gradient shows on the line. */
.frame-halo {
  overflow: hidden;
}
.frame-halo::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 280%;
  aspect-ratio: 1;
  translate: -50% -50%;
  background: conic-gradient(
    from 0deg,
    transparent 0 57%,
    color-mix(in srgb, var(--rank-c) 55%, transparent) 71%,
    #fff 79%,
    color-mix(in srgb, var(--rank-c) 55%, transparent) 87%,
    transparent 100%
  );
  animation: frame-spin 5.2s linear infinite;
}

/* Inner glow that swells and fades — the card looks charged, not painted */
.frame-aura {
  position: absolute;
  inset: 0;
  border-radius: 5px;
  box-shadow: inset 0 0 calc(15px * var(--frame-scale, 1))
    color-mix(in srgb, var(--rank-c) 50%, transparent);
  animation: frame-breathe 3.4s ease-in-out infinite;
}

/* ── Corner blades ──
   One SVG, mirrored into all four corners. The lower pair drops its feathers,
   so the bottom of the card stays as quiet as the reference borders. */
/* Square box with uniform scaling, so both arms keep the same thickness. Only
   the outermost few percent are painted — the arms hug the line and leave the
   card's content untouched. */
.frame-blade {
  position: absolute;
  width: var(--blade);
  height: var(--blade);
  overflow: visible;
  fill: color-mix(in srgb, var(--rank-c) 30%, #fff);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--rank-c) 70%, transparent));
}
/* inset by the corner radius, so the tips follow the card's rounding */
.frame-blade--tl {
  top: 2px;
  left: 2px;
}
.frame-blade--tr {
  top: 2px;
  right: 2px;
  scale: -1 1;
}
.frame-blade--bl {
  bottom: 2px;
  left: 2px;
  scale: 1 -1;
}
.frame-blade--br {
  bottom: 2px;
  right: 2px;
  scale: -1 -1;
}
/* the lower corners stay plain and quiet */
.frame-blade--bl .blade-feather,
.frame-blade--br .blade-feather {
  display: none;
}
.frame-blade--bl,
.frame-blade--br {
  opacity: 0.65;
}
/* feathers only once the tier has earned them */
.rank-frame--plain .blade-feather {
  display: none;
}

/* ── Crown ──
   Sits centred on the top edge, most of it rising above the card. Its foot
   overlaps the line by --foot so it reads as standing on it, not floating. */
.frame-crown {
  position: absolute;
  left: 50%;
  bottom: calc(100% - var(--foot));
  translate: -50% 0;
  width: calc(var(--crown-w) * var(--frame-scale, 1));
  height: calc(var(--crown-h) * var(--frame-scale, 1));
  overflow: visible;
  fill: var(--rank-c);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 7px color-mix(in srgb, var(--rank-c) 75%, transparent));
}

.crown-socket {
  fill: color-mix(in srgb, var(--rank-c) 55%, #000);
}
.crown-spire {
  fill: var(--rank-c);
}
.crown-lit {
  fill: color-mix(in srgb, var(--rank-c) 30%, #fff);
}
.crown-gem {
  fill: color-mix(in srgb, var(--rank-c) 20%, #fff);
}

/* Stage gating: each tier shows its own parts plus every earlier one. The base
   flanks are the exception — later stages replace them with real side spikes. */
.crown-part {
  display: none;
}
.rank-frame--plain .crown-part--base,
.rank-frame--crown .crown-part--crown,
.rank-frame--wings .crown-part--crown,
.rank-frame--royal .crown-part--crown,
.rank-frame--apex .crown-part--crown,
.rank-frame--wings .crown-part--wings,
.rank-frame--royal .crown-part--wings,
.rank-frame--apex .crown-part--wings,
.rank-frame--royal .crown-part--royal,
.rank-frame--apex .crown-part--royal,
.rank-frame--apex .crown-part--apex {
  display: block;
}

/* Apex crowns catch the light along the spire */
.rank-frame--apex .crown-lit {
  animation: crown-shine 2.8s ease-in-out infinite;
}

@keyframes frame-sweep {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

@keyframes frame-spin {
  100% {
    rotate: 360deg;
  }
}

@keyframes frame-breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

@keyframes crown-shine {
  0%,
  100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .frame-sweep,
  .frame-aura,
  .frame-halo::before,
  .rank-frame--apex .crown-lit {
    animation: none;
  }
}
</style>
