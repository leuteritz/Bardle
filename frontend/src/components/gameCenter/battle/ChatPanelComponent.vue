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
import { defineComponent, PropType, watch, nextTick } from 'vue'

export default defineComponent({
  name: 'ChatPanelComponent',
  props: {
    chatMessages: {
      type: Array as PropType<any[]>,
      required: true,
    },
  },
  setup(props) {
    // Automatisches Scrollen zum neuesten Chat-Eintrag
    watch(
      () => props.chatMessages.length,
      async () => {
        await nextTick()
        const chatBox = document.getElementById('battle-chat-box')
        if (chatBox) {
          chatBox.scrollTop = chatBox.scrollHeight
        }
      },
    )
    return {}
  },
})
</script>
