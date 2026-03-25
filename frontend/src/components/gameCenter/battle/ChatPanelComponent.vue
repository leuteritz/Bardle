<template>
  <div
    class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 h-full flex flex-col"
  >
    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="flex flex-col flex-1 min-h-0 p-3 space-y-2">
      <!-- Chat Box -->
      <div
        id="battle-chat-box"
        ref="chatBoxRef"
        class="flex-1 min-h-0 p-2 space-y-1 overflow-y-auto border custom-scrollbar rounded-xl bg-black/20 border-white/10 backdrop-blur-sm"
      >
        <div
          v-for="(msg, idx) in battleStore.chatMessages"
          :key="'msg-' + idx"
          class="flex items-start min-h-0 gap-1"
        >
          <span class="flex-shrink-0 text-[11px] font-bold text-white/30 mt-0.5">{{
            msg.time
          }}</span>
          <span
            class="flex-shrink-0 text-xs font-black truncate"
            :class="{
              'text-violet-300': msg.user === 'Bard',
              'text-blue-300': msg.team === 1 && msg.user !== 'Bard',
              'text-red-300': msg.team === 2 && msg.user !== 'Bard',
            }"
            >{{ msg.user }}:</span
          >
          <span class="flex-1 min-w-0 text-xs leading-tight break-words text-white/60">{{
            msg.text
          }}</span>
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
