<template>
  <div class="flex flex-col items-center justify-center w-full h-full">
    <div class="flex items-center gap-2 mb-2 text-lg font-bold text-white">
      <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6l-4 3V5z" />
      </svg>
      Chat
    </div>
    <div
      id="battle-chat-box"
      class="h-48 p-2 mb-2 space-y-1 overflow-y-auto text-sm border rounded w-80 opacity-70 bg-white/70 border-amber-100"
    >
      <div v-for="(msg, idx) in chatMessages" :key="'msg-' + idx" class="flex items-start gap-2">
        <span class="mr-2 text-xs text-gray-400">{{ msg.time }}</span>
        <span
          class="font-bold"
          :class="{
            'text-amber-500': msg.user === 'Bard',
            'text-blue-600': msg.team === 1 && msg.user !== 'Bard',
            'text-red-600': msg.team === 2 && msg.user !== 'Bard',
          }"
        >
          {{ msg.user }}:
        </span>
        <span class="break-words">{{ msg.text }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, watch, nextTick, ref } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { battleMessages } from '../../../config/messages'

export default defineComponent({
  name: 'ChatPanelComponent',
  props: {
    team1: {
      type: Array as PropType<any[]>,
      required: true,
    },
    team2: {
      type: Array as PropType<any[]>,
      required: true,
    },
    battleId: {
      type: [String, Number],
      default: 0,
    },
  },
  setup(props) {
    const gameStore = useGameStore()
    const gameTime = ref(120) // 120 s -> 02:00 min
    const chatMessages = ref<any[]>([])

    function showRandomChatMessagesSequentially() {
      chatMessages.value = []

      if (!props.team1.length || !props.team2.length) {
        setTimeout(() => showRandomChatMessagesSequentially(), 100)
        return
      }
      const messages = [...battleMessages]

      function showNext() {
        if (messages.length === 0) return
        const idx = Math.floor(Math.random() * messages.length)
        const msg = messages[idx]
        let chatMsg
        if (typeof msg === 'string') {
          const allChampions = [
            ...props.team1.map((champ) => ({ name: champ.name, team: 1 })),
            ...props.team2.map((champ) => ({ name: champ.name, team: 2 })),
          ]

          const randomChampion = allChampions[Math.floor(Math.random() * allChampions.length)]

          chatMsg = {
            user: randomChampion.name,
            text: msg,
            time: formatTime(gameTime.value),
            team: randomChampion.team,
          }
        }
        chatMessages.value.push(chatMsg)
        messages.splice(idx, 1)
        gameTime.value += getRandomTimeIncrement()
        if (messages.length > 0) {
          setTimeout(showNext, gameStore.gameSpeed)
        }
      }
      showNext()
    }

    function formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }
    function getRandomTimeIncrement() {
      return Math.floor(Math.random() * 471) + 30
    }

    // Automatisches Scrollen zum neuesten Chat-Eintrag
    watch(
      () => chatMessages.value.length,
      async () => {
        await nextTick()
        const chatBox = document.getElementById('battle-chat-box')
        if (chatBox) {
          chatBox.scrollTop = chatBox.scrollHeight
        }
      },
    )

    // Watcher für battleId - lädt Chats neu bei jedem neuen Battle
    // Der immediate: true sorgt dafür, dass beim ersten Laden die Chats geladen werden
    watch(
      () => props.battleId,
      () => {
        gameTime.value = 120 // Reset game time
        showRandomChatMessagesSequentially()
      },
      { immediate: true }
    )

    return {
      chatMessages,
      showRandomChatMessagesSequentially,
    }
  },
})
</script>
