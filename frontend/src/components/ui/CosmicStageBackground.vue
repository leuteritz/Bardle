<template>
  <!-- Shared cosmic backdrop — three parallax star layers over the consumer's
       flat deep-space color (no gradients/vignette of its own). Purely
       decorative: absolutely positioned, never intercepts pointer events.
       Consumers must keep their own content painted above (position/z-index). -->
  <div class="cosmic-stage-bg" aria-hidden="true">
    <div class="csb-stars csb-stars--far" />
    <div class="csb-stars csb-stars--mid" />
    <div class="csb-stars csb-stars--near" />
  </div>
</template>

<style scoped>
.cosmic-stage-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

/* Layered parallax starfield: three depth layers, each twinkling at its own
   rate with a barely-there drift, so it reads alive but stays subtle.
   Each layer tiles at a FIXED size (background-size + repeat) so star density
   is identical on every surface — a huge board shows proportionally more
   stars instead of stretching the same handful thin. Different tile sizes
   per layer keep the repeats from ever lining up into a visible grid. */
.csb-stars {
  position: absolute;
  /* slight overscan so the gentle drift never reveals hard edges */
  inset: -12px;
  background-repeat: repeat;
  animation:
    csb-stars-twinkle 6s ease-in-out infinite,
    csb-stars-drift 80s ease-in-out infinite alternate;
}

/* Far layer: many tiny, dim stars — slowest twinkle + slowest drift */
.csb-stars--far {
  background-image:
    radial-gradient(1px 1px at 12% 18%, rgba(255, 255, 255, 0.3), transparent),
    radial-gradient(1px 1px at 26% 64%, rgba(255, 255, 255, 0.24), transparent),
    radial-gradient(1px 1px at 38% 32%, rgba(255, 255, 255, 0.28), transparent),
    radial-gradient(1px 1px at 47% 82%, rgba(255, 255, 255, 0.22), transparent),
    radial-gradient(1px 1px at 58% 14%, rgba(255, 255, 255, 0.3), transparent),
    radial-gradient(1px 1px at 66% 54%, rgba(255, 255, 255, 0.24), transparent),
    radial-gradient(1px 1px at 74% 88%, rgba(255, 255, 255, 0.26), transparent),
    radial-gradient(1px 1px at 84% 38%, rgba(255, 255, 255, 0.3), transparent),
    radial-gradient(1px 1px at 92% 70%, rgba(255, 255, 255, 0.22), transparent),
    radial-gradient(1px 1px at 6% 46%, rgba(255, 255, 255, 0.26), transparent);
  background-size: 460px 460px;
  animation-duration: 7s, 90s;
}

/* Mid layer: medium stars at a different cadence (reversed drift) */
.csb-stars--mid {
  background-image:
    radial-gradient(1.5px 1.5px at 16% 22%, rgba(255, 255, 255, 0.48), transparent),
    radial-gradient(1.5px 1.5px at 30% 78%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1.5px 1.5px at 44% 40%, rgba(255, 255, 255, 0.42), transparent),
    radial-gradient(1.5px 1.5px at 55% 66%, rgba(255, 255, 255, 0.34), transparent),
    radial-gradient(1.5px 1.5px at 70% 24%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1.5px 1.5px at 82% 60%, rgba(255, 255, 255, 0.36), transparent),
    radial-gradient(1.5px 1.5px at 90% 84%, rgba(255, 255, 255, 0.34), transparent),
    radial-gradient(1.5px 1.5px at 10% 88%, rgba(255, 255, 255, 0.32), transparent),
    radial-gradient(1.5px 1.5px at 62% 92%, rgba(255, 255, 255, 0.3), transparent);
  background-size: 620px 620px;
  animation-duration: 5.5s, 70s;
  animation-delay: -2.5s, -18s;
  animation-direction: alternate, alternate-reverse;
}

/* Near layer: a few brighter stars, two faintly tinted to the current sun
   phase (falls back to warm defaults when no --phase-* vars are inherited) */
.csb-stars--near {
  background-image:
    radial-gradient(2px 2px at 22% 30%, rgba(255, 255, 255, 0.66), transparent),
    radial-gradient(2px 2px at 48% 18%, rgba(255, 255, 255, 0.56), transparent),
    radial-gradient(
      2px 2px at 36% 70%,
      color-mix(in srgb, white 82%, var(--phase-glow, #ff8c42)) 0%,
      transparent 100%
    ),
    radial-gradient(2px 2px at 68% 78%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(
      2px 2px at 80% 44%,
      color-mix(in srgb, white 84%, var(--phase-primary, #ffb347)) 0%,
      transparent 100%
    ),
    radial-gradient(2px 2px at 14% 52%, rgba(255, 255, 255, 0.5), transparent);
  background-size: 780px 780px;
  animation-duration: 4.2s, 58s;
  animation-delay: -1.2s, -9s;
}

@keyframes csb-stars-twinkle {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 0.5; }
}

/* Barely-there parallax drift (≤6px) — with `alternate` for a slow back-and-forth */
@keyframes csb-stars-drift {
  from { transform: translate(0, 0); }
  to { transform: translate(5px, -4px); }
}

@media (prefers-reduced-motion: reduce) {
  .csb-stars {
    animation: none;
  }
}
</style>
