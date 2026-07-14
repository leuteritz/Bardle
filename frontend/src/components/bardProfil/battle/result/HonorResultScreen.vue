<template>
  <div ref="screenEl" class="honor-screen" :class="won ? 'screen--win' : 'screen--loss'">
    <!-- Fixed design surface, fit-scaled so the full result (splash + honor
         table) is visible on every desktop resolution without scrolling -->
    <div ref="stageEl" class="honor-stage" :style="{ transform: `scale(${scale})` }">
      <VictorySplashPanel />
      <HonorGrantPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useFitScale } from '@/composables/useFitScale'
import VictorySplashPanel from './VictorySplashPanel.vue'
import HonorGrantPanel from './HonorGrantPanel.vue'

const battleStore = useBattleStore()
const won = computed(() => battleStore.lastAutoBattleResult?.won ?? false)

const screenEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const { scale } = useFitScale(screenEl, stageEl, { maxScale: 1.3, padding: 8 })
</script>

<style scoped>
.honor-screen {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.screen--win {
  background: radial-gradient(circle at 26% 30%, #16210f, #0a0d07 60%, #080907);
}
.screen--loss {
  background: radial-gradient(circle at 26% 30%, #211010, #0d0a07 60%, #090807);
}

.honor-stage {
  width: 1060px;
  height: 680px;
  flex-shrink: 0;
  display: flex;
  transform-origin: center center;
}
</style>
