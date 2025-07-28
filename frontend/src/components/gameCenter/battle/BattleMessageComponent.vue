<template>
  <div
    v-if="showMessage"
    :key="messageKey"
    class="fixed z-40 transform -translate-x-1/2 left-1/2 top-16"
  >
    <div
      class="px-4 py-2 text-lg font-bold text-center text-white border-2 border-yellow-400 rounded-lg shadow-xl bg-gradient-to-r from-red-600 to-orange-600 animate-bounce"
    >
      {{ currentMessage }}
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
    const messageDuration = ref(1500) // Kürzere Dauer

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
            // Reduzierte Häufigkeit
            showRandomMessage()
          }
        }
      }, messageDuration.value * 2) // Längere Intervalle
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
