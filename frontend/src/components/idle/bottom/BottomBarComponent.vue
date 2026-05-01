<template>
  <MiniMap />
  <BottomStatusComponent />
  <CommandPanelComponent />
</template>

<script setup lang="ts">
import MiniMap from '@/components/idle/bottom/minimap/MiniMap.vue'
import BottomStatusComponent from './BottomStatusComponent.vue'
import CommandPanelComponent from './CommandPanelComponent.vue'
</script>
