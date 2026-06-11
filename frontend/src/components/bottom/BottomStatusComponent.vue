<template>
  <div class="bottom-connector" aria-hidden="true">
    <div class="status-bar-bg-wide" />

    <div class="status-bar">
      <BottomBarStatsComponent />
    </div>

  </div>
</template>

<script setup lang="ts">
import BottomBarStatsComponent from './BottomBarStatsComponent.vue'
</script>

<style scoped>
.bottom-connector {
  position: fixed;
  left: 440px;
  right: 440px;
  bottom: 48px;
  height: 24px;
  z-index: 9999;
  pointer-events: none; /* Overlay blockt keine Klicks */
  overflow: visible;
}

.status-bar-bg-wide {
  position: absolute;
  top: 9px;
  bottom: -80px;
  left: -50vw;
  right: -50vw;
  background: var(--color-panel-bg);
  z-index: 0;
}


.status-bar {
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  pointer-events: auto; /* ← FIX: Hover wieder erlauben */
}

</style>
