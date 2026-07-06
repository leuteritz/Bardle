<template>
  <div class="comet-root" :style="vars">
    <div class="comet-rock">
      <div class="comet-gilding" />
      <div class="comet-shading" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { COMET_PHASE_DATA, COMET_STAGE_GOLD } from '@/config/constants'

/**
 * The player's origin body before First Spark: a wandering asteroid with Bard
 * asleep inside. Each of the five Star Forge core rays bought to Lv 1 gilds
 * the rock a little more (solarUpgradeStore.cometStage drives --comet-gold);
 * at stage 0 it is bare grey stone. Shared by every place that renders the
 * player's celestial body — sibling of PhaseSunDisc with the same contract
 * (absolutely centered in its parent, sized via the diameter prop) and the
 * same breathing animation language as the sun phases.
 */
export default defineComponent({
  name: 'CometDisc',
  props: {
    /** Disc diameter in px (the rock fills ~76% of it, like the sun's core). */
    diameter: { type: Number, required: true },
  },
  setup(props) {
    const solarStore = useSolarUpgradeStore()

    const vars = computed((): Record<string, string> => ({
      '--comet-d': `${props.diameter}px`,
      '--comet-core': COMET_PHASE_DATA.core,
      '--comet-mid': COMET_PHASE_DATA.mid,
      '--comet-edge': COMET_PHASE_DATA.edge,
      '--comet-crater': COMET_PHASE_DATA.crater,
      '--comet-glow': COMET_PHASE_DATA.glow,
      '--comet-gold': `${COMET_STAGE_GOLD[solarStore.cometStage]}`,
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
  /* Wobble, not a full spin — keeps the painted light source coherent */
  animation: comet-tumble var(--comet-tumble, 14s) ease-in-out infinite alternate;
  /* Stage-driven gold aura hugging the rock silhouette — replaces the old
     ring-shaped halo; invisible at stage 0, grows with the gilding. */
  box-shadow: 0 0 18px
    color-mix(in srgb, var(--comet-glow) calc(var(--comet-gold, 0) * 30%), transparent);
  transition: box-shadow 0.8s ease;
}

/* ── Gilding — gold veins + rim light, fading in per kindled core ray ── */
.comet-gilding {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(circle at 44% 34%, color-mix(in srgb, var(--comet-glow) 55%, transparent) 0 1.4%, transparent 2.4%),
    radial-gradient(circle at 58% 58%, color-mix(in srgb, var(--comet-glow) 45%, transparent) 0 1.1%, transparent 2%),
    radial-gradient(circle at 33% 55%, color-mix(in srgb, var(--comet-glow) 40%, transparent) 0 0.9%, transparent 1.7%),
    radial-gradient(circle at 66% 26%, color-mix(in srgb, var(--comet-glow) 35%, transparent) 0 0.8%, transparent 1.6%),
    /* a thin molten vein hinting at the star waking inside */
    linear-gradient(
      118deg,
      transparent 46%,
      color-mix(in srgb, var(--comet-glow) 30%, transparent) 49.5%,
      transparent 53%
    );
  box-shadow: inset -3px -4px 8px color-mix(in srgb, var(--comet-glow) 22%, transparent);
  opacity: var(--comet-gold, 0);
  transition: opacity 0.8s ease;
}

/* ── Shading overlay — terminator (day/night edge), always on top ── */
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
  box-shadow: inset 6px 6px 14px rgba(0, 0, 0, 0.25);
}

@keyframes comet-breathe {
  0%, 100% { opacity: 0.94; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
}

@keyframes comet-tumble {
  from { transform: rotate(-7deg); }
  to { transform: rotate(9deg); }
}

@media (prefers-reduced-motion: reduce) {
  .comet-root,
  .comet-rock {
    animation: none;
  }
}
</style>
