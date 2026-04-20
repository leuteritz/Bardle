<template>
  <div class="bottom-bg-fill" />
  <MiniMap />
  <BottomConnectorComponent />
  <ChatWidget />
</template>

<script setup lang="ts">
import MiniMap from '@/components/idle/bottom/minimap/MiniMap.vue'
import BottomConnectorComponent from './BottomConnectorComponent.vue'
import ChatWidget from '@/components/idle/bottom/chat/ChatWidget.vue'
</script>

<style scoped>
.bottom-bg-fill {
  position: fixed;
  bottom: 0;
  left: 440px;
  right: 440px;
  /* height: 48px – endet genau an der Connector-Linie */
  height: 48px;
  background: #1e1006;
  z-index: 9999;
}
</style>
