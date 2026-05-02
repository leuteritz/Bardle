<template>
  <MiniMap />
  <BottomStatusComponent />
  <CommandPanelComponent />
</template>

<script setup lang="ts">
import MiniMap from '@/components/bottom/minimap/MiniMap.vue'
import BottomStatusComponent from './BottomStatusComponent.vue'
import CommandPanelComponent from '@/components/bottom/command/CommandPanelComponent.vue'
</script>
