<template>
  <div class="sun-container" :class="{ contained }" :style="sunContainerVars">
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

    <!-- Flight wake — Motes fliegen radial auf den Betrachter zu, in jeder Phase -->
    <FlightMotes :diameter="discDiameter" />

    <!-- Sonnenscheibe — geteiltes Phase-Disc (identisch zu Planet-/Shop-Tab);
         vor der ersten Ignition fliegt stattdessen der Komet -->
    <CometDisc v-if="solarStore.isCometState" :diameter="discDiameter" />
    <PhaseSunDisc v-else :diameter="discDiameter" />

    <!-- Chime Particles (canvas) -->
    <canvas ref="canvasEl" class="chime-canvas" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useCombatStore } from '@/stores/combatStore'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import { useGameStore } from '@/stores/gameStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { SUN_BG_DISC_RADIUS_FACTOR } from '@/config/constants'
import PhaseSunDisc from './PhaseSunDisc.vue'
import CometDisc from './CometDisc.vue'
import FlightMotes from './FlightMotes.vue'

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
  components: { PhaseSunDisc, CometDisc, FlightMotes },
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

    const POOL_SIZE = 20
    const chimeParticles: ChimeParticle[] = Array.from({ length: POOL_SIZE }, (_, i) => ({
      id: i,
      active: false,
      cx: 0,
      cy: 0,
      tx: 0,
      ty: 0,
      duration: 1500,
      size: 12,
      startTime: 0,
    }))

    const canvasEl = ref<HTMLCanvasElement | null>(null)
    const chimeImg = new Image()
    chimeImg.src = '/img/BardAbilities/BardChime.png'

    function resizeCanvas() {
      const cvs = canvasEl.value
      if (!cvs) return
      const r = effectiveRadius.value
      cvs.width = Math.round(r * 6)
      cvs.height = Math.round(r * 6)
    }

    watch(effectiveRadius, resizeCanvas)

    let nextSpawnAt = 0

    function spawnChime(timestamp: number) {
      const cps = gameStore.chimesPerSecond
      if (cps <= 0 || timestamp < nextSpawnAt) return

      const maxVisible = Math.min(20, Math.max(2, Math.round(Math.sqrt(cps) * 1.8)))
      const activeCount = chimeParticles.filter((p) => p.active).length
      const baseInterval = 1200 / maxVisible
      const interval = baseInterval * (0.7 + Math.random() * 0.6)

      if (activeCount >= maxVisible) {
        nextSpawnAt = timestamp + interval * 0.5
        return
      }

      const slot = chimeParticles.find((p) => !p.active)
      if (!slot) return

      const r = effectiveRadius.value
      const angle = Math.random() * Math.PI * 2

      slot.cx = r * Math.cos(angle)
      slot.cy = r * Math.sin(angle)

      const outwardDist = r * 0.5 + Math.random() * r * 0.5
      const jitter = (Math.random() - 0.5) * 0.6
      slot.tx = Math.cos(angle + jitter) * outwardDist
      slot.ty = Math.sin(angle + jitter) * outwardDist
      slot.duration = 1000 + Math.random() * 1500
      slot.size = Math.max(14, r * 0.35)
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
          t < 0.15 ? (t / 0.15) * 0.9 : t > 0.8 ? ((1 - t) / 0.2) * 0.9 : 0.9
        const drawSize = p.size * (0.6 + eased * 0.3)

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

    return {
      combatStore,
      solarStore,
      discDiameter,
      sunContainerVars,
      canvasEl,
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

.chime-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
</style>
