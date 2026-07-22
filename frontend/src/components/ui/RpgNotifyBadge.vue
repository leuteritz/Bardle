<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  count: number
  label?: string
  variant?: 'default' | 'shop'
}>()

const display = computed(() => String(props.count))
</script>

<template>
  <span
    v-if="count > 0"
    class="rpg-notify-badge"
    :class="[variant === 'shop' ? 'rpg-notify-badge--shop' : '']"
    :aria-label="label ?? `${count} action(s) available`"
  >{{ display }}</span>
</template>

<style scoped>
/* default variant = expedition (purple) — gold is reserved for the
   Star-Forge/sun-evolution badge, cyan for the champion shop */
.rpg-notify-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 20;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  border: 1.5px solid #c9a0ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  pointer-events: none;
  animation: rpg-badge-pulse 1.8s ease-in-out infinite;
  --badge-glow-a: rgba(168, 85, 247, 0.5);
  --badge-glow-b: rgba(168, 85, 247, 0.9);
  --badge-glow-c: rgba(124, 58, 237, 0.4);
}

.rpg-notify-badge--shop {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  border-color: #38bdf8;
  color: #fff;
  --badge-glow-a: rgba(6, 182, 212, 0.5);
  --badge-glow-b: rgba(6, 182, 212, 0.9);
  --badge-glow-c: rgba(8, 145, 178, 0.4);
}

@keyframes rpg-badge-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 4px var(--badge-glow-a);
  }
  50% {
    transform: scale(1.2);
    box-shadow:
      0 0 10px var(--badge-glow-b),
      0 0 20px var(--badge-glow-c);
  }
}
</style>
