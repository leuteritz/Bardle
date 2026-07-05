<template>
  <div class="comet-root" :style="vars">
    <div class="comet-halo" />
    <div class="comet-rock">
      <div class="comet-shading" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { COMET_PHASE_DATA } from '@/config/constants'

/**
 * The player's origin body before First Spark: a wandering asteroid with Bard
 * asleep inside (a faint green shimmer, matching the header level badge).
 * Shared by every place that renders the player's celestial body — sibling of
 * PhaseSunDisc with the same contract (absolutely centered in its parent,
 * sized via the diameter prop) and the same breathing animation language as
 * the sun phases.
 */
export default defineComponent({
  name: 'CometDisc',
  props: {
    /** Disc diameter in px (the rock fills ~76% of it, like the sun's core). */
    diameter: { type: Number, required: true },
  },
  setup(props) {
    const vars = computed((): Record<string, string> => ({
      '--comet-d': `${props.diameter}px`,
      '--comet-core': COMET_PHASE_DATA.core,
      '--comet-mid': COMET_PHASE_DATA.mid,
      '--comet-edge': COMET_PHASE_DATA.edge,
      '--comet-crater': COMET_PHASE_DATA.crater,
      '--comet-glow': COMET_PHASE_DATA.glow,
      '--comet-dust': COMET_PHASE_DATA.dust,
      '--comet-tumble': COMET_PHASE_DATA.tumbleSec,
      '--comet-pulse': COMET_PHASE_DATA.pulseSpeed,
    }))

    return { vars }
  },
})
</script>

<style scoped>
.comet-root {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--comet-d, 120px);
  height: var(--comet-d, 120px);
  transform: translate(-50%, -50%);
  transition: width 1.2s ease, height 1.2s ease;
  /* Same breathing language as phase-sun-pulse, just subtler — cold rock,
     not burning plasma. */
  animation: comet-breathe var(--comet-pulse, 6s) ease-in-out infinite;
}

/* ── Dust halo — faint cold corona hinting at motion through space ── */
.comet-halo {
  position: absolute;
  inset: -14%;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 50%,
    transparent 38%,
    color-mix(in srgb, var(--comet-dust) 12%, transparent) 58%,
    transparent 78%
  );
  animation: comet-halo-shimmer 8s ease-in-out infinite;
}

/* ── Rock — irregular tumbling blob (celestial-body shape, not a UI box) ── */
.comet-rock {
  position: absolute;
  inset: 12%;
  border-radius: 46% 54% 58% 42% / 52% 44% 56% 48%;
  overflow: hidden;
  background:
    /* craters: dark floor + offset sunlit rim (light source sits at 30% 28%) */
    radial-gradient(circle at 60.5% 38.5%, color-mix(in srgb, var(--comet-core) 55%, white) 0 1.6%, transparent 2.6%),
    radial-gradient(circle at 62% 40%, var(--comet-crater) 0 7%, transparent 8%),
    radial-gradient(circle at 36.5% 64.5%, color-mix(in srgb, var(--comet-core) 45%, white) 0 1.2%, transparent 2%),
    radial-gradient(circle at 38% 66%, var(--comet-crater) 0 5%, transparent 6%),
    radial-gradient(circle at 70.5% 70.5%, color-mix(in srgb, var(--comet-mid) 70%, white) 0 0.9%, transparent 1.6%),
    radial-gradient(circle at 72% 72%, #443b33 0 4%, transparent 5%),
    radial-gradient(circle at 24.5% 43.5%, color-mix(in srgb, var(--comet-core) 50%, white) 0 1%, transparent 1.8%),
    radial-gradient(circle at 26% 45%, var(--comet-crater) 0 3.5%, transparent 4.5%),
    /* tiny pockmarks — dark only, no rim */
    radial-gradient(circle at 52% 22%, var(--comet-crater) 0 1.6%, transparent 2.4%),
    radial-gradient(circle at 80% 52%, #443b33 0 1.4%, transparent 2.2%),
    radial-gradient(circle at 46% 84%, var(--comet-crater) 0 1.8%, transparent 2.6%),
    /* base lit-rock gradient */
    radial-gradient(
      circle at 30% 28%,
      var(--comet-core) 0%,
      var(--comet-mid) 45%,
      var(--comet-edge) 78%,
      var(--comet-crater) 100%
    );
  box-shadow: 0 0 18px color-mix(in srgb, var(--comet-glow) 16%, transparent);
  /* Wobble, not a full spin — keeps the painted light source coherent */
  animation: comet-tumble var(--comet-tumble, 14s) ease-in-out infinite alternate;
}

/* ── Shading overlay — terminator (day/night edge) + cold rim light ── */
.comet-shading {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    128deg,
    transparent 42%,
    rgba(0, 0, 0, 0.18) 58%,
    rgba(0, 0, 0, 0.55) 82%
  );
  /* faint starlight grazing the shadowed limb */
  box-shadow:
    inset -3px -4px 6px color-mix(in srgb, var(--comet-glow) 12%, transparent),
    inset 6px 6px 14px rgba(0, 0, 0, 0.25);
}

@keyframes comet-breathe {
  0%, 100% { opacity: 0.94; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
}

@keyframes comet-tumble {
  from { transform: rotate(-7deg); }
  to { transform: rotate(9deg); }
}

@keyframes comet-halo-shimmer {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .comet-root,
  .comet-rock,
  .comet-halo {
    animation: none;
  }
}
</style>
