<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  count: number
  label?: string
}>()

const display = computed(() => (props.count > 9 ? '9+' : String(props.count)))
</script>

<template>
  <span
    v-if="count > 0"
    class="rpg-notify-badge"
    :aria-label="label ?? `${count} action(s) available`"
  >{{ display }}</span>
</template>

<style scoped>
.rpg-notify-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 20;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e8af34, #cc6050);
  border: 1.5px solid #ffcf60;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  pointer-events: none;
  animation: rpg-badge-pulse 1.8s ease-in-out infinite;
}

@keyframes rpg-badge-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 4px rgba(232, 175, 52, 0.5);
  }
  50% {
    transform: scale(1.2);
    box-shadow:
      0 0 10px rgba(232, 175, 52, 0.9),
      0 0 20px rgba(204, 96, 80, 0.4);
  }
}
</style>
