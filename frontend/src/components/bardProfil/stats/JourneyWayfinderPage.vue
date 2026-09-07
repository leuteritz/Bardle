<script setup lang="ts">
import WayfinderSection from './WayfinderSection.vue'
</script>

<template>
  <div class="jt-page">
    <div class="jt-body rpg-scrollbar">
      <WayfinderSection />
    </div>
  </div>
</template>

<style scoped>
.jt-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
}
.jt-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 16px;
}
</style>
