<template>
  <div>
    <!-- Golden ambience: the whole universe glows while the buff runs
         (sits below the bard profile modal, so it only tints the idle view) -->
    <Transition name="buff-fade">
      <div v-if="visible" class="buff-vignette" aria-hidden="true" />
    </Transition>
    <!-- Continues the glow underneath the centered header bar -->
    <Transition name="buff-fade">
      <div v-if="visible" class="buff-under-header" aria-hidden="true" />
    </Transition>
    <!-- Continues the glow right above the bottom scoreboard strip -->
    <Transition name="buff-fade">
      <div v-if="visible" class="buff-above-bar" aria-hidden="true" />
    </Transition>

    <!-- The countdown badge lives in ActiveBuffBar now, together with every
         other timed effect. What stays here is the ambience: the golden glow
         that tells the player at a glance that something is running. -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()

const secondsLeft = computed(() => gameStore.mvpBuffSecondsLeft)

// The overlay stays until the countdown has visibly shown "0s" for a
// moment — only then the slow fade-out kicks in.
const visible = ref(false)
let hideTimer: number | null = null
watch(
  secondsLeft,
  (s) => {
    if (s > 0) {
      visible.value = true
      if (hideTimer !== null) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
    } else if (visible.value && hideTimer === null) {
      hideTimer = window.setTimeout(() => {
        visible.value = false
        hideTimer = null
      }, 1000)
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  if (hideTimer !== null) clearTimeout(hideTimer)
})
</script>

<style scoped>
/* ── Golden smoke wrapping the whole screen ──
   Fills the entire viewport: the opaque header (z-120) and bottom bar
   (z-10000) each cover their own slice, so the glow hugs the real HUD
   silhouette with no gaps — corners, sides and everything in between.
   .buff-under-header / .buff-above-bar continue the glow along the inner
   edges of header and scoreboard strip. */
.buff-vignette {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  overflow: hidden;
  box-shadow:
    inset 0 0 clamp(70px, 9vw, 180px) rgba(232, 192, 64, 0.38),
    inset 0 0 clamp(18px, 2.4vw, 48px) rgba(255, 226, 138, 0.26);
  animation: vignette-breathe 2.6s ease-in-out infinite;
}

/* Glow band hugging the underside of the centered header bar, spanning
   exactly the header's width (min(100vw, --header-max-width)). */
.buff-under-header {
  position: fixed;
  top: var(--header-total-height, 96px);
  left: calc((100vw - min(100vw, var(--header-max-width, 100vw))) / 2);
  right: calc((100vw - min(100vw, var(--header-max-width, 100vw))) / 2);
  height: clamp(34px, 6vh, 76px);
  z-index: 40;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(232, 192, 64, 0.3), rgba(232, 192, 64, 0.08) 55%, transparent);
  border-radius: 0 0 18px 18px;
  /* Kept: this band is hard-cut on its left and right edge, the blur is what
     softens them. It is small (~header width × 76px), static, and rastered
     once — the animation only touches opacity. */
  filter: blur(6px);
  animation: vignette-breathe 2.6s ease-in-out infinite;
}

/* Glow band sitting right on top of the low center scoreboard strip,
   between the two raised side panels of the bottom bar. */
.buff-above-bar {
  position: fixed;
  bottom: var(--bottom-center-strip-h, 79px);
  left: var(--hud-panel-size, 440px);
  right: var(--hud-panel-size, 440px);
  height: clamp(30px, 5.5vh, 70px);
  z-index: 40;
  pointer-events: none;
  background: linear-gradient(to top, rgba(232, 192, 64, 0.3), rgba(232, 192, 64, 0.08) 55%, transparent);
  border-radius: 18px 18px 0 0;
  /* Same reason as .buff-under-header: softens the hard side edges. */
  filter: blur(6px);
  animation: vignette-breathe 2.6s ease-in-out infinite;
}
/* Drifting haze along top and bottom edges.
   No blur filter: the source is radial gradients that already fade to
   `transparent 70%`, so a fullscreen blur pass (up to 3888×2078 px on 4K,
   multi-pass, re-taken whenever the surface is invalidated) bought almost
   no visible softness. The gradients carry the softness on their own. */
.buff-vignette::before {
  content: '';
  position: absolute;
  inset: -24px;
  background:
    radial-gradient(60% 26% at 15% 100%, rgba(232, 192, 64, 0.3), transparent 70%),
    radial-gradient(48% 22% at 58% 100%, rgba(232, 192, 64, 0.22), transparent 70%),
    radial-gradient(55% 25% at 92% 100%, rgba(232, 192, 64, 0.28), transparent 70%),
    radial-gradient(58% 22% at 25% 0%, rgba(232, 192, 64, 0.24), transparent 70%),
    radial-gradient(48% 20% at 78% 0%, rgba(232, 192, 64, 0.26), transparent 70%);
  animation: smoke-drift-x 7s ease-in-out infinite alternate;
}
/* Drifting haze along the left and right edges */
.buff-vignette::after {
  content: '';
  position: absolute;
  inset: -24px;
  background:
    radial-gradient(22% 45% at 0% 28%, rgba(232, 192, 64, 0.26), transparent 70%),
    radial-gradient(20% 40% at 0% 74%, rgba(232, 192, 64, 0.2), transparent 70%),
    radial-gradient(22% 45% at 100% 24%, rgba(232, 192, 64, 0.24), transparent 70%),
    radial-gradient(20% 42% at 100% 72%, rgba(232, 192, 64, 0.22), transparent 70%);
  animation: smoke-drift-y 9s ease-in-out infinite alternate;
}
@keyframes vignette-breathe {
  0%, 100% { opacity: 0.78; }
  50% { opacity: 1; }
}
@keyframes smoke-drift-x {
  from { transform: translateX(-16px); }
  to { transform: translateX(16px); }
}
@keyframes smoke-drift-y {
  from { transform: translateY(-18px); }
  to { transform: translateY(18px); }
}

/* ── Enter / leave ── */
.buff-fade-enter-active {
  transition: opacity 0.45s ease;
}
/* Slow, gentle fade-out when the buff expires — no abrupt cut.
   The breathe animation also drives opacity and would override the
   transition, so it must be switched off while leaving. */
.buff-fade-leave-active {
  transition: opacity 2s ease-out;
  animation: none !important;
}
.buff-fade-enter-from,
.buff-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .buff-vignette,
  .buff-vignette::before,
  .buff-vignette::after,
  .buff-under-header,
  .buff-above-bar {
    animation: none;
  }
}
</style>
