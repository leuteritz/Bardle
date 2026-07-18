<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
</script>

<template>
  <div class="mst-root" title="The First Chime — every path begins here">
    <Handle type="source" :position="Position.Bottom" class="mst-handle" />

    <div class="mst-circle">
      <img src="/img/BardAbilities/BardChime.png" alt="Start" class="mst-icon" />
    </div>

    <div class="mst-label">
      <span class="mst-name">The First Chime</span>
    </div>
  </div>
</template>

<style scoped>
.mst-root {
  position: relative;
  width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mst-handle {
  opacity: 0;
  width: 2px;
  height: 2px;
  min-width: 0;
  min-height: 0;
  border: none;
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.mst-circle {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 3.5px solid var(--rpg-gold-dim);
  background: radial-gradient(circle at 35% 30%, #33270e, var(--rpg-bg-dark) 75%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: mst-glow 3s ease-in-out infinite;
}

@keyframes mst-glow {
  0%,
  100% {
    box-shadow:
      0 0 14px rgba(232, 192, 64, 0.35),
      inset 0 0 12px rgba(232, 192, 64, 0.12);
  }
  50% {
    box-shadow:
      0 0 26px rgba(232, 192, 64, 0.55),
      inset 0 0 16px rgba(232, 192, 64, 0.2);
  }
}

.mst-icon {
  width: 58px;
  height: 58px;
  object-fit: contain;
  image-rendering: crisp-edges;
}

.mst-label {
  margin-top: 8px;
  text-align: center;
}

.mst-name {
  font-size: 14px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--rpg-gold);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
}
</style>
