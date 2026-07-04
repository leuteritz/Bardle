<template>
  <div class="honor-screen" :class="won ? 'screen--win' : 'screen--loss'">
    <VictorySplashPanel />
    <HonorGrantPanel />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import VictorySplashPanel from './VictorySplashPanel.vue'
import HonorGrantPanel from './HonorGrantPanel.vue'

const battleStore = useBattleStore()
const won = computed(() => battleStore.lastAutoBattleResult?.won ?? false)
</script>

<style scoped>
.honor-screen {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  overflow: hidden;
}
.screen--win {
  background: radial-gradient(circle at 26% 30%, #16210f, #0a0d07 60%, #080907);
}
.screen--loss {
  background: radial-gradient(circle at 26% 30%, #211010, #0d0a07 60%, #090807);
}
</style>
