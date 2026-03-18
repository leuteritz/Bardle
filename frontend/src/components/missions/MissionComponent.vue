<template>
  <div class="flex flex-col w-full h-full gap-4 p-4">
    <!-- Tab Header -->
    <div class="flex items-center gap-3 px-1">
      <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Missionen</span>
      <div class="flex-1 h-px bg-white/5" />
      <div class="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        <button
          v-for="t in tabs"
          :key="t.id"
          @click="tab = t.id"
          class="relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5"
          :class="tab === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'"
        >
          <span
            v-if="tab === t.id"
            class="absolute inset-0 rounded-lg shadow-lg bg-gradient-to-br from-indigo-500/80 to-violet-600/80 shadow-violet-900/50"
          />
          <span class="relative">{{ t.icon }}</span>
          <span class="relative hidden tracking-wide sm:inline">{{ t.label }}</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div
      class="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
    >
      <MissionCreateComponent v-if="tab === 'create'" />
      <MissionActiveComponent v-else />
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue'
import MissionCreateComponent from './MissionCreateComponent.vue'
import MissionActiveComponent from './MissionActiveComponent.vue'

export default {
  name: 'MissionComponent',
  components: { MissionCreateComponent, MissionActiveComponent },
  setup() {
    const tab = ref('create')
    const tabs = [
      { id: 'create', label: 'Neue Mission', icon: '📜' },
      { id: 'active', label: 'Aktive', icon: '⚔️' },
    ]
    return { tab, tabs }
  },
}
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-track-transparent::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thumb-white\/10::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}
</style>
