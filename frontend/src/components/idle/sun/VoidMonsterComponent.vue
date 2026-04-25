<template>
  <Teleport to="body">
    <div class="void-monster-layer" aria-hidden="true">
      <div
        v-for="m in monsterRenders"
        :key="m.id"
        class="void-monster"
        :style="{
          transform: `translate(${m.x}px, ${m.y}px) translate(-50%, -50%) scale(${m.scale})`,
          opacity: m.opacity,
        }"
      />
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useVoidMonster } from '../../../composables/useVoidMonster'

export default defineComponent({
  name: 'VoidMonsterComponent',
  setup() {
    const { monsterRenders } = useVoidMonster()
    return { monsterRenders }
  },
})
</script>

<style scoped>
.void-monster-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 8;
}

@keyframes void-pulse {
  0%, 100% {
    box-shadow:
      0 0 12px #7700ff,
      0 0 28px #5500cc,
      0 0 52px #330099,
      inset 0 0 8px #aa55ff;
  }
  50% {
    box-shadow:
      0 0 20px #9922ff,
      0 0 44px #7700ee,
      0 0 80px #550099,
      inset 0 0 14px #cc77ff;
    transform: scale(1.05);
  }
}

@keyframes void-wobble {
  0%, 100% {
    border-radius: 50%;
    transform: rotate(0deg) scale(0.55) translate(14px, -10px);
  }
  33% {
    border-radius: 44% 56% 52% 48% / 48% 44% 56% 52%;
    transform: rotate(60deg) scale(0.5) translate(18px, -12px);
  }
  66% {
    border-radius: 52% 48% 44% 56% / 56% 52% 48% 44%;
    transform: rotate(120deg) scale(0.58) translate(10px, -14px);
  }
}

.void-monster {
  position: fixed;
  left: 0;
  top: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #3a0080 0%, #180038 45%, #07000f 100%);
  box-shadow:
    0 0 12px #7700ff,
    0 0 28px #5500cc,
    0 0 52px #330099,
    inset 0 0 8px #aa55ff;
  animation: void-pulse 1.8s ease-in-out infinite;
  will-change: transform, opacity;
}

.void-monster::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle, #4400aa 0%, #1a0040 70%);
  box-shadow: 0 0 10px #6600cc, 0 0 20px #440099;
  animation: void-wobble 2.4s ease-in-out infinite;
  top: 0;
  left: 0;
}

.void-monster::after {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #6600cc44 0%, transparent 70%);
}
</style>
