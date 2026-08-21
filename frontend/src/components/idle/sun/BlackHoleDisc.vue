<template>
  <div class="bh-root" :style="vars">
    <!-- Polar jets — the only part that leaves the disc plane. Behind everything. -->
    <span class="bh-jet bh-jet--up" />
    <span class="bh-jet bh-jet--down" />

    <!-- Lensed halo: the FAR side of the disc, bent up over the top of the hole
         and under its bottom. It is what turns a flat ring into a black hole. -->
    <span class="bh-halo" />

    <!-- Accretion disc, far half (above the horizon line) -->
    <span class="bh-disc bh-disc--far">
      <span class="bh-disc-spin" />
      <span class="bh-disc-glaze" />
    </span>

    <!-- Event horizon: the only fully opaque layer, plus the photon ring -->
    <span class="bh-shadow" />

    <!-- Accretion disc, near half — crosses IN FRONT of the horizon's lower edge -->
    <span class="bh-disc bh-disc--near">
      <span class="bh-disc-spin" />
      <span class="bh-disc-glaze" />
    </span>

    <!-- Debris spiralling in, riding the same tilted plane as the disc -->
    <span class="bh-inspiral">
      <span v-for="i in inspiralCount" :key="i" class="bh-mote" :style="moteStyle(i)" />
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { blackHoleSignatureVars } from '@/utils/game/solarSignature'
import {
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  BLACK_HOLE_SHADOW_FRACTION,
  BLACK_HOLE_PHOTON_RING_FRACTION,
  BLACK_HOLE_DISC_INNER_FRACTION,
  BLACK_HOLE_DISC_TILT,
  BLACK_HOLE_DISC_SPIN_SEC,
  BLACK_HOLE_HALO_FRACTION,
  BLACK_HOLE_DOPPLER_STRENGTH,
  BLACK_HOLE_JET_LENGTH_FRACTION,
  BLACK_HOLE_JET_WIDTH_FRACTION,
  BLACK_HOLE_JET_PULSE_SEC,
  BLACK_HOLE_INSPIRAL_COUNT,
  BLACK_HOLE_INSPIRAL_SEC,
} from '@/config/constants'

/**
 * The sun's final phase (Collapse). Pyre — the red giant — detonates in a
 * supernova and leaves this behind: an opaque event horizon inside a tilted,
 * Doppler-boosted accretion disc, wrapped by the gravitationally lensed far
 * side of that same disc.
 *
 * Same contract as PhaseSunDisc / CometDisc — absolutely centered in its parent,
 * sized by the `diameter` prop — so it drops into every place that renders the
 * player's celestial body without touching any layout.
 *
 * The event horizon stays fully opaque on purpose: the Planets tab lets a planet
 * pass BEHIND the sun, and that occlusion has to keep working.
 *
 * The root is its own container (`container-type: size`) and every inner size is
 * expressed in `cqw` or `%`. That is what lets a panel cap the root's width in
 * `cqmin` — as the Planets tab does — and have the whole black hole rescale
 * instead of bursting out of its box.
 *
 * Everything animated here is a transform or an opacity — no animated gradients
 * or box-shadows. This disc is on screen permanently once the phase is reached.
 */
export default defineComponent({
  name: 'BlackHoleDisc',
  props: {
    /** Disc diameter in px — the footprint the plasma sun would have had. */
    diameter: { type: Number, required: true },
  },
  setup(props) {
    const phase = STAR_PHASE_DATA[STAR_PHASE_FINAL_INDEX]
    const inspiralCount = BLACK_HOLE_INSPIRAL_COUNT
    const solarStore = useSolarUpgradeStore()

    /**
     * Die Signatur als Faktor auf fuenf Werte, die es hier schon gibt.
     *
     * Der Kollaps bekommt KEINE neue Ebene: jede der fuenf Achsen hat in dieser
     * Datei bereits eine Custom Property, die genau ihr Motiv traegt. Und
     * `inspiralCount` bleibt fest — eine an die Signatur gehaengte Elementzahl
     * waere genau die Kosten, die dieses Feature ausschliesst.
     */
    const sig = computed(() => blackHoleSignatureVars(solarStore.solarSignature))
    const f = (key: string): number => Number(sig.value[key] ?? 1)

    const vars = computed((): Record<string, string> => ({
      '--bh-d': `${props.diameter}px`,
      '--bh-core': phase.core,
      '--bh-mid': phase.mid,
      '--bh-edge': phase.edge,
      '--bh-glow': phase.phaseGlow,
      '--bh-shadow-f': `${BLACK_HOLE_SHADOW_FRACTION}`,
      // Fractions that feed `cqw` arrive as plain numbers — 1cqw is 1% of the
      // root's width, so `f * 100` is the same fraction the constant describes.
      '--bh-ring-f': `${BLACK_HOLE_PHOTON_RING_FRACTION * 100 * f('--sig-bh-ring')}`,
      // Mask stops read as a fraction of the disc's own radius, which equals the
      // fraction of the box diameter — see BLACK_HOLE_DISC_INNER_FRACTION.
      '--bh-inner': `${BLACK_HOLE_DISC_INNER_FRACTION * 100 * f('--sig-bh-inner')}%`,
      '--bh-tilt': `${BLACK_HOLE_DISC_TILT}`,
      '--bh-spin': `${BLACK_HOLE_DISC_SPIN_SEC}s`,
      '--bh-halo-f': `${BLACK_HOLE_HALO_FRACTION * f('--sig-bh-halo')}`,
      '--bh-dop': `${BLACK_HOLE_DOPPLER_STRENGTH * f('--sig-bh-dop')}`,
      '--bh-jet-w': `${BLACK_HOLE_JET_WIDTH_FRACTION * f('--sig-bh-jet')}`,
      '--bh-jet-l': `${BLACK_HOLE_JET_LENGTH_FRACTION * f('--sig-bh-jet')}`,
      '--bh-jet-pulse': `${BLACK_HOLE_JET_PULSE_SEC}s`,
      '--bh-inspiral': `${BLACK_HOLE_INSPIRAL_SEC}s`,
      '--bh-mote-f': `${f('--sig-bh-mote')}`,
      '--sig-core-lift': sig.value['--sig-core-lift'] ?? '0%',
    }))

    /** Motes share one keyframe and are spread over it by a negative delay. */
    function moteStyle(index: number): Record<string, string> {
      const offset = ((index - 1) / inspiralCount) * BLACK_HOLE_INSPIRAL_SEC
      return { animationDelay: `${-offset}s` }
    }

    return { vars, inspiralCount, moteStyle }
  },
})
</script>

<style scoped>
/* Same placement contract as .phase-sun-disc / .comet-root: centered in the
   parent, sized by the diameter prop, growing smoothly on a phase change.
   container-type: size makes every child's cqw resolve against THIS box —
   see the component doc for why that matters. It contains layout, not paint,
   so the glows still spill past the edge. */
.bh-root {
  position: absolute;
  top: 50%;
  left: 50%;
  container-type: size;
  width: var(--bh-d, 200px);
  height: var(--bh-d, 200px);
  transform: translate(-50%, -50%);
  transition: width 1.2s ease, height 1.2s ease;
  /* Heavier, slower breathing than a burning star — mass, not combustion. */
  animation: bh-breathe 7s ease-in-out infinite;
}

/* ── Event horizon ─────────────────────────────────────────────────────────
   Pure #000, never a dark tint: against the cosmic backdrop only true black
   reads as an absence of light rather than a dark ball. The crisp spread is the
   photon ring — light orbiting at the very rim. */
.bh-shadow {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  width: calc(var(--bh-shadow-f, 0.4) * 100%);
  height: calc(var(--bh-shadow-f, 0.4) * 100%);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #000;
  box-shadow:
    0 0 0 calc(var(--bh-ring-f, 1.4) * 1cqw) var(--bh-core, #ffffff),
    0 0 5cqw calc(var(--bh-ring-f, 1.4) * 1cqw)
      color-mix(in srgb, var(--bh-glow, #b45cff) 75%, transparent),
    0 0 16cqw 2cqw color-mix(in srgb, var(--bh-glow, #b45cff) 30%, transparent);
}

/* Second, wider ring that only breathes in opacity — an animated box-shadow on
   an element this large would repaint the whole disc every frame. */
.bh-shadow::after {
  content: '';
  position: absolute;
  inset: calc(var(--bh-ring-f, 1.4) * -2.2cqw);
  border-radius: 50%;
  border: calc(var(--bh-ring-f, 1.4) * 1cqw) solid
    color-mix(in srgb, var(--bh-core, #ffffff) 60%, transparent);
  opacity: 0.35;
  animation: bh-ring-pulse 2.6s ease-in-out infinite;
}

/* ── Lensed halo ───────────────────────────────────────────────────────────
   The far side of the disc, gravity-bent over the top of the hole and under its
   bottom. Masked to the top and bottom arcs only — at the sides the real, flat
   disc takes over, and the two meet seamlessly. */
.bh-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: calc(var(--bh-halo-f, 0.62) * 100%);
  height: calc(var(--bh-halo-f, 0.62) * 100%);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    transparent 0 80%,
    color-mix(in srgb, var(--bh-mid, #c8a2ff) 45%, white) 89%,
    color-mix(in srgb, var(--bh-edge, #6a12b8) 90%, transparent) 96%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    #000 0 16%,
    transparent 38%,
    transparent 62%,
    #000 84% 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0 16%,
    transparent 38%,
    transparent 62%,
    #000 84% 100%
  );
  filter: blur(0.35cqw);
}

/* ── Accretion disc ────────────────────────────────────────────────────────
   The plane is a full circle squashed on Y; its children spin as plain circles
   inside it, so the "orbiting plasma" is a compositor-only transform instead of
   an animated gradient. Split into two halves that clip around the horizon:
   the far half renders behind it, the near half in front. */
.bh-disc {
  position: absolute;
  inset: 0;
  transform: scaleY(var(--bh-tilt, 0.46));
  /* Contain the glaze's blend mode so it never reaches the starfield behind. */
  isolation: isolate;
  pointer-events: none;
}

.bh-disc--far {
  z-index: 2;
  clip-path: inset(0 0 50% 0);
}

.bh-disc--near {
  z-index: 4;
  clip-path: inset(50% 0 0 0);
}

.bh-disc-spin,
.bh-disc-glaze {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  /* Hollow ring: nothing is painted inside the disc's inner edge, and the outer
     rim fades instead of ending on a hard circle. */
  mask-image: radial-gradient(
    closest-side,
    transparent 0 var(--bh-inner, 46%),
    #000 calc(var(--bh-inner, 46%) + 1.5%),
    #000 88%,
    transparent 100%
  );
  -webkit-mask-image: radial-gradient(
    closest-side,
    transparent 0 var(--bh-inner, 46%),
    #000 calc(var(--bh-inner, 46%) + 1.5%),
    #000 88%,
    transparent 100%
  );
}

/* Plasma texture — uneven wedges with real gaps between them. Without the
   transparent troughs the disc averages out into one milky band and the
   rotation becomes invisible; the gaps are what makes it read as matter. */
.bh-disc-spin {
  background: conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--bh-mid, #c8a2ff) 60%, white) 0deg,
    var(--bh-mid, #c8a2ff) 18deg,
    color-mix(in srgb, var(--bh-edge, #6a12b8) 55%, transparent) 48deg,
    var(--bh-edge, #6a12b8) 78deg,
    color-mix(in srgb, var(--bh-mid, #c8a2ff) 70%, white) 112deg,
    var(--bh-mid, #c8a2ff) 140deg,
    color-mix(in srgb, var(--bh-edge, #6a12b8) 40%, transparent) 176deg,
    var(--bh-edge, #6a12b8) 214deg,
    color-mix(in srgb, var(--bh-mid, #c8a2ff) 85%, white) 250deg,
    color-mix(in srgb, var(--bh-edge, #6a12b8) 60%, transparent) 292deg,
    var(--bh-mid, #c8a2ff) 330deg,
    color-mix(in srgb, var(--bh-mid, #c8a2ff) 60%, white) 360deg
  );
  animation: bh-spin var(--bh-spin, 16s) linear infinite;
}

/* Two effects that must NOT rotate with the plasma: the inner edge is the
   hottest part of the disc (fixed in screen space), and relativistic beaming
   brightens whichever side moves towards the viewer. The hot band is kept
   narrow — spread wide it turns the whole disc white and eats the colour. */
.bh-disc-glaze {
  background:
    radial-gradient(
      closest-side,
      transparent 0 45%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0.08) 58%,
      transparent 70%
    ),
    linear-gradient(
      to right,
      rgba(255, 255, 255, var(--bh-dop, 0.62)) 0%,
      rgba(255, 255, 255, 0) 40%,
      rgba(0, 0, 0, 0.12) 58%,
      rgba(0, 0, 0, calc(var(--bh-dop, 0.62) * 0.95)) 100%
    );
  mix-blend-mode: overlay;
}

/* ── Infalling debris ──────────────────────────────────────────────────────
   Rides the same squashed plane as the disc, so the motes visibly orbit rather
   than drift across a flat circle. */
.bh-inspiral {
  position: absolute;
  inset: 0;
  z-index: 5;
  transform: scaleY(var(--bh-tilt, 0.46));
  pointer-events: none;
}

/* Die Truemmer wachsen mit der Klick-Achse — in der GROESSE, nicht in der
   Zahl: `BLACK_HOLE_INSPIRAL_COUNT` bleibt fest, sonst haenge die Ebenenzahl
   an der Zahl gekaufter Upgrades. */
.bh-mote {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(1.2cqw * var(--bh-mote-f, 1));
  height: calc(1.2cqw * var(--bh-mote-f, 1));
  border-radius: 50%;
  background: var(--bh-core, #ffffff);
  box-shadow: 0 0 calc(2cqw * var(--bh-mote-f, 1)) var(--bh-glow, #b45cff);
  animation: bh-inspiral var(--bh-inspiral, 5.5s) linear infinite;
}

/* ── Polar jets ────────────────────────────────────────────────────────────
   Narrow at the poles, flaring outwards, fading long before the tip. Deliberately
   faint: they are a hint of the physics, not a second light source. */
.bh-jet {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  width: calc(var(--bh-jet-w, 0.16) * 100%);
  height: calc(var(--bh-jet-l, 0.92) * 50%);
  clip-path: polygon(50% 100%, 100% 0%, 0% 0%);
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--bh-core, #ffffff) 92%, transparent) 0%,
    color-mix(in srgb, var(--bh-glow, #b45cff) 78%, white) 18%,
    color-mix(in srgb, var(--bh-glow, #b45cff) 62%, transparent) 44%,
    color-mix(in srgb, var(--bh-edge, #6a12b8) 40%, transparent) 74%,
    transparent 100%
  );
  /* Weichzeichnen statt harter Kegelkante — sonst liest sich der Jet als
     Dreieck aus der Werkzeugkiste, nicht als gebündeltes Plasma. */
  filter: blur(0.5cqw);
  opacity: 0.75;
  animation: bh-jet-pulse var(--bh-jet-pulse, 3.4s) ease-in-out infinite;
}

.bh-jet--up {
  transform: translate(-50%, -100%);
}

.bh-jet--down {
  transform: translate(-50%, 0) scaleY(-1);
}

@keyframes bh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bh-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.018);
  }
}

@keyframes bh-ring-pulse {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes bh-jet-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.92;
  }
}

/* Spirals from the outer disc down to the photon ring, then winks out. The
   rotation term is deliberately > 360° so the path reads as a spiral. */
@keyframes bh-inspiral {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) translateX(46cqw) scale(1);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  88% {
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) rotate(760deg) translateX(21cqw) scale(0.35);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bh-root,
  .bh-disc-spin,
  .bh-shadow::after,
  .bh-jet,
  .bh-mote {
    animation: none;
  }

  /* Without the spiral keyframe the motes would all pile up dead centre. */
  .bh-inspiral {
    display: none;
  }
}
</style>
