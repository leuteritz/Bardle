<template>
  <div class="sun-container" :style="sunContainerVars">
    <div class="sun-atmosphere"></div>
    <div class="sun-corona"></div>

    <!-- Orbit-Ringe der Champions -->
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

    <!-- Dynamische Strahlen -->
    <svg class="sun-rays-dynamic" viewBox="-180 -180 360 360">
      <line
        v-for="ray in dynamicRays"
        :key="ray.id"
        :x1="Math.cos(ray.angle) * 72"
        :y1="Math.sin(ray.angle) * 72"
        :x2="Math.cos(ray.angle) * ray.currentLength"
        :y2="Math.sin(ray.angle) * ray.currentLength"
        :stroke="`rgba(255, 232, 155, ${ray.opacity})`"
        :stroke-width="ray.width"
        stroke-linecap="round"
      />
    </svg>

    <!-- Kugel / Volumen -->
    <div class="sun-core"></div>
    <div class="sun-volume sun-volume--light"></div>
    <div class="sun-volume sun-volume--shade"></div>
    <div class="sun-rim-glow"></div>

    <!-- Oberfläche -->
    <div class="sun-surface-wrap">
      <div class="s-band s-band--eq"></div>
      <div class="s-band s-band--n1"></div>
      <div class="s-band s-band--s1"></div>
      <div class="s-band s-band--n2"></div>
      <div class="s-band s-band--s2"></div>
    </div>

    <!-- Chromosphäre -->
    <div class="sun-chromosphere sun-chromosphere--outer"></div>
    <div class="sun-chromosphere sun-chromosphere--inner"></div>

    <!-- Flecken / Faculae mit 3D-Projektion -->
    <svg class="sun-spots-svg" viewBox="0 0 360 360">
      <defs>
        <clipPath id="sun-sphere-clip">
          <circle cx="180" cy="180" r="108" />
        </clipPath>

        <filter id="sf-blur-facula" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4.2" />
        </filter>

        <filter id="sf-blur-penumbra" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>

        <filter id="sf-blur-umbra" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>

        <filter id="sf-terminator-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <g clip-path="url(#sun-sphere-clip)">
        <!-- Helle Faculae, besonders gut nahe Rand -->
        <ellipse
          v-for="s in sunspotPositions"
          :key="'fac-' + s.id"
          :cx="s.x - (1 - s.depth) * 7"
          :cy="s.y - 2"
          :rx="s.faculaRx"
          :ry="s.faculaRy"
          :fill="`rgba(255, 240, 180, ${s.faculaOpacity})`"
          filter="url(#sf-blur-facula)"
        />

        <!-- Penumbra -->
        <ellipse
          v-for="s in sunspotPositions"
          :key="'pen-' + s.id"
          :cx="s.x"
          :cy="s.y"
          :rx="s.rx"
          :ry="s.ry"
          :fill="`rgba(120, 50, 0, ${s.penumbraOpacity})`"
          filter="url(#sf-blur-penumbra)"
        />

        <!-- Umbra -->
        <ellipse
          v-for="s in sunspotPositions"
          :key="'umb-' + s.id"
          :cx="s.x"
          :cy="s.y"
          :rx="s.rx * 0.46"
          :ry="s.ry * 0.5"
          :fill="`rgba(34, 7, 0, ${s.umbraOpacity})`"
          filter="url(#sf-blur-umbra)"
        />

        <!-- Terminator / leichte Volumenschattierung -->
        <ellipse
          cx="195"
          cy="184"
          rx="78"
          ry="98"
          fill="rgba(70, 15, 0, 0.10)"
          filter="url(#sf-terminator-blur)"
        />
      </g>
    </svg>

    <div class="sun-flare"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useCombatStore } from '@/stores/combatStore'
import { SUN_RADIUS } from '@/config/constants'

interface DynamicRay {
  id: number
  angle: number
  currentLength: number
  targetLength: number
  speed: number
  opacity: number
  width: number
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
  rx: number
  ry: number
  depth: number
  penumbraOpacity: number
  umbraOpacity: number
  faculaRx: number
  faculaRy: number
  faculaOpacity: number
}

export default defineComponent({
  name: 'SunComponent',
  setup() {
    const combatStore = useCombatStore()

    const CENTER = 180
    const DISC_RADIUS = 108

    const RAY_COUNT = 18
    const MIN_LENGTH = 78
    const MAX_LENGTH = 238
    const TARGET_INTERVAL = 1500

    // Etwas langsamer und ruhiger, dafür räumlicher
    const SOLAR_ROT_SPEED = 0.000082

    // Blick auf die Kugel: leichte Neigung
    const AXIAL_TILT = -0.42
    const Y_FLATTENING = 0.9

    const SOLAR_SPOTS: SunspotDef[] = [
      { lat: 0.32, lonOffset: 0.0, size: 10.5 },
      { lat: -0.28, lonOffset: 0.88, size: 6.2 },
      { lat: 0.44, lonOffset: 1.75, size: 5.6 },
      { lat: -0.38, lonOffset: 2.7, size: 8.2 },
      { lat: 0.12, lonOffset: 3.82, size: 10.8 },
      { lat: -0.1, lonOffset: 4.68, size: 4.4 },
      { lat: 0.26, lonOffset: 5.26, size: 6.1 },
      { lat: -0.22, lonOffset: 5.95, size: 7.0 },
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
          opacity: 0.78 - ((len - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 0.62,
          width: 1.3 + Math.random() * 1.6,
        }
      }),
    )

    const sunRotation = ref(0)

    function projectSunspot(spot: SunspotDef, id: number): SunspotPos | null {
      const latSpeedFactor = 1.14 - Math.min(Math.abs(spot.lat) / 0.5, 1) * 0.34
      const lon = sunRotation.value * latSpeedFactor + spot.lonOffset

      const sinLat = Math.sin(spot.lat)
      const cosLat = Math.cos(spot.lat)

      // Kugelkoordinaten
      const x3 = cosLat * Math.sin(lon)
      const y3 = sinLat
      const z3 = cosLat * Math.cos(lon)

      // Neigung der Sonnenachse
      const cosT = Math.cos(AXIAL_TILT)
      const sinT = Math.sin(AXIAL_TILT)

      const yTilt = y3 * cosT - z3 * sinT
      const zTilt = y3 * sinT + z3 * cosT

      if (zTilt <= 0) return null

      const x = CENTER + DISC_RADIUS * x3
      const y = CENTER - DISC_RADIUS * yTilt * Y_FLATTENING

      // Stärkeres Foreshortening an den Rändern
      const rx = spot.size * (0.34 + 0.9 * zTilt)
      const ry = spot.size * (0.56 + 0.66 * zTilt)

      const depth = Math.max(0, Math.min(1, zTilt))
      const limbBoost = 1 - depth

      return {
        id,
        x,
        y,
        rx,
        ry,
        depth,
        penumbraOpacity: 0.16 + depth * 0.38,
        umbraOpacity: 0.28 + depth * 0.62,
        faculaRx: spot.size * (1.55 - depth * 0.32),
        faculaRy: spot.size * (0.9 - depth * 0.12),
        faculaOpacity: 0.04 + limbBoost * 0.17,
      }
    }

    const sunspotPositions = computed<SunspotPos[]>(
      () => SOLAR_SPOTS.map((spot, i) => projectSunspot(spot, i)).filter(Boolean) as SunspotPos[],
    )

    let animFrame = 0
    let lastTargetUpdate = 0
    let lastTimestamp = 0

    function animate(timestamp: number) {
      if (timestamp - lastTargetUpdate > TARGET_INTERVAL) {
        dynamicRays.value.forEach((ray) => {
          ray.targetLength = MIN_LENGTH + Math.random() * (MAX_LENGTH - MIN_LENGTH)
        })
        lastTargetUpdate = timestamp
      }

      dynamicRays.value.forEach((ray) => {
        ray.currentLength += (ray.targetLength - ray.currentLength) * ray.speed
        ray.opacity = 0.78 - ((ray.currentLength - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 0.62
      })

      const dt = lastTimestamp === 0 ? 0 : timestamp - lastTimestamp
      lastTimestamp = timestamp

      sunRotation.value += SOLAR_ROT_SPEED * dt

      animFrame = requestAnimationFrame(animate)
    }

    const { isRenderingPaused } = useRenderingPaused()

    watch(isRenderingPaused, (paused) => {
      if (paused) {
        cancelAnimationFrame(animFrame)
        animFrame = 0
      } else if (!animFrame) {
        lastTimestamp = 0
        animFrame = requestAnimationFrame(animate)
      }
    })

    onMounted(() => {
      animFrame = requestAnimationFrame(animate)
    })

    onUnmounted(() => {
      cancelAnimationFrame(animFrame)
    })

    return {
      combatStore,
      dynamicRays,
      sunspotPositions,
      Math,
      sunContainerVars: { '--sun-r': `${SUN_RADIUS}px` } as Record<string, string>,
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
  inset: calc(var(--sun-r) * -2.03);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 28%,
    rgba(255, 138, 18, 0.04) 48%,
    rgba(255, 110, 0, 0.03) 64%,
    rgba(200, 80, 0, 0.015) 80%,
    transparent 100%
  );
  animation: corona-breathe 8s ease-in-out infinite;
  filter: blur(5px);
  z-index: 1;
}

.sun-corona {
  position: absolute;
  inset: calc(var(--sun-r) * -1.53);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 18%,
    rgba(255, 182, 60, 0.05) 34%,
    rgba(255, 205, 92, 0.11) 47%,
    rgba(255, 152, 30, 0.045) 63%,
    rgba(200, 100, 0, 0.02) 79%,
    transparent 100%
  );
  animation: corona-breathe 5.5s ease-in-out infinite;
  z-index: 2;
}

@keyframes corona-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.72;
    filter: hue-rotate(0deg);
  }
  35% {
    transform: scale(1.09);
    opacity: 0.92;
    filter: hue-rotate(-9deg);
  }
  68% {
    transform: scale(1.18);
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

.sun-core {
  position: absolute;
  inset: var(--sun-r);
  border-radius: 50%;
  background:
    radial-gradient(
      circle at 42% 36%,
      /* ← war 38% 32%, näher an Mitte */ rgba(255, 255, 236, 0.92) 0%,
      rgba(255, 247, 190, 0.78) 13%,
      transparent 26%
    ),
    radial-gradient(
      circle at 50% 50%,
      rgba(255, 235, 120, 0.95) 0%,
      rgba(255, 198, 50, 0.82) 38%,
      rgba(230, 125, 12, 0.56) 68%,
      rgba(150, 48, 0, 0.28) 88%,
      transparent 100%
    );
  animation: core-pulse 3.6s ease-in-out infinite;
  filter: blur(1.6px);
  z-index: 5;
}

.sun-volume {
  position: absolute;
  inset: var(--sun-r);
  border-radius: 50%;
  pointer-events: none;
}

.sun-volume--light {
  background: radial-gradient(
    circle at 34% 28%,
    rgba(255, 255, 230, 0.22) 0%,
    rgba(255, 250, 220, 0.12) 18%,
    rgba(255, 240, 180, 0.04) 34%,
    transparent 52%
  );
  z-index: 6;
}

.sun-volume--shade {
  background: radial-gradient(
    circle at 60% 54%,
    /* ← war 68% 58%, näher an Mitte */ transparent 0%,
    transparent 52%,
    rgba(100, 25, 0, 0.08) 72%,
    /* ← schwächer */ rgba(50, 5, 0, 0.16) 100% /* ← schwächer */
  );
  z-index: 6;
}

.sun-rim-glow {
  position: absolute;
  inset: calc(var(--sun-r) * 0.97);
  border-radius: 50%;
  box-shadow:
    inset 0 0 22px rgba(255, 220, 130, 0.14),
    inset 0 0 18px rgba(80, 12, 0, 0.1),
    /* ← kein -10px -12px offset mehr */ 0 0 14px rgba(255, 190, 70, 0.18);
  z-index: 6;
}

@keyframes core-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: blur(1.6px) brightness(1);
  }
  25% {
    transform: scale(1.05);
    filter: blur(1.8px) brightness(1.1) saturate(1.15);
  }
  50% {
    transform: scale(1.12);
    filter: blur(2.6px) brightness(1.24);
  }
  75% {
    transform: scale(1.03);
    filter: blur(1.9px) brightness(1.08) saturate(0.95);
  }
}

.sun-surface-wrap {
  position: absolute;
  inset: calc(var(--sun-r) * 1.03);
  border-radius: 50%;
  overflow: hidden;
  z-index: 6;
  pointer-events: none;
  mix-blend-mode: soft-light;
}

.s-band {
  position: absolute;
  left: -120%;
  width: 340%;
  border-radius: 999px;
  filter: blur(2.2px);
}

.s-band--eq {
  top: 40%;
  height: 18%;
  background: linear-gradient(
    to right,
    transparent 4%,
    rgba(195, 78, 0, 0.14) 18%,
    rgba(220, 92, 0, 0.25) 36%,
    rgba(214, 84, 0, 0.21) 56%,
    rgba(188, 72, 0, 0.15) 78%,
    transparent 96%
  );
  animation: s-drift 17s linear infinite;
}

.s-band--n1 {
  top: 24%;
  height: 11%;
  background: linear-gradient(
    to right,
    transparent 5%,
    rgba(165, 58, 0, 0.09) 20%,
    rgba(180, 64, 0, 0.15) 40%,
    rgba(168, 58, 0, 0.12) 63%,
    rgba(150, 48, 0, 0.08) 82%,
    transparent 95%
  );
  animation: s-drift 23s linear infinite;
  animation-delay: -8s;
}

.s-band--s1 {
  top: 62%;
  height: 11%;
  background: linear-gradient(
    to right,
    transparent 5%,
    rgba(165, 58, 0, 0.09) 20%,
    rgba(180, 64, 0, 0.15) 40%,
    rgba(168, 58, 0, 0.12) 63%,
    rgba(150, 48, 0, 0.08) 82%,
    transparent 95%
  );
  animation: s-drift 23s linear infinite;
  animation-delay: -17s;
}

.s-band--n2 {
  top: 14%;
  height: 8%;
  background: linear-gradient(
    to right,
    transparent 8%,
    rgba(140, 45, 0, 0.06) 28%,
    rgba(165, 56, 0, 0.11) 50%,
    rgba(135, 44, 0, 0.05) 72%,
    transparent 94%
  );
  animation: s-drift 29s linear infinite reverse;
}

.s-band--s2 {
  top: 77%;
  height: 8%;
  background: linear-gradient(
    to right,
    transparent 8%,
    rgba(140, 45, 0, 0.06) 28%,
    rgba(165, 56, 0, 0.11) 50%,
    rgba(135, 44, 0, 0.05) 72%,
    transparent 94%
  );
  animation: s-drift 29s linear infinite reverse;
  animation-delay: -11s;
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
  inset: calc(var(--sun-r) * 0.8);
  background: radial-gradient(
    circle,
    transparent 56%,
    rgba(255, 115, 25, 0.52) 65%,
    rgba(220, 68, 10, 0.62) 72%,
    rgba(170, 40, 0, 0.3) 81%,
    transparent 91%
  );
  animation: chrom-spin-rev 64s linear infinite reverse;
  filter: blur(1.4px);
  z-index: 7;
}

.sun-chromosphere--inner {
  inset: calc(var(--sun-r) * 0.9);
  background: radial-gradient(
    circle,
    transparent 60%,
    rgba(255, 132, 20, 0.28) 70%,
    rgba(200, 60, 5, 0.4) 76%,
    rgba(150, 30, 0, 0.2) 84%,
    transparent 93%
  );
  animation: chrom-spin-fwd 34s linear infinite;
  filter: blur(1px);
  z-index: 7;
  transform-origin: 50% 50%;
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

.sun-spots-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 8;
}

.sun-flare {
  position: absolute;
  top: 29%;
  left: 34%;
  width: calc(var(--sun-r) * 0.8);
  height: calc(var(--sun-r) * 0.8);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 215, 0.66) 0%, transparent 72%);
  animation: flare-drift 6s ease-in-out infinite;
  filter: blur(1.1px);
  z-index: 9;
}

@keyframes flare-drift {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.46;
  }
  25% {
    transform: translate(9px, -6px) scale(1.28);
    opacity: 0.82;
  }
  50% {
    transform: translate(13px, 2px) scale(1.08);
    opacity: 0.62;
  }
  75% {
    transform: translate(-5px, 6px) scale(0.92);
    opacity: 0.4;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.46;
  }
}
</style>
