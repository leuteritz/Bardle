<script setup lang="ts">
import { useActionToast } from '@/composables/useActionToast'

const { message, visible } = useActionToast()
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="action-toast">
      <span class="toast-glyph">✦</span>
      <span class="toast-msg">{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.action-toast {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  background: #1a1008;
  border-bottom: 2px solid #c89040;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7), inset 0 -1px 0 rgba(200, 144, 64, 0.15);
}

.toast-glyph {
  color: #e8c040;
  font-size: 14px;
  flex-shrink: 0;
}

.toast-msg {
  color: #f0d878;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.toast-enter-active {
  animation: toast-in 0.15s ease-out;
}
.toast-leave-active {
  animation: toast-out 0.4s ease-in forwards;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}
</style>
