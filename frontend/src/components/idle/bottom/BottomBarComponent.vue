<template>
  <MiniMap />
  <BottomConnectorComponent />
  <ChatWidget />
</template>

<script setup lang="ts">
import MiniMap from '@/components/idle/bottom/minimap/MiniMap.vue'
import BottomConnectorComponent from './BottomConnectorComponent.vue'
import ChatWidget from '@/components/idle/bottom/chat/ChatWidget.vue'
</script>
