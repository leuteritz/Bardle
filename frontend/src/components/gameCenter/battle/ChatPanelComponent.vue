<template>
  <div
    class="group relative overflow-hidden h-full flex flex-col chat-panel"
  >
    <div
      class="absolute inset-0 pointer-events-none chat-shimmer translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="flex flex-col flex-1 min-h-0 p-3 space-y-2">
      <!-- Chat Box -->
      <div
        id="battle-chat-box"
        ref="chatBoxRef"
        class="flex-1 min-h-0 p-2 space-y-1 overflow-y-auto rpg-scrollbar chat-box"
      >
        <div
          v-for="(msg, idx) in battleStore.chatMessages"
          :key="'msg-' + idx"
          class="flex items-start min-h-0 gap-1"
          :class="{ 'chat-msg--system': msg.type === 'system' }"
        >
          <span class="flex-shrink-0 text-xs font-bold text-white/30 mt-0.5">{{
            msg.time
          }}</span>
          <span
            v-if="msg.type !== 'system'"
            class="flex-shrink-0 text-xs font-black truncate"
            :class="{
              'text-violet-300': msg.user === 'Bard',
              'text-blue-300': msg.team === 1 && msg.user !== 'Bard',
              'text-red-300': msg.team === 2 && msg.user !== 'Bard',
            }"
            >{{ msg.user }}:</span
          >
          <span
            class="flex-1 min-w-0 text-xs leading-tight break-words"
            :class="msg.type === 'system' ? 'chat-msg--system-text' : 'text-white/60'"
            >{{ msg.text }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch, nextTick, ref } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'ChatPanelComponent',
  setup() {
    const battleStore = useBattleStore()
    const chatBoxRef = ref<HTMLElement | null>(null)

    watch(
      () => battleStore.chatMessages.length,
      async () => {
        await nextTick()
        if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight
      },
    )

    return { battleStore, chatBoxRef }
  },
})
</script>

<style scoped>
.chat-panel {
  background: rgba(17, 16, 8, 0.45);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.chat-shimmer {
  background: linear-gradient(to right, transparent, rgba(92, 51, 16, 0.08), transparent);
}

.chat-box {
  background: rgba(26, 16, 8, 0.35);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.chat-msg--system {
  background: rgba(232, 192, 64, 0.04);
  border-radius: 2px;
  padding: 1px 2px;
}

.chat-msg--system-text {
  color: #e8c040;
  font-style: italic;
  opacity: 0.85;
}
</style>
