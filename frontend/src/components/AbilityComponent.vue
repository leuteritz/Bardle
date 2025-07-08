<template>
  <div
    class="flex flex-col items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
  >
    <div class="flex flex-row gap-0.5 mb-1">
      <div
        v-for="n in 5"
        :key="n"
        class="w-2 h-2 border-2 rounded border-amber-400"
        :class="n <= abilityLevel ? 'bg-white/60' : ''"
      ></div>
    </div>
    <div class="flex flex-col items-center justify-center w-16 h-16">
      <img :src="icon" class="object-contain w-full h-full drop-shadow-lg" />
    </div>
    <span class="mt-2 text-xs font-bold text-amber-400">{{ ability }}</span>
    <button
      v-if="canUpgrade"
      @click.stop="$emit('upgrade')"
      class="px-2 py-1 mt-2 text-xs font-bold text-white transition-all border rounded shadow bg-amber-500 hover:bg-amber-600 border-amber-700"
    >
      Upgrade
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AbilityComponent',
  props: {
    icon: String,
    ability: String,
    abilityLevel: Number,
    canUpgrade: Boolean,
  },
  emits: ['upgrade'],
})
</script>
