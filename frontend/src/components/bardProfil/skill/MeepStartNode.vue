<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { MEEP_TREE_START_ICON } from '@/config/meepTree'
</script>

<template>
  <div class="mst-root" title="The First Chime — every path begins here">
    <Handle type="source" :position="Position.Bottom" class="mst-handle" />

    <div class="mst-circle">
      <img :src="MEEP_TREE_START_ICON" alt="Start" class="mst-icon" />
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
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 3.5px solid var(--rpg-gold-dim);
  background: radial-gradient(circle at 35% 30%, #33270e, var(--rpg-bg-dark) 75%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 14px rgba(232, 192, 64, 0.16);
}

/* Glow als Pseudo-Element mit statischem box-shadow; animiert wird nur die
   opacity (GPU-kompositiert) — animierte box-shadows repainten jeden Frame. */
.mst-circle::after {
  content: '';
  position: absolute;
  inset: -3.5px;
  border-radius: 50%;
  box-shadow: 0 0 26px rgba(232, 192, 64, 0.55);
  opacity: 0.6;
  pointer-events: none;
  animation: mst-glow 3s ease-in-out infinite;
}

@keyframes mst-glow {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.mst-icon {
  width: 58px;
  height: 58px;
  object-fit: contain;
}

</style>
