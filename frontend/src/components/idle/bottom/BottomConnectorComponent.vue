<template>
  <div class="bottom-connector" />
</template>

<script setup lang="ts"></script>

<style scoped>
.bottom-connector {
  position: fixed;
  bottom: 0;
  left: 458px;
  right: 458px;
  height: 60px;
  background: #1e1006;
  z-index: 10000;

  /* exakt dieselben Rahmenfarben wie die Minimap */
  border-top: 5px solid rgba(30, 12, 0, 0.95);
  box-shadow:
    0 -1px 0 #7a4e20,
    0 -2px 0 rgba(210, 160, 40, 0.85),
    0 -3px 0 rgba(255, 220, 80, 0.25);

  /* kein Glow */
  animation: none;
  filter: none;
}

.bottom-connector::before,
.bottom-connector::after {
  content: none;
}
</style>
