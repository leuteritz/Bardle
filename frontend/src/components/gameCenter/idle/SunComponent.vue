<template>
  <div class="sun-container">
    <div class="sun-atmosphere"></div>
    <div class="sun-corona"></div>

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

    <div class="sun-chromosphere"></div>
    <div class="sun-core"></div>
    <div class="sun-flare"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'

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

export default defineComponent({
  name: 'SunComponent',
  setup() {
    const RAY_COUNT = 16
    const MIN_LENGTH = 55
    const MAX_LENGTH = 200

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

    let animFrame: number
    let lastTargetUpdate = 0
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

.sun-chromosphere {
  position: absolute;
  inset: 48px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 55%,
    rgba(255, 110, 25, 0.5) 65%,
    rgba(220, 70, 10, 0.6) 72%,
    rgba(170, 40, 0, 0.3) 80%,
    transparent 90%
  );
  animation: chromosphere-spin 60s linear infinite reverse;
  filter: blur(1.5px);
}

@keyframes chromosphere-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
