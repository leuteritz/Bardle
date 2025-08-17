<template>
  <div
    class="relative flex flex-col items-center justify-center w-56 h-full p-2 overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute w-16 h-16 bg-purple-500 rounded-full top-2 left-2 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute w-12 h-12 bg-pink-500 rounded-full bottom-2 right-2 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
    </div>

    <!-- Kompakter Header -->
    <div class="relative z-10 flex items-center gap-2 mb-2 text-sm font-bold">
      <svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6l-4 3V5z" />
      </svg>
      <span class="text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
        >Battle Chat</span
      >
    </div>

    <!-- Kompakte Chat Box mit fixer Breite -->
    <div
      id="battle-chat-box"
      class="relative z-10 w-full h-32 p-2 mb-2 space-y-1 overflow-y-auto text-xs border rounded-lg shadow-inner bg-white/10 border-purple-400/30 backdrop-blur-sm custom-scrollbar"
    >
      <div
        v-for="(msg, idx) in battleStore.chatMessages"
        :key="'msg-' + idx"
        class="flex items-start gap-1 py-0.5 min-h-0"
      >
        <span class="flex-shrink-0 w-8 text-xs font-medium text-purple-300">{{ msg.time }}</span>
        <span
          class="flex-shrink-0 w-12 text-xs font-bold truncate"
          :class="{
            'text-purple-300': msg.user === 'Bard',
            'text-blue-300': msg.team === 1 && msg.user !== 'Bard',
            'text-red-300': msg.team === 2 && msg.user !== 'Bard',
          }"
          :title="msg.user"
        >
          {{ msg.user }}:
        </span>
        <span
          class="flex-1 min-w-0 overflow-hidden text-xs leading-tight text-purple-200 break-words"
          >{{ msg.text }}</span
        >
      </div>
    </div>

    <!-- Kompakter Status -->
    <div class="relative z-10 flex items-center space-x-2 text-xs">
      <div
        class="w-2 h-2 rounded-full shadow-lg bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse"
      ></div>
      <span
        class="font-medium text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
        >Live Chat</span
      >
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

/* Custom Scrollbar für Chat */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 27, 75, 0.3);
  border-radius: 8px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.8) 0%, rgba(236, 72, 153, 0.8) 100%);
  border-radius: 8px;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(168, 85, 247, 1) 0%, rgba(236, 72, 153, 1) 100%);
}
</style>
