<template>
  <div ref="host" class="sun-container" :class="{ contained }" :style="sunContainerVars">
    <!-- Orbit-Ringe der Champions -->
    <svg v-if="showRings" class="orbit-paths" viewBox="0 0 360 360">
      <ellipse
        v-for="c in combatStore.champions"
        :key="'ring-' + c.name"
        cx="180"
        cy="180"
        :rx="c.orbitRadiusX"
        :ry="c.orbitRadiusY"
        fill="none"
        stroke="rgba(255, 190, 50, 0.08)"
        stroke-width="0.7"
        stroke-dasharray="3 10"
        :transform="`rotate(${c.tiltDeg}, 180, 180)`"
      />
    </svg>

    <!-- Sonnenscheibe — geteiltes Phase-Disc (identisch zu Planet-/Shop-Tab);
         vor der ersten Ignition fliegt stattdessen der Komet. Beim Zünden
         stehen beide kurz zugleich, sonst schnitte der Körperwechsel hart. -->
    <CometDisc
      v-if="showComet"
      :diameter="discDiameter"
      :wake="true"
      :class="{ 'sun-body--out': !solarStore.isCometState }"
    />
    <PhaseSunDisc
      v-if="showStar"
      :diameter="discDiameter"
      :wake="true"
      :class="{ 'sun-body--out': solarStore.isCometState }"
    />

    <!-- Blitz über der Scheibe, wenn ein Treffer den Kurs stösst; je Treffer neu (key). -->
    <span
      v-if="hitFlash"
      :key="'hf-' + hitFlash"
      class="sun-hit-flash"
      :style="{ '--sun-hit-ms': hitFlashMs + 'ms' }"
      aria-hidden="true"
    />

    <!-- Chime Particles (canvas) -->
    <canvas ref="canvasEl" class="chime-canvas" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { useBodyFollower } from '@/composables/orbit/useBodyFollower'
import { flightHitSeq } from '@/utils/orbit/flightLive'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { useCombatStore } from '@/stores/battle/combatStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  SUN_BG_DISC_RADIUS_FACTOR,
  SUN_BODY_SWAP_MS,
  SUN_HIT_FLASH_MS,
  JOLT_BODY_PX_MAX,
  JOLT_BODY_PX_MIN,
  JOLT_BODY_R_FRAC,
  STAR_PHASE_FINAL_INDEX,
  CHIME_PARTICLE_POOL_SIZE,
  CHIME_PARTICLE_MIN_VISIBLE,
  CHIME_PARTICLE_CPS_SCALE,
  CHIME_PARTICLE_SPAWN_WINDOW_MS,
  CHIME_PARTICLE_INTERVAL_JITTER_MIN,
  CHIME_PARTICLE_INTERVAL_JITTER_RANGE,
  CHIME_PARTICLE_FULL_RETRY_FRACTION,
  CHIME_PARTICLE_TRAVEL_MIN_FACTOR,
  CHIME_PARTICLE_TRAVEL_RANGE_FACTOR,
  CHIME_PARTICLE_ANGLE_JITTER,
  CHIME_PARTICLE_LIFETIME_MIN_MS,
  CHIME_PARTICLE_LIFETIME_RANGE_MS,
  CHIME_PARTICLE_DEFAULT_LIFETIME_MS,
  CHIME_PARTICLE_SIZE_SUN_FACTOR,
  CHIME_PARTICLE_SIZE_MIN_PX,
  CHIME_PARTICLE_SIZE_DEFAULT_PX,
  CHIME_PARTICLE_FADE_IN_FRACTION,
  CHIME_PARTICLE_FADE_OUT_START,
  CHIME_PARTICLE_MAX_OPACITY,
  CHIME_PARTICLE_DRAW_SCALE_BASE,
  CHIME_PARTICLE_DRAW_SCALE_SPAN,
  CHIME_PARTICLE_CANVAS_SUN_FACTOR,
} from '@/config/constants'
import { sunBodyFor, warmSunSprites } from '@/utils/fx/sunBodySprite'
import { solarSignatureStages } from '@/utils/game/solarSignature'
import type { SunBody } from '@/types'
import PhaseSunDisc from './PhaseSunDisc.vue'
import CometDisc from './CometDisc.vue'

interface ChimeParticle {
  id: number
  active: boolean
  cx: number
  cy: number
  tx: number
  ty: number
  duration: number
  size: number
  startTime: number
}

export default defineComponent({
  name: 'SunComponent',
  components: { PhaseSunDisc, CometDisc },
  props: {
    /** Override the visual radius (px). Defaults to the live phase radius from planetShopStore. */
    radius: { type: Number, default: null },
    /** Show the champion orbit rings around the sun. */
    showRings: { type: Boolean, default: true },
    /** Position the sun within its parent (absolute) instead of the viewport (fixed). */
    contained: { type: Boolean, default: false },
  },
  setup(props) {
    const combatStore = useCombatStore()
    const planetShopStore = usePlanetShopStore()
    const gameStore = useGameStore()
    const solarStore = useSolarUpgradeStore()

    const effectiveRadius = computed(() => props.radius ?? planetShopStore.currentSunRadius)
    const discDiameter = computed(() => effectiveRadius.value * SUN_BG_DISC_RADIUS_FACTOR)

    // Der Körper zuckt beim Treffer: die Sternfeld-Schleife schreibt seinen Transform.
    const host = ref<HTMLDivElement | null>(null)
    useBodyFollower(
      host,
      () => !props.contained,
      () =>
        Math.max(
          JOLT_BODY_PX_MIN,
          Math.min(JOLT_BODY_PX_MAX, effectiveRadius.value * JOLT_BODY_R_FRAC),
        ),
    )
    const hitFlash = ref<number | null>(null)
    let hitFlashTimer: ReturnType<typeof setTimeout> | null = null
    watch(flightHitSeq, (seq) => {
      if (props.contained || seq === 0) return
      hitFlash.value = seq
      if (hitFlashTimer) clearTimeout(hitFlashTimer)
      hitFlashTimer = setTimeout(() => {
        hitFlash.value = null
        hitFlashTimer = null
      }, SUN_HIT_FLASH_MS)
    })
    onUnmounted(() => {
      if (hitFlashTimer) clearTimeout(hitFlashTimer)
    })

    const POOL_SIZE = CHIME_PARTICLE_POOL_SIZE
    const chimeParticles: ChimeParticle[] = Array.from({ length: POOL_SIZE }, (_, i) => ({
      id: i,
      active: false,
      cx: 0,
      cy: 0,
      tx: 0,
      ty: 0,
      duration: CHIME_PARTICLE_DEFAULT_LIFETIME_MS,
      size: CHIME_PARTICLE_SIZE_DEFAULT_PX,
      startTime: 0,
    }))

    const canvasEl = ref<HTMLCanvasElement | null>(null)
    const chimeImg = new Image()
    chimeImg.src = '/img/BardAbilities/BardChime.png'

    function resizeCanvas() {
      const cvs = canvasEl.value
      if (!cvs) return
      const r = effectiveRadius.value
      cvs.width = Math.round(r * CHIME_PARTICLE_CANVAS_SUN_FACTOR)
      cvs.height = Math.round(r * CHIME_PARTICLE_CANVAS_SUN_FACTOR)
    }

    watch(effectiveRadius, resizeCanvas)

    let nextSpawnAt = 0

    function spawnChime(timestamp: number) {
      const cps = gameStore.chimesPerSecond
      if (cps <= 0 || timestamp < nextSpawnAt) return

      const maxVisible = Math.min(
        CHIME_PARTICLE_POOL_SIZE,
        Math.max(
          CHIME_PARTICLE_MIN_VISIBLE,
          Math.round(Math.sqrt(cps) * CHIME_PARTICLE_CPS_SCALE),
        ),
      )
      const activeCount = chimeParticles.filter((p) => p.active).length
      const baseInterval = CHIME_PARTICLE_SPAWN_WINDOW_MS / maxVisible
      const interval =
        baseInterval *
        (CHIME_PARTICLE_INTERVAL_JITTER_MIN +
          Math.random() * CHIME_PARTICLE_INTERVAL_JITTER_RANGE)

      if (activeCount >= maxVisible) {
        nextSpawnAt = timestamp + interval * CHIME_PARTICLE_FULL_RETRY_FRACTION
        return
      }

      const slot = chimeParticles.find((p) => !p.active)
      if (!slot) return

      const r = effectiveRadius.value
      const angle = Math.random() * Math.PI * 2

      slot.cx = r * Math.cos(angle)
      slot.cy = r * Math.sin(angle)

      const outwardDist =
        r * CHIME_PARTICLE_TRAVEL_MIN_FACTOR +
        Math.random() * r * CHIME_PARTICLE_TRAVEL_RANGE_FACTOR
      const jitter = (Math.random() - 0.5) * CHIME_PARTICLE_ANGLE_JITTER
      slot.tx = Math.cos(angle + jitter) * outwardDist
      slot.ty = Math.sin(angle + jitter) * outwardDist
      slot.duration =
        CHIME_PARTICLE_LIFETIME_MIN_MS + Math.random() * CHIME_PARTICLE_LIFETIME_RANGE_MS
      slot.size = Math.max(CHIME_PARTICLE_SIZE_MIN_PX, r * CHIME_PARTICLE_SIZE_SUN_FACTOR)
      slot.startTime = timestamp
      slot.active = true
      nextSpawnAt = timestamp + interval
    }

    function drawChimes(timestamp: number) {
      const cvs = canvasEl.value
      if (!cvs || !chimeImg.complete) return
      const ctx = cvs.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, cvs.width, cvs.height)
      const halfW = cvs.width / 2
      const halfH = cvs.height / 2

      for (const p of chimeParticles) {
        if (!p.active) continue
        const t = (timestamp - p.startTime) / p.duration
        if (t >= 1) {
          p.active = false
          continue
        }

        const eased = 1 - Math.pow(1 - t, 2)
        const x = halfW + p.cx + p.tx * eased
        const y = halfH + p.cy + p.ty * eased

        const opacity =
          t < CHIME_PARTICLE_FADE_IN_FRACTION
            ? (t / CHIME_PARTICLE_FADE_IN_FRACTION) * CHIME_PARTICLE_MAX_OPACITY
            : t > CHIME_PARTICLE_FADE_OUT_START
              ? ((1 - t) / (1 - CHIME_PARTICLE_FADE_OUT_START)) * CHIME_PARTICLE_MAX_OPACITY
              : CHIME_PARTICLE_MAX_OPACITY
        const drawSize =
          p.size * (CHIME_PARTICLE_DRAW_SCALE_BASE + eased * CHIME_PARTICLE_DRAW_SCALE_SPAN)

        ctx.globalAlpha = opacity
        ctx.drawImage(chimeImg, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize)
      }

      ctx.globalAlpha = 1
    }

    let animFrame = 0

    function animate(timestamp: number) {
      spawnChime(timestamp)
      drawChimes(timestamp)
      animFrame = requestAnimationFrame(animate)
    }

    const { isIdleRenderingPaused } = useRenderingPaused()

    watch(isIdleRenderingPaused, (paused) => {
      if (paused) {
        cancelAnimationFrame(animFrame)
        animFrame = 0
      } else if (!animFrame) {
        resetCanvasIfContextLost(canvasEl.value)
        animFrame = requestAnimationFrame(animate)
      }
    })

    onMounted(() => {
      resizeCanvas()
      animFrame = requestAnimationFrame(animate)
    })

    onUnmounted(() => {
      cancelAnimationFrame(animFrame)
    })

    const sunContainerVars = computed((): Record<string, string> => ({
      '--sun-r': `${effectiveRadius.value}px`,
    }))

    // Körperwechsel Komet → Spark: der alte Körper bleibt SUN_BODY_SWAP_MS stehen
    const showComet = ref(solarStore.isCometState)
    const showStar = ref(!solarStore.isCometState)
    let swapTimer = 0
    watch(
      () => solarStore.isCometState,
      (comet) => {
        showComet.value = true
        showStar.value = true
        clearTimeout(swapTimer)
        // Rein visuelle Frist
        swapTimer = window.setTimeout(() => {
          showComet.value = comet
          showStar.value = !comet
        }, SUN_BODY_SWAP_MS)
      },
    )

    /** Der Körper, der nach dem laufenden Evolve steht — vorgewärmt, damit der
     *  Crossfade genau auf den Store-Wechsel fällt. */
    function nextBody(): SunBody {
      const sig = solarSignatureStages(solarStore.solarSignature)
      if (solarStore.isCometState) return { kind: 'star', stage: 0, sig }
      const next = solarStore.starPhase + 1
      if (next >= STAR_PHASE_FINAL_INDEX) return { kind: 'blackHole', stage: STAR_PHASE_FINAL_INDEX, sig }
      return { kind: 'star', stage: next, sig }
    }

    const dpr = () => window.devicePixelRatio || 1
    watch(
      () => solarStore.isUpgrading,
      (on) => {
        if (on) warmSunSprites(nextBody(), discDiameter.value, dpr(), true)
      },
    )
    onMounted(() =>
      warmSunSprites(sunBodyFor(solarStore, solarStore.solarSignature), discDiameter.value, dpr(), true),
    )
    onUnmounted(() => clearTimeout(swapTimer))

    return {
      combatStore,
      solarStore,
      discDiameter,
      sunContainerVars,
      canvasEl,
      host,
      hitFlash,
      hitFlashMs: SUN_HIT_FLASH_MS,
      showComet,
      showStar,
    }
  },
})
</script>

<style scoped>
.sun-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--sun-r) * 6);
  height: calc(var(--sun-r) * 6);
  z-index: 5;
  pointer-events: none;
  overflow: visible;
  transition: width 1.5s ease, height 1.5s ease;
}

/* Contained: zentriert im positionierten Eltern-Element statt im Viewport. */
.sun-container.contained {
  position: absolute;
}

.orbit-paths {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}

/* Nur Deckkraft; der Verlauf ist statisch (Präzedenz .sig-pulse). */
.sun-hit-flash {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  opacity: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 244, 220, 0.85) 0%,
    rgba(255, 210, 150, 0.35) 22%,
    transparent 45%
  );
  animation: sun-hit-flash var(--sun-hit-ms, 380ms) ease-out forwards;
}

@keyframes sun-hit-flash {
  0% {
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.chime-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

/* Der ausblendende Körper beim Zünden. */
.sun-body--out {
  opacity: 0;
  transition: opacity 0.6s ease;
}
</style>
