<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue'
import { useBattleStore } from '../../stores/battleStore'

export default defineComponent({
  name: 'BattleMessageComponent',
  setup() {
    const battleStore = useBattleStore()

    const showMessage = ref(false)
    const currentMessage = ref('')
    const messageKey = ref(0)
    const messageDuration = ref(2000)

    // Battle-Nachrichten wie in League of Legends
    const battleMessages = [
      'PENTAKILL!',
      'QUADRAKILL!',
      'TRIPLE KILL!',
      'DOUBLE KILL!',
      'FIRST BLOOD!',
      'BARON HAS BEEN SLAIN!',
      'DRAGON HAS BEEN SLAIN!',
      'ACE!',
      'UNSTOPPABLE!',
      'DOMINATING!',
      'GODLIKE!',
      'LEGENDARY!',
      'SHUTDOWN!',
      'EXECUTED!',
      'AFK!',
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

      // Kontinuierlich während des Kampfes Nachrichten anzeigen
      messageInterval = window.setInterval(() => {
        if (battleStore.autoBattleEnabled) {
          // 50% Chance pro Sekunde eine Nachricht zu zeigen
          if (Math.random() < 0.5) {
            showRandomMessage()
          }
        }
      }, messageDuration.value)
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

<template>
  <div
    v-if="showMessage"
    :key="messageKey"
    class="fixed z-50 mt-32 transform -translate-x-1/2 left-1/2"
  >
    <div
      class="px-8 py-4 text-4xl font-bold text-center text-white border-4 border-yellow-400 rounded-lg shadow-2xl bg-gradient-to-r from-red-600 to-orange-600 animate-pulse"
    >
      {{ currentMessage }}
    </div>
  </div>
</template>
