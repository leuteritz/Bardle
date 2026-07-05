<template>
  <div class="relative flex items-center justify-center w-full h-full">
    <SunComponent />

    <div
      @click="handleChimeClick"
      class="fixed z-10 flex items-center justify-center cursor-pointer chime-main-button"
      :style="chimeButtonStyle"
    >
      <!-- Idle affordance: pulsing gold "energy heart" of the sun = the click target.
           The sun itself is the button; this glow signals "tap here for Chimes". -->
      <!-- During the comet origin state the gold aura desaturates with the
           comet's gilding stage: bare grey rock = grey aura, fully kindled =
           full gold (style from auraStageStyle). -->
      <div
        class="chime-aura"
        :class="{ punched: isPunching }"
        :style="auraStageStyle"
        aria-hidden="true"
      ></div>

      <!-- Click feedback: expanding ripple ring, keyed so it replays every click -->
      <div
        :key="rippleKey"
        class="chime-ripple"
        :style="rippleStyle"
        aria-hidden="true"
      ></div>

      <!-- Click feedback: mini chimes bursting outward ("you earned Chimes") -->
      <template v-for="burst in bursts" :key="burst.id">
        <img
          v-for="(p, i) in burst.particles"
          :key="i"
          src="/img/BardAbilities/BardChime.png"
          class="chime-burst-particle"
          :style="{
            '--dx': p.dx + 'px',
            '--dy': p.dy + 'px',
            '--rot': p.rot + 'deg',
            '--size': p.size + 'px',
          }"
          draggable="false"
          @dragstart.prevent
        />
      </template>
    </div>

    <ChampionOrbit />
    <PlanetOrbit />
    <StarSystemComponent />
    <PlayerHPBar />
    <StarSystemRescueTransition />

    <div
      :key="chimeGainKey"
      class="fixed z-50 pointer-events-none chime-popup"
      :style="{
        top: chimeGainPos.y + 'px',
        left: (chimeGainPos.x + chimeGainOffsetX) + 'px',
        '--angle': chimeGainAngle + 'deg',
      }"
    >
      <span class="chime-gain-text" :style="{ fontSize: chimePopupFontSize + 'px' }">
        +{{ $formatNumber(gameStore.chimesPerClick) }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useBattleStore } from '../../stores/battleStore'
import { useAugmentStore } from '../../stores/augmentStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import { usePlanetShopStore } from '../../stores/planetShopStore'
import { useSolarUpgradeStore } from '../../stores/solarUpgradeStore'
import { formatNumber } from '../../config/numberFormat'
import SunComponent from './sun/SunComponent.vue'
import ChampionOrbit from './sun/ChampionOrbit.vue'
import PlayerHPBar from './sun/PlayerHPBar.vue'
import StarSystemComponent from './sun/StarSystemComponent.vue'
import StarSystemRescueTransition from './sun/StarSystemRescueTransition.vue'
import PlanetOrbit from './sun/PlanetOrbit.vue'
import { playChimeSound } from '../../composables/useChimeSound'
import {
  CHIME_BURST_COUNT,
  CHIME_BURST_DURATION_MS,
  CHIME_BURST_DIST_MIN_FACTOR,
  CHIME_BURST_DIST_MAX_FACTOR,
  CHIME_BURST_SIZE_FACTOR,
  COMET_STAGE_GOLD,
} from '../../config/constants'

interface ChimeBurstParticle {
  dx: number
  dy: number
  rot: number
  size: number
}

interface ChimeBurst {
  id: number
  particles: ChimeBurstParticle[]
}

export default defineComponent({
  name: 'IdleGameComponent',
  components: {
    SunComponent,
    ChampionOrbit,
    PlayerHPBar,
    StarSystemComponent,
    StarSystemRescueTransition,
    PlanetOrbit,
  },
  setup() {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()
    const galaxyStore = useGalaxyStore()
    const planetShopStore = usePlanetShopStore()
    const solarStore = useSolarUpgradeStore()

    /** Comet state: desaturate the gold aura by the un-gilded remainder. */
    const auraStageStyle = computed(() => {
      if (!solarStore.isCometState) return {}
      const gold = COMET_STAGE_GOLD[solarStore.cometStage]
      return { filter: `grayscale(${(1 - gold).toFixed(2)})` }
    })

    const chimeButtonStyle = computed(() => ({
      width: `${planetShopStore.currentSunRadius * 4}px`,
      height: `${planetShopStore.currentSunRadius * 4}px`,
      transition: 'width 1.5s ease, height 1.5s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }))

    const chimePopupFontSize = computed(() =>
      Math.max(planetShopStore.currentSunRadius * 0.5, 22),
    )

    const chimeGainPos = ref({ x: 0, y: 0 })
    const chimeGainKey = ref(0)
    const chimeGainOffsetX = ref(0)
    const chimeGainAngle = ref(0)

    // Click feedback state (visual only — no game logic)
    const rippleKey = ref(0)
    const isPunching = ref(false)
    const bursts = ref<ChimeBurst[]>([])
    let burstId = 0
    let punchTimer: ReturnType<typeof setTimeout> | null = null

    const rippleStyle = computed(() => {
      const size = planetShopStore.currentSunRadius * 2.4
      return { width: `${size}px`, height: `${size}px` }
    })

    let gameTimer: ReturnType<typeof setInterval> | null = null

    function handleChimeClick(event: MouseEvent) {
      playChimeSound()
      gameStore.addChime()
      const augmentStore = useAugmentStore()
      const bonus = augmentStore.onClick(gameStore.chimesPerClick, gameStore.activeAugments)

      if (bonus > 0) {
        gameStore.chimes += bonus
        gameStore.chimesForMeep += bonus
        gameStore.chimesForNextUniverse += bonus
      }

      chimeGainPos.value = { x: event.clientX, y: event.clientY }
      chimeGainOffsetX.value = Math.round((Math.random() - 0.5) * 30)
      chimeGainAngle.value = Math.round((Math.random() - 0.5) * 10)
      chimeGainKey.value++

      triggerClickFeedback()
    }

    // Juicy click response: icon punch + ripple ring + mini-chime burst.
    // Purely visual; scales with the current sun radius.
    function triggerClickFeedback() {
      // Icon scale-punch — restart the animation on rapid clicks
      isPunching.value = false
      if (punchTimer) clearTimeout(punchTimer)
      requestAnimationFrame(() => {
        isPunching.value = true
      })
      punchTimer = setTimeout(() => {
        isPunching.value = false
      }, 260)

      // Ripple ring — bump the key to replay the CSS animation
      rippleKey.value++

      // Mini-chime burst — even spread of angles with jitter
      const r = planetShopStore.currentSunRadius
      const size = r * CHIME_BURST_SIZE_FACTOR
      const step = (Math.PI * 2) / CHIME_BURST_COUNT
      const baseAngle = Math.random() * Math.PI * 2
      const particles: ChimeBurstParticle[] = Array.from(
        { length: CHIME_BURST_COUNT },
        (_, i) => {
          const angle = baseAngle + step * i + (Math.random() - 0.5) * step * 0.6
          const dist =
            r *
            (CHIME_BURST_DIST_MIN_FACTOR +
              Math.random() * (CHIME_BURST_DIST_MAX_FACTOR - CHIME_BURST_DIST_MIN_FACTOR))
          return {
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            rot: Math.round((Math.random() - 0.5) * 180),
            size,
          }
        },
      )

      const id = burstId++
      bursts.value.push({ id, particles })
      setTimeout(() => {
        bursts.value = bursts.value.filter((b) => b.id !== id)
      }, CHIME_BURST_DURATION_MS)
    }

    const startGameTimer = () => {
      if (gameTimer) return
      gameTimer = setInterval(() => {
        gameStore.tick()
      }, 1000)
    }

    const stopGameTimer = () => {
      if (gameTimer) {
        clearInterval(gameTimer)
        gameTimer = null
      }
    }

    onMounted(() => {
      startGameTimer()
    })

    onUnmounted(() => {
      stopGameTimer()
      if (punchTimer) clearTimeout(punchTimer)
    })

    return {
      gameStore,
      battleStore,
      galaxyStore,
      formatNumber,
      handleChimeClick,
      chimeGainPos,
      chimeGainKey,
      chimeGainOffsetX,
      chimeGainAngle,
      chimeButtonStyle,
      auraStageStyle,
      chimePopupFontSize,
      rippleKey,
      rippleStyle,
      isPunching,
      bursts,
    }
  },
})
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes cps-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 40px rgba(251, 191, 36, 0.9);
    transform: scale(1.02);
  }
}

@keyframes fadeUpEnhanced {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(-100%) rotate(var(--angle, 0deg)) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-220%) rotate(var(--angle, 0deg)) scale(0.85);
  }
}

.chime-gain-text {
  color: #e8c040;
  font-weight: 900;
  -webkit-text-stroke: 1.5px #3e200a;
  text-shadow:
    0 0 6px #e8c040,
    0 0 14px #c89040,
    0 0 28px rgba(232, 192, 64, 0.5);
}

.animate-blob {
  animation: blob 7s infinite;
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-cps-shimmer {
  animation: cps-shimmer 1.8s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

.chime-main-button {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  user-select: none;
}

.chime-main-button:hover {
  transform: translate(-50%, -50%) scale(1.04);
}

.chime-main-button:active {
  transform: translate(-50%, -50%) scale(0.95);
}

/* Hover: brighten + enlarge the aura so the sun clearly reads as clickable. */
.chime-main-button:hover .chime-aura {
  filter: brightness(1.35);
  animation-duration: 1.6s;
}

.chime-popup {
  animation: fadeUpEnhanced 0.8s ease-out forwards;
}

/*
 * Central click target (design: the sun itself is the button, no static icon).
 * - .chime-aura: persistent pulsing gold "energy heart" = the idle affordance
 *   that reads "tap here for Chimes" (Golden Rule 8). Brightens on hover.
 * - .chime-ripple + .chime-burst-particle + .punched: layered click feedback
 *   so every tap feels rewarding and shows the Chimes earned (Golden Rule 3).
 * Palette matches the existing gold/amber chime glow (Golden Rule 1).
 * All motion is disabled under prefers-reduced-motion (Golden Rule 2).
 * Circular glow layers use border-radius: 50% (round like the sun), which is
 * exempt from the "max 4-5px radius" box rule.
 */
@keyframes aura-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.35;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.08);
    opacity: 0.7;
  }
}

@keyframes chime-ripple {
  0% {
    transform: translate(-50%, -50%) scale(0.4);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
}

@keyframes chime-burst {
  0% {
    transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(0.4);
    opacity: 0;
  }
  25% {
    opacity: 1;
    transform: translate(-50%, -50%) translate(calc(var(--dx) * 0.35), calc(var(--dy) * 0.35))
      rotate(calc(var(--rot) * 0.35)) scale(1.05);
  }
  100% {
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.7);
    opacity: 0;
  }
}

@keyframes aura-punch {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  40% {
    transform: translate(-50%, -50%) scale(1.28);
    opacity: 0.95;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.5;
  }
}

.chime-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 82%;
  height: 82%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    circle,
    rgba(255, 244, 214, 0.75) 0%,
    rgba(251, 191, 36, 0.6) 28%,
    rgba(232, 192, 64, 0.28) 52%,
    rgba(232, 192, 64, 0) 72%
  );
  box-shadow: 0 0 40px rgba(251, 191, 36, 0.35);
  transition: filter 0.25s ease;
  animation: aura-pulse 2.4s ease-in-out infinite;
}

.chime-aura.punched {
  animation: aura-punch 0.26s ease-out;
}

.chime-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
  border: 3px solid rgba(251, 191, 36, 0.8);
  box-shadow:
    0 0 12px rgba(232, 192, 64, 0.7),
    inset 0 0 12px rgba(232, 192, 64, 0.4);
  animation: chime-ripple 0.5s ease-out forwards;
}

.chime-burst-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--size);
  height: var(--size);
  z-index: 3;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8));
  animation: chime-burst 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

/* Accessibility: strip click-feedback motion; keep a steady glowing target + "+N".
   The aura stays as a static (non-pulsing) glow so the click target is still obvious. */
@media (prefers-reduced-motion: reduce) {
  .chime-aura,
  .chime-aura.punched {
    animation: none !important;
    opacity: 0.55;
  }
  .chime-ripple,
  .chime-burst-particle {
    display: none !important;
  }
}

@media (max-width: 1024px) {
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .stats-left {
    display: none;
  }
}

@media (max-width: 768px) {
  .w-48 {
    width: 10rem;
  }

  .h-48 {
    height: 10rem;
  }

  .w-40 {
    width: 8rem;
  }

  .h-40 {
    height: 8rem;
  }
}
</style>
