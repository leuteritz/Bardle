<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useGameStore } from '../stores/gameStore'

const props = defineProps<{
  data: {
    skill: { key: string; icon: string; effect: string; description: string }
    index: number
    cost: number
  }
}>()

const gameStore = useGameStore()
const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

const state = computed((): 'bought' | 'buyable' | 'locked' => {
  const idx = props.data.index
  if (gameStore.abilityLevels[idx] > 0) return 'bought'
  if (
    (idx === 0 || gameStore.abilityLevels[idx - 1] > 0) &&
    gameStore.meeps >= SKILL_MEEP_COSTS[idx]
  )
    return 'buyable'
  return 'locked'
})

function handleBuy() {
  if (state.value === 'buyable') {
    gameStore.unlockSkillWithMeeps(props.data.index)
  }
}
</script>

<template>
  <!-- ✅ pointer-events: none auf dem Wrapper – Vue Flow blockiert sonst alles -->
  <div
    :class="['relative select-none', state === 'locked' ? 'opacity-50' : '']"
    style="pointer-events: none"
  >
    <Handle type="target" :position="Position.Left" class="!opacity-0 !w-1 !h-1" />
    <Handle type="source" :position="Position.Right" class="!opacity-0 !w-1 !h-1" />

    <!-- Key Badge -->
    <div
      class="absolute z-10 flex items-center justify-center w-6 h-6 text-xs font-black border rounded-full -top-2 -left-2"
      :class="{
        'bg-yellow-500/80 border-yellow-300/80 text-yellow-900': state === 'bought',
        'bg-violet-600/80 border-violet-400/80 text-white': state === 'buyable',
        'bg-white/10 border-white/20 text-white/50': state === 'locked',
      }"
    >
      {{ data.skill.key }}
    </div>

    <!-- ✅ pointer-events: all nur auf dem Button -->
    <button
      style="pointer-events: all"
      class="relative flex items-center justify-center w-20 h-20 overflow-hidden transition-all duration-300 border-2 rounded-2xl"
      :class="{
        'border-yellow-400/80 bg-gradient-to-br from-yellow-900/40 to-amber-900/30 shadow-[0_0_20px_rgba(234,179,8,0.3)] ring-2 ring-yellow-400/50':
          state === 'bought',
        'border-violet-400/60 bg-gradient-to-br from-violet-900/30 to-purple-900/20 hover:shadow-[0_0_16px_rgba(124,58,237,0.4)] cursor-pointer hover:border-violet-300/80':
          state === 'buyable',
        'border-white/10 bg-white/5 cursor-not-allowed': state === 'locked',
      }"
      :disabled="state !== 'buyable'"
      @click.stop="handleBuy"
    >
      <div
        v-if="state === 'bought'"
        class="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent"
      />
      <img
        :src="data.skill.icon"
        :alt="data.skill.key"
        class="relative z-10 object-contain w-12 h-12"
      />
    </button>

    <!-- Effekt-Text -->
    <div class="mt-2 text-center">
      <div
        class="text-xs font-bold leading-tight"
        :class="{
          'text-yellow-300': state === 'bought',
          'text-violet-300': state === 'buyable',
          'text-white/30': state === 'locked',
        }"
      >
        {{ data.skill.effect }}
      </div>
      <div class="text-[10px] text-white/40 leading-tight mt-0.5">
        {{ data.skill.description }}
      </div>
    </div>

    <!-- Kosten / Freigeschaltet Badge -->
    <div class="flex justify-center mt-1">
      <div
        v-if="state !== 'bought'"
        class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
        :class="{
          'bg-violet-900/50 border-violet-400/40 text-violet-200': state === 'buyable',
          'bg-white/5 border-white/10 text-white/30': state === 'locked',
        }"
      >
        {{ data.cost }} Meeps
      </div>
      <div
        v-else
        class="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-yellow-900/40 border-yellow-400/40 text-yellow-300"
      >
        Freigeschaltet ✓
      </div>
    </div>
  </div>
</template>
