<template>
  <Transition name="battle-msg">
    <div
      v-if="showMessage"
      :key="messageKey"
      class="fixed z-40 -translate-x-1/2 pointer-events-none left-1/2 top-16"
    >
      <div
        class="relative overflow-hidden px-6 py-3 rounded-2xl border backdrop-blur-xl bg-black/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        <!-- Shimmer -->
        <div
          class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1s_ease-out]"
        />
        <span
          class="relative z-10 text-xl font-black tracking-widest text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text drop-shadow-lg"
        >
          {{ currentMessage }}
        </span>
        <div
          class="absolute inset-0 border pointer-events-none rounded-2xl border-blue-400/20 animate-pulse"
        />
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'BattleMessageComponent',
  setup() {
    const battleStore = useBattleStore()
    const showMessage = ref(false)
    const currentMessage = ref('')
    const messageKey = ref(0)
    const messageDuration = 1500

    const battleMessages = [
      'PENTAKILL!',
      'QUADRAKILL!',
      'TRIPLE KILL!',
      'DOUBLE KILL!',
      'FIRST BLOOD!',
      'BARON SLAIN!',
      'DRAGON SLAIN!',
      'ACE!',
      'UNSTOPPABLE!',
      'DOMINATING!',
      'GODLIKE!',
      'LEGENDARY!',
      'SHUTDOWN!',
      'EXECUTED!',
    ]

    let messageInterval: number | null = null
    let messageTimeout: number | null = null

    function showRandomMessage() {
      if (!battleStore.autoBattleEnabled) return
      currentMessage.value = battleMessages[Math.floor(Math.random() * battleMessages.length)]
      showMessage.value = true
      messageKey.value++
      messageTimeout = window.setTimeout(() => {
        showMessage.value = false
      }, messageDuration)
    }

    function start() {
      if (messageInterval) clearInterval(messageInterval)
      messageInterval = window.setInterval(() => {
        if (battleStore.autoBattleEnabled && Math.random() < 0.3) showRandomMessage()
      }, messageDuration * 2)
    }

    function stop() {
      if (messageInterval) {
        clearInterval(messageInterval)
        messageInterval = null
      }
      if (messageTimeout) {
        clearTimeout(messageTimeout)
        messageTimeout = null
      }
      showMessage.value = false
    }

    onMounted(() => {
      if (battleStore.autoBattleEnabled) start()
    })
    onUnmounted(() => stop())

    return { showMessage, currentMessage, messageKey }
  },
})
</script>

<style scoped>
.battle-msg-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.battle-msg-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.battle-msg-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px) scale(0.9);
}
.battle-msg-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px) scale(0.95);
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
