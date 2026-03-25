<template>
  <div class="relative z-50 flex w-full">
    <!-- Content -->
    <div class="flex-1 h-[600px] p-4">
      <component :is="currentComponent" class="h-full" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted } from 'vue'
import IdleGameComponent from './idle/IdleGameComponent.vue'
import { useBattleStore } from '../../stores/battleStore'

export default defineComponent({
  name: 'GameCenterComponent',
  components: {
    IdleGameComponent,
  },

  props: {
    activeTab: {
      type: String,
      default: 'idle',
    },
  },

  setup(props) {
    const battleStore = useBattleStore()

    const currentComponent = computed(() => {
      switch (props.activeTab) {
        case 'idle':
          return IdleGameComponent
        default:
          return IdleGameComponent
      }
    })

    onMounted(async () => {
      await battleStore.initializePersistentAutoBattle()
    })

    return {
      currentComponent,
    }
  },
})
</script>
