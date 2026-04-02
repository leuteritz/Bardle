<template>
  <div class="galaxy-map-tooltip">
    <div class="map-container">
      <img
        ref="imgEl"
        src="/img/galaxie.png"
        class="galaxy-img"
        alt="Galaxy Map"
        @load="onImageLoad"
      />
      <canvas ref="canvasEl" class="map-canvas" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, nextTick } from 'vue'

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

interface DotPos {
  x: number
  y: number
}

export default defineComponent({
  name: 'GalaxyMapTooltipComponent',
  props: {
    totalPlanets: { type: Number, required: true },
    rescuedCount: { type: Number, required: true },
    galaxyKey: { type: Number, required: true },
    needsFinalBoss: { type: Boolean, default: false },
  },
  setup(props) {
    const canvasEl = ref<HTMLCanvasElement | null>(null)
    const imgEl = ref<HTMLImageElement | null>(null)
    const dotPositions = ref<DotPos[]>([])
    const rescueOrder = ref<number[]>([])

    function generateDots() {
      const rng = seededRng(props.galaxyKey * 31337 + props.totalPlanets)
      const dots: DotPos[] = []
      for (let i = 0; i < props.totalPlanets; i++) {
        // Elliptical galaxy core: x in [18%, 82%], y in [18%, 82%]
        // Use polar coords to cluster more towards center, like a galaxy
        const angle = rng() * Math.PI * 2
        const r = Math.sqrt(rng()) * 0.32 // sqrt for uniform distribution in circle
        const cx = 0.5 + r * Math.cos(angle)
        const cy = 0.5 + r * Math.sin(angle) * 0.75 // slightly squished vertically
        dots.push({ x: cx, y: cy })
      }
      dotPositions.value = dots

      // Precompute rescue order (nearest-neighbor from seeded origin)
      const originRng = seededRng(props.galaxyKey * 99991 + props.totalPlanets * 7)
      const originIdx = Math.floor(originRng() * props.totalPlanets)
      const order: number[] = [originIdx]
      const visited = new Set<number>([originIdx])

      while (order.length < props.totalPlanets) {
        const last = order[order.length - 1]
        const lastDot = dots[last]
        let nearest = -1
        let nearestDist = Infinity
        for (let i = 0; i < dots.length; i++) {
          if (visited.has(i)) continue
          const dx = dots[i].x - lastDot.x
          const dy = dots[i].y - lastDot.y
          const dist = dx * dx + dy * dy
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = i
          }
        }
        if (nearest === -1) break
        order.push(nearest)
        visited.add(nearest)
      }
      rescueOrder.value = order
    }

    function drawCanvas() {
      const canvas = canvasEl.value
      if (!canvas) return
      const img = imgEl.value
      if (!img || !img.complete) return

      // Match canvas resolution to its rendered CSS size
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (w === 0 || h === 0) return
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)

      const dots = dotPositions.value
      const order = rescueOrder.value
      const rescued = Math.min(props.rescuedCount, dots.length)

      // Draw connecting path lines between rescued dots
      if (rescued >= 2) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(232, 192, 64, 0.55)'
        ctx.lineWidth = 3.5
        ctx.lineCap = 'round'
        for (let i = 0; i < rescued; i++) {
          const d = dots[order[i]]
          const px = d.x * w
          const py = d.y * h
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // Draw unsaved dots (hollow white)
      const rescuedSet = new Set(order.slice(0, rescued))
      for (let i = 0; i < dots.length; i++) {
        if (rescuedSet.has(i)) continue
        const d = dots[i]
        const px = d.x * w
        const py = d.y * h
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw rescued dots (filled gold)
      for (let i = 0; i < rescued; i++) {
        const d = dots[order[i]]
        const px = d.x * w
        const py = d.y * h
        ctx.beginPath()
        ctx.arc(px, py, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#e8c040'
        ctx.fill()
        ctx.strokeStyle = '#fff8c0'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Draw galaxy boss marker at center when all planets rescued
      if (props.needsFinalBoss) {
        const bx = w * 0.5
        const by = h * 0.5

        // Dashed line from last rescued dot to boss center
        if (rescued > 0) {
          const lastDot = dots[order[rescued - 1]]
          ctx.beginPath()
          ctx.setLineDash([4, 4])
          ctx.strokeStyle = 'rgba(255, 80, 30, 0.55)'
          ctx.lineWidth = 1.5
          ctx.moveTo(lastDot.x * w, lastDot.y * h)
          ctx.lineTo(bx, by)
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Outer glow rings
        for (const [r, alpha] of [[26, 0.08], [20, 0.18], [15, 0.32]] as [number, number][]) {
          ctx.beginPath()
          ctx.arc(bx, by, r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200, 30, 10, ${alpha})`
          ctx.fill()
        }

        // Main boss dot
        ctx.beginPath()
        ctx.arc(bx, by, 11, 0, Math.PI * 2)
        ctx.fillStyle = '#9b1020'
        ctx.fill()
        ctx.strokeStyle = '#ff4020'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Inner dark
        ctx.beginPath()
        ctx.arc(bx, by, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#1a0404'
        ctx.fill()

        // Skull symbol
        ctx.font = 'bold 10px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ff6040'
        ctx.fillText('☠', bx, by)
      }
    }

    function onImageLoad() {
      nextTick(() => drawCanvas())
    }

    watch(
      () => [props.galaxyKey, props.totalPlanets] as [number, number],
      () => {
        generateDots()
        nextTick(() => drawCanvas())
      },
      { immediate: true },
    )

    watch(() => props.rescuedCount, () => {
      nextTick(() => drawCanvas())
    })

    watch(() => props.needsFinalBoss, () => {
      nextTick(() => drawCanvas())
    })

    onMounted(() => {
      nextTick(() => {
        if (imgEl.value?.complete) drawCanvas()
      })
    })

    return { canvasEl, imgEl, onImageLoad }
  },
})
</script>

<style scoped>
.galaxy-map-tooltip {
  width: 400px;
  max-width: calc(100vw - 16px);
  overflow: hidden;
}

.map-container {
  position: relative;
  line-height: 0;
}

.galaxy-img {
  width: 100%;
  display: block;
}

.map-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

</style>
