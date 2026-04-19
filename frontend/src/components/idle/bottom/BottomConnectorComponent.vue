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
  z-index: 9999;
  border-top: 3px solid #7a4e20;
  box-shadow:
    0 -1px 0 rgba(210, 160, 40, 0.85),
    0 -4px 6px rgba(30, 12, 0, 0.95);
}

/* fills gap between minimap right edge and arc start (CORNER_R - 2 = 18px) */
.bottom-connector::before {
  content: '';
  position: absolute;
  top: 0;
  left: -18px;
  width: 18px;
  height: 100%;
  background: #1e1006;
}

/* fills gap between arc end and chat left edge (mirrored) */
.bottom-connector::after {
  content: '';
  position: absolute;
  top: 0;
  right: -18px;
  width: 18px;
  height: 100%;
  background: #1e1006;
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
