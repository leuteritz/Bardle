<template>
  <div class="relative flex flex-col w-full h-full">
    <!-- Chat: obere Hälfte -->
    <div class="flex-1 min-h-0 mb-2">
      <div class="flex items-center gap-2 mb-2 text-lg font-bold text-amber-800">
        <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6l-4 3V5z" />
        </svg>
        Chat
      </div>
      <div
        id="battle-chat-box"
        class="flex-1 h-full min-h-0 p-2 mb-2 space-y-1 overflow-y-auto text-sm border rounded bg-white/70 border-amber-100"
        style="max-height: 60%"
      >
        <div v-for="(msg, idx) in chatMessages" :key="'msg-' + idx" class="flex items-start gap-2">
          <span class="mr-2 text-xs text-gray-400 min-w-[40px]">{{ msg.time }}</span>
          <span class="font-bold text-amber-700" v-if="msg.user === 'Bard'">{{ msg.user }}:</span>
          <span class="font-bold text-blue-700" v-else-if="msg.user === 'Team'"
            >{{ msg.user }}:</span
          >
          <span class="font-bold text-red-700" v-else>{{ msg.user }}:</span>
          <span class="break-words">{{ msg.text }}</span>
        </div>
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
