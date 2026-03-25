<template>
  <div
    class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 h-full flex flex-col"
  >
    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="p-3 space-y-2 flex flex-col flex-1 min-h-0">
      <!-- Header -->
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-6 h-6 border rounded-lg bg-gradient-to-br from-white/10 to-white/5 border-white/15"
        >
          <svg class="w-3 h-3 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6l-4 3V5z" />
          </svg>
        </div>
        <span
          class="text-xs font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
        >
          Battle Chat
        </span>
        <div class="flex items-center gap-1 ml-auto">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span class="text-[10px] text-emerald-300 font-bold">Live</span>
        </div>
      </div>

      <!-- Chat Box -->
      <div
        id="battle-chat-box"
        ref="chatBoxRef"
        class="p-2 space-y-1 overflow-y-auto custom-scrollbar border flex-1 min-h-0 rounded-xl bg-black/20 border-white/10 backdrop-blur-sm"
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
          <span class="flex-1 min-w-0 text-xs leading-tight text-white/60 break-words">{{
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
