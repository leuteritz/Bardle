<template>
  <div
    v-if="showMessage"
    :key="messageKey"
    class="fixed z-40 transform -translate-x-1/2 left-1/2 top-16"
  >
    <div
      class="relative px-6 py-3 overflow-hidden text-xl font-bold text-center border-2 shadow-2xl rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400/50 backdrop-blur-lg animate-bounce"
    >
      <!-- Animated Background -->
      <div class="absolute inset-0 opacity-30">
        <div
          class="absolute top-0 left-0 w-8 h-8 bg-purple-500 rounded-full mix-blend-multiply filter blur-lg animate-blob"
        ></div>
        <div
          class="absolute bottom-0 right-0 w-6 h-6 bg-pink-500 rounded-full mix-blend-multiply filter blur-lg animate-blob animation-delay-2000"
        ></div>
      </div>

      <span
        class="relative z-10 text-transparent bg-gradient-to-r from-white to-purple-100 bg-clip-text drop-shadow-lg"
      >
        {{ currentMessage }}
      </span>

      <!-- Glow Effect -->
      <div class="absolute inset-0 border pointer-events-none rounded-2xl border-white/20"></div>
    </div>
  </div>
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
    const messageDuration = ref(1500)

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
      const randomMessage = battleMessages[Math.floor(Math.random() * battleMessages.length)]
      currentMessage.value = randomMessage
      showMessage.value = true
      messageKey.value++
      messageTimeout = window.setTimeout(() => {
        showMessage.value = false
      }, messageDuration.value)
    }

    function startMessageInterval() {
      if (messageInterval) {
        clearInterval(messageInterval)
      }
      messageInterval = window.setInterval(() => {
        if (battleStore.autoBattleEnabled) {
          if (Math.random() < 0.3) {
            showRandomMessage()
          }
        }
      }, messageDuration.value * 2)
    }

    function stopMessageInterval() {
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
      if (battleStore.autoBattleEnabled) {
        startMessageInterval()
      }
    })

    onUnmounted(() => {
      stopMessageInterval()
    })

    return {
      showMessage,
      currentMessage,
      messageKey,
    }
  },
})
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(15px, -25px) scale(1.1);
  }
  66% {
    transform: translate(-10px, 10px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
</style>
