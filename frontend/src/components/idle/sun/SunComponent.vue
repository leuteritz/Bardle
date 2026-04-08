<template>
  <div class="sun-container">
    <div class="sun-atmosphere"></div>
    <div class="sun-corona"></div>

    <!-- Decorative elliptical orbit rings (from combatStore champions) -->
    <svg class="orbit-paths" viewBox="0 0 360 360">
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

    <svg class="sun-rays-dynamic" viewBox="-180 -180 360 360">
      <line
        v-for="ray in dynamicRays"
        :key="ray.id"
        :x1="Math.cos(ray.angle) * 68"
        :y1="Math.sin(ray.angle) * 68"
        :x2="Math.cos(ray.angle) * ray.currentLength"
        :y2="Math.sin(ray.angle) * ray.currentLength"
        :stroke="`rgba(255, 230, 150, ${ray.opacity})`"
        :stroke-width="ray.width"
        stroke-linecap="round"
      />
    </svg>

    <!-- Differential-rotation surface bands (equator faster than poles) -->
    <div class="sun-surface-wrap">
      <div class="s-band s-band--eq"></div>
      <div class="s-band s-band--n1"></div>
      <div class="s-band s-band--s1"></div>
    </div>

    <!-- Outer chromosphere ring (counter-rotation) -->
    <div class="sun-chromosphere sun-chromosphere--outer"></div>
    <!-- Inner chromosphere ring (faster forward rotation) -->
    <div class="sun-chromosphere sun-chromosphere--inner"></div>

    <div class="sun-core"></div>
    <div class="sun-flare"></div>

    <!-- 3-D projected sunspots — the primary rotation indicator -->
    <svg class="sun-spots-svg" viewBox="0 0 360 360">
      <defs>
        <clipPath id="sun-sphere-clip">
          <circle cx="180" cy="180" r="108" />
        </clipPath>
        <filter id="sf-blur-penumbra" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>
        <filter id="sf-blur-umbra" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <g clip-path="url(#sun-sphere-clip)">
        <!-- Penumbra (outer, diffuse) -->
        <circle
          v-for="s in sunspotPositions"
          :key="'pen-' + s.id"
          :cx="s.x"
          :cy="s.y"
          :r="s.size * s.scale"
          :fill="`rgba(115, 48, 0, ${s.depth * 0.7})`"
          filter="url(#sf-blur-penumbra)"
        />
        <!-- Umbra (inner, dark core) -->
        <circle
          v-for="s in sunspotPositions"
          :key="'umb-' + s.id"
          :cx="s.x"
          :cy="s.y"
          :r="s.size * s.scale * 0.5"
          :fill="`rgba(38, 8, 0, ${s.depth * 0.92})`"
          filter="url(#sf-blur-umbra)"
        />
      </g>
    </svg>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useCombatStore } from '@/stores/combatStore'

interface DynamicRay {
  id: number
  angle: number
  currentLength: number
  targetLength: number
  speed: number
  opacity: number
  width: number
  innerRadius: number
}

interface SunspotDef {
  lat: number
  lonOffset: number
  size: number
}

interface SunspotPos {
  id: number
  x: number
  y: number
  size: number
  scale: number
  depth: number
}

export default defineComponent({
  name: 'SunComponent',
  setup() {
    const combatStore = useCombatStore()

    const RAY_COUNT = 15
    const MIN_LENGTH = 70
    const MAX_LENGTH = 250
    const CENTER = 180
    const SOLAR_RADIUS = 92
    const SOLAR_ROT_SPEED = 0.000088

    const SOLAR_SPOTS: SunspotDef[] = [
      { lat: 0.3, lonOffset: 0.0, size: 8.5 },
      { lat: -0.24, lonOffset: 1.3, size: 6 },
      { lat: 0.4, lonOffset: 2.55, size: 5 },
      { lat: -0.33, lonOffset: 3.8, size: 7.5 },
      { lat: 0.16, lonOffset: 5.05, size: 9 },
      { lat: -0.13, lonOffset: 0.75, size: 4 },
      { lat: 0.27, lonOffset: 4.35, size: 5 },
      { lat: -0.2, lonOffset: 2.0, size: 6 },
    ]

    const dynamicRays = ref<DynamicRay[]>(
      Array.from({ length: RAY_COUNT }, (_, i) => {
        const angle = (i / RAY_COUNT) * Math.PI * 2
        const len = MIN_LENGTH + Math.random() * (MAX_LENGTH - MIN_LENGTH)
        return {
          id: i,
          angle,
          currentLength: len,
          targetLength: len,
          speed: 0.008 + Math.random() * 0.012,
          opacity: 0.8 - ((len - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 0.65,
          width: 1.5 + Math.random() * 1.5,
          innerRadius: 68,
        }
      }),
    )

    const sunRotation = ref(0)

    const sunspotPositions = computed<SunspotPos[]>(() => {
      const result: SunspotPos[] = []
      SOLAR_SPOTS.forEach((s, i) => {
        const lon = sunRotation.value + s.lonOffset
        const cosLat = Math.cos(s.lat)
        const depth = cosLat * Math.cos(lon)
        if (depth <= 0) return

        const x = CENTER + SOLAR_RADIUS * cosLat * Math.sin(lon)
        const y = CENTER - SOLAR_RADIUS * Math.sin(s.lat)
        const scale = 0.3 + 0.7 * depth

        result.push({ id: i, x, y, size: s.size, scale, depth })
      })
      return result
    })

    let animFrame: number
    let lastTargetUpdate = 0
    let lastTimestamp = 0
    const TARGET_INTERVAL = 1500

    function animateRays(timestamp: number) {
      if (timestamp - lastTargetUpdate > TARGET_INTERVAL) {
        dynamicRays.value.forEach((ray) => {
          ray.targetLength = MIN_LENGTH + Math.random() * (MAX_LENGTH - MIN_LENGTH)
        })
        lastTargetUpdate = timestamp
      }
      dynamicRays.value.forEach((ray) => {
        ray.currentLength += (ray.targetLength - ray.currentLength) * ray.speed
        ray.opacity = 0.8 - ((ray.currentLength - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 0.65
      })

      const dt = lastTimestamp === 0 ? 0 : timestamp - lastTimestamp
      lastTimestamp = timestamp

      sunRotation.value += SOLAR_ROT_SPEED * dt

      animFrame = requestAnimationFrame(animateRays)
    }

    onMounted(() => {
      animFrame = requestAnimationFrame(animateRays)
    })
    onUnmounted(() => {
      cancelAnimationFrame(animFrame)
    })

    return {
      dynamicRays,
      sunspotPositions,
      combatStore,
      Math,
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
  width: 360px;
  height: 360px;
  z-index: 5;
  pointer-events: none;
  overflow: visible;
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

.sun-atmosphere {
  position: absolute;
  inset: -120px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 30%,
    rgba(255, 140, 20, 0.04) 50%,
    rgba(255, 110, 0, 0.03) 65%,
    rgba(200, 80, 0, 0.015) 80%,
    transparent 100%
  );
  animation: corona-breathe 7s ease-in-out infinite;
  filter: blur(4px);
  z-index: 1;
}

.sun-corona {
  position: absolute;
  inset: -90px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 20%,
    rgba(255, 180, 60, 0.06) 35%,
    rgba(255, 200, 80, 0.1) 48%,
    rgba(255, 150, 30, 0.04) 62%,
    rgba(200, 100, 0, 0.02) 78%,
    transparent 100%
  );
  animation: corona-breathe 5s ease-in-out infinite;
  z-index: 1;
}

@keyframes corona-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
    filter: hue-rotate(0deg);
  }
  33% {
    transform: scale(1.1);
    opacity: 0.9;
    filter: hue-rotate(-10deg);
  }
  66% {
    transform: scale(1.2);
    opacity: 1;
    filter: hue-rotate(10deg);
  }
}

.sun-rays-dynamic {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.sun-surface-wrap {
  position: absolute;
  inset: 62px;
  border-radius: 50%;
  overflow: hidden;
  z-index: 4;
  pointer-events: none;
}

.s-band {
  position: absolute;
  left: -100%;
  width: 300%;
}

.s-band--eq {
  top: 42%;
  height: 16%;
  background: linear-gradient(
    to right,
    transparent 5%,
    rgba(195, 78, 0, 0.16) 20%,
    rgba(215, 88, 0, 0.22) 38%,
    rgba(210, 84, 0, 0.2) 55%,
    rgba(190, 74, 0, 0.15) 75%,
    transparent 95%
  );
  animation: s-drift 19s linear infinite;
}

.s-band--n1 {
  top: 25%;
  height: 11%;
  background: linear-gradient(
    to right,
    transparent 5%,
    rgba(165, 58, 0, 0.11) 20%,
    rgba(178, 64, 0, 0.16) 38%,
    rgba(170, 60, 0, 0.13) 60%,
    rgba(160, 54, 0, 0.09) 80%,
    transparent 95%
  );
  animation: s-drift 24s linear infinite;
  animation-delay: -9s;
}

.s-band--s1 {
  top: 62%;
  height: 11%;
  background: linear-gradient(
    to right,
    transparent 5%,
    rgba(165, 58, 0, 0.11) 20%,
    rgba(178, 64, 0, 0.16) 38%,
    rgba(170, 60, 0, 0.13) 60%,
    rgba(160, 54, 0, 0.09) 80%,
    transparent 95%
  );
  animation: s-drift 24s linear infinite;
  animation-delay: -18s;
}

@keyframes s-drift {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(33.33%);
  }
}

.sun-chromosphere {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.sun-chromosphere--outer {
  inset: 48px;
  background: radial-gradient(
    circle,
    transparent 55%,
    rgba(255, 110, 25, 0.5) 65%,
    rgba(220, 70, 10, 0.6) 72%,
    rgba(170, 40, 0, 0.3) 80%,
    transparent 90%
  );
  animation: chrom-spin-rev 60s linear infinite reverse;
  filter: blur(1.5px);
  z-index: 4;
}

.sun-chromosphere--inner {
  inset: 54px;
  background: radial-gradient(
    circle,
    transparent 60%,
    rgba(255, 130, 20, 0.3) 70%,
    rgba(200, 60, 5, 0.42) 76%,
    rgba(150, 30, 0, 0.22) 84%,
    transparent 93%
  );
  animation: chrom-spin-fwd 34s linear infinite;
  filter: blur(1px);
  z-index: 4;
}

@keyframes chrom-spin-rev {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes chrom-spin-fwd {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sun-core {
  position: absolute;
  inset: 60px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 230, 0.97) 0%,
    rgba(255, 245, 160, 0.88) 22%,
    rgba(255, 210, 70, 0.75) 45%,
    rgba(230, 130, 15, 0.5) 68%,
    rgba(160, 55, 0, 0.25) 85%,
    transparent 100%
  );
  animation: core-pulse 3s ease-in-out infinite;
  filter: blur(2px);
  z-index: 5;
}

@keyframes core-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: blur(2px) brightness(1);
  }
  25% {
    transform: scale(1.08);
    filter: blur(2px) brightness(1.15) saturate(1.2);
  }
  50% {
    transform: scale(1.18);
    filter: blur(3px) brightness(1.35);
  }
  75% {
    transform: scale(1.05);
    filter: blur(2px) brightness(1.1) saturate(0.9);
  }
}

.sun-spots-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 6;
}

.sun-flare {
  position: absolute;
  top: 30%;
  left: 35%;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 210, 0.7) 0%, transparent 70%);
  animation: flare-drift 6s ease-in-out infinite;
  filter: blur(1px);
  z-index: 7;
}

@keyframes flare-drift {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.5;
  }
  25% {
    transform: translate(8px, -5px) scale(1.3);
    opacity: 0.8;
  }
  50% {
    transform: translate(12px, 3px) scale(1.1);
    opacity: 0.6;
  }
  75% {
    transform: translate(-5px, 5px) scale(0.9);
    opacity: 0.4;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.5;
  }
}

</style>
