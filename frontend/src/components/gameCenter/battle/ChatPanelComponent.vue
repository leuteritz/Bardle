<template>
  <div class="flex flex-col items-center justify-center w-full h-full p-2">
    <!-- Kompakter Header -->
    <div class="flex items-center gap-1 mb-2 text-sm font-bold text-amber-800">
      <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6l-4 3V5z" />
      </svg>
      Battle Chat
    </div>

    <!-- Kompakte Chat Box -->
    <div
      id="battle-chat-box"
      class="w-full h-32 max-w-xs p-2 mb-2 space-y-1 overflow-y-auto text-xs border rounded-lg shadow-inner bg-white/80 border-amber-200"
    >
      <div
        v-for="(msg, idx) in battleStore.chatMessages"
        :key="'msg-' + idx"
        class="flex items-start gap-1 py-0.5"
      >
        <span class="text-xs text-amber-600 font-medium min-w-[30px]">{{ msg.time }}</span>
        <span
          class="font-bold text-xs min-w-[50px]"
          :class="{
            'text-amber-600': msg.user === 'Bard',
            'text-blue-600': msg.team === 1 && msg.user !== 'Bard',
            'text-red-600': msg.team === 2 && msg.user !== 'Bard',
          }"
        >
          {{ msg.user }}:
        </span>
        <span class="text-xs leading-tight break-words">{{ msg.text }}</span>
      </div>
    </div>

    <!-- Kompakter Status -->
    <div class="flex items-center space-x-1 text-xs">
      <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
      <span class="font-medium text-amber-700">Live Chat</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, watch, nextTick, ref } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { useBattleStore } from '../../../stores/battleStore'
import { battleMessages } from '../../../config/messages'

export default defineComponent({
  name: 'ChatPanelComponent',
  props: {
    team1: { type: Array as PropType<any[]>, required: true },
    team2: { type: Array as PropType<any[]>, required: true },
    battleId: { type: [String, Number], default: 0 },
  },
  setup(props) {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()
    const currentTimeoutId = ref<any>(null)

    function showRandomChatMessagesSequentially() {
      if (currentTimeoutId.value) {
        clearTimeout(currentTimeoutId.value)
        currentTimeoutId.value = null
      }
      battleStore.chatMessages = []

      if (!props.team1.length || !props.team2.length) {
        currentTimeoutId.value = setTimeout(() => showRandomChatMessagesSequentially(), 100)
        return
      }
      const messages = [...battleMessages]
      function showNext() {
        if (messages.length === 0) {
          currentTimeoutId.value = null
          return
        }
        const idx = Math.floor(Math.random() * messages.length)
        const msg = messages[idx]
        let chatMsg
        if (typeof msg === 'string') {
          const allChampions = [
            ...props.team1.map((champ) => ({ name: champ.name, team: 1 })),
            ...props.team2.map((champ) => ({ name: champ.name, team: 2 })),
          ]
          const randomChampion = allChampions[Math.floor(Math.random() * allChampions.length)]
          battleStore.gameTime += getRandomTimeIncrement()
          chatMsg = {
            user: randomChampion.name,
            text: msg,
            time: formatTime(battleStore.gameTime),
            team: randomChampion.team,
          }
        }
        battleStore.chatMessages.push(chatMsg)
        messages.splice(idx, 1)
        if (messages.length > 0) {
          currentTimeoutId.value = setTimeout(showNext, gameStore.gameSpeed)
        } else {
          currentTimeoutId.value = null
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

    watch(
      () => battleStore.chatMessages.length,
      async () => {
        await nextTick()
        const chatBox = document.getElementById('battle-chat-box')
        if (chatBox) {
          chatBox.scrollTop = chatBox.scrollHeight
        }
      },
    )

    watch(
      () => props.battleId,
      () => {
        battleStore.gameTime = 120
        showRandomChatMessagesSequentially()
      },
    )

    return {
      gameStore,
      battleStore,
      showRandomChatMessagesSequentially,
    }
  },
})
</script>
