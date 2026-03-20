<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../stores/gameStore'

type HyperStar = {
  angle: number
  dist: number
  speed: number
  size: number
}

const gameStore = useGameStore()
const phase = ref<'idle' | 'streaks' | 'flash' | 'fadeout'>('idle')
const canvasRef = ref<HTMLCanvasElement | null>(null)

let rafId: number | null = null
let stars: HyperStar[] = []
let startTime: number | null = null
let maxDist = 1000

// ─── Spawnt einen einzelnen Stern ───────────────────────────────────────────
// fromEdge=true → Stern startet am Rand (Respawn während Animation)
// fromEdge=false → zufällige Startposition über den ganzen Bildschirm (Init)
function spawnStar(fromEdge = false): HyperStar {
  const dist = fromEdge
    ? maxDist * (0.75 + Math.random() * 0.35) // Rand bis leicht außerhalb
    : maxDist * (0.03 + Math.random() * 0.97) // gesamter Bildschirm
  return {
    angle: Math.random() * Math.PI * 2,
    dist,
    speed: 70 + Math.random() * 180,
    size: 0.4 + Math.random() * 2.0,
  }
}

function initStars() {
  const canvas = canvasRef.value
  // 10 % Puffer damit auch Ecken voll abgedeckt sind
  maxDist = canvas ? Math.sqrt((canvas.width / 2) ** 2 + (canvas.height / 2) ** 2) * 1.1 : 1000
  stars = Array.from({ length: 500 }, () => spawnStar(false))
}

function startAnimation() {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  initStars()
  startTime = null

  let lastTime: number | null = null

  function frame(now: number) {
    if (!startTime) startTime = now
    const elapsed = now - startTime
    const dtMs = lastTime !== null ? now - lastTime : 16
    lastTime = now
    const dtSec = Math.min(dtMs / 1000, 0.1)

    // Halbtransparentes Schwarz → natürlicher Motion-Blur-Effekt
    ctx!.fillStyle = 'rgba(10, 6, 32, 0.18)'
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

    const cx = canvas!.width / 2
    const cy = canvas!.height / 2

    // Sanfte Beschleunigung: 1× → ~18× über 2 Sekunden (kubisch)
    const t = Math.min(elapsed / 2000, 1)
    const accel = 1 + t * t * t * 17

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i]
      star.dist -= star.speed * accel * dtSec

      // Stern hat Zentrum erreicht → neu vom Rand spawnen
      if (star.dist <= 4) {
        stars[i] = spawnStar(true)
        continue
      }

      // Schweif hinter dem Stern (weg vom Zentrum)
      const tailLen = Math.max(star.speed * accel * 0.22, 4)
      const tailDist = Math.min(star.dist + tailLen, maxDist)

      const headX = cx + Math.cos(star.angle) * star.dist
      const headY = cy + Math.sin(star.angle) * star.dist
      const tailX = cx + Math.cos(star.angle) * tailDist
      const tailY = cy + Math.sin(star.angle) * tailDist

      // Blau-weißer Gradient: Schweifende → transparent, Kopf → hell
      const grad = ctx!.createLinearGradient(tailX, tailY, headX, headY)
      grad.addColorStop(0, 'rgba(140, 200, 255, 0)')
      grad.addColorStop(0.55, 'rgba(190, 225, 255, 0.35)')
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.97)')

      ctx!.strokeStyle = grad
      ctx!.lineWidth = star.size
      ctx!.beginPath()
      ctx!.moveTo(tailX, tailY)
      ctx!.lineTo(headX, headY)
      ctx!.stroke()
    }

    if (elapsed < 2000) {
      rafId = requestAnimationFrame(frame)
    } else {
      stopAnimation(true)
    }
  }

  rafId = requestAnimationFrame(frame)
}

function stopAnimation(clearCanvas = false) {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (clearCanvas && canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  }
  startTime = null
}

watch(
  () => gameStore.isHyperspaceActive,
  async (active) => {
    if (active) {
      phase.value = 'streaks'
      await nextTick() // ← Canvas ist jetzt im DOM, canvasRef.value ist nicht mehr null
      startAnimation()

      setTimeout(() => {
        phase.value = 'flash'
        stopAnimation(true)
      }, 2000)
      setTimeout(() => {
        phase.value = 'fadeout'
      }, 2500)
      setTimeout(() => {
        phase.value = 'idle'
      }, 3500)
    } else {
      phase.value = 'idle'
      stopAnimation(true)
    }
  },
)

onUnmounted(() => {
  stopAnimation()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="phase !== 'idle'" class="hyperspace-overlay">
      <canvas ref="canvasRef" class="hyperspace-canvas" />
      <div
        class="hyperspace-flash"
        :class="{
          'flash-in': phase === 'flash',
          'flash-out': phase === 'fadeout',
        }"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.hyperspace-overlay {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(45deg, #0a0620, #110b3d, #160e4a, #0d0830);
}

.hyperspace-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hyperspace-flash {
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0;
}

.hyperspace-flash.flash-in {
  opacity: 1;
  transition: opacity 0.45s ease-in;
}

.hyperspace-flash.flash-out {
  opacity: 0;
  transition: opacity 1.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .hyperspace-overlay {
    display: none;
  }
}
</style>
