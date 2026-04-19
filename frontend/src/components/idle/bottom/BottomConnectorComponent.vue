<template>
  <div class="bottom-connector" />
</template>

<script setup lang="ts"></script>

<style scoped>
.bottom-connector {
  position: fixed;
  bottom: 0;
  left: 440px;
  right: 440px;
  height: 60px;
  background: #1e1006;
  z-index: 9999;
  border-top: 3px solid #7a4e20;
  box-shadow:
    0 -1px 0 rgba(210, 160, 40, 0.85),
    0 -4px 6px rgba(30, 12, 0, 0.95);
}

@keyframes connector-pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(180, 130, 28, 0.45))
      drop-shadow(0 0 3px rgba(90, 58, 10, 0.65));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(210, 160, 40, 0.65))
      drop-shadow(0 0 6px rgba(120, 82, 15, 0.75));
  }
}
</style>
