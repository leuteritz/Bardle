<template>
  <div class="bottom-bg-fill" />
  <div class="bottom-bar-title">
    <span class="bottom-bar-deco">✦</span>
    <span class="bottom-bar-title-text">BARDLE</span>
    <span class="bottom-bar-deco">✦</span>
  </div>
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
  height: 48px;
  background: #1a0d04;
  z-index: 9999;
}

.bottom-bar-title {
  position: fixed;
  bottom: 0;
  left: 440px;
  right: 440px;
  height: 48px;
  z-index: 10002;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.bottom-bar-title-text {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 6px;
  color: #ffe080;
  text-shadow:
    0 0 18px rgba(232, 192, 64, 0.95),
    0 0 8px rgba(200, 140, 20, 0.8),
    0 0 2px rgba(255, 240, 160, 0.6);
  text-transform: uppercase;
  user-select: none;
}

.bottom-bar-deco {
  font-size: 12px;
  color: rgba(210, 160, 40, 0.6);
  user-select: none;
  margin-top: 2px;
}
</style>
