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

    <!-- Status badge, centered right above the bottom scoreboard strip.
         Hidden while a bard profile tab covers the screen. -->
    <Transition name="buff-fade">
      <div v-if="visible && uiStore.bardActiveTab === null" class="buff-badge" role="status">
        <div class="badge-row">
          <span class="badge-mult">{{ HONOR_MVP_BUFF_MULT }}×</span>
          <img src="/img/BardAbilities/BardChime.png" alt="" class="badge-chime" />
          <span class="badge-label">CHIMES</span>
          <span class="badge-divider" />
          <span class="badge-seconds">{{ secondsLeft }}s</span>
        </div>
        <div class="badge-sub">MVP HONOR BUFF</div>
        <div class="badge-track">
          <div class="badge-progress" :style="{ width: progressPercent + '%' }" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { HONOR_MVP_BUFF_MULT, HONOR_MVP_BUFF_DURATION_S } from '@/config/constants'

const gameStore = useGameStore()
const uiStore = useUiStore()

const secondsLeft = computed(() => gameStore.mvpBuffSecondsLeft)
const progressPercent = computed(() =>
  Math.max(0, Math.min(100, (secondsLeft.value / HONOR_MVP_BUFF_DURATION_S) * 100)),
)

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
  filter: blur(6px);
  animation: vignette-breathe 2.6s ease-in-out infinite;
}
/* Drifting haze along top and bottom edges */
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
  filter: blur(24px);
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
  filter: blur(26px);
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

/* ── Status badge above the bottom scoreboard strip ──
   The center strip of the bottom bar is (BOTTOM_BAR_HEIGHT −
   BOTTOM_BAR_CENTER_TOP_Y) = 79px tall, scaled by --hud-scale. */
/* Frameless: glowing text straight on the scene, no box */
.buff-badge {
  position: fixed;
  bottom: calc(79px * var(--hud-scale, 1) + 16px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10001;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(3px, 0.5vh, 6px);
}

.badge-row {
  display: flex;
  align-items: center;
  gap: clamp(10px, 0.9vw, 16px);
  line-height: 1;
}
.badge-mult {
  font-size: clamp(20px, 1.8vw, 34px);
  font-weight: 700;
  color: #ffe28a;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.8), 0 2px 6px rgba(0, 0, 0, 0.8);
  animation: badge-text-pulse 1.6s ease-in-out infinite;
}
.badge-chime {
  width: clamp(22px, 1.8vw, 34px);
  height: clamp(22px, 1.8vw, 34px);
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(232, 192, 64, 0.75));
}
.badge-label {
  font-size: clamp(15px, 1.3vw, 24px);
  font-weight: 700;
  letter-spacing: 3px;
  color: #f2ead2;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
}
.badge-divider {
  width: 1px;
  height: clamp(18px, 1.5vw, 28px);
  background: rgba(232, 192, 64, 0.45);
}
.badge-seconds {
  font-size: clamp(20px, 1.8vw, 34px);
  font-weight: 700;
  color: #ffe28a;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.8), 0 2px 6px rgba(0, 0, 0, 0.8);
  font-variant-numeric: tabular-nums;
  min-width: 2em;
  text-align: center;
}
.badge-sub {
  font-size: clamp(10px, 0.85vw, 14px);
  letter-spacing: 3.5px;
  color: #b89b5a;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.85);
}
@keyframes badge-text-pulse {
  0%, 100% { text-shadow: 0 0 10px rgba(232, 192, 64, 0.6), 0 2px 6px rgba(0, 0, 0, 0.8); }
  50% { text-shadow: 0 0 20px rgba(232, 192, 64, 1), 0 2px 6px rgba(0, 0, 0, 0.8); }
}

.badge-track {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.badge-progress {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to right, #d4a020, #ffe28a);
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.85);
  transition: width 1s linear;
}

/* ── Enter / leave ── */
.buff-fade-enter-active {
  transition: opacity 0.45s ease;
}
.buff-fade-enter-active.buff-badge {
  animation: badge-pop-in 0.45s cubic-bezier(0.2, 1.5, 0.4, 1);
}
/* Slow, gentle fade-out when the buff expires — no abrupt cut.
   The breathe animation also drives opacity and would override the
   transition, so it must be switched off while leaving. */
.buff-fade-leave-active {
  transition: opacity 2s ease-out;
  animation: none !important;
}
.buff-fade-leave-active.buff-badge {
  transition: opacity 1.4s ease-out, transform 1.4s ease-out;
}
.buff-fade-enter-from,
.buff-fade-leave-to {
  opacity: 0;
}
.buff-fade-leave-to.buff-badge {
  transform: translateX(-50%) translateY(10px) scale(0.96);
}
@keyframes badge-pop-in {
  0% { opacity: 0; transform: translateX(-50%) translateY(14px) scale(0.85); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .buff-vignette,
  .buff-vignette::before,
  .buff-vignette::after,
  .buff-under-header,
  .buff-above-bar,
  .buff-badge,
  .badge-mult,
  .badge-seconds {
    animation: none;
  }
}
</style>
